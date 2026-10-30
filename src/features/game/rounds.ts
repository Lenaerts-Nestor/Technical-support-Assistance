/**
 * The loop around the fighting. A round is won by doing what its objective asks: putting down a
 * budget of enemies, gathering soul shards over the ledges, lighting shrines, or felling the
 * boss. Enemies walk in from the sides, on the ground or on a ledge that meets the side, a few at
 * a time and in a mix of kinds. When the round is won the player is patched up and a break offers
 * a choice of upgrades before the next, harder round.
 */
import { ARENA, COST, ELITE, ENEMIES, ROUNDS, SCORE } from './config'
import type { EnemyKind, EnemyStats } from './config'
import { computeMods, offerUpgrades } from './upgrades'
import type { UpgradeId } from './upgrades'
import type { Enemy, World } from './types'
import { eliteChance, maxAlive, maxOf, roundBudget, spawnInterval, unlocked } from './pacing'
import { BIOMES, biomeForRound, entrances } from './biomes'
import { bossVariantFor } from './enemyLooks'
import { HEROES } from './heroes'
import { OBJECTIVE, createObjective, objectiveProgress } from './objectives'
import { spawnEnemy } from './world'

type Rng = () => number

const alive = (w: World) => w.enemies.filter((e) => e.state !== 'dying')

/** How often each kind is picked, before the mix is evened out. */
const WEIGHT: Record<Exclude<EnemyKind, 'warlord'>, number> = { imp: 3, demon: 4, lancer: 2.5, archer: 2, brute: 1.5 }

/** Which kind arrives next: any kind the round has unlocked, favouring one that is not already on screen. */
export function pickKind(w: World, rng: Rng): EnemyKind | null {
  const objective = w.objective.kind
  if (objective === 'boss' && !w.bossSpawned) return 'warlord'
  const bossAlive = alive(w).some((e) => e.kind === 'warlord')
  const count = (kind: EnemyKind) => alive(w).filter((e) => e.kind === kind).length
  const options: [EnemyKind, number][] = []
  for (const [kind, weight] of Object.entries(WEIGHT) as [Exclude<EnemyKind, 'warlord'>, number][]) {
    if (!unlocked(kind, w.round) || count(kind) >= maxOf(kind, w.round)) continue
    // A round of slaying spends a budget; the others send enemies for as long as they last.
    if (objective === 'slay' && w.budget < COST[kind]) continue
    // The boss's escort is the small fry.
    if (bossAlive && (kind === 'brute' || kind === 'lancer')) continue
    options.push([kind, count(kind) === 0 ? weight * 2 : weight])
  }
  if (options.length === 0) return null
  let roll = rng() * options.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [kind, weight] of options) {
    roll -= weight
    if (roll < 0) return kind
  }
  return options[options.length - 1][0]
}

/** Bring `kind` in from a side: on the ground, or on a ledge that meets the side if it can climb. */
function spawnFromSide(w: World, kind: EnemyKind, rng: Rng) {
  const stats = ENEMIES[kind]
  const left = rng() < 0.5
  const heights = entrances(w.platforms)[left ? 'left' : 'right']
  // The ground is the main way in; a ledge at the side is one of the others.
  const choices = stats.canJump ? [0, ...heights] : [0]
  const y = choices[Math.floor(rng() * choices.length)]
  const edge = stats.halfWidth + ROUNDS.margin
  const elite = kind !== 'warlord' && rng() < eliteChance(w.round)
  return spawnEnemy(w, kind, left ? -edge : ARENA.width + edge, kind === 'warlord' ? bossVariantFor(w.round) : undefined, { y, elite })
}

/** Advance the round by one step: the objective, the next enemy, a win, the streak. */
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

  stepObjective(w, dt)
  const objective = w.objective.kind

  w.spawnTimer -= dt
  const room = alive(w).length < maxAlive(w.round)
  const spending = objective !== 'slay' || w.budget > 0
  if (w.spawnTimer <= 0 && room && spending) {
    const kind = pickKind(w, rng)
    if (kind) {
      spawnFromSide(w, kind, rng)
      if (objective === 'slay' || objective === 'boss') w.budget -= COST[kind]
      // The boss walks in alone; its escort follows after a moment.
      if (kind === 'warlord') w.bossSpawned = true
      w.spawnTimer = kind === 'warlord' ? 3 : spawnInterval(w.round)
    } else {
      w.spawnTimer = 0.5
    }
  }

  if (objectiveDone(w)) clearRound(w, rng)
}

