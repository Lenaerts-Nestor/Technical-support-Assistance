/**
 * The rules of the game, with no drawing and no browser: `stepWorld` moves the world forward by
 * a small slice of time given what the player is pressing. The random source is passed in so a
 * test can play the same game twice.
 */
import { AIM_ASSIST_RANGE, ARENA, COMBO_WINDOW, DASH, ENEMIES, LIGHT_COMBO, PLAYER, SPAWN } from './config'
import type { AttackStep, EnemyKind } from './config'
import type { Enemy, FrameInput, Player, World } from './types'

type Rng = () => number

const ENEMY_GRAVITY = 2400
/** The player cannot walk off the edge of the arena. */
const WALL_MARGIN = 24
const MAX_PARTICLES = 220

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Move `value` towards `target` by at most `delta`. */
function approach(value: number, target: number, delta: number) {
  return value < target ? Math.min(target, value + delta) : Math.max(target, value - delta)
}

export function createWorld(): World {
  const player: Player = {
    x: ARENA.width / 2,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    state: 'free',
    stateTime: 0,
    attackIndex: 0,
    comboWindow: 0,
    struck: new Set(),
    dashCooldown: 0,
    invuln: 0,
  }
  return {
    time: 0,
    player,
    enemies: [],
    particles: [],
    nextId: 1,
    spawnTimer: SPAWN.firstDelay,
    kills: 0,
    score: 0,
    freeze: 0,
    shake: 0,
    buffer: { jump: 0, dash: 0, light: 0 },
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
    hp: stats.hp,
    maxHp: stats.hp,
    state: 'walk',
    stateTime: 0,
    cooldown: 0.5,
    struckPlayer: false,
    flash: 0,
  }
  w.enemies.push(enemy)
  return enemy
}

export function stepWorld(w: World, input: FrameInput, dt: number, rng: Rng) {
  const buffer = w.buffer
  buffer.jump = input.jumpPressed ? PLAYER.inputBuffer : Math.max(0, buffer.jump - dt)
  buffer.dash = input.dashPressed ? PLAYER.inputBuffer : Math.max(0, buffer.dash - dt)
  buffer.light = input.lightPressed ? PLAYER.inputBuffer : Math.max(0, buffer.light - dt)
  w.shake *= Math.exp(-dt * 10)

  // Hit-stop: the whole world holds its breath for a moment after a solid hit.
  if (w.freeze > 0) {
    w.freeze -= dt
    return
  }

  w.time += dt
  stepPlayer(w, input, dt, rng)
  for (const enemy of w.enemies) stepEnemy(w, enemy, dt, rng)
  separateEnemies(w)
  w.enemies = w.enemies.filter((e) => e.state !== 'dying' || e.stateTime < 0.6)
  spawnEnemies(w, dt, rng)
  stepParticles(w, dt)
}

/* -- Player ---------------------------------------------------------------- */

