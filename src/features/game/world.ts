import { ARENA, ENEMIES, PLAYER, ROUNDS } from './config'
import type { EnemyKind } from './config'
import { BASE_MODS } from './upgrades'
import type { Enemy, Player, World } from './types'
import { enemyHealthScale, enemyPower, roundBudget } from './pacing'
import { DEFAULT_LOOK } from './appearance'
import type { Appearance } from './appearance'
import { DEFAULT_LOADOUT } from './weapons'
import type { WeaponId } from './weapons'

export function createWorld(loadout: readonly [WeaponId, WeaponId] = DEFAULT_LOADOUT, look: Appearance = DEFAULT_LOOK): World {
  const player: Player = {
    x: ARENA.width / 2,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
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
    swapCooldown: 0,
    swapAnim: 99,
    drawing: false,
    drawTime: 0,
    drawPower: 0,
    landTime: 0,
    hitTime: 0,
  }
  const budget = roundBudget(1)
  return {
    time: 0,
    player,
    enemies: [],
    waves: [],
    arrows: [],
    loadout: [loadout[0], loadout[1]],
    activeSlot: 0,
    particles: [],
    floaters: [],
    impacts: [],
    look: { ...look },
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
    buffer: { jump: 0, dash: 0, light: 0, heavy: 0, swap: 0 },
    over: false,
  }
}

export function spawnEnemy(w: World, kind: EnemyKind, x: number): Enemy {
  const stats = ENEMIES[kind]
  const enemy: Enemy = {
    id: w.nextId++,
    kind,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    facing: x < w.player.x ? 1 : -1,
    hp: Math.round(stats.hp * enemyHealthScale(w.round)),
    maxHp: Math.round(stats.hp * enemyHealthScale(w.round)),
    state: 'walk',
    stateTime: 0,
    cooldown: 0.5,
    struckPlayer: false,
    poiseHit: 0,
    poiseTimer: 0,
    flash: 0,
    power: enemyPower(w.round),
    hitTime: 0,
    move: null,
    pattern: 0,
  }
  w.enemies.push(enemy)
  return enemy
}
