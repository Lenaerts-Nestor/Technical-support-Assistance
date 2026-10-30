import { describe, expect, it } from 'vitest'
import { BIOMES, BIOME_ORDER, LEDGE, biomeForRound, entrances, ledgeLeft, ledgeRight, startsBiome } from './biomes'
import { ARENA, CAMERA, ENEMIES, PLAYER, TIER } from './config'
import { HEROES } from './heroes'
import type { HeroId } from './heroes'
import { nextRound } from './rounds'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { NO_INPUT } from './types'
import type { FrameInput, World } from './types'
import { offerUpgrades } from './upgrades'

const DT = 1 / 120
const rng = () => 0.9

function quiet(hero: HeroId = 'huntress'): World {
  const w = createWorld(hero)
  w.spawnTimer = 1e9
  w.platforms = []
  return w
}

const run = (w: World, seconds: number, input: Partial<FrameInput> = {}) => {
  const held = { ...NO_INPUT, ...input, jumpPressed: false, dashPressed: false, lightPressed: false, heavyPressed: false }
  for (let t = 0; t < seconds; t += DT) stepWorld(w, held, DT, rng)
}
const press = (w: World, input: Partial<FrameInput>) => stepWorld(w, { ...NO_INPUT, ...input }, DT, rng)

/** A ledge over the player, wide enough to jump onto and stand on; a second one stacked above it if asked. */
const withLedges = (w: World, tiers = 1, width = 300) => {
  w.platforms = Array.from({ length: tiers }, (_, i) => ({ cx: w.player.x, width, y: LEDGE * (i + 1) }))
}

/** Jump and hold the key until the hero is standing on the ledge above. */
const climb = (w: World) => {
  press(w, { jumpPressed: true, jumpHeld: true })
  run(w, 1.2, { jumpHeld: true })
}

describe('ledges', () => {
  it('can be jumped onto from below and stood on, one tier at a time up to the third', () => {
    const w = quiet()
    withLedges(w, 3)
    for (let tier = 1; tier <= 3; tier++) {
      climb(w)
      expect(w.player.y).toBe(LEDGE * tier)
      expect(w.player.grounded).toBe(true)
    }
  })

  it('is out of reach of a short hop, which comes down to the ground', () => {
    const w = quiet()
    withLedges(w)
    press(w, { jumpPressed: true, jumpHeld: true })
    run(w, 1.2, { jumpHeld: false })
    expect(w.player.y).toBe(0)
  })

  it('lets the hero jump up through it without bumping their head', () => {
    const w = quiet()
    withLedges(w)
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
    withLedges(w)
    climb(w)
    run(w, 0.1, { downHeld: true })
    run(w, 0.8)
    expect(w.player.y).toBe(0)
  })

  it('lets go of the hero who walks off the edge', () => {
    const w = quiet()
    withLedges(w, 1, 200)
    climb(w)
    run(w, 1.5, { move: 1 })
    expect(w.player.x).toBeGreaterThan(w.platforms[0].cx + 100)
    expect(w.player.y).toBe(0)
  })

  it('does not stop the hero standing on the ground beneath', () => {
    const w = quiet()
    withLedges(w)
    run(w, 0.5, { move: 1 })
    expect(w.player.y).toBe(0)
    expect(w.player.grounded).toBe(true)
  })
})

describe('the camera', () => {
  it('stays down on the ground, rises as the hero climbs, and stops at its limit', () => {
    const w = quiet()
    run(w, 1)
    expect(w.camY).toBe(0)
    withLedges(w, 3)
    for (let tier = 0; tier < 3; tier++) climb(w)
    run(w, 2)
    expect(w.camY).toBeGreaterThan(CAMERA.maxRise * 0.9)
    expect(w.camY).toBeLessThanOrEqual(CAMERA.maxRise)
    for (let tier = 0; tier < 3; tier++) {
      run(w, 0.1, { downHeld: true })
      run(w, 0.8)
    }
    run(w, 3)
    expect(w.player.y).toBe(0)
    expect(w.camY).toBeLessThan(5)
  })

  it('keeps the top tier on screen when it has risen all the way', () => {
    // The view shows `groundY + camY` of height above the ground.
    expect(ARENA.groundY + CAMERA.maxRise).toBeGreaterThan(TIER.step * TIER.count + 120)
  })
})

