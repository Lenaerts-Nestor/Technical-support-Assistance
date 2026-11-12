/**
 * The places the fight happens, in the dark, muted style of the SHADOW Series: a misty sky, the
 * Grassland pack's ridges, hills and reeds drawn as layered silhouettes that slide past at
 * different speeds, the ground and ledges built from the SHADOW tile map, and an Abyssal Gate on
 * each side where enemies come through. Everything is laid out from a fixed seed so a place
 * always looks the same.
 */
import { ARENA, CAMERA } from '../config'
import { entrances, ledgeLeft } from '../biomes'
import type { BiomeId } from '../biomes'
import type { World } from '../types'
import { filtered, silhouette } from './sprites'
import type { EnvName, Sprites } from './sprites'

const { width: W, height: H, groundY } = ARENA

/** One pixel of the tile map is this many arena pixels. */
const TILE = 2

type Look = {
  sky: [string, string, string]
  /** The silhouettes, far to near. */
  layers: [string, string, string, string]
  mist: string
  ground: string
  /** A colour filter for the tile pieces, to suit the place. */
  tiles: string
  grass: string
  mote: string
  /** The glow inside the gates, and a filter for their mossy stone. */
  portal: string
  gate: string
}

const LOOKS: Record<BiomeId, Look> = {
  wetlands: {
    sky: ['#262b25', '#363d34', '#4a5446'],
    layers: ['#3a4238', '#2e352c', '#232921', '#191d17'],
    mist: '#6b7766',
    ground: '#151413',
    tiles: 'saturate(0.5) brightness(0.92)',
    grass: '#1f2b1d',
    mote: '#d6efb8',
    portal: '#9ff0c8',
    gate: 'none',
  },
  hollow: {
    sky: ['#161b24', '#252c38', '#38414f'],
    layers: ['#2c3340', '#232934', '#1b2029', '#13161d'],
    mist: '#5d6a80',
    ground: '#121317',
    tiles: 'hue-rotate(170deg) saturate(0.5) brightness(1.05)',
    grass: '#1d2632',
    mote: '#bcd6ff',
    portal: '#a9c8ff',
    gate: 'saturate(0.35) brightness(0.85)',
  },
  abyss: {
    sky: ['#120b18', '#20152c', '#33243f'],
    layers: ['#2b1f38', '#22182d', '#1a1223', '#120c19'],
    mist: '#6a4f86',
    ground: '#110c14',
    tiles: 'hue-rotate(250deg) saturate(1.3)',
    grass: '#2a1c38',
    mote: '#9ff0ff',
    portal: '#c49bff',
    gate: 'hue-rotate(140deg) saturate(0.8) brightness(0.9)',
  },
}

/** A small deterministic random sequence, so the scenery sits in the same place every time. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

type Tuft = { name: EnvName; x: number; scale: number; flip: boolean }
type Layout = { trees: { x: number; scale: number }[]; clouds: { name: EnvName; x: number; y: number; speed: number }[]; tufts: Tuft[]; motes: { x: number; y: number; phase: number; speed: number }[] }

const layouts = new Map<BiomeId, Layout>()

function layoutFor(id: BiomeId): Layout {
  let layout = layouts.get(id)
  if (layout) return layout
  const rng = seeded(id.length * 7919 + id.charCodeAt(0) * 31)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rng() * list.length)]
  const trees = Array.from({ length: 6 }, (_, i) => ({ x: (i + rng() * 0.7) * (W / 5) - 80, scale: 2 + rng() * 1.2 }))
  const clouds = Array.from({ length: 7 }, () => ({ name: pick(['cloud_1', 'cloud_2', 'cloud_3'] as const), x: rng() * W, y: 40 + rng() * 180, speed: 4 + rng() * 8 }))
  const tufts: Tuft[] = []
  for (let x = 10; x < W; x += 30 + rng() * 70) tufts.push({ name: pick(['tall_grass_1', 'tall_grass_2', 'bush', 'tall_grass_1', 'stone_3'] as const), x, scale: 3, flip: rng() < 0.5 })
  const motes = Array.from({ length: 26 }, () => ({ x: rng() * W, y: rng() * (groundY + CAMERA.maxRise), phase: rng() * 10, speed: 4 + rng() * 10 }))
  layout = { trees, clouds, tufts, motes }
  layouts.set(id, layout)
  return layout
}

/** A picture repeated across the view, standing on `bottom`, with the area below filled in its colour. */
function band(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, scale: number, bottom: number, offset: number, fill: string) {
  const w = img.width * scale
  const h = img.height * scale
  const start = -(((offset % w) + w) % w)
  for (let x = start; x < W; x += w) ctx.drawImage(img, Math.round(x), Math.round(bottom - h), Math.ceil(w) + 1, Math.ceil(h))
  ctx.fillStyle = fill
  ctx.fillRect(0, Math.round(bottom) - 1, W, H - bottom + 2)
}