function stepPlayer(w: World, input: FrameInput, dt: number, rng: Rng) {
  const p = w.player
  p.stateTime += dt
  p.invuln = Math.max(0, p.invuln - dt)
  p.dashCooldown = Math.max(0, p.dashCooldown - dt)
  if (p.comboWindow > 0) {
    p.comboWindow = Math.max(0, p.comboWindow - dt)
    if (p.comboWindow === 0) p.attackIndex = 0
  }

  switch (p.state) {
    case 'free': {
      if (input.move !== 0) p.facing = input.move
      const accel = p.grounded ? PLAYER.groundAccel : PLAYER.airAccel
      p.vx = approach(p.vx, input.move * PLAYER.speed, accel * dt)
      cutJump(p, input)
      if (tryJump(w, p)) break
      if (w.buffer.dash > 0 && p.dashCooldown <= 0) startDash(w, p, input)
      else if (w.buffer.light > 0) startAttack(w, input, p.comboWindow > 0 ? p.attackIndex : 0)
      break
    }
    case 'attack': {
      const step = LIGHT_COMBO[p.attackIndex]
      const t = p.stateTime
      if (t - dt < step.hitStart && t >= step.hitStart) p.vx = p.facing * step.lunge
      else if (t < step.hitStart || t > step.hitEnd) p.vx = approach(p.vx, 0, 1500 * dt)
      cutJump(p, input)
      if (t >= step.hitStart && t <= step.hitEnd) strike(w, step, rng)
      if (t >= step.cancelAt) {
        if (w.buffer.dash > 0 && p.dashCooldown <= 0) startDash(w, p, input)
        else if (w.buffer.light > 0 && p.attackIndex < LIGHT_COMBO.length - 1) startAttack(w, input, p.attackIndex + 1)
        else if (tryJump(w, p)) endAttack(p, step)
      }
      if (p.state === 'attack' && t >= step.duration) endAttack(p, step)
      break
    }
    case 'dash': {
      p.vx = p.facing * DASH.speed
      p.vy = 0
      if (p.stateTime >= DASH.time) {
        p.state = 'free'
        p.stateTime = 0
        p.vx = p.facing * PLAYER.speed
      }
      break
    }
    case 'hurt':
      p.vx = approach(p.vx, 0, 1800 * dt)
      if (p.stateTime >= PLAYER.hurtTime) {
        p.state = 'free'
        p.stateTime = 0
      }
      break
    case 'dead':
      p.vx = approach(p.vx, 0, 1800 * dt)
      break
  }

  if (p.state !== 'dash') p.vy -= PLAYER.gravity * dt
  const nextX = clamp(p.x + p.vx * dt, WALL_MARGIN, ARENA.width - WALL_MARGIN)
  if (nextX !== p.x + p.vx * dt) p.vx = 0
  p.x = nextX
  p.y += p.vy * dt
  if (p.y <= 0) {
    p.y = 0
    if (p.vy < 0) p.vy = 0
    p.grounded = true
  } else {
    p.grounded = false
  }
}

/** Starts a jump if one was asked for and the player stands on the ground. */
function tryJump(w: World, p: Player) {
  if (w.buffer.jump <= 0 || !p.grounded) return false
  p.vy = PLAYER.jumpSpeed
  p.grounded = false
  w.buffer.jump = 0
  return true
}

/** Letting go of jump while still rising turns a full jump into a hop. */
function cutJump(p: Player, input: FrameInput) {
  if (!input.jumpHeld && p.vy > PLAYER.jumpSpeed * PLAYER.jumpCut) p.vy = PLAYER.jumpSpeed * PLAYER.jumpCut
}

function startDash(w: World, p: Player, input: FrameInput) {
  p.facing = input.move !== 0 ? input.move : p.facing
  p.state = 'dash'
  p.stateTime = 0
  p.vy = 0
  p.dashCooldown = DASH.cooldown
  p.invuln = Math.max(p.invuln, DASH.invuln)
  w.buffer.dash = 0
}

function startAttack(w: World, input: FrameInput, index: number) {
  const p = w.player
  p.state = 'attack'
  p.stateTime = 0
  p.attackIndex = index
  p.comboWindow = 0
  p.struck.clear()
  w.buffer.light = 0
  if (input.move !== 0) p.facing = input.move
  else {
    // Nothing held: turn towards the closest enemy in reach, so a swing is rarely wasted.
    let best: Enemy | null = null
    for (const e of w.enemies) {
      if (e.state === 'dying') continue
      if (Math.abs(e.x - p.x) <= AIM_ASSIST_RANGE && (!best || Math.abs(e.x - p.x) < Math.abs(best.x - p.x))) best = e
    }
    if (best) p.facing = best.x >= p.x ? 1 : -1
  }
}

function endAttack(p: Player, step: AttackStep) {
  const last = step === LIGHT_COMBO[LIGHT_COMBO.length - 1]
  p.state = 'free'
  p.stateTime = 0
  p.comboWindow = last ? 0 : COMBO_WINDOW
  p.attackIndex = last ? 0 : p.attackIndex + 1
}

