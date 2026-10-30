import { describe, expect, it } from 'vitest'
import { BIOMES, tierOf } from './biomes'
import { ELITE, ENEMIES, ROUNDS } from './config'
import { OBJECTIVE, createObjective, objectiveKindFor, objectiveProgress, shardsFor } from './objectives'
import { eliteChance } from './pacing'
import { pickKind } from './rounds'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { NO_INPUT } from './types'
import type { FrameInput, World } from './types'

const DT = 1 / 120
const rng = () => 0.9

function rngFrom(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

const run = (w: World, seconds: number, input: Partial<FrameInput> = {}, random = rng) => {
  for (let t = 0; t < seconds; t += DT) stepWorld(w, { ...NO_INPUT, ...input }, DT, random)
}

/** A world in round `round`, with that round's objective and no spawner. */
function roundWorld(round: number, seed = 1): World {
  const w = createWorld('huntress')
  w.round = round
  w.spawnTimer = 1e9
  w.objective = createObjective(round, w.platforms, rngFrom(seed))
  return w
}

/** Put the hero on a surface: stood on height `y` at `x`. */
const standAt = (w: World, x: number, y: number) => {
  w.player.x = x
  w.player.y = y
  w.player.vy = 0
  w.player.grounded = true
}

describe('round objectives', () => {
  it('cycle slay, shards, shrines and shards, with the boss every fifth round', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(objectiveKindFor)).toEqual(['slay', 'shards', 'shrines', 'shards', 'boss', 'slay', 'shards', 'shrines', 'shards', 'boss'])
  })

  it('scatter shards over every tier of ledges, and more of them in later rounds', () => {
    for (const biome of Object.values(BIOMES)) {
      for (let seed = 1; seed < 20; seed++) {
        const o = createObjective(2, biome.platforms, rngFrom(seed))
        expect(o.shards).toHaveLength(shardsFor(2))
        expect(new Set(o.shards.map((s) => tierOf(s.y)))).toEqual(new Set([1, 2, 3]))
        for (const s of o.shards) expect(biome.platforms.some((p) => p.y === s.y && Math.abs(s.x - p.cx) <= p.width / 2)).toBe(true)
      }
    }
    expect(shardsFor(12)).toBeGreaterThan(shardsFor(2))
  })

  it('take a shard when the hero touches it, for score and a little health', () => {
    const w = roundWorld(2)
    w.player.hp = 50
    const shard = w.objective.shards[0]
    standAt(w, shard.x - 200, shard.y)
    run(w, 0.1)
    expect(shard.taken).toBe(false)
    standAt(w, shard.x, shard.y)
    run(w, 0.05)
    expect(shard.taken).toBe(true)
    expect(w.score).toBe(OBJECTIVE.shardScore)
    expect(w.player.hp).toBe(50 + OBJECTIVE.shardHeal)
    expect(objectiveProgress(w.objective)).toEqual({ done: 1, needed: w.objective.shards.length })
  })

  it('win the round once every shard is taken, sending what is left of the enemies away', () => {
    const w = roundWorld(2)
    const demon = spawnEnemy(w, 'demon', 100)
    demon.cooldown = 1e9
    for (const shard of w.objective.shards.slice(1)) shard.taken = true
    run(w, 0.2)
    expect(w.stage).toBe('fight')
    const last = w.objective.shards[0]
    standAt(w, last.x, last.y)
    run(w, 0.05)
    expect(w.stage).toBe('cleared')
    expect(demon.state).toBe('dying')
    expect(w.kills).toBe(0)
  })

  it('light a shrine while the hero stands by it, and let it cool when they leave', () => {
    const w = roundWorld(3)
    expect(w.objective.kind).toBe('shrines')
    const shrine = w.objective.shrines[0]
    standAt(w, shrine.x, shrine.y)
    run(w, OBJECTIVE.shrineTime / 2)
    expect(shrine.charge).toBeGreaterThan(0.4)
    expect(shrine.lit).toBe(false)
    const half = shrine.charge
    // Off the ledge and away: it cools.
    standAt(w, shrine.x + 400, 0)
    w.platforms = []
    run(w, 1)
    expect(shrine.charge).toBeLessThan(half)
    w.platforms = [...BIOMES.wetlands.platforms]
    standAt(w, shrine.x, shrine.y)
    run(w, OBJECTIVE.shrineTime)
    expect(shrine.lit).toBe(true)
    expect(w.score).toBeGreaterThanOrEqual(OBJECTIVE.shrineScore)
  })

  it('keep sending enemies while the shards are out, never more than the round allows', () => {
    const w = createWorld('huntress')
    w.round = 2
    w.objective = createObjective(2, w.platforms, rngFrom(3))
    const random = rngFrom(7)
    let peak = 0
    let arrivals = 0
    const seen = new Set<number>()
    for (let t = 0; t < 60; t += DT) {
      stepWorld(w, NO_INPUT, DT, random)
      w.player.invuln = 1
      for (const e of w.enemies) {
        if (!seen.has(e.id)) arrivals++
        seen.add(e.id)
        // Kill every arrival after a moment, as a player would.
        if (e.state !== 'dying' && e.x > 100 && e.x < 1180) {
          e.state = 'dying'
          e.stateTime = 0
        }
      }
      peak = Math.max(peak, w.enemies.filter((e) => e.state !== 'dying').length)
    }
    expect(w.stage).toBe('fight')
    expect(arrivals).toBeGreaterThan(10)
    expect(peak).toBeLessThanOrEqual(3)
  })
})

