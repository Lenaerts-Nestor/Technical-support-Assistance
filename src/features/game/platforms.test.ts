import { describe, expect, it } from 'vitest'
import { BIOMES, BIOME_ORDER, LEDGE, biomeForRound, startsBiome } from './biomes'
import { ENEMIES, PLAYER } from './config'
import { HEROES } from './heroes'
import type { HeroId } from './heroes'
import { nextRound } from './rounds'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { NO_INPUT } from './types'
import type { FrameInput, World } from './types'
import { offerUpgrades } from './upgrades'

const DT = 1 / 120
const rng = () => 0.9

function quiet(hero: HeroId = 'soldier'): World {
  const w = createWorld(hero)
  w.spawnTimer = 1e9
  return w
}

const run = (w: World, seconds: number, input: Partial<FrameInput> = {}) => {
  const held = { ...NO_INPUT, ...input, jumpPressed: false, dashPressed: false, lightPressed: false, heavyPressed: false }
  for (let t = 0; t < seconds; t += DT) stepWorld(w, held, DT, rng)
}
const press = (w: World, input: Partial<FrameInput>) => stepWorld(w, { ...NO_INPUT, ...input }, DT, rng)

/** A ledge under the player, wide enough to jump onto and stand on. */
const withLedge = (w: World, width = 300) => {
  w.platforms = [{ cx: w.player.x, width, y: LEDGE, sprite: 'plat_a' }]
}

/** Jump and hold the key until the hero is standing on the ledge. */
const climb = (w: World) => {
  press(w, { jumpPressed: true, jumpHeld: true })
  run(w, 1.2, { jumpHeld: true })
}

describe('ledges', () => {
  it('can be jumped onto from below and stood on', () => {
    const w = quiet()
    withLedge(w)
    climb(w)
    expect(w.player.y).toBe(LEDGE)
    expect(w.player.grounded).toBe(true)
  })

  it('is out of reach of a short hop, which comes down to the ground', () => {
    const w = quiet()
    withLedge(w)
    press(w, { jumpPressed: true, jumpHeld: true })
    run(w, 1.2, { jumpHeld: false })
    expect(w.player.y).toBe(0)
  })

  it('lets the hero jump up through it without bumping their head', () => {
    const w = quiet()
    withLedge(w)
    press(w, { jumpPressed: true, jumpHeld: true })
    let peak = 0
    for (let t = 0; t < 0.5; t += DT) {
      stepWorld(w, { ...NO_INPUT, jumpHeld: true }, DT, rng)
      peak = Math.max(peak, w.player.y)
    }
    expect(peak).toBeGreaterThan(LEDGE + 5)
  })

  it('is dropped through by holding down', () => {
    const w = quiet()
    withLedge(w)
    climb(w)
    run(w, 0.1, { downHeld: true })
    run(w, 0.8)
    expect(w.player.y).toBe(0)
  })

  it('lets go of the hero who walks off the edge', () => {
    const w = quiet()
    withLedge(w, 200)
    climb(w)
    run(w, 1.5, { move: 1 })
    expect(w.player.x).toBeGreaterThan(w.platforms[0].cx + 100)
    expect(w.player.y).toBe(0)
  })

  it('does not stop the hero standing on the ground beneath', () => {
    const w = quiet()
    withLedge(w)
    run(w, 0.5, { move: 1 })
    expect(w.player.y).toBe(0)
    expect(w.player.grounded).toBe(true)
  })
})

describe('enemies and ledges', () => {
  it('goblins hop up to a player standing on a ledge', () => {
    const w = quiet()
    withLedge(w)
    climb(w)
    const goblin = spawnEnemy(w, 'goblin', w.player.x + 90)
    goblin.cooldown = 1e9
    let top = 0
    for (let t = 0; t < 3; t += DT) {
      stepWorld(w, NO_INPUT, DT, rng)
      top = Math.max(top, goblin.y)
    }
    expect(top).toBeGreaterThan(LEDGE * 0.8)
  })

  it('orcs can hop too, but ogres stay on the ground', () => {
    expect(ENEMIES.orc.canJump).toBe(true)
    const w = quiet()
    withLedge(w)
    climb(w)
    const ogre = spawnEnemy(w, 'ogre', w.player.x + 120)
    ogre.cooldown = 1e9
    run(w, 2.5)
    expect(ogre.y).toBe(0)
  })

  it('come down off a ledge to reach a player on the ground', () => {
    const w = quiet()
    w.player.x = 140
    w.platforms = [{ cx: 480, width: 240, y: LEDGE, sprite: 'plat_a' }]
    const goblin = spawnEnemy(w, 'goblin', 480)
    goblin.y = LEDGE
    goblin.cooldown = 1e9
    run(w, 3)
    expect(goblin.y).toBe(0)
    expect(goblin.x).toBeLessThan(400)
  })

  it('do not attack a player on a ledge from the ground below', () => {
    const w = quiet()
    withLedge(w)
    climb(w)
    const orc = spawnEnemy(w, 'orc', w.player.x + 70)
    orc.cooldown = 0
    orc.jumpCooldown = 1e9
    run(w, 1)
    expect(orc.state).toBe('walk')
    expect(w.player.hp).toBe(w.player.maxHp)
  })
})