describe('enemies and ledges', () => {
  it('imps climb tier by tier to a player high up', () => {
    const w = quiet()
    withLedges(w, 2)
    climb(w)
    climb(w)
    expect(w.player.y).toBe(LEDGE * 2)
    const imp = spawnEnemy(w, 'imp', w.player.x + 260)
    imp.cooldown = 1e9
    let top = 0
    for (let t = 0; t < 6; t += DT) {
      stepWorld(w, NO_INPUT, DT, rng)
      top = Math.max(top, imp.grounded ? imp.y : 0)
    }
    expect(top).toBe(LEDGE * 2)
  })

  it('head for a ledge they can reach when the player is above a gap', () => {
    const w = quiet()
    // The player stands on a high ledge; the only way up is a ledge off to the left.
    w.platforms = [
      { cx: 300, width: 240, y: LEDGE },
      { cx: 500, width: 240, y: LEDGE * 2 },
    ]
    w.player.x = 560
    w.player.y = LEDGE * 2
    const demon = spawnEnemy(w, 'demon', 800)
    demon.cooldown = 1e9
    let reached = false
    for (let t = 0; t < 10 && !reached; t += DT) {
      stepWorld(w, NO_INPUT, DT, rng)
      w.player.x = 560
      reached = demon.grounded && demon.y === LEDGE * 2
    }
    expect(reached).toBe(true)
  })

  it('brutes stay on the ground', () => {
    expect(ENEMIES.demon.canJump).toBe(true)
    expect(ENEMIES.brute.canJump).toBe(false)
    const w = quiet()
    withLedges(w)
    climb(w)
    const brute = spawnEnemy(w, 'brute', w.player.x + 120)
    brute.cooldown = 1e9
    run(w, 2.5)
    expect(brute.y).toBe(0)
  })

  it('come down off a ledge to reach a player on the ground', () => {
    const w = quiet()
    w.player.x = 140
    w.platforms = [{ cx: 480, width: 240, y: LEDGE }]
    const imp = spawnEnemy(w, 'imp', 480, undefined, { y: LEDGE })
    imp.cooldown = 1e9
    run(w, 3)
    expect(imp.y).toBe(0)
    expect(imp.x).toBeLessThan(400)
  })

  it('do not attack a player on a ledge from the ground below', () => {
    const w = quiet()
    withLedges(w)
    climb(w)
    const demon = spawnEnemy(w, 'demon', w.player.x + 70)
    demon.cooldown = 0
    demon.jumpCooldown = 1e9
    run(w, 1)
    expect(demon.state).toBe('walk')
    expect(w.player.hp).toBe(w.player.maxHp)
  })
})

describe('places', () => {
  it('changes every fifth round, cycling through all three', () => {
    expect([1, 5, 6, 10, 11, 15, 16].map(biomeForRound)).toEqual(['wetlands', 'wetlands', 'hollow', 'hollow', 'abyss', 'abyss', 'wetlands'])
    expect(BIOME_ORDER).toHaveLength(3)
    expect([1, 2, 6, 11].map(startsBiome)).toEqual([true, false, true, true])
  })

  it('puts the ledges of the new place in the world when the next round starts', () => {
    const w = createWorld()
    expect(w.biome).toBe('wetlands')
    w.round = 5
    w.stage = 'break'
    nextRound(w, rng)
    expect(w.round).toBe(6)
    expect(w.biome).toBe('hollow')
    expect(w.platforms).toEqual(BIOMES.hollow.platforms)
  })

  it('has three tiers of ledges inside the arena, each within a jump of the tier below', () => {
    const reach = PLAYER.jumpSpeed ** 2 / (2 * PLAYER.gravity)
    for (const biome of Object.values(BIOMES)) {
      expect(new Set(biome.platforms.map((p) => p.y))).toEqual(new Set([TIER.step, TIER.step * 2, TIER.step * 3]))
      for (const ledge of biome.platforms) {
        expect(ledgeLeft(ledge)).toBeGreaterThanOrEqual(0)
        expect(ledgeRight(ledge)).toBeLessThanOrEqual(ARENA.width)
        expect(TIER.step).toBeLessThan(reach)
        if (ledge.y === TIER.step) continue
        // Some ledge a tier lower lies under it or close beside it, so a running jump gets there.
        const below = biome.platforms.filter((p) => p.y === ledge.y - TIER.step)
        const near = below.some((p) => ledgeLeft(p) <= ledgeRight(ledge) + 80 && ledgeRight(p) >= ledgeLeft(ledge) - 80)
        expect(near, `${biome.id} ledge at ${ledge.cx}, ${ledge.y}`).toBe(true)
      }
    }
  })

  it('has a way in on the ledges at the sides in every place, as well as on the ground', () => {
    for (const biome of Object.values(BIOMES)) {
      const ways = entrances(biome.platforms)
      expect(ways.left[0]).toBe(0)
      expect(ways.right[0]).toBe(0)
      expect(ways.left.length + ways.right.length).toBeGreaterThan(2)
    }
  })
})

