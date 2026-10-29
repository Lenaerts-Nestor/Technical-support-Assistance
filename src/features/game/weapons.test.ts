import { describe, expect, it } from 'vitest'
import { ENEMIES, PLAYER, SWAP } from './config'
import { GameEngine } from './engine'
import { createWorld, spawnEnemy, stepWorld, weaponOf } from './sim'
import { NO_INPUT } from './types'
import { DEFAULT_LOADOUT, WEAPON_LIST, WEAPONS } from './weapons'
import { computeMods } from './upgrades'
import type { Enemy, EnemyState, FrameInput, World } from './types'
import type { WeaponId } from './weapons'

const DT = 1 / 120
const first = () => 0.9

function quiet(...loadout: [WeaponId, WeaponId]): World {
  const w = createWorld(loadout)
  w.spawnTimer = 1e9
  return w
}

const run = (w: World, seconds: number, input: Partial<FrameInput> = {}) => {
  const held = { ...NO_INPUT, ...input, jumpPressed: false, dashPressed: false, lightPressed: false, heavyPressed: false, swapPressed: false }
  for (let t = 0; t < seconds; t += DT) stepWorld(w, held, DT, first)
}
const press = (w: World, input: Partial<FrameInput>) => stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
const until = (w: World, done: () => boolean, input: Partial<FrameInput> = {}, limit = 5) => {
  for (let t = 0; t < limit && !done(); t += DT) stepWorld(w, { ...NO_INPUT, ...input }, DT, first)
  expect(done()).toBe(true)
}
const dummy = (w: World, kind: 'goblin' | 'orc' | 'ogre', offset: number): Enemy => {
  const e = spawnEnemy(w, kind, w.player.x + offset)
  e.cooldown = 1e9
  return e
}
const stagger = (e: Enemy) => (e.state as EnemyState) === 'stagger'

describe('weapon definitions', () => {
  it('has four distinct weapons with sane attack steps', () => {
    expect(WEAPON_LIST).toHaveLength(4)
    expect(new Set(WEAPON_LIST.map((x) => x.id)).size).toBe(4)
    for (const weapon of WEAPON_LIST) {
      expect(weapon.combos.light.length).toBeGreaterThan(0)
      expect(weapon.combos.heavy.length).toBeGreaterThan(0)
      for (const step of [...weapon.combos.light, ...weapon.combos.heavy, ...weapon.combos.close]) {
        expect(step.hitStart).toBeLessThanOrEqual(step.hitEnd)
        expect(step.hitEnd).toBeLessThanOrEqual(step.duration)
        expect(step.cancelAt).toBeLessThanOrEqual(step.duration)
        expect(step.damage).toBeGreaterThan(0)
      }
    }
  })

  it('only the sword and shield can block', () => {
    expect(WEAPON_LIST.filter((x) => x.canBlock).map((x) => x.id)).toEqual(['swordShield'])
  })

  it('starts with two different weapons', () => {
    expect(new Set(DEFAULT_LOADOUT).size).toBe(2)
  })
})

describe('the loadout', () => {
  it('assigns a weapon to a slot and trades places when it is already in the other', () => {
    const engine = new GameEngine()
    engine.setWeapon(0, 'mace')
    expect(engine.loadout).toEqual(['mace', DEFAULT_LOADOUT[1]])
    engine.setWeapon(1, 'mace')
    expect(engine.loadout).toEqual([DEFAULT_LOADOUT[1], 'mace'])
    expect(engine.world.loadout).toEqual(engine.loadout)
  })

  it('is kept for the next run', () => {
    const engine = new GameEngine()
    engine.setWeapon(1, 'bow')
    engine.reset()
    expect(engine.world.loadout).toEqual([DEFAULT_LOADOUT[0], 'bow'])
  })
})

describe('swapping with Q', () => {
  it('takes the other weapon, and not again straight away', () => {
    const w = quiet('swordShield', 'mace')
    expect(weaponOf(w).id).toBe('swordShield')
    press(w, { swapPressed: true })
    expect(weaponOf(w).id).toBe('mace')
    run(w, 0.1)
    press(w, { swapPressed: true })
    expect(weaponOf(w).id).toBe('mace')
    run(w, SWAP.cooldown)
    press(w, { swapPressed: true })
    expect(weaponOf(w).id).toBe('swordShield')
  })

  it('cannot attack until the new weapon is up', () => {
    const w = quiet('swordShield', 'longSword')
    press(w, { swapPressed: true })
    press(w, { lightPressed: true })
    expect(w.player.state).not.toBe('attack')
    until(w, () => w.player.state === 'attack')
    expect(w.player.attackKind).toBe('light')
    expect(w.player.swapAnim).toBeGreaterThanOrEqual(SWAP.time)
  })

  it('drops the shield when swapping to a weapon that cannot block', () => {
    const w = quiet('swordShield', 'mace')
    run(w, 0.1, { blockHeld: true })
    expect(w.player.state).toBe('block')
    press(w, { swapPressed: true, blockHeld: true })
    run(w, 0.5, { blockHeld: true })
    expect(w.player.state).not.toBe('block')
  })

  it('breaks off a swing in recovery', () => {
    const w = quiet('swordShield', 'mace')
    press(w, { lightPressed: true })
    until(w, () => w.player.stateTime >= WEAPONS.swordShield.combos.light[0].cancelAt)
    press(w, { swapPressed: true })
    expect(weaponOf(w).id).toBe('mace')
    expect(w.player.state).toBe('free')
  })
})

