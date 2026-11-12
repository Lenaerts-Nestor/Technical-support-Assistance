import { describe, expect, it } from 'vitest'
import { ARENA, DASH, ENEMIES, PLAYER, SHIELD } from './config'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { NO_INPUT } from './types'
import { HEROES } from './heroes'

const COMBOS = HEROES.warden.combos
import type { Enemy, EnemyState, FrameInput, World } from './types'

const DT = 1 / 120
/** The Warden plays these tests: it is the hero with a guard. */
const MAX_HP = HEROES.warden.hp
const first = () => 0.9

/** A world with no spawner, so a test controls exactly who is in it. */
function quiet(): World {
  const w = createWorld('warden')
  w.spawnTimer = 1e9
  w.platforms = []
  return w
}

/** Presses last for one step, holds (move, block, jump) stay for the whole run. */
const run = (w: World, seconds: number, input: Partial<FrameInput> = {}) => {
  const held = { ...NO_INPUT, ...input, jumpPressed: false, dashPressed: false, lightPressed: false, heavyPressed: false }
  for (let t = 0; t < seconds; t += DT) stepWorld(w, held, DT, first)
}
const press = (w: World, input: Partial<FrameInput>) => stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
/** Step until `done` is true, or fail after `limit` seconds. */
const until = (w: World, done: () => boolean, input: Partial<FrameInput> = {}, limit = 5) => {
  const held = { ...NO_INPUT, ...input }
  for (let t = 0; t < limit && !done(); t += DT) stepWorld(w, held, DT, first)
  expect(done()).toBe(true)
}

/** An enemy standing `offset` px in front of the player, with its own attacks switched off. */
const dummy = (w: World, kind: 'imp' | 'demon' | 'brute', offset = 70): Enemy => {
  const e = spawnEnemy(w, kind, w.player.x + offset)
  e.cooldown = 1e9
  return e
}

const stagger = (e: Enemy) => (e.state as EnemyState) === 'stagger'

describe('movement', () => {
  it('walks in the held direction and stops at the arena wall', () => {
    const w = quiet()
    run(w, 0.5, { move: 1 })
    expect(w.player.x).toBeGreaterThan(ARENA.width / 2 + 60)
    run(w, 6, { move: 1 })
    expect(w.player.x).toBe(ARENA.width - 24)
  })

  it('jumps, rises, and lands again', () => {
    const w = quiet()
    press(w, { jumpPressed: true, jumpHeld: true })
    run(w, 0.2, { jumpHeld: true })
    expect(w.player.y).toBeGreaterThan(20)
    expect(w.player.grounded).toBe(false)
    run(w, 1.2)
    expect(w.player.y).toBe(0)
    expect(w.player.grounded).toBe(true)
  })

  it('jumps lower when the key is let go early', () => {
    const peak = (hold: boolean) => {
      const w = quiet()
      press(w, { jumpPressed: true, jumpHeld: true })
      let top = 0
      for (let t = 0; t < 1; t += DT) {
        stepWorld(w, { ...NO_INPUT, jumpHeld: hold }, DT, first)
        top = Math.max(top, w.player.y)
      }
      return top
    }
    expect(peak(false)).toBeLessThan(peak(true) * 0.5)
  })

  it('dashes quickly forward, spends stamina, and cannot dash again straight away', () => {
    const w = quiet()
    const start = w.player.x
    press(w, { dashPressed: true })
    expect(w.player.state).toBe('dash')
    expect(w.player.stamina).toBeCloseTo(PLAYER.maxStamina - DASH.stamina * HEROES.warden.dashCost, 5)
    run(w, 0.2)
    expect(w.player.x - start).toBeGreaterThan(100)
    const after = w.player.x
    press(w, { dashPressed: true })
    expect(w.player.state).not.toBe('dash')
    expect(w.player.x - after).toBeLessThan(10)
  })

  it('will not dash without the stamina, and says so', () => {
    const w = quiet()
    w.player.stamina = DASH.stamina - 1
    press(w, { dashPressed: true })
    expect(w.player.state).toBe('free')
    expect(w.player.lowStamina).toBeGreaterThan(0)
  })
})