describe('hero moves', () => {
  it('the Huntress dives onto an enemy below and bounces off it', () => {
    const w = quiet('huntress')
    const imp = spawnEnemy(w, 'imp', w.player.x)
    imp.cooldown = 1e9
    imp.hp = imp.maxHp = 500
    w.player.y = 260
    w.player.grounded = false
    press(w, { lightPressed: true, downHeld: true })
    expect(w.player.attackKind).toBe('airDown')
    let bounced = false
    for (let t = 0; t < 1 && !bounced; t += DT) {
      stepWorld(w, { ...NO_INPUT, downHeld: true }, DT, rng)
      imp.x = w.player.x
      bounced = w.player.vy > 300
    }
    expect(imp.hp).toBeLessThan(500)
    expect(bounced).toBe(true)
  })

  it('the Huntress cuts out of a dash', () => {
    const w = quiet('huntress')
    press(w, { dashPressed: true })
    press(w, { lightPressed: true })
    expect(w.player.state).toBe('attack')
    expect(w.player.attackKind).toBe('dashAttack')
  })

  it('the Huntress is untouchable during her phantom dash', () => {
    const w = quiet('huntress')
    const step = HEROES.huntress.combos.heavy[0]
    press(w, { heavyPressed: true })
    run(w, (step.hitStart + step.hitEnd) / 2)
    expect(w.player.state).toBe('attack')
    expect(w.player.invuln).toBeGreaterThan(0)
  })

  it('the Hallokin jumps a second time in the air, and only once', () => {
    const w = quiet('hallokin')
    press(w, { jumpPressed: true, jumpHeld: true })
    run(w, 0.25, { jumpHeld: true })
    press(w, { jumpPressed: true, jumpHeld: true })
    expect(w.player.vy).toBeGreaterThan(PLAYER.jumpSpeed * 0.8)
    run(w, 0.1, { jumpHeld: true })
    const vy = w.player.vy
    press(w, { jumpPressed: true, jumpHeld: true })
    expect(w.player.vy).toBeLessThanOrEqual(vy)
    // Landing gives the extra jump back.
    run(w, 2)
    expect(w.player.airJumps).toBe(1)
  })

  it("the Hallokin's flame pillar reaches an enemy on the ledge above", () => {
    const w = quiet('hallokin')
    withLedges(w)
    const imp = spawnEnemy(w, 'imp', w.player.x + 20, undefined, { y: LEDGE })
    imp.cooldown = 1e9
    imp.jumpCooldown = 1e9
    press(w, { heavyPressed: true })
    run(w, 0.5)
    expect(imp.hp).toBeLessThan(imp.maxHp)
  })

  it("the Warden's tail whip hits behind it", () => {
    const w = quiet('warden')
    const imp = spawnEnemy(w, 'imp', w.player.x - 90)
    imp.cooldown = 1e9
    imp.hp = imp.maxHp = 500
    w.player.attackKind = 'light'
    w.player.attackIndex = 2
    w.player.comboWindow = 1
    press(w, { lightPressed: true, move: 1 })
    expect(w.player.attackIndex).toBe(2)
    run(w, 0.5)
    expect(imp.hp).toBeLessThan(500)
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

  it('does not raise a guard for a hero without one', () => {
    const w = quiet('huntress')
    run(w, 0.3, { blockHeld: true })
    expect(w.player.state).toBe('free')
  })

  it('leaves guard upgrades out of the offer for a hero without a guard', () => {
    for (let seed = 0; seed < 60; seed++) {
      let s = seed + 1
      const random = () => ((s = (s * 16807) % 2147483647) / 2147483647)
      const offer = offerUpgrades({}, random, 3, false)
      expect(offer).toHaveLength(3)
      expect(offer.filter((id) => ['bulwark', 'keenEye', 'riposte'].includes(id))).toEqual([])
    }
  })
})