describe('the mix of enemies', () => {
  it('favours a kind that is not on screen yet', () => {
    const w = createWorld('huntress')
    w.round = 4
    w.objective = createObjective(4, w.platforms, rng)
    spawnEnemy(w, 'demon', 100)
    spawnEnemy(w, 'demon', 200)
    const counts: Record<string, number> = {}
    const random = rngFrom(11)
    for (let i = 0; i < 2000; i++) {
      const kind = pickKind(w, random) ?? 'none'
      counts[kind] = (counts[kind] ?? 0) + 1
    }
    expect(counts.demon ?? 0).toBe(0)
    expect(counts.lancer).toBeGreaterThan(0)
    expect(counts.archer).toBeGreaterThan(0)
    expect(counts.brute).toBeGreaterThan(0)
  })

  it('brings enemies in on the ledges at the sides as well as on the ground', () => {
    const w = createWorld('huntress')
    w.round = 3
    w.objective = createObjective(3, w.platforms, rng)
    const heights = new Set<number>()
    const random = rngFrom(5)
    for (let t = 0; t < 120; t += DT) {
      stepWorld(w, NO_INPUT, DT, random)
      w.player.invuln = 1
      for (const e of w.enemies) {
        if (e.stateTime < DT * 1.5 && e.state === 'walk') heights.add(e.y)
        if (e.state !== 'dying' && e.stateTime > 1) {
          e.state = 'dying'
          e.stateTime = 0
        }
      }
    }
    expect(heights.has(0)).toBe(true)
    expect([...heights].some((y) => y > 0)).toBe(true)
  })

  it('walks an enemy in along a ledge that meets the side, without it falling off', () => {
    const w = createWorld('huntress')
    w.spawnTimer = 1e9
    const ledge = w.platforms.find((p) => p.cx - p.width / 2 <= 0)!
    const imp = spawnEnemy(w, 'imp', -60, undefined, { y: ledge.y })
    imp.cooldown = 1e9
    w.player.x = 200
    w.player.y = ledge.y
    run(w, 1)
    expect(imp.x).toBeGreaterThan(20)
    expect(imp.y).toBe(ledge.y)
  })

  it('sends elites from round six on: tougher, harder-hitting and worth more', () => {
    expect(eliteChance(ROUNDS.eliteFromRound - 1)).toBe(0)
    expect(eliteChance(ROUNDS.eliteFromRound)).toBeGreaterThan(0)
    const w = createWorld('huntress')
    const plain = spawnEnemy(w, 'demon', 100)
    const elite = spawnEnemy(w, 'demon', 200, undefined, { elite: true })
    expect(elite.maxHp).toBe(Math.round(plain.maxHp * ELITE.hp))
    expect(elite.power).toBeCloseTo(plain.power * ELITE.power, 5)
    w.score = 0
    elite.hp = 1
    elite.x = w.player.x + 60
    w.player.facing = 1
    w.spawnTimer = 1e9
    stepWorld(w, { ...NO_INPUT, lightPressed: true }, DT, rng)
    run(w, 0.3)
    expect(elite.state).toBe('dying')
    expect(w.score).toBe(ENEMIES.demon.score * ELITE.score)
  })
})

