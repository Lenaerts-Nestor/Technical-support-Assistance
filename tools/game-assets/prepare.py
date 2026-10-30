#!/usr/bin/env python3
"""
Turn the free sprite packs into the small files the game ships with.

    python3 -I tools/game-assets/prepare.py \
        --rpg1 Tiny_RPG_Character_Asset_Pack_01..._SoldierOrc.zip \
        --rpg2 Tiny_RPG_Character_Asset_Pack_02..._Demon_ABlood_Monster_A.zip \
        --shadow SHADOW_Series_-_The_Free_Assets.rar \
        --tiles Multi_Platformer_Tileset_Free.zip \
        --out src/features/game/sprites

The three heroes and the Shadeflit come from the SHADOW Series pack; the other enemies from the
Tiny RPG packs. Sheets are copied as they are, renamed to the clip names the game uses. Two are
put together: the Wetlands Warden's three-part roll becomes one `attack03`, and the Shadeflit,
which has no attack of its own, gets an `attack01` of a held stance followed by its run.

The scenery is the SHADOW tile map, cut into its separate pieces, the Abyssal Gate, and the
Grassland pack's backdrop layers and props (the game draws those as dark silhouettes).
A `.rar` is opened with `bsdtar`. Needs Pillow and numpy. Run it only on archives you trust.
"""
import argparse, collections, json, os, shutil, subprocess, sys, tempfile, zipfile
import numpy as np
from PIL import Image

# Where each character's sheets are, and which file becomes which clip.
SHADOW = {
    'huntress': ('The Blind Huntress/Sprite Sheet', {
        'idle': '1 - Idle', 'walk': '2 - Run', 'jump': '3 - jump', 'fall': '5 - fall', 'dash': '6 - dash',
        'airUp': '7 - jump-up-attack', 'airDown': '8 - jump-down-attack', 'attack01': '10 - attack 1',
        'attack02': '11 - attack 3', 'dashAttack': '12 - dash attack', 'attack03': '13 - spetial dash',
        'hurt': '14 - hit', 'death': '15 - death',
    }),
    'hallokin': ('Hallokin (free)/png (free)', {
        'idle': 'idle', 'walk': 'run', 'jump': 'jump', 'fall': 'fall', 'hurt': 'hit',
        'attack01': 'attack-2', 'attack02': 'attack up', 'airForward': 'jump - attack forwared',
    }),
    'warden': ('The Shadowed Wetlands Boss v1.1/Sprite Sheet', {
        'idle': 'idle', 'walk': 'walk', 'attack01': 'Attack 1', 'attack02': 'Attack 2',
        'hurt': 'new/hit', 'death': 'new/death',
    }),
    'flit': ('Shadeflit (Free)', {'idle': 'idle', 'walk': 'run', 'hurt': 'run-turn'}),
}
TINY = {
    'soldier': ('rpg1', 'Soldier'),
    'orc': ('rpg1', 'Orc'),
    'demon': ('rpg2', 'Demon_A'),
    'monster': ('rpg2', 'Blood Monster_A'),
}
TINY_ANIMS = ['Idle', 'Walk', 'Attack01', 'Attack02', 'Attack03', 'Hurt', 'Death']