describe('stamina', () => {
  it('comes back, but only after a short pause from the last spend', () => {
    const w = quiet()
    press(w, { dashPressed: true })
    const spent = w.player.stamina
    run(w, 0.4)
    expect(w.player.stamina).toBe(spent)
    run(w, 0.6)
    expect(w.player.stamina).toBeGreaterThan(spent + 10)
    run(w, 5)
    expect(w.player.stamina).toBe(PLAYER.maxStamina)
  })
})

describe('light combo', () => {
  it('hurts and nudges an enemy in front, and only once per swing', () => {
    const w = quiet()
    const imp = dummy(w, 'imp')
    press(w, { lightPressed: true })
    until(w, () => w.player.stateTime >= COMBOS.light[0].hitStart - DT)
    const startX = imp.x
    run(w, 0.2)
    expect(imp.hp).toBe(ENEMIES.imp.hp - COMBOS.light[0].damage)
    expect(imp.x).toBeGreaterThan(startX + 5)
  })

  it('does not hit an enemy behind the player', () => {
    const w = quiet()
    const imp = dummy(w, 'imp', -70)
    press(w, { lightPressed: true, move: 1 })
    run(w, 0.3, { move: 1 })
    expect(imp.hp).toBe(ENEMIES.imp.hp)
  })

  it('turns towards a nearby enemy when no direction is held', () => {
    const w = quiet()
    const imp = dummy(w, 'imp', -70)
    press(w, { lightPressed: true })
    expect(w.player.facing).toBe(-1)
    run(w, 0.3)
    expect(imp.hp).toBeLessThan(ENEMIES.imp.hp)
  })

  it('chains three presses into the finisher', () => {
    const w = quiet()
    const imp = dummy(w, 'imp')
    imp.hp = imp.maxHp = 500
    const seen: number[] = []
    press(w, { lightPressed: true })
    for (let t = 0; t < 1.6; t += DT) {
      if (w.player.state === 'attack' && seen[seen.length - 1] !== w.player.attackIndex) seen.push(w.player.attackIndex)
      stepWorld(w, { ...NO_INPUT, lightPressed: Math.round(t / DT) % 20 === 0 }, DT, first)
      imp.x = w.player.x + 70
      imp.state = 'hurt'
      imp.stateTime = 0
    }
    expect(seen.slice(0, 3)).toEqual([0, 1, 2])
  })

  it('kills an imp with the chain and scores it', () => {
    const w = quiet()
    const imp = dummy(w, 'imp')
    const down = () => (imp.state as EnemyState) === 'dying'
    for (let t = 0; t < 1.6 && !down(); t += DT) {
      stepWorld(w, { ...NO_INPUT, lightPressed: Math.round(t / DT) % 20 === 0 }, DT, first)
      if (!down()) imp.x = w.player.x + 70
    }
    expect(imp.state).toBe('dying')
    expect(w.kills).toBe(1)
    expect(w.score).toBe(ENEMIES.imp.score)
    run(w, 1)
    expect(w.enemies).toHaveLength(0)
  })

  it('freezes the world for a moment on a solid hit', () => {
    const w = quiet()
    dummy(w, 'imp')
    press(w, { lightPressed: true })
    until(w, () => w.freeze > 0)
    expect(w.freeze).toBeGreaterThan(0)
    expect(w.shake).toBeGreaterThan(0)
  })
})

