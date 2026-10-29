import { describe, expect, it } from 'vitest'
import { DASH, ENEMIES, SHIELD } from './config'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { BASE_MODS, UPGRADES, computeMods, offerUpgrades } from './upgrades'
import { NO_INPUT } from './types'
import { HEROES } from './heroes'

const COMBOS = HEROES.soldier.combos
import type { Picks } from './upgrades'
import type { Enemy, EnemyState, World } from './types'

const DT = 1 / 120
const first = () => 0.9

function withUpgrades(picks: Picks): World {
  const w = createWorld()
  w.spawnTimer = 1e9
  w.upgrades = { ...picks }
  w.mods = computeMods(picks)
  w.player.maxHp += w.mods.maxHp
  w.player.hp = w.player.maxHp
  w.player.maxStamina += w.mods.maxStamina
  w.player.stamina = w.player.maxStamina
  return w
}

const run = (w: World, seconds: number, input = {}) => {
  for (let t = 0; t < seconds; t += DT) stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
}
const press = (w: World, input: Partial<typeof NO_INPUT>) => stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
const until = (w: World, done: () => boolean, input = {}, limit = 5) => {
  for (let t = 0; t < limit && !done(); t += DT) stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
  expect(done()).toBe(true)
}
const dummy = (w: World, kind: 'goblin' | 'orc' | 'ogre', offset = 70): Enemy => {
  const e = spawnEnemy(w, kind, w.player.x + offset)
  e.cooldown = 1e9
  return e
}

describe('the upgrade list', () => {
  it('has unique ids, sensible limits, and every upgrade changes something', () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length)
    for (const u of UPGRADES) {
      expect(u.max).toBeGreaterThanOrEqual(1)
      expect(u.weight).toBeGreaterThan(0)
      expect(u.text.length).toBeGreaterThan(5)
      const mods = computeMods({ [u.id]: 1 })
      expect(mods).not.toEqual(BASE_MODS)
      // At the limit nothing should go negative or absurd.
      const maxed = computeMods({ [u.id]: u.max })
      expect(maxed.damageTaken).toBeGreaterThan(0.5)
      expect(maxed.blockCost).toBeGreaterThan(0.3)
      expect(maxed.dashCost).toBeGreaterThan(0.3)
      expect(maxed.dashCooldown).toBeGreaterThan(0.3)
    }
  })

  it('stacks', () => {
    expect(computeMods({ whetstone: 2 }).damage).toBeCloseTo(1.3)
    expect(computeMods({ whetstone: 1, hardened: 3 })).toMatchObject({ maxHp: 60 })
  })

  it('offers three different upgrades, never one that is maxed out', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = seed
      const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647)
      const offer = offerUpgrades({ phoenix: 1, whetstone: 5 }, rng)
      expect(offer).toHaveLength(3)
      expect(new Set(offer).size).toBe(3)
      expect(offer).not.toContain('phoenix')
      expect(offer).not.toContain('whetstone')
    }
  })

  it('offers what is left when little is', () => {
    const picks: Picks = {}
    for (const u of UPGRADES) picks[u.id] = u.max
    delete picks.reaper
    delete picks.fleet
    expect(offerUpgrades(picks, first).sort()).toEqual(['fleet', 'reaper'])
    delete picks.fleet
    delete picks.reaper
    picks.reaper = UPGRADES.find((u) => u.id === 'reaper')!.max
    expect(offerUpgrades(picks, first)).toEqual(['fleet'])
  })
})

