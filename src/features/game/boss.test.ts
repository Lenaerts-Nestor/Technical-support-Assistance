import { describe, expect, it } from 'vitest'
import { ARENA, COST, ENEMIES, PLAYER, ROUNDS } from './config'
import { enemyHealthScale, roundBudget } from './pacing'
import { awardKill, nextRound } from './rounds'
import { createWorld, isEnraged, spawnEnemy, stepWorld, windupTime } from './sim'
import { NO_INPUT } from './types'
import type { BossMove, Enemy, FrameInput, World } from './types'

const DT = 1 / 120
const first = () => 0.9
const boss = ENEMIES.warlord.boss!

function quiet(round = 1): World {
  const w = createWorld()
  w.round = round
  w.spawnTimer = 1e9
  return w
}

const run = (w: World, seconds: number, input: Partial<FrameInput> = {}) => {
  for (let t = 0; t < seconds; t += DT) stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
}
const until = (w: World, done: () => boolean, input: Partial<FrameInput> = {}, limit = 6) => {
  for (let t = 0; t < limit && !done(); t += DT) stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
  expect(done()).toBe(true)
}

/** A boss, put straight into the wind-up of a chosen move. */
function warlord(w: World, x: number, move: BossMove): Enemy {
  const e = spawnEnemy(w, 'warlord', x)
  e.state = 'windup'
  e.stateTime = 0
  e.move = move
  e.cooldown = 0
  return e
}

describe('the boss round', () => {
  it('brings the boss first, alone, then its small crowd', () => {
    const w = createWorld()
    w.round = 5
    w.budget = w.roundBudget = roundBudget(5)
    w.spawnTimer = 0.2
    until(w, () => w.enemies.length > 0)
    expect(w.enemies.map((e) => e.kind)).toEqual(['warlord'])
    expect(w.bossSpawned).toBe(true)
    expect(w.budget).toBe(roundBudget(5) - COST.warlord)
    run(w, 3.5)
    expect(w.enemies.filter((e) => e.kind === 'warlord')).toHaveLength(1)
    expect(w.enemies.length).toBeGreaterThan(1)
    expect(w.enemies.every((e) => e.kind === 'warlord' || e.kind === 'goblin' || e.kind === 'orc')).toBe(true)
  })

  it('is stronger than an ogre, and grows stronger with the round', () => {
    const w = quiet(5)
    const b = spawnEnemy(w, 'warlord', 0)
    expect(b.maxHp).toBe(Math.round(ENEMIES.warlord.hp * enemyHealthScale(5)))
    expect(ENEMIES.warlord.hp).toBeGreaterThan(ENEMIES.ogre.hp * 2.5)
    const later = quiet(15)
    expect(spawnEnemy(later, 'warlord', 0).maxHp).toBeGreaterThan(b.maxHp)
  })

  it('is not won until the boss is down, and the next round is ordinary', () => {
    const w = createWorld()
    w.round = 5
    w.budget = w.roundBudget = roundBudget(5)
    w.spawnTimer = 0.1
    until(w, () => w.bossSpawned)
    const b = w.enemies[0]
    w.budget = 0
    run(w, 3)
    expect(w.stage).toBe('fight')
    b.state = 'dying'
    awardKill(w, ENEMIES.warlord)
    w.enemies = []
    until(w, () => w.stage === 'cleared')
    expect(w.score).toBeGreaterThanOrEqual(ENEMIES.warlord.score)
    until(w, () => w.stage === 'break', {}, ROUNDS.clearedTime + 1)
    nextRound(w)
    expect(w.round).toBe(6)
    expect(w.bossSpawned).toBe(false)
  })
})

describe('the boss moves', () => {
  it('slam: a wave rolls out ahead, and a second the other way once it is enraged', () => {
    const calm = quiet(5)
    calm.player.x = 300
    warlord(calm, 480, 'slam')
    until(calm, () => calm.waves.length > 0)
    expect(calm.waves).toHaveLength(1)

    const angry = quiet(5)
    angry.player.x = 300
    const b = warlord(angry, 480, 'slam')
    b.hp = b.maxHp * 0.3
    until(angry, () => angry.waves.length > 0)
    expect(angry.waves).toHaveLength(2)
    expect(Math.sign(angry.waves[0].vx)).toBe(-Math.sign(angry.waves[1].vx))
  })

  it('charge: it runs straight at the player and hits for a lot', () => {
    const w = quiet(5)
    w.player.x = 250
    const b = warlord(w, 800, 'charge')
    until(w, () => b.state === 'attack')
    expect(Math.abs(b.vx)).toBeGreaterThan(boss.chargeSpeed * 0.9)
    until(w, () => w.player.hp < PLAYER.maxHp)
    expect(w.player.hp).toBe(PLAYER.maxHp - Math.round(boss.chargeDamage * b.power))
  })

  it('charge: a dash through it takes no damage', () => {
    const w = quiet(5)
    w.player.x = 250
    const b = warlord(w, 800, 'charge')
    until(w, () => b.state === 'attack' && b.x < 440)
    stepWorld(w, { ...NO_INPUT, dashPressed: true, move: 1 }, DT, first)
    run(w, 0.6)
    expect(w.player.hp).toBe(PLAYER.maxHp)
  })

  it('charge: a shield takes it, at a heavy price in stamina', () => {
    const w = quiet(5)
    w.player.x = 250
    w.player.facing = 1
    const b = warlord(w, 800, 'charge')
    until(w, () => b.state === 'attack' && b.x < 520, { blockHeld: true })
    run(w, 0.5, { blockHeld: true })
    expect(w.player.hp).toBe(PLAYER.maxHp)
    expect(w.player.stamina).toBeLessThan(PLAYER.maxStamina - 40)
  })

  it('charge: running into the wall leaves it stunned and open', () => {
    const w = quiet(5)
    w.player.x = 700
    w.player.invuln = 99
    const b = warlord(w, 400, 'charge')
    b.facing = -1
    // The player stands away from its path, to the right; it turns to face them at the end of the wind-up,
    // so send it the other way by putting the player on the left.
    w.player.x = 60
    until(w, () => (b.state as string) === 'stagger', {}, 6)
    expect(b.x).toBeLessThan(ENEMIES.warlord.halfWidth + 40)
    expect(w.shake).toBeGreaterThan(5)
  })

  it('roar: calls goblins in from the edges', () => {
    const w = quiet(5)
    w.player.x = 300
    warlord(w, 600, 'roar')
    until(w, () => w.enemies.filter((e) => e.kind === 'goblin').length >= boss.summon)
    expect(w.enemies.filter((e) => e.kind === 'goblin')).toHaveLength(boss.summon)
  })
})