def components(im, minsize=30):
    """Bounding boxes of the separate pieces on a sheet, largest first."""
    a = np.array(im)[:, :, 3] > 0
    h, w = a.shape
    seen = np.zeros_like(a)
    boxes = []
    for y in range(h):
        for x in range(w):
            if a[y, x] and not seen[y, x]:
                q = collections.deque([(y, x)])
                seen[y, x] = True
                n, y0, y1, x0, x1 = 0, y, y, x, x
                while q:
                    cy, cx = q.popleft()
                    n += 1
                    y0, y1, x0, x1 = min(y0, cy), max(y1, cy), min(x0, cx), max(x1, cx)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and a[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                q.append((ny, nx))
                if n >= minsize:
                    boxes.append((x0, y0, x1 + 1, y1 + 1))
    return boxes


def frames_of(im, fw):
    return [im.crop((i * fw, 0, (i + 1) * fw, im.height)) for i in range(im.width // fw)]


def strip(frames):
    out = Image.new('RGBA', (sum(f.width for f in frames), frames[0].height))
    x = 0
    for f in frames:
        out.paste(f, (x, 0))
        x += f.width
    return out


def unpack(path, dest):
    os.makedirs(dest)
    if os.path.isdir(path):
        shutil.copytree(path, dest, dirs_exist_ok=True)
    elif path.lower().endswith('.rar'):
        subprocess.run(['bsdtar', '-xf', path, '-C', dest], check=True)
    else:
        zipfile.ZipFile(path).extractall(dest)


def find_dir(root, suffix):
    """The folder whose path ends in `suffix` (the first one found, outermost first)."""
    found = []
    for dirpath, _dirs, _files in os.walk(root):
        if dirpath.replace(os.sep, '/').endswith(suffix):
            found.append(dirpath)
    if not found:
        raise SystemExit(f'not found: {suffix}')
    return min(found, key=len)


def find_file(root, name):
    for dirpath, _dirs, files in os.walk(root):
        if name in files:
            return os.path.join(dirpath, name)
    raise SystemExit(f'not found: {name}')


def main():
    ap = argparse.ArgumentParser()
    for name in ('rpg1', 'rpg2', 'shadow', 'tiles'):
        ap.add_argument(f'--{name}', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    out = os.path.abspath(args.out)
    tmp = tempfile.mkdtemp(prefix='game-assets-')
    roots = {}
    for key in ('rpg1', 'rpg2', 'shadow', 'tiles'):
        roots[key] = os.path.join(tmp, key)
        unpack(getattr(args, key), roots[key])

    shutil.rmtree(out, ignore_errors=True)
    chars = os.path.join(out, 'characters')

    # --- SHADOW characters --------------------------------------------------------
    for cid, (folder, clips) in SHADOW.items():
        src = find_dir(roots['shadow'], 'SHADOW Series - ' + folder)
        dst = os.path.join(chars, cid)
        os.makedirs(dst)
        for clip, name in clips.items():
            shutil.copy(os.path.join(src, name + '.png'), os.path.join(dst, clip + '.png'))
        if cid == 'warden':
            # The roll: curl up, spin along the ground, burst out in a crescent.
            parts = [Image.open(os.path.join(src, f'new/{p}-Attack 3.png')).convert('RGBA') for p in ('Pre', 'mid', 'end')]
            strip([f for p in parts for f in frames_of(p, 247)]).save(os.path.join(dst, 'attack03.png'), optimize=True)
        if cid == 'flit':
            idle = frames_of(Image.open(os.path.join(src, 'idle.png')).convert('RGBA'), 277)
            run = frames_of(Image.open(os.path.join(src, 'run.png')).convert('RGBA'), 277)
            strip([idle[0], idle[0], *run]).save(os.path.join(dst, 'attack01.png'), optimize=True)

    # --- Tiny RPG characters (the sheets without shadows: the game draws its own) -------
    for cid, (pack, folder) in TINY.items():
        src = None
        for dirpath, _d, files in os.walk(roots[pack]):
            if f'{folder}_Idle.png' in files and 'with shadows' not in dirpath and os.path.basename(os.path.dirname(dirpath)) == folder:
                src = dirpath
        if not src:
            raise SystemExit(f'sheets for {cid} not found')
        dst = os.path.join(chars, cid)
        os.makedirs(dst)
        for anim in TINY_ANIMS:
            f = os.path.join(src, f'{folder}_{anim}.png')
            if os.path.exists(f):
                shutil.copy(f, os.path.join(dst, anim.lower() + '.png'))
    shutil.copy(find_file(roots['rpg1'], 'Arrow01(32x32).png'), os.path.join(out, 'arrow.png'))

    # --- scenery ------------------------------------------------------------------
    env = os.path.join(out, 'environment')
    os.makedirs(env)
    manifest = {}

    def save(name, im):
        im.save(os.path.join(env, name + '.png'), optimize=True)
        manifest[name] = {'w': im.width, 'h': im.height}

    tiles = Image.open(find_file(roots['shadow'], 'tile map.png')).convert('RGBA')
    # The left half of the map; the right half repeats it.
    pieces = [b for b in components(tiles) if b[0] < tiles.width // 2]
    pieces.sort(key=lambda b: (b[1], b[0]))
    for name, box in zip(('block_a', 'block_b', 'block_c', 'slab', 'pillar', 'ledge', 'frame'), pieces):
        save(name, tiles.crop(box))
    gate = Image.open(find_file(roots['shadow'], 'SHADOW Series - Abyssal Gate.png')).convert('RGBA')
    save('gate', gate.crop(gate.getbbox()))

    grass = find_dir(roots['tiles'], 'GrassLand')
    for name, rel in (
        ('bg_ridge', 'Background/GrassLand_Background_2.png'), ('bg_hills', 'Background/GrassLand_Background_3.png'),
        ('bg_meadow', 'Background/GrassLand_Background_4.png'), ('bg_reeds', 'Background/GrassLand_Background_5.png'),
        ('cloud_1', 'Background/GrassLand_Cloud_1.png'), ('cloud_2', 'Background/GrassLand_Cloud_2.png'), ('cloud_3', 'Background/GrassLand_Cloud_3.png'),
        ('tree', 'Props/GrassLand_Tree.png'), ('bush', 'Props/GrassLand_Bush.png'), ('stump', 'Props/GrassLand_ChoppedTree.png'),
        ('stone_1', 'Props/GrassLand_Stone_1.png'), ('stone_3', 'Props/GrassLand_Stone_3.png'),
        ('tall_grass_1', 'Props/GrassLand_TallGrass_1.png'), ('tall_grass_2', 'Props/GrassLand_TallGrass_2.png'),
    ):
        im = Image.open(os.path.join(grass, rel)).convert('RGBA')
        save(name, im.crop(im.getbbox()))

    with open(os.path.join(env, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    shutil.rmtree(tmp, ignore_errors=True)
    print('wrote', out)


if __name__ == '__main__':
    sys.exit(main())
