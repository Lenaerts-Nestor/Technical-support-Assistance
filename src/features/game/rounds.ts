/**
 * The loop around the fighting: a round is a budget of enemies that arrive one by one; when it
 * is spent and the last one is down the round is won, the player is patched up, and a break
 * offers a choice of upgrades before the next, harder round.
 */
import { ARENA, COST, ENEMIES, ROUNDS, SCORE } from './config'
import type { EnemyKind, EnemyStats } from './config'
import { computeMods, offerUpgrades } from './upgrades'
import type { UpgradeId } from './upgrades'
import type { World } from './types'
import { isBossRound, maxAlive, maxOf, roundBudget, spawnInterval } from './pacing'
import { spawnEnemy } from './world'

type Rng = () => number

const alive = (w: World) => w.enemies.filter((e) => e.state !== 'dying')

/** Which kind arrives next: goblins mostly, with the tougher kinds mixed in as the rounds go on. */
function pickKind(w: World, rng: Rng): EnemyKind {
  // The boss comes first in a boss round; while it lives the crowd is only the small fry.
  if (isBossRound(w.round) && !w.bossSpawned) return 'warlord'
  const bossAlive = alive(w).some((e) => e.kind === 'warlord')
  const options: [EnemyKind, number][] = [['goblin', 6]]
  const count = (kind: EnemyKind) => alive(w).filter((e) => e.kind === kind).length
  if (w.round >= ROUNDS.orcFromRound && w.budget >= COST.orc && count('orc') < maxOf('orc', w.round)) options.push(['orc', 3])
  if (w.round >= ROUNDS.ogreFromRound && w.budget >= COST.ogre && !bossAlive && count('ogre') < maxOf('ogre', w.round)) options.push(['ogre', 1.5])
  let roll = rng() * options.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [kind, weight] of options) {
    roll -= weight
    if (roll < 0) return kind
  }
  return 'goblin'
}

/** Advance the round by one step: bring in the next enemy, notice a win, count down a streak. */
export function stepRound(w: World, dt: number, rng: Rng) {
  w.stageTime += dt
  w.streakTimer = Math.max(0, w.streakTimer - dt)
  if (w.streakTimer === 0) w.streak = 0

  if (w.stage === 'cleared') {
    if (w.stageTime >= ROUNDS.clearedTime) {
      w.stage = 'break'
      w.stageTime = 0
    }
    return
  }
  if (w.stage !== 'fight' || w.over) return

  if (w.budget > 0) {
    w.spawnTimer -= dt
    if (w.spawnTimer <= 0 && alive(w).length < maxAlive(w.round)) {
      const kind = pickKind(w, rng)
      const edge = ENEMIES[kind].halfWidth + ROUNDS.margin
      spawnEnemy(w, kind, rng() < 0.5 ? -edge : ARENA.width + edge)
      w.budget -= COST[kind]
      // The boss walks in alone; its crowd follows after a moment.
      if (kind === 'warlord') w.bossSpawned = true
      w.spawnTimer = kind === 'warlord' ? 3 : spawnInterval(w.round)
    }
  } else if (alive(w).length === 0) {
    clearRound(w, rng)
  }
}

/** The last enemy is down: pay the bonuses, patch the player up and line up the upgrades. */
function clearRound(w: World, rng: Rng) {
  const p = w.player
  const clearBonus = SCORE.clearBonus * w.round
  const flawlessBonus = w.hurtThisRound ? 0 : SCORE.flawlessBase + SCORE.flawlessPerRound * w.round
  const before = p.hp
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * ROUNDS.healShare))
  p.stamina = p.maxStamina
  w.score += clearBonus + flawlessBonus
  w.summary = { round: w.round, kills: w.roundKills, parries: w.roundParries, clearBonus, flawlessBonus, healed: p.hp - before }
  w.offer = offerUpgrades(w.upgrades, rng)
  w.picked = null
  w.stage = 'cleared'
  w.stageTime = 0
}

/** Take one of the upgrades on offer. Only works during the break, and only once. */
export function pickUpgrade(w: World, id: UpgradeId) {
  if (w.stage !== 'break' || w.picked || !w.offer.includes(id)) return false
  const p = w.player
  w.upgrades[id] = (w.upgrades[id] ?? 0) + 1
  const before = w.mods
  w.mods = computeMods(w.upgrades)
  // Extra capacity arrives full, so the upgrade is felt at once.
  p.maxHp += w.mods.maxHp - before.maxHp
  p.hp = Math.min(p.maxHp, p.hp + (w.mods.maxHp - before.maxHp))
  p.maxStamina += w.mods.maxStamina - before.maxStamina
  p.stamina = Math.min(p.maxStamina, p.stamina + (w.mods.maxStamina - before.maxStamina))
  w.picked = id
  return true
}

/** Leave the break and start the next, bigger round. */
export function nextRound(w: World) {
  if (w.stage !== 'break') return false
  w.round += 1
  w.stage = 'fight'
  w.stageTime = 0
  w.budget = w.roundBudget = roundBudget(w.round)
  w.bossSpawned = false
  w.spawnTimer = ROUNDS.firstDelay
  w.roundKills = 0
  w.roundParries = 0
  w.hurtThisRound = false
  w.offer = []
  w.picked = null
  w.summary = null
  w.player.invuln = Math.max(w.player.invuln, 0.6)
  return true
}

/** A kill: points scaled by the streak, a little healing if the player has earned it. */
export function awardKill(w: World, stats: EnemyStats) {
  w.kills += 1
  w.roundKills += 1
  w.streak = w.streakTimer > 0 ? w.streak + 1 : 1
  w.streakTimer = SCORE.streakTime + w.mods.streakTime
  w.score += Math.round(stats.score * streakMultiplier(w.streak))
  if (w.mods.healOnKill > 0) w.player.hp = Math.min(w.player.maxHp, w.player.hp + w.mods.healOnKill)
}

export const streakMultiplier = (streak: number) => Math.min(SCORE.maxMultiplier, 1 + SCORE.streakStep * Math.max(0, streak - 1))
