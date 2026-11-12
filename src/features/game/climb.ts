/**
 * Jump Hunter: the second way to play. No rounds, only a tower of ledges to jump up, level after
 * level, past the archers, demons and ogres that hold it, played by the Huntress with her usual moves. Ledges are solid only from above, so
 * a missed jump drops you onto a lower ledge; the run is lost when you fall all the way back to the
 * ground after having left it, and won by standing on the summit. All of it is data and rules with
 * no drawing, like `sim.ts`.
 */
import { ARENA, PLAYER } from './config'
import { ledgeLeft, ledgeRight } from './biomes'
import type { BiomeId, Platform } from './biomes'
import { HEROES } from './heroes'
import type { HeroId } from './heroes'
import type { World } from './types'

/** Jump Hunter is played by the Huntress alone. */
export const CLIMB_HERO: HeroId = 'huntress'

/** Arena pixels per metre of height shown to the player. */
export const METRE = 80

/** The melee enemies that stand guard on a ledge: demons cut, ogres slam. */
export type GuardKind = 'demon' | 'brute'

export type ClimbLevel = {
  name: string
  biome: BiomeId
  /** How many ledges the level has, how wide each is, and the gap left between one ledge and the next. */
  ledges: number
  width: number
  gap: number
  /** How far each ledge sits above the one before. A full jump reaches about 176, so the higher this is the harder the timing. */
  rise: number
  /** Every this many ledges, the step has an archer on the wall beside it (0: none). */
  sentryEvery: number
  /** Which ledges of the level (counting from 0; not the first) are guarded, and by what. Those ledges are made wide enough to fight on. */
  guards: Readonly<Record<number, GuardKind>>
}

/** The tower: six levels, each a little harder and more crowded than the one before. */
export const CLIMB_LEVELS: readonly ClimbLevel[] = [
  { name: 'The Roots', biome: 'wetlands', ledges: 6, width: 290, gap: 40, rise: 130, sentryEvery: 0, guards: { 3: 'demon' } },
  { name: 'The Hollow Stair', biome: 'hollow', ledges: 6, width: 240, gap: 80, rise: 138, sentryEvery: 3, guards: { 2: 'demon', 5: 'demon' } },
  { name: 'The Gatehouse', biome: 'abyss', ledges: 6, width: 220, gap: 92, rise: 144, sentryEvery: 2, guards: { 2: 'brute', 4: 'demon' } },
  { name: 'The Mire Heights', biome: 'wetlands', ledges: 6, width: 200, gap: 100, rise: 148, sentryEvery: 3, guards: { 1: 'demon', 3: 'brute', 5: 'demon' } },
  { name: 'The Ashen Reach', biome: 'hollow', ledges: 6, width: 180, gap: 106, rise: 150, sentryEvery: 2, guards: { 2: 'brute', 3: 'demon', 5: 'brute' } },
  { name: 'The Spire', biome: 'abyss', ledges: 6, width: 160, gap: 115, rise: 152, sentryEvery: 2, guards: { 1: 'demon', 3: 'brute', 4: 'demon', 5: 'brute' } },
]

/** How wide a ledge must be for a guard to patrol it and for the hero to have room to fight: more for the big ogre. */
const GUARD_WIDTH: Record<GuardKind, number> = { demon: 330, brute: 420 }

/** The summit is a wide ledge, so the last jump is the hard part and the landing is not. */
const SUMMIT_WIDTH = 360
const EDGE = 70
/** Small stones hugging the walls, halfway up each step. */
const WALL_STONE = 130
const STONE_WIDTH = 130
/** The ledge an archer stands on: it hugs a wall, leaving a few pixels so it does not count as a gate. */
const SENTRY_WIDTH = 170
const SENTRY_GAP = 4
/** How far in from the wall the archer stands. */
const SENTRY_INSET = 36

/** An archer on a wall ledge: it looks across the arena and shoots along a lane at chest height. */
export type Sentry = { x: number; y: number }

/** A demon or ogre on a main ledge: it patrols that ledge, from `left` to `right`, and never leaves it. */
export type Guard = { kind: GuardKind; x: number; y: number; left: number; right: number }

export type ClimbTower = {
  platforms: Platform[]
  /** The height at which each level starts (its first ledge). */
  levelStarts: number[]
  /** The height of the summit ledge, which wins the run. */
  summit: number
  /** The archers, each on one of `platforms`. */
  sentries: Sentry[]
  /** The demons and ogres, each on one of `platforms`. */
  guards: Guard[]
}