describe('lancers', () => {
  it('set the spear from far off and run the player through', () => {
    const w = createWorld('huntress')
    w.spawnTimer = 1e9
    w.platforms = []
    const lancer = spawnEnemy(w, 'lancer', w.player.x + 300)
    lancer.cooldown = 0
    let started = false
    for (let t = 0; t < 2.5; t += DT) {
      stepWorld(w, NO_INPUT, DT, rng)
      if (lancer.state === 'windup' && !started) {
        started = true
        expect(Math.abs(lancer.x - w.player.x)).toBeGreaterThan(200)
      }
    }
    expect(started).toBe(true)
    expect(w.player.hp).toBe(w.player.maxHp - ENEMIES.lancer.damage)
  })

  it('miss a player who jumps over the run', () => {
    const w = createWorld('huntress')
    w.spawnTimer = 1e9
    w.platforms = []
    const lancer = spawnEnemy(w, 'lancer', w.player.x + 300)
    lancer.cooldown = 0
    for (let t = 0; t < 2.5; t += DT) {
      const jump = lancer.state === 'attack' && w.player.grounded && Math.abs(lancer.x - w.player.x) < 220
      stepWorld(w, { ...NO_INPUT, jumpPressed: jump, jumpHeld: true }, DT, rng)
    }
    expect(w.player.hp).toBe(w.player.maxHp)
  })
})

describe('archers', () => {
  it('back away from a player who comes close', () => {
    const w = createWorld('huntress')
    w.spawnTimer = 1e9
    w.platforms = []
    const archer = spawnEnemy(w, 'archer', w.player.x + 120)
    archer.cooldown = 1e9
    run(w, 1)
    expect(archer.x - w.player.x).toBeGreaterThan(150)
  })

  it('shoot an arrow that flies level and hurts a player standing in its way', () => {
    const w = createWorld('huntress')
    w.spawnTimer = 1e9
    w.platforms = []
    const archer = spawnEnemy(w, 'archer', w.player.x + 400)
    archer.cooldown = 0
    let flew = false
    for (let t = 0; t < 3 && w.player.hp === w.player.maxHp; t += DT) {
      stepWorld(w, NO_INPUT, DT, rng)
      if (w.arrows.length > 0) flew = true
    }
    expect(flew).toBe(true)
    expect(w.player.hp).toBe(w.player.maxHp - ENEMIES.archer.damage)
  })

  it('lose their arrows to a well-timed cut', () => {
    const w = createWorld('huntress')
    w.spawnTimer = 1e9
    w.platforms = []
    w.arrows.push({ x: w.player.x + 260, y: 50, vx: -640, damage: 11, blockCost: 12, life: 2 })
    w.player.facing = 1
    for (let t = 0; t < 1; t += DT) {
      const near = w.arrows.length > 0 && w.arrows[0].x - w.player.x < 150
      stepWorld(w, { ...NO_INPUT, lightPressed: near && w.player.state === 'free' }, DT, rng)
    }
    expect(w.arrows).toHaveLength(0)
    expect(w.player.hp).toBe(w.player.maxHp)
  })
})