/** The blade is out: hurt every enemy in front that this swing has not touched yet. */
function strike(w: World, step: AttackStep, rng: Rng) {
  const p = w.player
  const x0 = p.facing > 0 ? p.x - 10 : p.x - step.reach
  const x1 = p.facing > 0 ? p.x + step.reach : p.x + 10
  const y0 = p.y - 10
  const y1 = p.y + PLAYER.height + 10
  for (const e of w.enemies) {
    if (e.state === 'dying' || p.struck.has(e.id)) continue
    const stats = ENEMIES[e.kind]
    const overlaps = e.x - stats.halfWidth < x1 && e.x + stats.halfWidth > x0 && e.y < y1 && e.y + stats.height > y0
    if (overlaps) hitEnemy(w, e, step, rng)
  }
}

function hitEnemy(w: World, e: Enemy, step: AttackStep, rng: Rng) {
  const p = w.player
  const stats = ENEMIES[e.kind]
  const dir = p.facing
  p.struck.add(e.id)
  e.hp -= step.damage
  e.flash = 0.1
  e.facing = (dir * -1) as 1 | -1
  e.stateTime = 0
  if (e.hp <= 0) {
    e.state = 'dying'
    e.vx = dir * step.knockback * 1.2 * stats.knockScale
    e.vy = 380
    w.kills += 1
    w.score += stats.score
  } else {
    e.state = 'hurt'
    e.vx = dir * step.knockback * stats.knockScale
    e.vy = step.knockback > 300 ? 260 : 0
  }
  w.freeze = Math.max(w.freeze, step.hitStop)
  w.shake = Math.max(w.shake, step.shake)
  burst(w, e.x - dir * stats.halfWidth * 0.4, e.y + stats.height * 0.55, dir, rng, step.knockback > 300 ? 14 : 8, ['#ffe9a8', '#ffffff', '#a3bd6c'])
}

/** Returns whether the hit landed (it does not while the player is dashing or recently hurt). */
function damagePlayer(w: World, amount: number, fromX: number, rng: Rng) {
  const p = w.player
  if (p.invuln > 0 || p.state === 'dead') return false
  const dir = p.x >= fromX ? 1 : -1
  p.hp = Math.max(0, p.hp - amount)
  p.invuln = PLAYER.invulnAfterHit
  p.vx = dir * 320
  p.vy = 260
  p.grounded = false
  p.stateTime = 0
  w.freeze = Math.max(w.freeze, 0.07)
  w.shake = Math.max(w.shake, 7)
  burst(w, p.x, p.y + PLAYER.height * 0.6, dir, rng, 10, ['#ff8f8f', '#ffffff', '#f5a93a'])
  if (p.hp === 0) {
    p.state = 'dead'
    w.over = true
  } else {
    p.state = 'hurt'
  }
  return true
}

/* -- Enemies --------------------------------------------------------------- */

