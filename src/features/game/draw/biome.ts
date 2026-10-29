/**
 * The places the fight happens, built from the cave and plant pictures: a coloured dark
 * backdrop, rocks and spikes far behind, the ground, the ledges, and plants that sway.
 * Everything is laid out from a fixed seed so a place always looks the same.
 */
import { ARENA } from '../config'
import type { BiomeId } from '../biomes'
import type { World } from '../types'
import { filtered } from './sprites'
import type { Sprites } from './sprites'

const { width: W, height: H, groundY } = ARENA

/** How the baked pixels map to the arena: one picture pixel is this many arena pixels. */
const PIXEL = 5

type Look = {
  sky: [string, string, string]
  /** The glow the far distance fades into. */
  fog: string
  ground: [string, string, string]
  edge: string
  /** Colour filter for the brown rocks and the olive plants, to suit the place. */
  rock: string
  plant: string
  mote: string
}

const LOOKS: Record<BiomeId, Look> = {
  cave: {
    sky: ['#0c0b12', '#191622', '#2a2230'],
    fog: '#3a2c3a',
    ground: ['#2d2730', '#231f27', '#17141a'],
    edge: '#4b4050',
    rock: 'none',
    plant: 'saturate(0.9)',
    mote: '#c9a3ff',
  },
  jungle: {
    sky: ['#0a1612', '#16302a', '#2f5a3e'],
    fog: '#3f7a4c',
    ground: ['#2b3a24', '#212d1c', '#141b12'],
    edge: '#5d8a3c',
    rock: 'hue-rotate(75deg) saturate(1.2)',
    plant: 'hue-rotate(40deg) saturate(2) brightness(1.15)',
    mote: '#f3f08a',
  },
  overgrown: {
    sky: ['#0d0a16', '#1a1a33', '#25455a'],
    fog: '#2f7a7a',
    ground: ['#262a3a', '#1d2030', '#12141f'],
    edge: '#4fb39a',
    rock: 'hue-rotate(150deg) saturate(0.9)',
    plant: 'hue-rotate(115deg) saturate(2.2) brightness(1.2)',
    mote: '#8af3e0',
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

type Prop = { name: string; x: number; y: number; scale: number; flip: boolean }
type Plant = { name: string; x: number; scale: number; offset: number }
type Layout = { far: Prop[]; mid: Prop[]; ceiling: Prop[]; back: Plant[]; front: Plant[]; motes: { x: number; y: number; phase: number; speed: number }[] }

const layouts = new Map<BiomeId, Layout>()

function layoutFor(id: BiomeId): Layout {
  let layout = layouts.get(id)
  if (layout) return layout
  const rng = seeded(id.length * 7919 + id.charCodeAt(0))
  const pick = <T,>(list: T[]) => list[Math.floor(rng() * list.length)]
  const far: Prop[] = []
  for (let x = -40; x < W + 40; x += 150 + rng() * 120) far.push({ name: pick(['rock_a', 'rock_b', 'rock_c', 'rock_d', 'rock_e']), x, y: groundY + 6, scale: 2 + Math.floor(rng() * 2), flip: rng() < 0.5 })
  const mid: Prop[] = []
  for (let x = 30; x < W; x += 210 + rng() * 160) mid.push({ name: pick(['rock_b', 'rock_c', 'rock_e']), x, y: groundY + 12, scale: 3 + Math.floor(rng() * 2), flip: rng() < 0.5 })
  const ceiling: Prop[] = []
  for (let x = -10; x < W + 20; x += 60 + rng() * 90) ceiling.push({ name: `spike_down_${Math.floor(rng() * 4)}`, x, y: -10 - rng() * 30, scale: 2 + Math.floor(rng() * 3), flip: false })
  const names = ['grass2', 'grass3', 'grass4', 'curl', 'leaves', 'bigleaf']
  const back: Plant[] = []
  for (let x = 20; x < W; x += 70 + rng() * 110) back.push({ name: pick(names), x, scale: 2 + Math.floor(rng() * 2), offset: Math.floor(rng() * 20) })
  const front: Plant[] = [
    { name: pick(names), x: 18, scale: 3, offset: 3 },
    { name: pick(names), x: 64, scale: 2, offset: 9 },
    { name: pick(names), x: W - 20, scale: 3, offset: 6 },
    { name: pick(names), x: W - 70, scale: 2, offset: 12 },
  ]
  const motes = Array.from({ length: 18 }, () => ({ x: rng() * W, y: rng() * groundY, phase: rng() * 10, speed: 4 + rng() * 8 }))
  layout = { far, mid, ceiling, back, front, motes }
  layouts.set(id, layout)
  return layout
}

/** The ground band, painted once per place into its own canvas (blocky, with a lit edge). */
const groundCache = new Map<BiomeId, HTMLCanvasElement>()

function groundFor(id: BiomeId): HTMLCanvasElement {
  let canvas = groundCache.get(id)
  if (canvas) return canvas
  const look = LOOKS[id]
  canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H - groundY
  const c = canvas.getContext('2d')
  if (c) {
    const rng = seeded(id.charCodeAt(1) * 31)
    const cell = PIXEL
    for (let y = 0; y < canvas.height; y += cell) {
      for (let x = 0; x < W; x += cell) {
        const depth = y / canvas.height
        c.fillStyle = look.ground[depth < 0.25 ? 0 : depth < 0.6 ? 1 : 2]
        c.fillRect(x, y, cell, cell)
        if (rng() < 0.12) {
          c.fillStyle = 'rgba(255,255,255,.05)'
          c.fillRect(x, y, cell, cell)
        } else if (rng() < 0.1) {
          c.fillStyle = 'rgba(0,0,0,.18)'
          c.fillRect(x, y, cell, cell)
        }
      }
    }
    // The lit top edge, ragged by a cell here and there.
    for (let x = 0; x < W; x += cell) {
      c.fillStyle = look.edge
      c.fillRect(x, 0, cell, cell)
      if (rng() < 0.35) c.fillRect(x, cell, cell, cell)
      c.fillStyle = 'rgba(0,0,0,.25)'
      c.fillRect(x, cell * 2, cell, cell)
    }
  }
  groundCache.set(id, canvas)
  return canvas
}

function prop(ctx: CanvasRenderingContext2D, sprites: Sprites, filter: string, p: Prop, shiftX: number, baseline: 'ground' | 'top') {
  const img = sprites.env[p.name]
  if (!img) return
  const source = filter === 'none' ? img : filtered(img, filter)
  const w = img.width * p.scale
  const h = img.height * p.scale
  const x = p.x + shiftX
  ctx.save()
  ctx.translate(x, baseline === 'ground' ? p.y - h : p.y)
  if (p.flip) {
    ctx.translate(w / 2, 0)
    ctx.scale(-1, 1)
    ctx.translate(-w / 2, 0)
  }
  ctx.drawImage(source, 0, 0, w, h)
  ctx.restore()
}

/** The backdrop: sky, far and near rocks and spikes, the ground, and the ledges. Everything that sits behind the fighters. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const id = w.biome
  const look = LOOKS[id]
  const layout = layoutFor(id)
  const shift = (w.player.x - W / 2) / W

  const sky = ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, look.sky[0])
  sky.addColorStop(0.6, look.sky[1])
  sky.addColorStop(1, look.sky[2])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // Far rocks sit in the fog, near ones are darker and slide faster against the player for depth.
  ctx.globalAlpha = 0.55
  for (const p of layout.far) prop(ctx, sprites, look.rock, p, -shift * 14, 'ground')
  ctx.globalAlpha = 1
  const fog = ctx.createLinearGradient(0, groundY - 220, 0, groundY)
  fog.addColorStop(0, 'rgba(0,0,0,0)')
  fog.addColorStop(1, look.fog)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = fog
  ctx.fillRect(0, groundY - 220, W, 220)
  ctx.globalAlpha = 1
  ctx.globalAlpha = 0.85
  for (const p of layout.mid) prop(ctx, sprites, look.rock, p, -shift * 30, 'ground')
  ctx.globalAlpha = 1

  // Spikes hanging from the ceiling.
  for (const p of layout.ceiling) prop(ctx, sprites, look.rock, p, -shift * 44, 'top')
  if (id !== 'cave') drawVines(ctx, id, w.time, shift)

  // The ground, and a few rocks to stand against.
  ctx.drawImage(groundFor(id), 0, groundY)

  // Ledges: the platform picture with a shadow under it.
  for (const ledge of w.platforms) {
    const img = sprites.env[ledge.sprite]
    if (!img) continue
    const width = img.width * PIXEL
    const height = img.height * PIXEL
    const left = ledge.cx - width / 2
    const top = groundY - ledge.y - 3
    ctx.fillStyle = 'rgba(0,0,0,.25)'
    ctx.fillRect(left + 24, top + height - 2, width - 48, 10)
    ctx.drawImage(look.rock === 'none' ? img : filtered(img, look.rock), left, top, width, height)
    // A lit rim along the top, so the surface you can stand on reads at a glance.
    ctx.globalAlpha = 0.6
    ctx.fillStyle = look.edge
    ctx.fillRect(left + PIXEL * 4, top + PIXEL * 0.6, width - PIXEL * 8, 3)
    ctx.globalAlpha = 1
    // Roots and moss hang off a ledge in the green places.
    if (id !== 'cave') {
      ctx.fillStyle = look.edge
      for (let i = 0; i < 6; i++) {
        const x = left + 30 + i * ((width - 60) / 5)
        ctx.fillRect(Math.round(x / PIXEL) * PIXEL, top + height - 3, PIXEL, PIXEL * (1 + ((i * 7) % 3)))
      }
    }
  }
}

/** Pixel vines hanging from the top of the screen and swaying a little. */
function drawVines(ctx: CanvasRenderingContext2D, id: BiomeId, time: number, shift: number) {
  const look = LOOKS[id]
  const rng = seeded(id.length * 101)
  ctx.fillStyle = look.edge
  for (let i = 0; i < 9; i++) {
    const x0 = rng() * W
    const length = 70 + rng() * 150
    const phase = rng() * 6
    ctx.globalAlpha = 0.75
    for (let y = 0; y < length; y += PIXEL) {
      const sway = Math.sin(time * 1.2 + phase + y * 0.03) * (y / length) * 10
      ctx.fillRect(Math.round((x0 - shift * 40 + sway) / PIXEL) * PIXEL, y, PIXEL, PIXEL)
    }
  }
  ctx.globalAlpha = 1
}

/** One frame of an animated plant strip, standing on the ground (or `base`). */
function drawPlant(ctx: CanvasRenderingContext2D, sprites: Sprites, id: BiomeId, p: Plant, time: number, base = groundY + 8) {
  const img = sprites.env[p.name]
  const strip = sprites.strips[p.name]
  if (!img || !strip) return
  const frame = (Math.floor(time * strip.fps) + p.offset) % strip.frames
  const w = strip.frameW * p.scale
  const h = strip.frameH * p.scale
  const source = filtered(img, LOOKS[id].plant)
  ctx.drawImage(source, frame * strip.frameW, 0, strip.frameW, strip.frameH, p.x - w / 2, base - h, w, h)
}

/** Plants growing behind the fighters. */
export function drawPlantsBehind(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const layout = layoutFor(w.biome)
  for (const p of layout.back) drawPlant(ctx, sprites, w.biome, p, w.time)
  // And on the ledges.
  w.platforms.forEach((ledge, i) => {
    for (let k = 0; k < 3; k++) {
      const x = ledge.cx - ledge.width / 2 + 40 + ((k * 97 + i * 53) % Math.max(60, ledge.width - 80))
      drawPlant(ctx, sprites, w.biome, { name: ['grass2', 'grass4', 'leaves'][(i + k) % 3], x, scale: 2, offset: k * 5 + i }, w.time, groundY - ledge.y + 4)
    }
  })
}

/** Plants and drifting lights in front of the fighters, at the edges, so the arena feels deep. */
export function drawForeground(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const layout = layoutFor(w.biome)
  for (const p of layout.front) drawPlant(ctx, sprites, w.biome, p, w.time, H + 6)
  ctx.fillStyle = LOOKS[w.biome].mote
  for (const m of layout.motes) {
    const x = (m.x + w.time * m.speed) % W
    const y = m.y + Math.sin(w.time * 0.8 + m.phase) * 14
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(w.time * 1.5 + m.phase)
    ctx.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, 3, 3)
  }
  ctx.globalAlpha = 1
}