describe('heavy combo', () => {
  it('hits much harder than a light cut and costs stamina', () => {
    const w = quiet()
    const demon = dummy(w, 'demon', 80)
    press(w, { heavyPressed: true })
    expect(w.player.stamina).toBe(PLAYER.maxStamina - COMBOS.heavy[0].stamina)
    run(w, 0.5)
    expect(demon.hp).toBe(ENEMIES.demon.hp - COMBOS.heavy[0].damage)
    expect(COMBOS.heavy[0].damage).toBeGreaterThan(COMBOS.light[0].damage * 2)
  })

  it('can follow a light cut', () => {
    const w = quiet()
    press(w, { lightPressed: true })
    until(w, () => w.player.stateTime >= COMBOS.light[0].cancelAt - 0.03)
    press(w, { heavyPressed: true })
    run(w, 0.05)
    expect(w.player.attackKind).toBe('heavy')
    expect(w.player.attackIndex).toBe(0)
  })

  it('cannot be swung without the stamina', () => {
    const w = quiet()
    w.player.stamina = COMBOS.heavy[0].stamina - 1
    press(w, { heavyPressed: true })
    expect(w.player.state).toBe('free')
    expect(w.player.lowStamina).toBeGreaterThan(0)
  })
})

describe('poise', () => {
  it('lets a light hit pass without interrupting an demon winding up', () => {
    const w = quiet()
    const demon = dummy(w, 'demon', 80)
    demon.state = 'windup'
    press(w, { lightPressed: true })
    run(w, 0.25)
    expect(demon.hp).toBeLessThan(ENEMIES.demon.hp)
    expect(demon.state).toBe('windup')
  })

  it('staggers an demon with a whole light combo', () => {
    const w = quiet()
    const demon = dummy(w, 'demon', 80)
    demon.hp = demon.maxHp = 500
    press(w, { lightPressed: true })
    for (let t = 0; t < 1.6 && !stagger(demon); t += DT) {
      stepWorld(w, { ...NO_INPUT, lightPressed: Math.round(t / DT) % 20 === 0 }, DT, first)
      demon.x = w.player.x + 80
    }
    expect(stagger(demon)).toBe(true)
  })

  it('staggers an demon with one heavy chop, and a staggered enemy takes extra damage', () => {
    const w = quiet()
    const demon = dummy(w, 'demon', 80)
    press(w, { heavyPressed: true })
    until(w, () => stagger(demon))
    until(w, () => w.player.state === 'free')
    const before = demon.hp
    demon.x = w.player.x + 80
    press(w, { lightPressed: true })
    run(w, 0.2)
    expect(before - demon.hp).toBeCloseTo(COMBOS.light[0].damage * 1.3, 5)
  })

  it('is not shifted far by a light hit when it is an brute', () => {
    const w = quiet()
    const brute = dummy(w, 'brute', 110)
    press(w, { lightPressed: true })
    run(w, 0.3)
    expect(brute.hp).toBeLessThan(ENEMIES.brute.hp)
    expect(brute.state).toBe('walk')
  })

  it('takes two heavy hits to stagger an brute', () => {
    const w = quiet()
    const brute = dummy(w, 'brute', 110)
    press(w, { heavyPressed: true })
    run(w, COMBOS.heavy[0].duration + 0.05)
    expect(stagger(brute)).toBe(false)
    press(w, { heavyPressed: true })
    run(w, 0.6)
    expect(stagger(brute)).toBe(true)
  })
})