describe('enrage', () => {
  it('begins below half health and speeds the boss up', () => {
    const w = quiet(5)
    const b = warlord(w, 600, 'slam')
    expect(isEnraged(b)).toBe(false)
    const calm = windupTime(b)
    b.hp = b.maxHp * 0.49
    expect(isEnraged(b)).toBe(true)
    expect(windupTime(b)).toBeLessThan(calm)
    expect(isEnraged(spawnEnemy(w, 'ogre', 0))).toBe(false)
  })

  it('charges have their own, longer wind-up and the roar a shorter one', () => {
    const w = quiet(5)
    const b = warlord(w, 600, 'charge')
    expect(windupTime(b)).toBe(boss.chargeWindup)
    b.move = 'roar'
    expect(windupTime(b)).toBe(boss.roarWindup)
    b.move = 'slam'
    expect(windupTime(b)).toBe(ENEMIES.warlord.windup)
  })
})

describe('feedback you can see', () => {
  const swing = (w: World) => {
    stepWorld(w, { ...NO_INPUT, lightPressed: true }, DT, first)
    run(w, 0.3)
  }

  it('a hit floats its damage over the enemy and leaves an impact mark', () => {
    const w = quiet()
    const g = spawnEnemy(w, 'goblin', w.player.x + 70)
    g.cooldown = 1e9
    swing(w)
    expect(w.floaters.some((f) => /^\d+$/.test(f.text))).toBe(true)
    expect(g.hitTime).toBeGreaterThan(0)
    stepWorld(w, NO_INPUT, DT, first)
    expect(w.impacts.length + w.floaters.length).toBeGreaterThan(0)
    run(w, 1.5)
    expect(w.floaters).toHaveLength(0)
    expect(w.impacts).toHaveLength(0)
  })

  it('a staggered enemy says so', () => {
    const w = quiet()
    const orc = spawnEnemy(w, 'orc', w.player.x + 80)
    orc.cooldown = 1e9
    stepWorld(w, { ...NO_INPUT, heavyPressed: true }, DT, first)
    run(w, 0.6)
    expect(w.floaters.some((f) => f.text === 'STAGGER!') || orc.state === 'stagger').toBe(true)
  })

  it('a hit on the hero shows what it cost and flashes the hero', () => {
    const w = quiet()
    const g = spawnEnemy(w, 'goblin', w.player.x + 100)
    g.cooldown = 0
    until(w, () => w.player.hp < PLAYER.maxHp)
    expect(w.floaters.some((f) => f.text === `-${PLAYER.maxHp - w.player.hp}`)).toBe(true)
    expect(w.player.hitTime).toBeGreaterThan(0)
  })

  it('blocking and parrying are called out', () => {
    const w = quiet()
    const orc = spawnEnemy(w, 'orc', w.player.x + 90)
    orc.cooldown = 0
    until(w, () => orc.state === 'windup' && orc.stateTime >= ENEMIES.orc.windup - 0.04)
    run(w, 0.2, { blockHeld: true })
    expect(w.floaters.some((f) => f.text === 'PARRY!')).toBe(true)
  })

  it('landing from a jump squashes the hero for a moment', () => {
    const w = quiet()
    stepWorld(w, { ...NO_INPUT, jumpPressed: true, jumpHeld: true }, DT, first)
    until(w, () => w.player.grounded === false)
    until(w, () => w.player.landTime > 0, { jumpHeld: true })
    expect(w.player.landTime).toBeGreaterThan(0)
    run(w, 0.4)
    expect(w.player.landTime).toBe(0)
  })
})

describe('arena', () => {
  it('has room for the boss to run', () => {
    expect(ARENA.width).toBeGreaterThan(ENEMIES.warlord.halfWidth * 6)
  })
})