describe('no shield without the sword and shield', () => {
  it('the long sword, mace and bow ignore the shield key', () => {
    for (const id of ['longSword', 'mace', 'bow'] as const) {
      const w = quiet(id, 'swordShield')
      run(w, 0.3, { blockHeld: true })
      expect(w.player.state).not.toBe('block')
    }
  })
})

describe('long sword', () => {
  it('reaches further than the sword and shield', () => {
    const hit = (id: WeaponId) => {
      const w = quiet(id, 'mace')
      const g = dummy(w, 'goblin', 160)
      const x = g.x
      press(w, { lightPressed: true })
      // The goblin is held where it stands, so only the weapon's own reach decides.
      for (let t = 0; t < 0.4; t += DT) {
        stepWorld(w, NO_INPUT, DT, first)
        g.x = x
        g.vx = 0
      }
      return g.hp < g.maxHp
    }
    expect(hit('swordShield')).toBe(false)
    expect(hit('longSword')).toBe(true)
  })

  it('the heavy spin cuts enemies on both sides at once', () => {
    const spin = (id: WeaponId) => {
      const w = quiet(id, 'mace')
      const a = dummy(w, 'goblin', 80)
      const b = dummy(w, 'goblin', -80)
      press(w, { heavyPressed: true })
      run(w, 0.8)
      return [a, b].map((g) => g.hp < g.maxHp)
    }
    expect(spin('longSword')).toEqual([true, true])
    expect(spin('swordShield')).not.toEqual([true, true])
  })

  it('the second heavy is a long thrust', () => {
    const w = quiet('longSword', 'mace')
    const far = dummy(w, 'orc', 215)
    press(w, { heavyPressed: true })
    until(w, () => w.player.stateTime >= WEAPONS.longSword.combos.heavy[0].cancelAt - 0.03)
    press(w, { heavyPressed: true })
    run(w, 0.7)
    expect(w.player.attackKind).toBe('heavy')
    expect(far.hp).toBeLessThan(far.maxHp)
  })
})

describe('mace', () => {
  it('staggers an orc in two light hits', () => {
    const w = quiet('mace', 'longSword')
    const orc = dummy(w, 'orc', 80)
    orc.hp = orc.maxHp = 1000
    press(w, { lightPressed: true })
    until(w, () => orc.hp < orc.maxHp)
    until(w, () => w.player.stateTime >= WEAPONS.mace.combos.light[0].cancelAt)
    orc.x = w.player.x + 80
    press(w, { lightPressed: true })
    run(w, 0.5)
    expect(stagger(orc)).toBe(true)
  })

  it('the slam sends a wave along the ground that hurts grounded enemies and runs on past them', () => {
    const w = quiet('mace', 'longSword')
    const near = dummy(w, 'goblin', 90)
    const far = dummy(w, 'goblin', 230)
    near.hp = near.maxHp = far.hp = far.maxHp = 1000
    press(w, { heavyPressed: true })
    until(w, () => w.waves.some((x) => x.friendly))
    run(w, 0.8)
    expect(far.hp).toBeLessThan(far.maxHp)
    expect(near.hp).toBeLessThan(near.maxHp)
    expect(w.waves.every((x) => !x.friendly || x.life > 0)).toBe(true)
  })

  it('the wave passes under an enemy that is in the air', () => {
    const w = quiet('mace', 'longSword')
    const g = dummy(w, 'goblin', 230)
    g.y = 120
    g.vy = 0
    press(w, { heavyPressed: true })
    until(w, () => w.waves.some((x) => x.friendly))
    // Keep the goblin up while the wave goes by.
    for (let t = 0; t < 0.6; t += DT) {
      g.y = 120
      g.vy = 0
      stepWorld(w, NO_INPUT, DT, first)
    }
    expect(g.hp).toBe(g.maxHp)
  })

  it('never hurts the player', () => {
    const w = quiet('mace', 'longSword')
    press(w, { heavyPressed: true })
    until(w, () => w.waves.some((x) => x.friendly))
    run(w, 0.8)
    expect(w.player.hp).toBe(PLAYER.maxHp)
  })
})

