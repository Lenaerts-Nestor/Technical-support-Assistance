import { describe, expect, it } from 'vitest'
import { COST, ENEMIES, ROUNDS, SCORE } from './config'
import { DEFAULT_HERO, HEROES } from './heroes'
import { enemyHealthScale, enemyPower, isBossRound, maxAlive, maxOf, roundBudget } from './pacing'
import { awardKill, nextRound, pickUpgrade, streakMultiplier } from './rounds'
import { createWorld, spawnEnemy, stepWorld } from './sim'
import { NO_INPUT } from './types'
import type { EnemyKind } from './config'
import type { World } from './types'

const DT = 1 / 100

function rngFrom(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

/** Take down everyone on the field the way a kill would, so rounds can be driven without fighting. */
function defeatAll(w: World) {
  for (const e of w.enemies) {
    if (e.state === 'dying') continue
    e.state = 'dying'
    e.stateTime = 0
    awardKill(w, ENEMIES[e.kind])
  }
}

/** Take every shard and light every shrine, as if the player had gone round them all. */
function completeObjective(w: World) {
  for (const shard of w.objective.shards) shard.taken = true
  for (const shrine of w.objective.shrines) shrine.lit = true
}

/**
 * Play a round out with the player untouchable, killing everyone as they arrive. A round of
 * shards or shrines is completed after a while of that. Returns who came.
 */
function playRound(w: World, rng: () => number, hurt = false): EnemyKind[] {
  const seen = new Map<number, EnemyKind>()
  for (let t = 0; t < 600 && w.stage === 'fight'; t += DT) {
    stepWorld(w, NO_INPUT, DT, rng)
    w.player.invuln = 1
    for (const e of w.enemies) seen.set(e.id, e.kind)
    if (w.enemies.some((e) => e.state !== 'dying')) defeatAll(w)
    if (t > 12) completeObjective(w)
  }
  if (hurt) w.hurtThisRound = true
  return [...seen.values()]
}

const toBreak = (w: World, rng: () => number) => {
  for (let t = 0; t < 10 && w.stage !== 'break'; t += DT) stepWorld(w, NO_INPUT, DT, rng)
}

describe('pacing', () => {
  it('gives every round more to fight than the last ordinary one', () => {
    const ordinary = Array.from({ length: 30 }, (_, i) => i + 1).filter((r) => !isBossRound(r))
    for (let i = 1; i < ordinary.length; i++) expect(roundBudget(ordinary[i])).toBeGreaterThan(roundBudget(ordinary[i - 1]))
  })

  it('makes every fifth round a boss round, with the boss counted in its budget', () => {
    expect([1, 4, 5, 6, 10, 15].map(isBossRound)).toEqual([false, false, true, false, true, true])
    expect(roundBudget(5)).toBeGreaterThanOrEqual(COST.warlord)
    expect(maxAlive(5)).toBeLessThanOrEqual(5)
  })

  it('makes enemies tougher with every round after the first', () => {
    expect(enemyHealthScale(1)).toBe(1)
    expect(enemyPower(1)).toBe(1)
    expect(enemyHealthScale(2)).toBeGreaterThan(1)
    expect(enemyHealthScale(12)).toBeGreaterThan(enemyHealthScale(6))
    const w = createWorld()
    w.round = 12
    const demon = spawnEnemy(w, 'demon', 0)
    expect(demon.maxHp).toBeGreaterThan(ENEMIES.demon.hp)
    expect(demon.power).toBeGreaterThan(1)
    w.round = 1
    expect(spawnEnemy(w, 'demon', 0).maxHp).toBe(ENEMIES.demon.hp)
  })

  it('keeps the crowd small: it grows a little, within a low limit', () => {
    expect(maxAlive(10)).toBeGreaterThan(maxAlive(1))
    expect(maxAlive(1)).toBeLessThanOrEqual(3)
    expect(maxAlive(100)).toBeLessThanOrEqual(5)
  })
})

describe('a round', () => {
  it('spends exactly its budget on the first round, in imps and demons only', () => {
    const w = createWorld()
    const rng = rngFrom(1)
    const kinds = playRound(w, rng)
    expect(kinds.every((k) => k === 'imp' || k === 'demon')).toBe(true)
    expect(kinds.reduce((sum, k) => sum + COST[k], 0)).toBe(roundBudget(1))
    expect(w.stage).toBe('cleared')
  })

  it('opens the break after the banner, with a summary, bonuses and three upgrades on offer', () => {
    const w = createWorld()
    const rng = rngFrom(2)
    playRound(w, rng)
    const kills = w.kills
    expect(w.summary).toMatchObject({ round: 1, kills, clearBonus: SCORE.clearBonus })
    expect(w.summary?.flawlessBonus).toBe(SCORE.flawlessBase + SCORE.flawlessPerRound)
    expect(w.offer).toHaveLength(3)
    expect(new Set(w.offer).size).toBe(3)
    stepWorld(w, NO_INPUT, ROUNDS.clearedTime / 2, rng)
    expect(w.stage).toBe('cleared')
    toBreak(w, rng)
    expect(w.stage).toBe('break')
  })

  it('pays no flawless bonus after taking a hit, and patches the player up', () => {
    const w = createWorld()
    const rng = rngFrom(3)
    w.player.hp = 20
    w.player.stamina = 0
    w.hurtThisRound = true
    playRound(w, rng)
    expect(w.summary?.flawlessBonus).toBe(0)
    expect(w.player.hp).toBe(20 + Math.round(w.player.maxHp * ROUNDS.healShare))
    expect(w.player.stamina).toBe(w.player.maxStamina)
    expect(w.summary?.healed).toBe(w.player.hp - 20)
  })

  it('stands still during the break and moves on to a bigger round when asked', () => {
    const w = createWorld()
    const rng = rngFrom(4)
    playRound(w, rng)
    expect(nextRound(w)).toBe(false)
    toBreak(w, rng)
    expect(nextRound(w)).toBe(true)
    expect(w.round).toBe(2)
    expect(w.stage).toBe('fight')
    expect(w.budget).toBe(roundBudget(2))
    expect(w.roundKills).toBe(0)
    expect(w.hurtThisRound).toBe(false)
    expect(w.offer).toHaveLength(0)
  })

  it('brings in each kind from its round on, and the boss on round five, within the limits', () => {
    const w = createWorld()
    const rng = rngFrom(5)
    const everSeen = new Set<EnemyKind>()
    for (let round = 1; round <= 9; round++) {
      let peakOgres = 0
      const seen = new Map<number, EnemyKind>()
      for (let t = 0; t < 600 && w.stage === 'fight'; t += DT) {
        stepWorld(w, NO_INPUT, DT, rng)
        w.player.invuln = 1
        for (const e of w.enemies) seen.set(e.id, e.kind)
        expect(w.enemies.filter((e) => e.state !== 'dying').length).toBeLessThanOrEqual(maxAlive(round))
        peakOgres = Math.max(peakOgres, w.enemies.filter((e) => e.kind === 'brute' && e.state !== 'dying').length)
        // Let each wave of arrivals live a moment, so the limits get tested.
        if (w.enemies.filter((e) => e.state !== 'dying').length >= maxAlive(round) || w.budget <= 0) defeatAll(w)
        if (t > 30) completeObjective(w)
      }
      expect(w.stage).not.toBe('fight')
      const kinds = new Set(seen.values())
      kinds.forEach((k) => everSeen.add(k))
      for (const kind of kinds) expect(round).toBeGreaterThanOrEqual(ROUNDS.unlock[kind])
      expect(kinds.has('warlord')).toBe(isBossRound(round))
      expect(peakOgres).toBeLessThanOrEqual(maxOf('brute', round))
      toBreak(w, rng)
      nextRound(w)
    }
    expect([...everSeen].sort()).toEqual(['archer', 'brute', 'demon', 'imp', 'lancer', 'warlord'])
  })

  it('does not clear while the player is dead', () => {
    const w = createWorld()
    w.over = true
    w.player.state = 'dead'
    w.budget = 0
    for (let t = 0; t < 3; t += DT) stepWorld(w, NO_INPUT, DT, rngFrom(1))
    expect(w.stage).toBe('fight')
  })
})

describe('score', () => {
  it('multiplies kills in a streak and falls back when it lapses', () => {
    const w = createWorld()
    const imp = ENEMIES.imp
    awardKill(w, imp)
    expect(w.score).toBe(imp.score)
    awardKill(w, imp)
    expect(w.score).toBe(imp.score + Math.round(imp.score * streakMultiplier(2)))
    expect(streakMultiplier(2)).toBeGreaterThan(1)
    expect(streakMultiplier(1000)).toBe(SCORE.maxMultiplier)
    // Let the streak run out.
    for (let t = 0; t < SCORE.streakTime + 0.5; t += DT) stepWorld(w, NO_INPUT, DT, rngFrom(1))
    expect(w.streak).toBe(0)
    const before = w.score
    awardKill(w, imp)
    expect(w.score - before).toBe(imp.score)
  })

  it('loses the streak when the player is hurt', () => {
    const w = createWorld()
    w.spawnTimer = 1e9
    awardKill(w, ENEMIES.imp)
    awardKill(w, ENEMIES.imp)
    expect(w.streak).toBe(2)
    // An imp leaps onto the player.
    const e = spawnEnemy(w, 'imp', w.player.x + 100)
    e.cooldown = 0
    for (let t = 0; t < 1.3; t += DT) stepWorld(w, NO_INPUT, DT, rngFrom(1))
    expect(w.streak).toBe(0)
    expect(w.hurtThisRound).toBe(true)
  })
})

describe('upgrade picks', () => {
  const readyForBreak = () => {
    const w = createWorld()
    const rng = rngFrom(9)
    playRound(w, rng)
    toBreak(w, rng)
    return w
  }

  it('takes one upgrade from the offer, and swaps it for another until the round starts', () => {
    const w = readyForBreak()
    const [first, second] = w.offer
    expect(pickUpgrade(w, first)).toBe(true)
    expect(w.picked).toBe(first)
    expect(w.upgrades[first]).toBe(1)
    expect(pickUpgrade(w, second)).toBe(true)
    expect(w.picked).toBe(second)
    expect(w.upgrades[first]).toBeUndefined()
    expect(w.upgrades[second]).toBe(1)
    nextRound(w)
    expect(pickUpgrade(w, first)).toBe(false)
  })

  it('hands back the extra health of an upgrade swapped away', () => {
    const w = readyForBreak()
    w.offer = ['hardened', 'lungs', 'whetstone']
    const maxHp = w.player.maxHp
    w.player.hp = 50
    pickUpgrade(w, 'hardened')
    expect(w.player.maxHp).toBe(maxHp + 20)
    pickUpgrade(w, 'whetstone')
    expect(w.player.maxHp).toBe(maxHp)
    expect(w.player.hp).toBe(50)
    expect(w.mods.damage).toBeGreaterThan(1)
  })

  it('refuses an upgrade that is not on offer, or outside the break', () => {
    const w = readyForBreak()
    const notOffered = (['whetstone', 'hardened', 'lungs', 'fleet', 'reaper'] as const).find((id) => !w.offer.includes(id))!
    expect(pickUpgrade(w, notOffered)).toBe(false)
    const fresh = createWorld()
    fresh.offer = ['whetstone']
    expect(pickUpgrade(fresh, 'whetstone')).toBe(false)
  })

  it('gives extra health and stamina at once, not just room for it', () => {
    const w = readyForBreak()
    w.offer = ['hardened', 'lungs', 'whetstone']
    w.player.hp = 50
    pickUpgrade(w, 'hardened')
    expect(w.player.maxHp).toBe(HEROES[DEFAULT_HERO].hp + 20)
    expect(w.player.hp).toBe(70)
    nextRound(w)
    toBreak(w, rngFrom(1))
    // A second break is not needed to test stamina: use a fresh one.
    const v = readyForBreak()
    v.offer = ['lungs', 'hardened', 'whetstone']
    v.player.stamina = 40
    pickUpgrade(v, 'lungs')
    expect(v.player.maxStamina).toBe(120)
    expect(v.player.stamina).toBe(60)
  })
})
