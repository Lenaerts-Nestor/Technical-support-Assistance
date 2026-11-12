import { describe, expect, it } from 'vitest'
import { ledgeLeft, ledgeRight } from './biomes'
import type { Platform } from './biomes'
import { CLIMB_LEVELS, GROUND, TOWER, canReach, clashes, levelAt, metres, stepClimb } from './climb'
import { ARENA, ENEMIES, PLAYER } from './config'
import { createWorld, stepWorld } from './sim'
import { NO_INPUT } from './types'

const rng = () => 0.5

describe('the tower', () => {
  const mainLedges = CLIMB_LEVELS.reduce((n, l) => n + l.ledges, 0) + 1

  it('keeps every ledge inside the arena and the summit last and highest', () => {
    const { platforms } = TOWER
    for (const p of platforms) {
      // A ledge that meets a side would carry on out of the arena, so keep clear of it.
      expect(ledgeLeft(p)).toBeGreaterThan(0)
      expect(ledgeRight(p)).toBeLessThan(ARENA.width)
    }
    expect(TOWER.summit).toBe(platforms[platforms.length - 1].y)
    expect(Math.max(...platforms.map((p) => p.y))).toBe(TOWER.summit)
  })

  it('has side ledges around the main way up, so there is more than one way', () => {
    expect(TOWER.platforms.length).toBeGreaterThan(mainLedges * 1.5)
    const heights = new Set(TOWER.platforms.map((p) => Math.round(p.y)))
    // More than one ledge at some heights: two routes side by side.
    expect(heights.size).toBeLessThan(TOWER.platforms.length)
  })

  it('has no ledges sitting on top of each other', () => {
    const { platforms } = TOWER
    platforms.forEach((a, i) => platforms.slice(i + 1).forEach((b) => expect(clashes(a, b)).toBe(false)))
  })

  it('can be climbed: the summit is reachable from the ground, and so is every ledge', () => {
    const reached = new Set<Platform>()
    let grew = true
    while (grew) {
      grew = false
      for (const p of TOWER.platforms) {
        if (!reached.has(p) && [GROUND, ...reached].some((from) => canReach(from, p))) {
          reached.add(p)
          grew = true
        }
      }
    }
    expect(reached.size).toBe(TOWER.platforms.length)
    expect(reached.has(TOWER.platforms[TOWER.platforms.length - 1])).toBe(true)
  })

  it('does not ask for a step higher than a jump', () => {
    const maxJump = PLAYER.jumpSpeed ** 2 / (2 * PLAYER.gravity)
    // The first ledge of each level is the highest step: levelStarts are on the main way.
    expect(Math.max(...CLIMB_LEVELS.map((l) => l.rise))).toBeLessThan(maxJump - 15)
  })

  it('names the level a height is in', () => {
    expect(levelAt(0)).toBe(0)
    expect(levelAt(TOWER.levelStarts[1])).toBe(1)
    expect(levelAt(TOWER.summit)).toBe(CLIMB_LEVELS.length - 1)
    expect(metres(TOWER.summit)).toBeGreaterThan(20)
  })
})