describe('upgrades in the fight', () => {
  const swing = (w: World, e: Enemy) => {
    const before = e.hp
    press(w, { lightPressed: true })
    run(w, 0.25)
    return before - e.hp
  }

  it('Whetstone raises damage', () => {
    const plain = withUpgrades({})
    const sharp = withUpgrades({ whetstone: 2 })
    expect(swing(sharp, dummy(sharp, 'orc', 80))).toBeCloseTo(swing(plain, dummy(plain, 'orc', 80)) * 1.3, 5)
  })

  it('Executioner only boosts the last hit of a combo', () => {
    const w = withUpgrades({ executioner: 1 })
    const orc = dummy(w, 'orc', 80)
    orc.hp = orc.maxHp = 1000
    const hit = (index: number) => {
      const before = orc.hp
      w.player.attackKind = 'light'
      w.player.attackIndex = index
      w.player.comboWindow = 1
      orc.x = w.player.x + 80
      orc.state = 'walk'
      press(w, { lightPressed: true })
      run(w, 0.6)
      return before - orc.hp
    }
    expect(hit(0)).toBe(COMBOS.light[0].damage)
    expect(hit(2)).toBeCloseTo(COMBOS.light[2].damage * 1.35, 5)
  })

  it('Skullcracker staggers an orc sooner', () => {
    const swings = (picks: Picks) => {
      const w = withUpgrades(picks)
      const orc = dummy(w, 'orc', 80)
      orc.hp = orc.maxHp = 1000
      let n = 0
      while ((orc.state as EnemyState) !== 'stagger' && n < 12) {
        n++
        orc.x = w.player.x + 80
        w.player.comboWindow = 0
        press(w, { lightPressed: true })
        run(w, 0.4)
      }
      return n
    }
    expect(swings({ skullcracker: 3 })).toBeLessThan(swings({}))
  })

  it('Iron Skin softens a hit', () => {
    const w = withUpgrades({ ironSkin: 3 })
    const orc = spawnEnemy(w, 'orc', w.player.x + 90)
    orc.cooldown = 0
    until(w, () => w.player.hp < w.player.maxHp)
    expect(w.player.hp).toBe(w.player.maxHp - Math.round(ENEMIES.orc.damage * 0.7))
  })

  it('Bulwark makes blocking cheaper', () => {
    const cost = (picks: Picks) => {
      const w = withUpgrades(picks)
      const orc = spawnEnemy(w, 'orc', w.player.x + 90)
      orc.cooldown = 0
      until(w, () => orc.state === 'attack', { blockHeld: true })
      run(w, 0.2, { blockHeld: true })
      return w.player.maxStamina - w.player.stamina
    }
    expect(cost({ bulwark: 2 })).toBeLessThan(cost({}))
  })

  it('Keen Eye turns a slightly early block into a parry', () => {
    const outcome = (picks: Picks) => {
      const w = withUpgrades(picks)
      const orc = spawnEnemy(w, 'orc', w.player.x + 90)
      orc.cooldown = 0
      until(w, () => orc.state === 'windup' && orc.stateTime >= ENEMIES.orc.windup - SHIELD.parryWindow - 0.03)
      run(w, 0.3, { blockHeld: true })
      return w.parries
    }
    expect(outcome({})).toBe(0)
    expect(outcome({ keenEye: 1 })).toBe(1)
  })

  it('Riposte heals on a parry', () => {
    const w = withUpgrades({ riposte: 1 })
    w.player.hp = 50
    const orc = spawnEnemy(w, 'orc', w.player.x + 90)
    orc.cooldown = 0
    until(w, () => orc.state === 'windup' && orc.stateTime >= ENEMIES.orc.windup - 0.04)
    run(w, 0.3, { blockHeld: true })
    expect(w.parries).toBe(1)
    expect(w.player.hp).toBe(56)
  })

  it('Light Feet makes dashing cheaper', () => {
    const w = withUpgrades({ lightFeet: 2 })
    press(w, { dashPressed: true })
    expect(w.player.maxStamina - w.player.stamina).toBeCloseTo(DASH.stamina * 0.6, 5)
    expect(w.player.dashCooldown).toBeLessThan(DASH.cooldown * 0.7)
  })

  it('Fleet Boots walk faster', () => {
    const distance = (picks: Picks) => {
      const w = withUpgrades(picks)
      run(w, 0.6, { move: 1 })
      return w.player.x - ARENA_MID
    }
    const ARENA_MID = 480
    expect(distance({ fleet: 3 })).toBeGreaterThan(distance({}) * 1.1)
  })

  it('Second Wind refills stamina faster', () => {
    const regained = (picks: Picks) => {
      const w = withUpgrades(picks)
      w.player.stamina = 10
      w.player.staminaDelay = 0
      run(w, 1)
      return w.player.stamina - 10
    }
    expect(regained({ recovery: 2 })).toBeCloseTo(regained({}) * 1.5, 1)
  })

  it('Reaper heals on a kill', () => {
    const w = withUpgrades({ reaper: 2 })
    w.player.hp = 50
    const goblin = dummy(w, 'goblin')
    goblin.hp = 1
    press(w, { lightPressed: true })
    run(w, 0.3)
    expect(goblin.state).toBe('dying')
    expect(w.player.hp).toBe(56)
  })

  it('Phoenix Feather survives one fatal blow, and only one', () => {
    const w = withUpgrades({ phoenix: 1 })
    w.player.hp = 1
    const goblin = spawnEnemy(w, 'goblin', w.player.x + 100)
    goblin.cooldown = 0
    run(w, 1.3)
    expect(w.over).toBe(false)
    expect(w.player.hp).toBeGreaterThan(20)
    expect(w.revivesUsed).toBe(1)
    w.player.hp = 1
    w.player.invuln = 0
    const another = spawnEnemy(w, 'goblin', w.player.x - 100)
    another.cooldown = 0
    run(w, 1.5)
    expect(w.over).toBe(true)
  })
})