describe('shield', () => {
  const swingAt = (w: World, kind: 'imp' | 'demon' | 'brute', offset: number) => {
    const e = spawnEnemy(w, kind, w.player.x + offset)
    e.cooldown = 0
    return e
  }

  it('blocks a hit from the front for stamina instead of health', () => {
    const w = quiet()
    const demon = swingAt(w, 'demon', 90)
    until(w, () => demon.state === 'attack' || w.player.hp < MAX_HP || w.player.stamina < PLAYER.maxStamina, { blockHeld: true })
    // Raised long before the hit lands, so this is a block and not a parry.
    run(w, 0.3, { blockHeld: true })
    expect(w.player.hp).toBe(MAX_HP)
    expect(w.player.stamina).toBeLessThan(PLAYER.maxStamina)
  })

  it('does not protect the back', () => {
    const w = quiet()
    w.player.facing = -1
    const demon = swingAt(w, 'demon', 90)
    until(w, () => w.player.hp < MAX_HP, { blockHeld: true, move: 0 })
    expect(w.player.hp).toBe(MAX_HP - ENEMIES.demon.damage)
    expect(demon.state).not.toBe('stagger')
  })

  it('parries a hit raised just in time: no damage, stamina refunded, attacker staggered, score', () => {
    const w = quiet()
    const demon = swingAt(w, 'demon', 90)
    until(w, () => demon.state === 'windup')
    // Raise the shield only when the blow is about to land.
    until(w, () => demon.stateTime >= ENEMIES.demon.windup - 0.04)
    run(w, 0.3, { blockHeld: true })
    expect(w.parries).toBe(1)
    expect(w.player.hp).toBe(MAX_HP)
    expect(w.player.stamina).toBe(PLAYER.maxStamina)
    expect(w.score).toBe(SHIELD.parryScore)
    expect(stagger(demon)).toBe(true)
  })

  it('breaks the guard when stamina runs out, letting half the blow through', () => {
    const w = quiet()
    w.player.stamina = 2
    const demon = swingAt(w, 'demon', 90)
    until(w, () => demon.state === 'attack', { blockHeld: true })
    run(w, 0.3, { blockHeld: true })
    expect(w.player.hp).toBe(MAX_HP - Math.ceil(ENEMIES.demon.damage / 2))
    expect(w.player.stamina).toBe(0)
  })

  it('cannot be raised in the air', () => {
    const w = quiet()
    press(w, { jumpPressed: true, jumpHeld: true, blockHeld: true })
    run(w, 0.1, { jumpHeld: true, blockHeld: true })
    expect(w.player.state).not.toBe('block')
  })

  it('catches an imp leap and bounces it off', () => {
    const w = quiet()
    const imp = swingAt(w, 'imp', 110)
    until(w, () => imp.state === 'attack', { blockHeld: true })
    run(w, 0.6, { blockHeld: true })
    expect(w.player.hp).toBe(MAX_HP)
  })
})

describe('demon and brute', () => {
  it('a demon winds up and chops a player standing still', () => {
    const w = quiet()
    const demon = spawnEnemy(w, 'demon', w.player.x + 90)
    demon.cooldown = 0
    run(w, 1.4)
    expect(w.player.hp).toBe(MAX_HP - ENEMIES.demon.damage)
  })

  it('a dash through the chop avoids it', () => {
    const w = quiet()
    const demon = spawnEnemy(w, 'demon', w.player.x + 90)
    demon.cooldown = 0
    until(w, () => demon.state === 'windup')
    until(w, () => demon.stateTime >= ENEMIES.demon.windup - 0.05)
    press(w, { dashPressed: true, move: -1 })
    run(w, 0.6)
    expect(w.player.hp).toBe(MAX_HP)
  })

  it('a brute slam hurts, and sends a wave of rock along the ground', () => {
    const w = quiet()
    const brute = spawnEnemy(w, 'brute', w.player.x + 140)
    brute.cooldown = 0
    until(w, () => w.waves.length > 0)
    // The brute stands to the player's right, so the wave runs left towards them.
    expect(w.waves[0].vx).toBeLessThan(0)
    run(w, 0.4)
    expect(w.player.hp).toBeLessThan(MAX_HP)
  })

  it('a wave hurts a player on the ground but passes under one who jumps', () => {
    const wave = () => ({ x: 0, vx: 340, life: 0.85, maxLife: 0.85, damage: 14, height: 34, halfWidth: 22, blockCost: 15, struck: false })
    const standing = quiet()
    standing.waves.push({ ...wave(), x: standing.player.x - 120 })
    run(standing, 0.7)
    expect(standing.player.hp).toBe(MAX_HP - 14)

    const jumping = quiet()
    jumping.waves.push({ ...wave(), x: jumping.player.x - 120 })
    press(jumping, { jumpPressed: true, jumpHeld: true })
    run(jumping, 0.7, { jumpHeld: true })
    expect(jumping.player.hp).toBe(MAX_HP)
  })

  it('a shield stops a wave', () => {
    const w = quiet()
    w.waves.push({ x: w.player.x + 160, vx: -340, life: 0.85, maxLife: 0.85, damage: 14, height: 34, halfWidth: 22, blockCost: 15, struck: false })
    run(w, 0.8, { blockHeld: true })
    expect(w.player.hp).toBe(MAX_HP)
    expect(w.waves).toHaveLength(0)
  })

  it('a brute shoves the player aside, but a dash passes through it', () => {
    const w = quiet()
    const brute = dummy(w, 'brute', 10)
    run(w, 0.1)
    expect(Math.abs(w.player.x - brute.x)).toBeGreaterThanOrEqual(ENEMIES.brute.halfWidth)
    const x = w.player.x
    press(w, { dashPressed: true, move: 1 })
    run(w, 0.2)
    expect(w.player.x).toBeGreaterThan(x + 60)
  })
})

