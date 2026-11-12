import { BIOMES } from './biomes'
import { ARENA, ELITE, ENEMIES, PLAYER, ROUNDS } from './config'
import type { EnemyKind } from './config'
import { ENEMY_LOOKS } from './enemyLooks'
import { DEFAULT_HERO, HEROES } from './heroes'
import type { HeroId } from './heroes'
import { createObjective } from './objectives'
import { BASE_MODS } from './upgrades'
import { TOWER, newClimbState } from './climb'
import type { Enemy, GameMode, Player, World } from './types'
import { enemyHealthScale, enemyPower, roundBudget } from './pacing'

/** The order the shards of the first rounds are scattered in does not matter much; a fixed one keeps a new world the same each time. */
const fixed = () => 0.5

export function createWorld(hero: HeroId = DEFAULT_HERO, mode: GameMode = 'survival'): World {
  const def = HEROES[hero]
  const player: Player = {
    x: ARENA.width / 2,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    hp: def.hp,
    maxHp: def.hp,
    maxStamina: PLAYER.maxStamina,
    stamina: PLAYER.maxStamina,
    staminaDelay: 0,
    state: 'free',
    stateTime: 0,
    attackKind: 'light',
    attackIndex: 0,
    comboWindow: 0,
    struck: new Set(),
    dashCooldown: 0,
    invuln: 0,
    blockCooldown: 0,
    guardDelay: 0,
    parryFlash: 0,
    lowStamina: 0,
    dropTime: 0,
    diveCooldown: 0,
    airJumps: def.airJumps,
    hitTime: 0,
    speed: def.speed,
    halfWidth: def.halfWidth,
    height: def.height,
  }
  const budget = roundBudget(1)
  const platforms = mode === 'climb' ? [...TOWER.platforms] : [...BIOMES.wetlands.platforms]
  const world: World = {
    mode,
    climb: newClimbState(),
    time: 0,
    player,
    enemies: [],
    waves: [],
    arrows: [],
    particles: [],
    floaters: [],
    impacts: [],
    hero,
    biome: 'wetlands',
    platforms,
    objective: createObjective(1, platforms, fixed),
    camY: 0,
    bossSpawned: false,
    nextId: 1,
    spawnTimer: ROUNDS.firstDelay,
    round: 1,
    stage: 'fight',
    stageTime: 0,
    budget,
    roundBudget: budget,
    roundKills: 0,
    roundParries: 0,
    hurtThisRound: false,
    streak: 0,
    streakTimer: 0,
    kills: 0,
    parries: 0,
    score: 0,
    upgrades: {},
    mods: { ...BASE_MODS },
    offer: [],
    picked: null,
    summary: null,
    revivesUsed: 0,
    freeze: 0,
    shake: 0,
    buffer: { jump: 0, dash: 0, light: 0, heavy: 0 },
    over: false,
  }
  // The archers of the tower stand at their posts from the start, each a little out of step with the others.
  if (mode === 'climb') {
    TOWER.sentries.forEach((post, i) => {
      const sentry = spawnEnemy(world, 'archer', post.x, 0, { y: post.y })
      sentry.cooldown = 1 + ((i * 0.9) % 2.4)
    })
    // Demons and ogres walk their ledges from the start, each facing a different way.
    TOWER.guards.forEach((guard, i) => {
      const e = spawnEnemy(world, guard.kind, guard.x, i, { y: guard.y, post: { left: guard.left, right: guard.right } })
      e.facing = i % 2 ? 1 : -1
      e.cooldown = 1.5
    })
  }
  return world
}

/**
 * Put an enemy in the world, standing at height `y` (the ground by default). `variant` picks one
 * of the kind's looks; by default they take turns. An elite has more of everything.
 */
export function spawnEnemy(w: World, kind: EnemyKind, x: number, variant?: number, options: { y?: number; elite?: boolean; post?: { left: number; right: number } } = {}): Enemy {
  const stats = ENEMIES[kind]
  const id = w.nextId++
  const elite = options.elite ?? false
  const hp = Math.round(stats.hp * enemyHealthScale(w.round) * (elite ? ELITE.hp : 1))
  const enemy: Enemy = {
    id,
    kind,
    x,
    y: options.y ?? 0,
    vx: 0,
    vy: 0,
    facing: x < w.player.x ? 1 : -1,
    hp,
    maxHp: hp,
    state: 'walk',
    stateTime: 0,
    cooldown: 0.5,
    struckPlayer: false,
    poiseHit: 0,
    poiseTimer: 0,
    flash: 0,
    power: enemyPower(w.round) * (elite ? ELITE.power : 1),
    hitTime: 0,
    move: null,
    pattern: 0,
    grounded: true,
    jumpCooldown: 0,
    variant: (variant ?? id) % ENEMY_LOOKS[kind].length,
    dropTime: 0,
    elite,
    post: options.post ?? null,
  }
  w.enemies.push(enemy)
  return enemy
}
