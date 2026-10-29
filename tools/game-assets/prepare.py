#!/usr/bin/env python3
"""
Turn the free sprite packs into the small files the game ships with.

    python3 -I tools/game-assets/prepare.py \
        --rpg1 Tiny_RPG_Character_Asset_Pack_01..._SoldierOrc.zip \
        --rpg2 Tiny_RPG_Character_Asset_Pack_02..._Demon_ABlood_Monster_A.zip \
        --plants PlantsAnimated.zip --cave CaveAssetsMaaot.zip \
        --out src/features/game/sprites

Characters are copied as they are (the sheets without shadows: the game draws its own). The
cave rocks and animated plants are painted at high resolution, so they are shrunk to a grid of
PIXEL art-pixels, given a small palette and hard edges, so they sit next to the 100x100
character sprites. Needs Pillow and numpy. Run it only on archives you trust.
"""
import argparse, collections, json, os, shutil, sys, tempfile, zipfile
import numpy as np
from PIL import Image

PIXEL = 5  # one art pixel of the environment is this many arena pixels

CHARACTERS = {
    'soldier': ('rpg1', 'Soldier', 'Soldier'),
    'orc': ('rpg1', 'Orc', 'Orc'),
    'demon': ('rpg2', 'Demon_A', 'Demon_A'),
    'monster': ('rpg2', 'Blood Monster_A', 'Blood Monster_A'),
}
ANIMS = ['Idle', 'Walk', 'Attack01', 'Attack02', 'Attack03', 'Hurt', 'Death']


def components(path, step=4, minsize=15):
    """Bounding boxes of the separate pieces on a sheet, found on a shrunken copy of its alpha."""
    a = np.array(Image.open(path).convert('RGBA'))[:, :, 3]
    small = a[::step, ::step] > 20
    h, w = small.shape
    seen = np.zeros((h, w), bool)
    boxes = []
    for y in range(h):
        for x in range(w):
            if small[y, x] and not seen[y, x]:
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
                            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                q.append((ny, nx))
                if n >= minsize:
                    boxes.append((x0 * step, y0 * step, (x1 + 1) * step, (y1 + 1) * step))
    boxes.sort(key=lambda b: (b[1], b[0]))
    return boxes


def pixelate(im, logical_w=None, logical_h=None, colors=26, flip=False):
    """Shrink to a grid of art pixels, with a small palette and hard edges."""
    if logical_w:
        w = max(1, round(logical_w / PIXEL))
        h = max(1, round(im.height * w / im.width))
    else:
        h = max(1, round(logical_h / PIXEL))
        w = max(1, round(im.width * h / im.height))
    small = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    alpha = small.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    rgb = small.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = Image.merge('RGBA', (*rgb.split(), alpha))
    return out.transpose(Image.FLIP_TOP_BOTTOM) if flip else out