function stepEnemy(w: World, e: Enemy, dt: number, rng: Rng) {
  const stats = ENEMIES[e.kind]
  const p = w.player
  e.stateTime += dt
  e.flash = Math.max(0, e.flash - dt)
  e.cooldown = Math.max(0, e.cooldown - dt)
  const dx = p.x - e.x
  const toward = dx >= 0 ? 1 : -1

  switch (e.state) {
    case 'walk':
      e.facing = toward
      if (w.over) {
        e.vx = approach(e.vx, 0, 2600 * dt)
        break
      }
      e.vx = approach(e.vx, toward * stats.speed, 2600 * dt)
      if (Math.abs(dx) < stats.attackRange && e.cooldown <= 0 && e.y === 0) {
        e.state = 'windup'
        e.stateTime = 0
      }
      break
    case 'windup':
      e.facing = toward
      e.vx = approach(e.vx, 0, 3000 * dt)
      if (e.stateTime >= stats.windup) {
        e.state = 'leap'
        e.stateTime = 0
        e.vx = toward * stats.leapSpeed
        e.vy = stats.leapLift
        e.struckPlayer = false
      }
      break
    case 'leap':
      if (!e.struckPlayer && overlapsPlayer(w, e, 10)) {
        e.struckPlayer = true
        damagePlayer(w, stats.damage, e.x, rng)
      }
      if (e.y <= 0 && e.stateTime > 0.05) {
        e.state = 'recover'
        e.stateTime = 0
        e.vx = 0
      }
      break
    case 'recover':
      e.vx = approach(e.vx, 0, 2600 * dt)
      if (e.stateTime >= stats.recover) {
        e.state = 'walk'
        e.stateTime = 0
        e.cooldown = stats.attackCooldown
      }
      break
    case 'hurt':
      e.vx = approach(e.vx, 0, 900 * dt)
      if (e.stateTime >= stats.hurtTime) {
        e.state = 'walk'
        e.stateTime = 0
      }
      break
    case 'dying':
      e.vx = approach(e.vx, 0, 600 * dt)
      break
  }

  e.vy -= ENEMY_GRAVITY * dt
  e.x += e.vx * dt
  e.y += e.vy * dt
  if (e.y <= 0) {
    e.y = 0
    if (e.vy < 0) e.vy = 0
  }
}

function overlapsPlayer(w: World, e: Enemy, grow: number) {
  const p = w.player
  const stats = ENEMIES[e.kind]
  return (
    Math.abs(p.x - e.x) < PLAYER.halfWidth + stats.halfWidth + grow &&
    e.y < p.y + PLAYER.height &&
    e.y + stats.height > p.y
  )
}

/** Enemies are solid to each other, so a crowd spreads out instead of stacking on one spot. */
function separateEnemies(w: World) {
  const live = w.enemies.filter((e) => e.state !== 'dying')
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i]
      const b = live[j]
      const gap = ENEMIES[a.kind].halfWidth + ENEMIES[b.kind].halfWidth
      const d = b.x - a.x
      if (Math.abs(d) >= gap || Math.abs(a.y - b.y) > 30) continue
      const push = (gap - Math.abs(d)) / 2
      const side = d === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(d)
      a.x -= push * side
      b.x += push * side
    }
  }
}

function spawnEnemies(w: World, dt: number, rng: Rng) {
  if (w.over) return
  w.spawnTimer -= dt
  if (w.spawnTimer > 0) return
  const alive = w.enemies.filter((e) => e.state !== 'dying').length
  if (alive >= SPAWN.maxAlive) return
  const fromLeft = rng() < 0.5
  spawnEnemy(w, 'goblin', fromLeft ? -SPAWN.margin : ARENA.width + SPAWN.margin)
  w.spawnTimer = Math.max(SPAWN.fastestInterval, SPAWN.interval - w.kills * 0.05)
}

/* -- Particles ------------------------------------------------------------- */

function burst(w: World, x: number, y: number, dir: number, rng: Rng, count: number, colors: string[]) {
  for (let i = 0; i < count; i++) {
    const life = 0.25 + rng() * 0.3
    w.particles.push({
      x,
      y,
      vx: dir * (80 + rng() * 320) + (rng() - 0.5) * 120,
      vy: 120 + rng() * 380,
      life,
      maxLife: life,
      size: 2 + rng() * 3.5,
      color: colors[Math.floor(rng() * colors.length)],
    })
  }
  if (w.particles.length > MAX_PARTICLES) w.particles.splice(0, w.particles.length - MAX_PARTICLES)
}

function stepParticles(w: World, dt: number) {
  for (const q of w.particles) {
    q.life -= dt
    q.vy -= 1500 * dt
    q.x += q.vx * dt
    q.y = Math.max(0, q.y + q.vy * dt)
  }
  w.particles = w.particles.filter((q) => q.life > 0)
}