describe('imps', () => {
  it('an imp winds up, leaps, and hurts a player standing still', () => {
    const w = quiet()
    const imp = spawnEnemy(w, 'imp', w.player.x + 100)
    imp.cooldown = 0
    run(w, 1.2)
    expect(w.player.hp).toBe(MAX_HP - ENEMIES.imp.damage)
  })

  it('a dash through the leap avoids the damage', () => {
    const w = quiet()
    const imp = spawnEnemy(w, 'imp', w.player.x + 100)
    imp.cooldown = 0
    for (let t = 0; t < 1.5; t += DT) {
      stepWorld(w, { ...NO_INPUT, dashPressed: imp.state === 'attack' && w.player.state !== 'dash' && w.player.dashCooldown <= 0 }, DT, first)
    }
    expect(w.player.hp).toBe(MAX_HP)
  })

  it('a jump clears the leap', () => {
    const w = quiet()
    const imp = spawnEnemy(w, 'imp', w.player.x + 100)
    imp.cooldown = 0
    for (let t = 0; t < 1.5; t += DT) {
      stepWorld(w, { ...NO_INPUT, jumpPressed: imp.state === 'windup' && imp.stateTime > 0.3 && w.player.grounded, jumpHeld: true }, DT, first)
    }
    expect(w.player.hp).toBe(MAX_HP)
  })
})

describe('death', () => {
  it('ends the run at zero health and stops new spawns', () => {
    const w = createWorld('warden')
    w.player.hp = 1
    const imp = spawnEnemy(w, 'imp', w.player.x + 100)
    imp.cooldown = 0
    run(w, 1.5)
    expect(w.over).toBe(true)
    expect(w.player.state).toBe('dead')
    const count = w.enemies.length
    run(w, 6)
    expect(w.enemies.length).toBeLessThanOrEqual(count)
  })
})

describe('the downward dive', () => {
  const dive = { ...NO_INPUT, downHeld: true, lightPressed: true }
  const inAir = () => {
    const w = createWorld('huntress')
    w.player.y = 500
    w.player.vy = 0
    w.player.grounded = false
    return w
  }

  it('recharges: asking again straight away does nothing, and it works once recharged', () => {
    const w = inAir()
    stepWorld(w, dive, 0.01, () => 0.5)
    expect(w.player.state).toBe('attack')
    expect(w.player.attackKind).toBe('airDown')
    expect(w.player.diveCooldown).toBeGreaterThan(1)

    // Back in the air, and the dive is asked for again: it is refused, not turned into another blow.
    w.player.state = 'free'
    w.player.y = 500
    w.player.vy = 0
    w.player.grounded = false
    stepWorld(w, dive, 0.01, () => 0.5)
    expect(w.player.state).toBe('free')

    w.player.diveCooldown = 0
    stepWorld(w, dive, 0.01, () => 0.5)
    expect(w.player.attackKind).toBe('airDown')
    expect(w.player.state).toBe('attack')
  })
})