/** Whether a hero standing on `from` can jump up onto `to`: within a jump's height and across its gap. */
export function canReach(from: Platform, to: Platform): boolean {
  const rise = to.y - from.y
  if (rise <= 0 || rise > PLAYER.jumpSpeed ** 2 / (2 * PLAYER.gravity) - 15) return false
  // Airborne until it comes down to the height of `to`; the run over that time, less a margin for the speed-up.
  const airtime = (PLAYER.jumpSpeed + Math.sqrt(PLAYER.jumpSpeed ** 2 - 2 * PLAYER.gravity * rise)) / PLAYER.gravity
  const gap = Math.max(0, ledgeLeft(to) - ledgeRight(from), ledgeLeft(from) - ledgeRight(to))
  return gap <= HEROES[CLIMB_HERO].speed * airtime * 0.85
}

/** The ground, as a ledge the whole width of the arena, so the first ledges count as reachable. */
export const GROUND: Platform = { cx: ARENA.width / 2, width: ARENA.width, y: 0 }

/** Two ledges too close to stand on one another: overlapping across, and nearly at the same height. */
export const clashes = (a: Platform, b: Platform) => Math.abs(a.y - b.y) < 60 && ledgeLeft(a) < ledgeRight(b) + 20 && ledgeLeft(b) < ledgeRight(a) + 20

/**
 * Lay the ledges out. Each level has a main way up that zig-zags across the arena, one ledge above
 * the last. Around it go side ledges: the main way mirrored on the other side, and small stones on
 * the walls halfway up every step, on alternating sides. A side ledge is kept only if the hero can reach it from the ground
 * or from another ledge that is kept, so every ledge is part of some way up and none is out of reach.
 */
export function buildTower(levels: readonly ClimbLevel[] = CLIMB_LEVELS): ClimbTower {
  const main: Platform[] = []
  const candidates: Platform[] = []
  /** Which main ledges are guarded, by what. */
  const guardOf = new Map<Platform, GuardKind>()
  /** Which side ledges carry an archer, which wall they stand at, and which step they belong to (one archer per step). */
  const sentryAt = new Map<Platform, { wall: 'left' | 'right'; step: number }>()
  const levelStarts: number[] = []
  let y = 0
  let cx = ARENA.width / 2
  let dir: 1 | -1 = 1
  for (const level of levels) {
    for (let i = 0; i < level.ledges; i++) {
      y += level.rise
      if (i === 0) levelStarts.push(y)
      const guard = i > 0 ? level.guards[i] : undefined
      // A guarded ledge is wide enough to fight on; the others are as wide as the level says.
      const width = guard ? Math.max(level.width, GUARD_WIDTH[guard]) : level.width
      if (i > 0) {
        // The gap is left between the edges of the two ledges, whatever their widths.
        const before = main[main.length - 1]
        const step = before.width / 2 + level.gap + width / 2
        const room = (c: number) => c + width / 2 <= ARENA.width - EDGE && c - width / 2 >= EDGE
        cx = before.cx + dir * step
        // Turn round at a wall, and step back the way we came.
        if (!room(cx)) {
          dir = dir === 1 ? -1 : 1
          cx = before.cx + dir * step
        }
        cx = Math.min(ARENA.width - EDGE - width / 2, Math.max(EDGE + width / 2, cx))
      }
      const ledge: Platform = { cx, width, y }
      main.push(ledge)
      if (guard) guardOf.set(ledge, guard)
      candidates.push({ cx: ARENA.width - cx, width: Math.round(width * 0.85), y })
      // One stone per step, on alternating walls, so neither wall becomes a ladder to the top.
      const wall = main.length % 2 ? 'left' : 'right'
      if (level.sentryEvery > 0 && i > 0 && i % level.sentryEvery === 0) {
        // This step's wall ledge is an archer's post instead of a stone: on whichever wall the hero can reach it from.
        for (const side of [wall, wall === 'left' ? 'right' : 'left'] as const) {
          const post = { cx: side === 'left' ? SENTRY_GAP + SENTRY_WIDTH / 2 : ARENA.width - SENTRY_GAP - SENTRY_WIDTH / 2, width: SENTRY_WIDTH, y: y - level.rise / 2 }
          candidates.push(post)
          sentryAt.set(post, { wall: side, step: main.length })
        }
      } else {
        candidates.push({ cx: wall === 'left' ? WALL_STONE : ARENA.width - WALL_STONE, width: STONE_WIDTH, y: y - level.rise / 2 })
      }
    }
  }
  const last = levels[levels.length - 1]
  y += last.rise
  // Towards the middle of the arena, so there is room for it and a real gap to jump across.
  const toward = cx < ARENA.width / 2 ? 1 : -1
  const before = main[main.length - 1]
  const summitCx = Math.min(ARENA.width - EDGE - SUMMIT_WIDTH / 2, Math.max(EDGE + SUMMIT_WIDTH / 2, cx + toward * (before.width / 2 + last.gap + SUMMIT_WIDTH / 2)))
  const summit: Platform = { cx: summitCx, width: SUMMIT_WIDTH, y }

  // Keep a side ledge once something kept leads to it; repeat, since one can lead to the next.
  const kept: Platform[] = [...main, summit]
  const extras: Platform[] = []
  let grew = true
  while (grew) {
    grew = false
    for (const c of candidates) {
      if (extras.includes(c) || kept.some((k) => clashes(k, c)) || extras.some((k) => clashes(k, c))) continue
      const post = sentryAt.get(c)
      if (post && extras.some((k) => sentryAt.get(k)?.step === post.step)) continue
      if ([GROUND, ...kept, ...extras].some((from) => canReach(from, c))) {
        extras.push(c)
        grew = true
      }
    }
  }
  extras.sort((a, b) => a.y - b.y)
  const sentries: Sentry[] = []
  for (const [post, { wall }] of sentryAt) {
    if (extras.includes(post)) sentries.push({ x: wall === 'left' ? SENTRY_GAP + SENTRY_INSET : ARENA.width - SENTRY_GAP - SENTRY_INSET, y: post.y })
  }
  const guards: Guard[] = []
  for (const [ledge, kind] of guardOf) guards.push({ kind, x: ledge.cx, y: ledge.y, left: ledgeLeft(ledge), right: ledgeRight(ledge) })
  // The summit stays last: the run is won on `platforms[platforms.length - 1]`.
  return { platforms: [...main, ...extras, summit], levelStarts, summit: y, sentries, guards }
}

