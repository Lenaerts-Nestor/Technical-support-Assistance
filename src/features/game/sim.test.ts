import { describe, expect, it } from 'vitest'
import { ARENA, ENEMIES, LIGHT_COMBO, PLAYER } from './config'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { NO_INPUT } from './types'
import type { FrameInput, World } from './types'

const DT = 1 / 120
const first = () => 0.9

/** A world with no spawner, so a test controls exactly who is in it. */
function quiet(): World {
  const w = createWorld()
  w.spawnTimer = 1e9
  return w
}

const run = (w: World, seconds: number, input: Partial<FrameInput> = {}) => {
  const frame = { ...NO_INPUT, ...input }
  for (let t = 0; t < seconds; t += DT) stepWorld(w, { ...frame, jumpPressed: false, dashPressed: false, lightPressed: false }, DT, first)
}
const press = (w: World, input: Partial<FrameInput>) => stepWorld(w, { ...NO_INPUT, ...input }, DT, first)

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

  it('dashes quickly forward and cannot dash again straight away', () => {
    const w = quiet()
    const start = w.player.x
    press(w, { dashPressed: true })
    expect(w.player.state).toBe('dash')
    run(w, 0.2)
    expect(w.player.x - start).toBeGreaterThan(100)
    const after = w.player.x
    press(w, { dashPressed: true })
    expect(w.player.state).not.toBe('dash')
    expect(w.player.x - after).toBeLessThan(10)
  })
})

describe('combat', () => {
  const beside = (w: World, offset = 70) => spawnEnemy(w, 'goblin', w.player.x + offset)

  it('a light hit hurts and knocks back an enemy in front, and only once per swing', () => {
    const w = quiet()
    const goblin = beside(w)
    goblin.cooldown = 99
    const startX = goblin.x
    press(w, { lightPressed: true })
    run(w, 0.3)
    expect(goblin.hp).toBe(ENEMIES.goblin.hp - LIGHT_COMBO[0].damage)
    expect(goblin.x).toBeGreaterThan(startX + 10)
  })

  it('does not hit an enemy behind the player', () => {
    const w = quiet()
    const goblin = beside(w, -70)
    goblin.cooldown = 99
    press(w, { lightPressed: true, move: 1 })
    run(w, 0.3, { move: 1 })
    expect(goblin.hp).toBe(ENEMIES.goblin.hp)
  })

  it('turns towards a nearby enemy when no direction is held', () => {
    const w = quiet()
    const goblin = beside(w, -70)
    goblin.cooldown = 99
    press(w, { lightPressed: true })
    expect(w.player.facing).toBe(-1)
    run(w, 0.3)
    expect(goblin.hp).toBeLessThan(ENEMIES.goblin.hp)
  })

  it('chains three presses into the finisher, which hits hardest', () => {
    const w = quiet()
    const goblin = beside(w)
    goblin.cooldown = 99
    goblin.hp = goblin.maxHp = 500
    const seen: number[] = []
    press(w, { lightPressed: true })
    for (let t = 0; t < 1.6; t += DT) {
      const idx = w.player.attackIndex
      if (w.player.state === 'attack' && seen[seen.length - 1] !== idx) seen.push(idx)
      // Keep tapping: the buffer should turn taps into the next hit as soon as it is allowed.
      stepWorld(w, { ...NO_INPUT, lightPressed: Math.round(t / DT) % 20 === 0 }, DT, first)
      goblin.x = w.player.x + 70
      goblin.state = 'hurt'
      goblin.stateTime = 0
    }
    expect(seen.slice(0, 3)).toEqual([0, 1, 2])
  })

  it('kills a goblin in two light hits and scores it', () => {
    const w = quiet()
    const goblin = beside(w)
    goblin.cooldown = 99
    press(w, { lightPressed: true })
    run(w, 0.25)
    goblin.x = w.player.x + 70
    press(w, { lightPressed: true })
    run(w, 0.3)
    expect(goblin.state).toBe('dying')
    expect(w.kills).toBe(1)
    expect(w.score).toBe(ENEMIES.goblin.score)
    run(w, 1)
    expect(w.enemies).toHaveLength(0)
  })

  it('freezes the world for a moment on a solid hit', () => {
    const w = quiet()
    const goblin = beside(w)
    goblin.cooldown = 99
    press(w, { lightPressed: true })
    run(w, 0.1)
    expect(w.freeze).toBeGreaterThan(0)
    expect(w.shake).toBeGreaterThan(0)
  })
})

describe('enemies', () => {
  it('a goblin winds up, leaps, and hurts a player standing still', () => {
    const w = quiet()
    spawnEnemy(w, 'goblin', w.player.x + 100)
    run(w, 1.2)
    expect(w.player.hp).toBe(PLAYER.maxHp - ENEMIES.goblin.damage)
  })

  it('a dash through the leap avoids the damage', () => {
    const w = quiet()
    const goblin = spawnEnemy(w, 'goblin', w.player.x + 100)
    goblin.cooldown = 0
    // Dash exactly while the goblin is in the air.
    for (let t = 0; t < 1.5; t += DT) {
      stepWorld(w, { ...NO_INPUT, dashPressed: goblin.state === 'leap' && w.player.state !== 'dash' && w.player.dashCooldown <= 0 }, DT, first)
    }
    expect(w.player.hp).toBe(PLAYER.maxHp)
  })

  it('a jump clears the leap', () => {
    const w = quiet()
    const goblin = spawnEnemy(w, 'goblin', w.player.x + 100)
    for (let t = 0; t < 1.5; t += DT) {
      stepWorld(w, { ...NO_INPUT, jumpPressed: goblin.state === 'windup' && goblin.stateTime > 0.3 && w.player.grounded, jumpHeld: true }, DT, first)
    }
    expect(w.player.hp).toBe(PLAYER.maxHp)
  })

  it('spawns goblins from the edges, never beyond the cap', () => {
    const w = createWorld()
    w.player.x = ARENA.width / 2
    const alive = () => w.enemies.filter((e) => e.state !== 'dying').length
    let max = 0
    for (let t = 0; t < 30; t += DT) {
      stepWorld(w, NO_INPUT, DT, first)
      max = Math.max(max, alive())
      w.player.hp = w.player.maxHp
      w.player.invuln = 1
    }
    expect(max).toBeGreaterThan(0)
    expect(max).toBeLessThanOrEqual(4)
  })
})

describe('death', () => {
  it('ends the run at zero health and stops new spawns', () => {
    const w = createWorld()
    w.player.hp = 1
    spawnEnemy(w, 'goblin', w.player.x + 100)
    run(w, 1.5)
    expect(w.over).toBe(true)
    expect(w.player.state).toBe('dead')
    const count = w.enemies.length
    run(w, 6)
    expect(w.enemies.length).toBeLessThanOrEqual(count)
  })
})