/**
 * The sky and the silhouettes behind the arena, in screen space: they rise more slowly than the
 * world when the camera climbs, and slide a little against the hero's movement, for depth.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const look = LOOKS[w.biome]
  const layout = layoutFor(w.biome)
  const shift = w.player.x - W / 2
  const cam = w.camY

  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, look.sky[0])
  sky.addColorStop(0.55, look.sky[1])
  sky.addColorStop(1, look.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Mist drifting high up.
  ctx.globalAlpha = 0.18
  for (const c of layout.clouds) {
    const img = sprites.env[c.name]
    const x = ((c.x + w.time * c.speed - shift * 0.03) % (W + 300)) - 150
    ctx.drawImage(silhouette(img, look.mist), x, c.y + cam * 0.1, img.width * 4, img.height * 4)
  }
  ctx.globalAlpha = 1

  const env = sprites.env
  band(ctx, silhouette(env.bg_ridge, look.layers[0]), 3, groundY - 70 + cam * 0.3, shift * 0.05, look.layers[0])
  band(ctx, silhouette(env.bg_hills, look.layers[1]), 3, groundY - 30 + cam * 0.45, shift * 0.1 + 200, look.layers[1])
  // Dead trees on the far bank.
  for (const t of layout.trees) {
    const img = silhouette(env.tree, look.layers[2])
    const tw = img.width * t.scale
    const th = img.height * t.scale
    ctx.drawImage(img, Math.round(t.x - shift * 0.15), Math.round(groundY - 10 + cam * 0.6 - th), tw, th)
  }
  band(ctx, silhouette(env.bg_meadow, look.layers[2]), 3, groundY + 10 + cam * 0.6, shift * 0.15 + 90, look.layers[2])
  band(ctx, silhouette(env.bg_reeds, look.layers[3]), 2.5, groundY + 34 + cam * 0.8, shift * 0.22 + 40, look.layers[3])

  // A veil of mist low down, so the far layers fade into it.
  const veil = ctx.createLinearGradient(0, groundY - 220 + cam * 0.5, 0, groundY + cam * 0.6)
  veil.addColorStop(0, 'rgba(0,0,0,0)')
  veil.addColorStop(1, look.mist)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = veil
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 1
}

/** A tile piece in the colours of the place. */
const tile = (sprites: Sprites, name: EnvName, look: Look) => (look.tiles === 'none' ? sprites.env[name] : filtered(sprites.env[name], look.tiles))

/** An Abyssal Gate at a side of the arena, standing on `floor`, glowing while the round is on. */
function drawGate(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites, side: -1 | 1, floor: number, scale: number) {
  const look = LOOKS[w.biome]
  const img = sprites.env.gate
  const gw = img.width * scale
  const gh = img.height * scale
  const cx = side < 0 ? 18 : W - 18
  const bottom = groundY - floor + 8
  // The dark mouth of the arch, lit from within.
  const glow = ctx.createRadialGradient(cx, bottom - gh * 0.25, 2, cx, bottom - gh * 0.25, gh * 0.55)
  const pulse = 0.35 + 0.15 * Math.sin(w.time * 2.4 + side)
  glow.addColorStop(0, look.portal)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.translate(cx, 0)
  ctx.scale(side < 0 ? 1 : -1, 1)
  ctx.drawImage(look.gate === 'none' ? img : filtered(img, look.gate), -gw / 2, bottom - gh, gw, gh)
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = pulse
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.fillRect(cx - gh, bottom - gh, gh * 2, gh)
  ctx.restore()
}