def main():
    ap = argparse.ArgumentParser()
    for name in ('rpg1', 'rpg2', 'plants', 'cave'):
        ap.add_argument(f'--{name}', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    out = os.path.abspath(args.out)
    tmp = tempfile.mkdtemp(prefix='game-assets-')
    roots = {}
    for key in ('rpg1', 'rpg2', 'plants', 'cave'):
        roots[key] = os.path.join(tmp, key)
        zipfile.ZipFile(getattr(args, key)).extractall(roots[key])

    def find(root, *parts):
        for dirpath, _dirs, files in os.walk(root):
            if os.path.basename(dirpath) == parts[0] and all(os.path.exists(os.path.join(dirpath, p)) for p in parts[1:]):
                return dirpath
        raise SystemExit(f'not found: {parts}')

    shutil.rmtree(out, ignore_errors=True)
    # --- characters -----------------------------------------------------------
    for cid, (pack, folder, prefix) in CHARACTERS.items():
        # The folder that holds `<prefix>_Idle.png` directly is the shadowless set.
        src = None
        for dirpath, _d, files in os.walk(roots[pack]):
            if f'{prefix}_Idle.png' in files and 'with shadows' not in dirpath and os.path.basename(os.path.dirname(dirpath)) == folder:
                src = dirpath
        if not src:
            raise SystemExit(f'sheets for {cid} not found')
        dst = os.path.join(out, 'characters', cid)
        os.makedirs(dst)
        for anim in ANIMS:
            f = os.path.join(src, f'{prefix}_{anim}.png')
            if os.path.exists(f):
                shutil.copy(f, os.path.join(dst, anim.lower() + '.png'))

    # --- environment ------------------------------------------------------------
    env = os.path.join(out, 'environment')
    os.makedirs(env)
    manifest = {'pixel': PIXEL, 'images': {}, 'strips': {}}
    cave = find(roots['cave'], 'Assets 1024 Cave')

    def save(name, im, **extra):
        im.save(os.path.join(env, name + '.png'), optimize=True)
        manifest['images'][name] = {'w': im.width, 'h': im.height, **extra}

    floor = Image.open(os.path.join(cave, 'Cave - Floor.png')).convert('RGBA')
    fb = components(os.path.join(cave, 'Cave - Floor.png'), step=6, minsize=30)
    fb.sort(key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))
    save('hill', pixelate(floor.crop(fb[0]), logical_w=1100))
    for name, box, width in (('plat_a', fb[2], 340), ('plat_b', fb[6], 300), ('plat_c', fb[4], 260), ('plat_d', fb[5], 280)):
        save(name, pixelate(floor.crop(box), logical_w=width))

    rocks = Image.open(os.path.join(cave, 'Cave - BigRocks1.png')).convert('RGBA')
    rb = components(os.path.join(cave, 'Cave - BigRocks1.png'), step=6, minsize=30)
    rb.sort(key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))
    for name, box, width in (('rock_a', rb[0], 480), ('rock_b', rb[1], 420), ('rock_c', rb[2], 380), ('rock_d', rb[3], 170), ('rock_e', rb[4], 210)):
        save(name, pixelate(rocks.crop(box), logical_w=width))

    small = Image.open(os.path.join(cave, 'Cave - SmallRocks.png')).convert('RGBA')
    sb = components(os.path.join(cave, 'Cave - SmallRocks.png'), step=4, minsize=15)
    # The pointed rocks are the very tall, narrow pieces; the rounder ones are boulders.
    tall = [b for b in sb if (b[3] - b[1]) / (b[2] - b[0]) > 1.9 and (b[3] - b[1]) > 300]
    for i, box in enumerate(tall[:4]):
        height = (200, 190, 260, 190)[i]
        # The same spike drawn point-up for the floor and point-down for the ceiling.
        save(f'spike_up_{i}', pixelate(small.crop(box), logical_h=height))
        save(f'spike_down_{i}', pixelate(small.crop(box), logical_h=height, flip=True))

    veg = find(roots['plants'], 'Vegetation')
    for name, folder, height, every in (
        ('grass2', 'Grass2', 110, 2), ('grass3', 'Grass3', 170, 2), ('grass4', 'Grass4', 150, 2),
        ('curl', 'Comp 1', 120, 2), ('leaves', 'Group Plant', 150, 3), ('bigleaf', 'Grass5', 190, 2),
    ):
        d = os.path.join(veg, folder)
        files = sorted(f for f in os.listdir(d) if f.lower().endswith('.png'))[::every]
        frames = [Image.open(os.path.join(d, f)).convert('RGBA') for f in files]
        # One crop for every frame, so the plant does not jump about as it sways.
        union = None
        for f in frames:
            b = f.getbbox()
            if b:
                union = b if union is None else (min(union[0], b[0]), min(union[1], b[1]), max(union[2], b[2]), max(union[3], b[3]))
        done = [pixelate(f.crop(union), logical_h=height, colors=22) for f in frames]
        fw, fh = done[0].size
        strip = Image.new('RGBA', (fw * len(done), fh))
        for i, f in enumerate(done):
            strip.paste(f, (i * fw, 0))
        strip.save(os.path.join(env, name + '.png'), optimize=True)
        manifest['strips'][name] = {'frameW': fw, 'frameH': fh, 'frames': len(done), 'fps': 10}

    with open(os.path.join(env, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=1)
    shutil.rmtree(tmp, ignore_errors=True)
    print('wrote', out)


if __name__ == '__main__':
    sys.exit(main())