describe('bow', () => {
  it('shoots an arrow that hits the first enemy it meets, from afar', () => {
    const w = quiet('bow', 'mace')
    const near = dummy(w, 'goblin', 300)
    const far = dummy(w, 'goblin', 420)
    press(w, { lightPressed: true })
    run(w, 0.8)
    expect(near.hp).toBe(near.maxHp - WEAPONS.bow.combos.light[0].damage)
    expect(far.hp).toBe(far.maxHp)
    expect(w.arrows).toHaveLength(0)
  })

  it('turns to an enemy far away when no direction is held', () => {
    const w = quiet('bow', 'mace')
    const g = dummy(w, 'goblin', -400)
    press(w, { lightPressed: true })
    expect(w.player.facing).toBe(-1)
    run(w, 0.9)
    expect(g.hp).toBeLessThan(g.maxHp)
  })

  it('kicks instead of shooting when an enemy is right there', () => {
    const w = quiet('bow', 'mace')
    const g = dummy(w, 'goblin', 60)
    press(w, { lightPressed: true })
    expect(w.player.attackKind).toBe('close')
    run(w, 0.4)
    expect(w.arrows).toHaveLength(0)
    expect(g.hp).toBe(g.maxHp - WEAPONS.bow.combos.close[0].damage)
  })

  it('holds the draw while the button is down, and a long draw shoots a pierced line harder', () => {
    const shot = (heldFor: number) => {
      const w = quiet('bow', 'mace')
      const line = [200, 300, 400].map((x) => dummy(w, 'goblin', x))
      line.forEach((g) => (g.hp = g.maxHp = 1000))
      press(w, { heavyPressed: true, heavyHeld: true })
      run(w, heldFor, { heavyHeld: true })
      expect(w.player.drawing).toBe(heldFor < WEAPONS.bow.combos.heavy[0].charge!.max)
      run(w, 1)
      return line.map((g) => g.maxHp - g.hp)
    }
    const quick = shot(0.1)
    const full = shot(1)
    expect(quick.every((d) => d > 0)).toBe(true)
    expect(full.every((d) => d > 0)).toBe(true)
    expect(full[0]).toBeCloseTo(WEAPONS.bow.combos.heavy[0].damage, 5)
    // Let go as early as the draw allows: about the weakest shot.
    expect(quick[0]).toBeCloseTo(WEAPONS.bow.combos.heavy[0].damage * 0.3, 0)
  })

  it('a drawn shot spends stamina and cannot start without it', () => {
    const w = quiet('bow', 'mace')
    press(w, { heavyPressed: true, heavyHeld: true })
    expect(w.player.stamina).toBe(PLAYER.maxStamina - WEAPONS.bow.combos.heavy[0].stamina)
    const tired = quiet('bow', 'mace')
    tired.player.stamina = 5
    press(tired, { heavyPressed: true, heavyHeld: true })
    expect(tired.player.state).toBe('free')
  })

  it('a dash cancels a draw', () => {
    const w = quiet('bow', 'mace')
    press(w, { heavyPressed: true, heavyHeld: true })
    run(w, 0.1, { heavyHeld: true })
    expect(w.player.drawing).toBe(true)
    press(w, { dashPressed: true, heavyHeld: true })
    expect(w.player.state).toBe('dash')
    expect(w.player.drawing).toBe(false)
  })

  it('upgrades apply to arrows', () => {
    const w = quiet('bow', 'mace')
    w.upgrades = { whetstone: 2 }
    w.mods = computeMods(w.upgrades)
    const g = dummy(w, 'goblin', 300)
    g.hp = g.maxHp = 1000
    press(w, { lightPressed: true })
    run(w, 0.8)
    expect(g.maxHp - g.hp).toBeCloseTo(WEAPONS.bow.combos.light[0].damage * 1.3, 5)
  })

  it('does not hit an enemy in the air above the arrow', () => {
    const w = quiet('bow', 'mace')
    const g = dummy(w, 'goblin', 300)
    g.y = 200
    press(w, { lightPressed: true })
    for (let t = 0; t < 0.8; t += DT) {
      g.y = 200
      g.vy = 0
      stepWorld(w, NO_INPUT, DT, first)
    }
    expect(g.hp).toBe(g.maxHp)
    expect(ENEMIES.goblin.height).toBeLessThan(200)
  })
})