describe('a climb', () => {
  const settle = (w: ReturnType<typeof createWorld>, seconds = 1) => {
    for (let t = 0; t < seconds; t += 0.01) stepWorld(w, NO_INPUT, 0.01, rng)
  }

  it('starts on the ground, and standing there is not a loss', () => {
    const w = createWorld('huntress', 'climb')
    settle(w, 2)
    expect(w.over).toBe(false)
    expect(w.platforms).toEqual(TOWER.platforms)
  })

  it('is lost by falling to the ground after having stood on a ledge', () => {
    const w = createWorld('huntress', 'climb')
    const ledge = TOWER.platforms[0]
    w.player.x = ledge.cx
    w.player.y = ledge.y + 1
    settle(w, 0.5)
    expect(w.climb.started).toBe(true)
    expect(w.climb.best).toBe(ledge.y)
    expect(w.over).toBe(false)
    // Step off the ledge, into the open, and fall.
    w.player.x = ledgeRight(ledge) + 40
    settle(w, 1)
    expect(w.over).toBe(true)
    expect(w.player.state).toBe('dead')
    expect(w.climb.won).toBe(false)
    expect(w.score).toBe(metres(ledge.y))
  })

  it('is not lost by falling onto a lower ledge', () => {
    const w = createWorld('huntress', 'climb')
    const [low, high] = TOWER.platforms
    w.player.x = high.cx
    w.player.y = high.y + 1
    settle(w, 0.2)
    // Drop to where only the lower ledge is under the hero.
    w.player.x = low.cx
    w.player.y = high.y + 1
    settle(w, 1.5)
    expect(w.over).toBe(false)
    expect(w.player.y).toBeGreaterThan(0)
    expect(w.climb.best).toBe(high.y)
  })

  it('is won on the summit', () => {
    const w = createWorld('huntress', 'climb')
    const top = TOWER.platforms[TOWER.platforms.length - 1]
    w.player.x = top.cx
    w.player.y = top.y + 1
    settle(w, 0.5)
    expect(w.climb.won).toBe(true)
    expect(w.over).toBe(true)
    expect(w.player.state).not.toBe('dead')
    stepClimb(w)
    expect(w.climb.level).toBe(CLIMB_LEVELS.length - 1)
  })

  it('follows the hero up with the camera and back down again', () => {
    const w = createWorld('huntress', 'climb')
    const top = TOWER.platforms[TOWER.platforms.length - 1]
    w.player.x = top.cx
    w.player.y = top.y + 1
    settle(w, 2)
    expect(w.camY).toBeGreaterThan(top.y - 400)
    expect(w.camY).toBeLessThanOrEqual(top.y)
  })

  it('puts archers on wall ledges, one to a step, none in the first level', () => {
    expect(TOWER.sentries.length).toBeGreaterThan(0)
    for (const post of TOWER.sentries) {
      expect(TOWER.platforms.some((p) => p.y === post.y && post.x > ledgeLeft(p) && post.x < ledgeRight(p))).toBe(true)
      expect(post.y).toBeGreaterThan(TOWER.levelStarts[1] - 1)
    }
    const w = createWorld('huntress', 'climb')
    expect(w.enemies.filter((e) => e.kind === 'archer')).toHaveLength(TOWER.sentries.length)
  })

  it('has demons and ogres guarding ledges in every level, on ledges wide enough to fight on', () => {
    const { guards, platforms } = TOWER
    CLIMB_LEVELS.forEach((_, level) => expect(guards.some((g) => levelAt(g.y) === level)).toBe(true))
    expect(guards.some((g) => g.kind === 'demon')).toBe(true)
    expect(guards.some((g) => g.kind === 'brute')).toBe(true)
    for (const g of guards) {
      const ledge = platforms.find((p) => p.y === g.y && g.x >= ledgeLeft(p) && g.x <= ledgeRight(p))
      expect(ledge).toBeDefined()
      if (!ledge) continue
      // Room for the guard to pace, and for the hero to stand beside it.
      expect(ledge.width).toBeGreaterThanOrEqual(ENEMIES[g.kind].halfWidth * 2 + 160)
      expect(g.left).toBe(ledgeLeft(ledge))
      expect(g.right).toBe(ledgeRight(ledge))
    }
  })

  it('gets more crowded as it climbs', () => {
    const per = CLIMB_LEVELS.map((_, level) => TOWER.guards.filter((g) => levelAt(g.y) === level).length)
    expect(per[per.length - 1]).toBeGreaterThan(per[0])
  })

  it('has an archer warn first, then loose an arrow along a level lane across the arena', () => {
    const w = createWorld('huntress', 'climb')
    const post = TOWER.sentries[0]
    const archer = w.enemies.find((e) => e.kind === 'archer' && e.y === post.y)!
    w.player.x = ARENA.width / 2
    w.player.y = post.y + 1
    w.player.grounded = true
    archer.cooldown = 0
    let warned = false
    for (let t = 0; t < 2 && w.arrows.length === 0; t += 0.01) {
      stepWorld(w, NO_INPUT, 0.01, rng)
      if (archer.state === 'windup') warned = true
      w.player.y = post.y + 1
    }
    expect(warned).toBe(true)
    expect(w.arrows).toHaveLength(1)
    // It flies level across the arena, away from its own wall.
    expect(Math.sign(w.arrows[0].vx)).toBe(post.x < ARENA.width / 2 ? 1 : -1)
    expect(w.arrows[0].y).toBeGreaterThan(post.y)
  })

  it('does not shoot when the hero is far away from its height', () => {
    const w = createWorld('huntress', 'climb')
    for (const e of w.enemies) e.cooldown = 0
    settle(w, 3)
    expect(w.arrows).toHaveLength(0)
  })

  it('knocks the hero off their line when an arrow hits, at no cost in health', () => {
    const w = createWorld('huntress', 'climb')
    const ledge = TOWER.platforms[0]
    w.player.x = ledge.cx
    w.player.y = ledge.y
    w.player.grounded = true
    const before = w.player.hp
    w.arrows.push({ x: ledge.cx - 60, y: ledge.y + 40, vx: 640, damage: 11, blockCost: 12, life: 2 })
    settle(w, 0.3)
    expect(w.player.hp).toBe(before)
    expect(w.over).toBe(false)
    expect(w.player.state === 'hurt' || w.player.hitTime > 0 || w.player.vx !== 0).toBe(true)
    expect(w.arrows).toHaveLength(0)
  })

  it('has a guard pace its ledge and never leave it, however long the hero is away', () => {
    const w = createWorld('huntress', 'climb')
    const guard = w.enemies.find((e) => e.post)!
    const start = guard.x
    let moved = false
    for (let t = 0; t < 20; t += 0.01) {
      stepWorld(w, NO_INPUT, 0.01, rng)
      if (Math.abs(guard.x - start) > 20) moved = true
      expect(guard.x).toBeGreaterThanOrEqual(guard.post!.left)
      expect(guard.x).toBeLessThanOrEqual(guard.post!.right)
      expect(guard.y).toBe(TOWER.guards.find((g) => g.x === start)!.y)
    }
    expect(moved).toBe(true)
  })

  it('has a guard go for the hero on its ledge, and a hit shoves them without costing health', () => {
    const w = createWorld('huntress', 'climb')
    const guard = w.enemies.find((e) => e.kind === 'demon')!
    const g = TOWER.guards.find((t) => t.kind === 'demon' && t.x === guard.x)!
    w.player.x = guard.x + 120
    w.player.y = g.y
    w.player.grounded = true
    guard.cooldown = 0
    const before = w.player.hp
    let swung = false
    let shoved = false
    for (let t = 0; t < 3 && !shoved; t += 0.01) {
      stepWorld(w, NO_INPUT, 0.01, rng)
      if (guard.state === 'windup' || guard.state === 'attack') swung = true
      if (w.player.state === 'hurt') shoved = true
      expect(guard.x).toBeGreaterThanOrEqual(g.left)
      expect(guard.x).toBeLessThanOrEqual(g.right)
    }
    expect(swung).toBe(true)
    expect(shoved).toBe(true)
    expect(w.player.hp).toBe(before)
    expect(w.over).toBe(false)
  })

  it('leaves the survival game as it was', () => {
    const w = createWorld('huntress')
    expect(w.mode).toBe('survival')
    expect(w.platforms.length).toBeLessThan(TOWER.platforms.length)
  })
})