/** Whether the round's objective has been met. */
export function objectiveDone(w: World): boolean {
  switch (w.objective.kind) {
    case 'slay':
      return w.budget <= 0 && alive(w).length === 0
    case 'boss':
      return w.bossSpawned && !alive(w).some((e) => e.kind === 'warlord')
    default: {
      const { done, needed } = objectiveProgress(w.objective)
      return needed > 0 && done >= needed
    }
  }
}

/** Shards are taken by touching them; a shrine fills while the hero stands by it, and cools while they do not. */
function stepObjective(w: World, dt: number) {
  const p = w.player
  if (p.state === 'dead') return
  const middle = p.y + p.height / 2
  for (const shard of w.objective.shards) {
    if (shard.taken) continue
    if (Math.abs(p.x - shard.x) < OBJECTIVE.pickupRange + p.halfWidth && Math.abs(middle - (shard.y + 36)) < p.height / 2 + 24) {
      shard.taken = true
      w.score += OBJECTIVE.shardScore
      p.hp = Math.min(p.maxHp, p.hp + OBJECTIVE.shardHeal)
      note(w, shard.x, shard.y + 80, 'SHARD', '#9ff0ff')
    }
  }
  for (const shrine of w.objective.shrines) {
    if (shrine.lit) continue
    const near = p.grounded && Math.abs(p.y - shrine.y) < 4 && Math.abs(p.x - shrine.x) < OBJECTIVE.shrineRange
    shrine.charge = near ? Math.min(1, shrine.charge + dt / OBJECTIVE.shrineTime) : Math.max(0, shrine.charge - OBJECTIVE.shrineDecay * dt)
    if (shrine.charge >= 1) {
      shrine.lit = true
      w.score += OBJECTIVE.shrineScore
      w.shake = Math.max(w.shake, 5)
      note(w, shrine.x, shrine.y + 120, 'SHRINE LIT', '#9ff0ff')
    }
  }
}

function note(w: World, x: number, y: number, text: string, color: string) {
  w.floaters.push({ x, y, text, color, size: 22, life: 1.1, maxLife: 1.1 })
}

/** The round is won: pay the bonuses, send what is left of the enemies back to the dark, line up the upgrades. */
function clearRound(w: World, rng: Rng) {
  const p = w.player
  const clearBonus = SCORE.clearBonus * w.round
  const flawlessBonus = w.hurtThisRound ? 0 : SCORE.flawlessBase + SCORE.flawlessPerRound * w.round
  const before = p.hp
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * ROUNDS.healShare))
  p.stamina = p.maxStamina
  w.score += clearBonus + flawlessBonus
  for (const e of alive(w)) banish(e)
  w.arrows = []
  w.waves = w.waves.filter((wave) => wave.friendly)
  w.summary = { round: w.round, kills: w.roundKills, parries: w.roundParries, clearBonus, flawlessBonus, healed: p.hp - before }
  w.offer = offerUpgrades(w.upgrades, rng, 3, HEROES[w.hero].canBlock)
  w.picked = null
  w.stage = 'cleared'
  w.stageTime = 0
}

/** An enemy left when the round is won fades away, worth nothing. */
function banish(e: Enemy) {
  e.state = 'dying'
  e.stateTime = 0
  e.vx = 0
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

/** Leave the break and start the next round, with its own objective. */
export function nextRound(w: World, rng: Rng = Math.random) {
  if (w.stage !== 'break') return false
  w.round += 1
  // A new place after every boss: the ledges change with it.
  w.biome = biomeForRound(w.round)
  w.platforms = [...BIOMES[w.biome].platforms]
  w.objective = createObjective(w.round, w.platforms, rng)
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
  w.enemies = []
  w.player.invuln = Math.max(w.player.invuln, 0.6)
  return true
}

/** A kill: points scaled by the streak (twice for an elite), a little healing if the player has earned it. */
export function awardKill(w: World, stats: EnemyStats, elite = false) {
  w.kills += 1
  w.roundKills += 1
  w.streak = w.streakTimer > 0 ? w.streak + 1 : 1
  w.streakTimer = SCORE.streakTime + w.mods.streakTime
  w.score += Math.round(stats.score * (elite ? ELITE.score : 1) * streakMultiplier(w.streak))
  if (w.mods.healOnKill > 0) w.player.hp = Math.min(w.player.maxHp, w.player.hp + w.mods.healOnKill)
}

export const streakMultiplier = (streak: number) => Math.min(SCORE.maxMultiplier, 1 + SCORE.streakStep * Math.max(0, streak - 1))