export const TOWER = buildTower()

export type ClimbState = {
  /** Has left the ground at least once; before that, standing on it is where the run begins. */
  started: boolean
  /** The highest surface stood on, in arena pixels. */
  best: number
  /** Index into `CLIMB_LEVELS` of the level the hero has climbed to. */
  level: number
  won: boolean
}

export const newClimbState = (): ClimbState => ({ started: false, best: 0, level: 0, won: false })

/** The level a height belongs to. Below the first ledge counts as the first level. */
export function levelAt(height: number, tower: ClimbTower = TOWER): number {
  let level = 0
  tower.levelStarts.forEach((start, i) => {
    if (height >= start) level = i
  })
  return level
}

/** How many metres a height is. */
export const metres = (height: number) => Math.floor(height / METRE)

/** Track the climb: the best height reached, the level, a fall to the ground, the summit. */
export function stepClimb(w: World) {
  const c = w.climb
  const p = w.player
  if (w.over) return
  if (p.grounded) {
    if (p.y > 0) {
      c.started = true
      if (p.y > c.best) c.best = p.y
    } else if (c.started) {
      // Back on the ground after having been up: the run is over.
      p.state = 'dead'
      p.stateTime = 0
      p.hp = 0
      p.vx = 0
      w.over = true
      w.shake = Math.max(w.shake, 8)
      w.floaters.push({ x: p.x, y: p.y + p.height + 10, text: 'FELL!', color: '#ff6b6b', size: 30, life: 0.95, maxLife: 0.95 })
      w.score = metres(c.best)
      return
    }
    if (p.y >= TOWER.summit - 0.5) {
      c.won = true
      w.over = true
      w.floaters.push({ x: p.x, y: p.y + p.height + 10, text: 'SUMMIT!', color: '#ffd27a', size: 34, life: 1.4, maxLife: 1.4 })
    }
  }
  c.level = levelAt(c.best)
  w.biome = CLIMB_LEVELS[c.level].biome
  w.score = metres(c.best)
}

/**
 * The camera only moves when the hero leaves a band of the view, so a jump does not bob the screen:
 * it follows up when they climb out of the top of it, and down when they fall out of the bottom.
 */
const BAND = { low: 70, high: 340 }

export function climbCamera(w: World, dt: number) {
  const rel = w.player.y - w.camY
  let target = w.camY
  if (rel > BAND.high) target = w.player.y - BAND.high
  else if (rel < BAND.low) target = w.player.y - BAND.low
  target = Math.max(0, target)
  w.camY += (target - w.camY) * Math.min(1, dt * 8)
}