/** Grass and stones on a surface: silhouettes in the place's colour. */
function drawTufts(ctx: CanvasRenderingContext2D, sprites: Sprites, look: Look, tufts: readonly Tuft[], from: number, to: number, surface: number) {
  for (const t of tufts) {
    if (t.x < from || t.x > to) continue
    const img = silhouette(sprites.env[t.name], look.grass)
    const w = img.width * t.scale
    const h = img.height * t.scale
    ctx.save()
    ctx.translate(t.x, surface + 3)
    if (t.flip) ctx.scale(-1, 1)
    ctx.drawImage(img, -w / 2, -h, w, h)
    ctx.restore()
  }
}

/** The arena itself, in world space: the ground, the gates and the ledges. */
export function drawArena(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const look = LOOKS[w.biome]
  const layout = layoutFor(w.biome)

  // Gates on the ground and wherever a ledge meets a side.
  const ways = entrances(w.platforms)
  for (const y of ways.left) drawGate(ctx, w, sprites, -1, y, y === 0 ? 1.6 : 0.9)
  for (const y of ways.right) drawGate(ctx, w, sprites, 1, y, y === 0 ? 1.6 : 0.9)

  // The ground: earth below, a ragged edge of tile slabs along the top.
  ctx.fillStyle = look.ground
  ctx.fillRect(0, groundY + 10, W, H + CAMERA.maxRise)
  const slab = tile(sprites, 'slab', look)
  const sw = slab.width * TILE
  const sh = slab.height * TILE
  for (let i = 0, x = -60; x < W + 60; i++, x += sw - 34) {
    ctx.save()
    ctx.translate(x + sw / 2, groundY - 6)
    if (i % 2) ctx.scale(-1, 1)
    ctx.drawImage(slab, -sw / 2, 0, sw, sh)
    ctx.restore()
  }
  drawTufts(ctx, sprites, look, layout.tufts, 0, W, groundY)

  // Ledges: the long thin tile piece, repeated along the ledge, its drips hanging below.
  const piece = tile(sprites, 'ledge', look)
  const pw = piece.width * TILE
  const ph = piece.height * TILE
  w.platforms.forEach((ledge, i) => {
    const left = ledgeLeft(ledge) - 8
    const width = ledge.width + 16
    const n = Math.max(1, Math.ceil((width - 20) / (pw - 30)))
    const step = n > 1 ? (width - pw) / (n - 1) : 0
    const top = groundY - ledge.y - 4
    ctx.fillStyle = 'rgba(0,0,0,.28)'
    ctx.fillRect(left + 20, top + ph, width - 40, 8)
    for (let k = 0; k < n; k++) {
      const x = n > 1 ? left + k * step : left + (width - pw) / 2
      ctx.save()
      ctx.translate(x + pw / 2, top)
      if ((k + i) % 2) ctx.scale(-1, 1)
      ctx.drawImage(piece, -pw / 2, 0, pw, ph)
      ctx.restore()
    }
    drawTufts(ctx, sprites, look, layout.tufts.map((t) => ({ ...t, x: t.x * 0.37 + i * 113 })), ledgeLeft(ledge) + 12, ledgeLeft(ledge) + ledge.width - 12, groundY - ledge.y)
  })
}

/** Drifting lights in front of everything, so the arena feels deep. */
export function drawForeground(ctx: CanvasRenderingContext2D, w: World) {
  const layout = layoutFor(w.biome)
  ctx.fillStyle = LOOKS[w.biome].mote
  for (const m of layout.motes) {
    const x = (m.x + w.time * m.speed) % W
    // In the tower the camera climbs far above the arena the motes were laid out for, so they hang in the view and slip down past it.
    const home = w.mode === 'climb' ? ((m.y * 0.9 + w.camY * 0.3) % H) - w.camY : groundY - m.y
    const y = home + Math.sin(w.time * 0.8 + m.phase) * 14
    ctx.globalAlpha = 0.2 + 0.2 * Math.sin(w.time * 1.5 + m.phase)
    ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, 3)
  }
  ctx.globalAlpha = 1
}