describe('places', () => {
  it('changes every fifth round, cycling through all three', () => {
    expect([1, 5, 6, 10, 11, 15, 16].map(biomeForRound)).toEqual(['cave', 'cave', 'jungle', 'jungle', 'overgrown', 'overgrown', 'cave'])
    expect(BIOME_ORDER).toHaveLength(3)
    expect([1, 2, 6, 11].map(startsBiome)).toEqual([true, false, true, true])
  })

  it('puts the ledges of the new place in the world when the next round starts', () => {
    const w = quiet()
    expect(w.biome).toBe('cave')
    w.round = 5
    w.stage = 'break'
    nextRound(w)
    expect(w.round).toBe(6)
    expect(w.biome).toBe('jungle')
    expect(w.platforms).toEqual(BIOMES.jungle.platforms)
  })

  it('keeps every ledge inside the arena and within a jump of the ground', () => {
    for (const biome of Object.values(BIOMES)) {
      for (const ledge of biome.platforms) {
        expect(ledge.cx - ledge.width / 2).toBeGreaterThanOrEqual(0)
        expect(ledge.cx + ledge.width / 2).toBeLessThanOrEqual(960)
        expect(ledge.y).toBeLessThan(PLAYER.jumpSpeed ** 2 / (2 * PLAYER.gravity))
      }
    }
  })
})

describe('hero moves', () => {
  it('gives the orc a shockwave that hurts enemies along the ground', () => {
    const w = quiet('orc')
    const goblin = spawnEnemy(w, 'goblin', w.player.x + 330)
    goblin.cooldown = 1e9
    press(w, { heavyPressed: true })
    run(w, 1.2)
    expect(goblin.hp).toBeLessThan(ENEMIES.goblin.hp)
    expect(w.player.hp).toBe(w.player.maxHp)
  })

  it('makes the demon untouchable during its rush', () => {
    const w = quiet('demon')
    const step = HEROES.demon.combos.heavy[0]
    press(w, { heavyPressed: true })
    run(w, (step.hitStart + step.hitEnd) / 2)
    expect(w.player.state).toBe('attack')
    expect(w.player.invuln).toBeGreaterThan(0)
  })

  it('has the monster leap off the ground in its pounce', () => {
    const w = quiet('monster')
    const step = HEROES.monster.combos.heavy[0]
    press(w, { heavyPressed: true })
    run(w, step.hitStart + 0.05)
    expect(w.player.y).toBeGreaterThan(5)
    run(w, 1)
    expect(w.player.y).toBe(0)
  })

  it('gives each hero its own body', () => {
    for (const hero of Object.values(HEROES)) {
      const w = createWorld(hero.id)
      expect(w.hero).toBe(hero.id)
      expect(w.player.maxHp).toBe(hero.hp)
      expect(w.player.speed).toBe(hero.speed)
      expect(w.player.height).toBe(hero.height)
    }
  })

  it('does not raise a shield for a hero without one', () => {
    const w = quiet('orc')
    run(w, 0.3, { blockHeld: true })
    expect(w.player.state).toBe('free')
  })

  it('leaves shield upgrades out of the offer for a hero without a shield', () => {
    for (let seed = 0; seed < 60; seed++) {
      let s = seed + 1
      const random = () => ((s = (s * 16807) % 2147483647) / 2147483647)
      const offer = offerUpgrades({}, random, 3, false)
      expect(offer).toHaveLength(3)
      expect(offer.filter((id) => ['bulwark', 'keenEye', 'riposte'].includes(id))).toEqual([])
    }
  })
})
