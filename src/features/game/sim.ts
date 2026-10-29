/**
 * The rules of the game, with no drawing and no browser: `stepWorld` moves the world forward by
 * a small slice of time given what the player is pressing. The random source is passed in so a
 * test can play the same game twice.
 */
import { ARENA, COMBO_WINDOW, DASH, ENEMIES, PLAYER, POISE_RESET, ROUNDS, SHIELD, VULNERABLE_BONUS } from './config'
import type { AttackStep, EnemyStats } from './config'
import { HEROES } from './heroes'
import type { HeroDef } from './heroes'
import { awardKill, stepRound } from './rounds'
import type { Enemy, FrameInput, Player, World } from './types'
import { createWorld, spawnEnemy } from './world'

export { createWorld, spawnEnemy }

type Rng = () => number

/** How a hit on the player turned out. `none`: it did not count (the player is untouchable right now). */
export type HitResult = 'hit' | 'blocked' | 'parried' | 'broken' | 'none'

const ENEMY_GRAVITY = 2400
/** The player cannot walk off the edge of the arena. */
const WALL_MARGIN = 24
const MAX_PARTICLES = 240
/** Spark colours: steel on steel, dust, and blood-red for a hit that gets through. */
const STEEL_SPARKS = ['#ffffff', '#c9d1de', '#ffd27a']
const DUST = ['#8a7a62', '#6b5a44', '#a08a6c']

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Move `value` towards `target` by at most `delta`. */
function approach(value: number, target: number, delta: number) {
  return value < target ? Math.min(target, value + delta) : Math.max(target, value - delta)
}

export function stepWorld(w: World, input: FrameInput, dt: number, rng: Rng) {
  const buffer = w.buffer
  if (input.jumpPressed) buffer.jump = PLAYER.inputBuffer
  if (input.dashPressed) buffer.dash = PLAYER.inputBuffer
  if (input.lightPressed) buffer.light = PLAYER.inputBuffer
  if (input.heavyPressed) buffer.heavy = PLAYER.inputBuffer
  w.shake *= Math.exp(-dt * 10)

  // Hit-stop: the whole world holds its breath for a moment after a solid hit, and so do
  // the buffered button presses, so a press made during it is still there when time resumes.
  if (w.freeze > 0) {
    w.freeze -= dt
    return
  }

  buffer.jump = Math.max(0, buffer.jump - dt)
  buffer.dash = Math.max(0, buffer.dash - dt)
  buffer.light = Math.max(0, buffer.light - dt)
  buffer.heavy = Math.max(0, buffer.heavy - dt)
  w.time += dt
  stepPlayer(w, input, dt, rng)
  for (const enemy of w.enemies) stepEnemy(w, enemy, dt, rng)
  stepWaves(w, dt, rng)
  keepApart(w)
  w.enemies = w.enemies.filter((e) => e.state !== 'dying' || e.stateTime < 0.7)
  stepRound(w, dt, rng)
  stepParticles(w, dt)
}

/* -- Player ---------------------------------------------------------------- */

/** The hero being played. */
export const heroOf = (w: World): HeroDef => HEROES[w.hero]

/** The step of the combo being swung. */
const stepOf = (w: World, p: Player): AttackStep => heroOf(w).combos[p.attackKind][p.attackIndex]

function stepPlayer(w: World, input: FrameInput, dt: number, rng: Rng) {
  const p = w.player
  const hero = heroOf(w)
  p.stateTime += dt
  p.invuln = Math.max(0, p.invuln - dt)
  p.dashCooldown = Math.max(0, p.dashCooldown - dt)
  p.blockCooldown = Math.max(0, p.blockCooldown - dt)
  p.guardDelay = Math.max(0, p.guardDelay - dt)
  p.parryFlash = Math.max(0, p.parryFlash - dt)
  p.lowStamina = Math.max(0, p.lowStamina - dt)
  p.hitTime = Math.max(0, p.hitTime - dt)
  p.dropTime = Math.max(0, p.dropTime - dt)
  if (p.comboWindow > 0) {
    p.comboWindow = Math.max(0, p.comboWindow - dt)
    if (p.comboWindow === 0) p.attackIndex = 0
  }

  p.staminaDelay = Math.max(0, p.staminaDelay - dt)
  if (p.staminaDelay === 0 && p.state !== 'dead') {
    const share = p.state === 'block' ? PLAYER.blockRegenShare : 1
    p.stamina = Math.min(p.maxStamina, p.stamina + PLAYER.staminaRegen * w.mods.staminaRegen * share * dt)
  }

  switch (p.state) {
    case 'free': {
      if (input.move !== 0) p.facing = input.move
      const accel = p.grounded ? PLAYER.groundAccel : PLAYER.airAccel
      p.vx = approach(p.vx, input.move * p.speed * w.mods.moveSpeed, accel * dt)
      cutJump(p, input)
      // Holding down on a ledge steps off it.
      if (input.downHeld && p.grounded && p.y > 0) dropThrough(p)
      if (tryJump(w, p)) break
      if (w.buffer.dash > 0 && tryDash(w, p, input)) break
      if (w.buffer.heavy > 0 && tryAttack(w, p, input, 'heavy')) break
      if (w.buffer.light > 0 && tryAttack(w, p, input, 'light')) break
      if (input.blockHeld && hero.canBlock && p.grounded && p.blockCooldown === 0) {
        p.state = 'block'
        p.stateTime = 0
        p.guardDelay = 0
      }
      break
    }
    case 'block': {
      if (!input.blockHeld || !p.grounded || !hero.canBlock) {
        lowerShield(p)
        break
      }
      // Turning round with the shield up leaves the back open for a moment.
      if (input.move !== 0 && input.move !== p.facing) {
        p.facing = input.move
        p.guardDelay = SHIELD.turnDelay
      }
      p.vx = approach(p.vx, input.move * p.speed * SHIELD.moveShare * w.mods.moveSpeed, PLAYER.groundAccel * dt)
      if (tryJump(w, p)) break
      if (w.buffer.dash > 0 && tryDash(w, p, input)) break
      if (w.buffer.heavy > 0 && tryAttack(w, p, input, 'heavy')) break
      if (w.buffer.light > 0 && tryAttack(w, p, input, 'light')) break
      break
    }
    case 'attack': {
      const step = stepOf(w, p)
      const t = p.stateTime
      if (t - dt < step.hitStart && t >= step.hitStart) {
        p.vx = p.facing * step.lunge
        if (step.hop) {
          p.vy = step.hop
          p.grounded = false
        }
        if (step.wave) spawnPlayerWave(w, p, step, rng)
      } else if (t < step.hitStart || t > step.hitEnd) p.vx = approach(p.vx, 0, 1500 * dt)
      // A rush cannot be touched while the blow is out.
      if (step.rush && t >= step.hitStart && t <= step.hitEnd) p.invuln = Math.max(p.invuln, 0.06)
      if (t >= step.hitStart && t <= step.hitEnd) strike(w, step, rng)
      if (t >= step.cancelAt) continueAttack(w, p, input)
      if (p.state === 'attack' && t >= step.duration) endAttack(w, p)
      break
    }
    case 'dash': {
      p.vx = p.facing * DASH.speed
      p.vy = 0
      if (p.stateTime >= DASH.time) {
        p.state = 'free'
        p.stateTime = 0
        p.vx = p.facing * p.speed
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
  const wanted = p.x + p.vx * dt
  p.x = clamp(wanted, WALL_MARGIN, ARENA.width - WALL_MARGIN)
  if (p.x !== wanted) p.vx = 0
  const fallSpeed = p.vy
  const floor = moveVertically(w, p, dt, p.dropTime > 0)
  if (floor !== null) {
    // Coming down hard kicks up a little dust.
    if (!p.grounded && fallSpeed < -350) burst(w, p.x, p.y, 0, rng, 7, DUST)
    p.grounded = true
  } else {
    p.grounded = false
  }
}

/**
 * Move something up or down by its speed and land it on whatever it falls onto: the ground, or a
 * ledge it comes down on from above (they are solid only from above). Returns the height it landed
 * on, or null if it is still in the air.
 */
function moveVertically(w: World, body: { x: number; y: number; vy: number }, dt: number, ignoreLedges: boolean): number | null {
  const before = body.y
  body.y += body.vy * dt
  let land: number | null = body.y <= 0 ? 0 : null
  if (land === null && body.vy <= 0 && !ignoreLedges) {
    for (const ledge of w.platforms) {
      const onIt = body.x >= ledge.cx - ledge.width / 2 && body.x <= ledge.cx + ledge.width / 2
      if (onIt && before >= ledge.y - 0.01 && body.y <= ledge.y) land = Math.max(land ?? 0, ledge.y)
    }
  }
  if (land === null) return null
  body.y = land
  if (body.vy < 0) body.vy = 0
  return land
}

/** The height of the highest surface at or below `y` under `x`: a ledge, or the ground (0). */
export function floorBelow(w: World, x: number, y: number): number {
  let floor = 0
  for (const ledge of w.platforms) {
    if (ledge.y > floor && ledge.y <= y + 1 && x >= ledge.cx - ledge.width / 2 && x <= ledge.cx + ledge.width / 2) floor = ledge.y
  }
  return floor
}

/** Let go of the ledge underfoot: fall through it, and through any other for a moment. */
function dropThrough(p: Player) {
  p.dropTime = 0.28
  p.grounded = false
  p.y -= 1
}

function spend(p: Player, amount: number) {
  p.stamina = Math.max(0, p.stamina - amount)
  p.staminaDelay = PLAYER.staminaDelay
}

/** Starts a jump if one was asked for and the player stands on something. */
function tryJump(w: World, p: Player) {
  if (w.buffer.jump <= 0 || !p.grounded) return false
  p.vy = PLAYER.jumpSpeed
  p.grounded = false
  w.buffer.jump = 0
  if (p.state === 'block') lowerShield(p)
  return true
}

/** Letting go of jump while still rising turns a full jump into a hop. */
function cutJump(p: Player, input: FrameInput) {
  if (!input.jumpHeld && p.vy > PLAYER.jumpSpeed * PLAYER.jumpCut) p.vy = PLAYER.jumpSpeed * PLAYER.jumpCut
}

function lowerShield(p: Player) {
  p.state = 'free'
  p.stateTime = 0
  p.blockCooldown = SHIELD.cooldown
}

/** Dash if it is ready and affordable. Returns whether it started. */
function tryDash(w: World, p: Player, input: FrameInput) {
  if (p.dashCooldown > 0) return false
  const cost = DASH.stamina * heroOf(w).dashCost * w.mods.dashCost
  if (p.stamina < cost) {
    w.buffer.dash = 0
    p.lowStamina = 0.5
    return false
  }
  spend(p, cost)
  p.facing = input.move !== 0 ? input.move : p.facing
  p.state = 'dash'
  p.stateTime = 0
  p.vy = 0
  p.dashCooldown = DASH.cooldown * w.mods.dashCooldown
  p.invuln = Math.max(p.invuln, DASH.invuln)
  w.buffer.dash = 0
  return true
}

/** Start the first hit of a combo, or the next one while the chain is still alive. */
function tryAttack(w: World, p: Player, input: FrameInput, button: 'light' | 'heavy') {
  const continues = p.comboWindow > 0 && p.attackKind === button
  return beginAttack(w, p, input, button, continues ? p.attackIndex : 0)
}

function nearestEnemy(w: World, range: number): Enemy | null {
  const p = w.player
  let best: Enemy | null = null
  for (const e of w.enemies) {
    if (e.state === 'dying') continue
    if (Math.abs(e.x - p.x) <= range && (!best || Math.abs(e.x - p.x) < Math.abs(best.x - p.x))) best = e
  }
  return best
}

function beginAttack(w: World, p: Player, input: FrameInput, button: 'light' | 'heavy', index: number) {
  const hero = heroOf(w)
  const step = hero.combos[button][index]
  if (!step) return false
  if (p.stamina < step.stamina) {
    w.buffer[button] = 0
    p.lowStamina = 0.5
    return false
  }
  spend(p, step.stamina)
  p.state = 'attack'
  p.stateTime = 0
  p.attackKind = button
  p.attackIndex = index
  p.comboWindow = 0
  p.struck.clear()
  w.buffer[button] = 0
  if (input.move !== 0) p.facing = input.move
  else {
    // Nothing held: turn towards the closest enemy in reach, so a swing is rarely wasted.
    const target = nearestEnemy(w, hero.aimRange)
    if (target) p.facing = target.x >= p.x ? 1 : -1
  }
  return true
}

/** Late in a swing the next action may cut the recovery short. */
function continueAttack(w: World, p: Player, input: FrameInput) {
  const combos = heroOf(w).combos
  const last = p.attackIndex >= combos[p.attackKind].length - 1
  if (w.buffer.dash > 0 && tryDash(w, p, input)) return
  // The heavy blow can follow any light one.
  if (w.buffer.heavy > 0 && p.attackKind === 'light' && beginAttack(w, p, input, 'heavy', 0)) return
  if (w.buffer.light > 0 && p.attackKind === 'light' && !last && beginAttack(w, p, input, 'light', p.attackIndex + 1)) return
  if (tryJump(w, p)) endAttack(w, p)
}

function endAttack(w: World, p: Player) {
  const steps = heroOf(w).combos[p.attackKind]
  const last = p.attackIndex >= steps.length - 1
  p.state = 'free'
  p.stateTime = 0
  p.comboWindow = last ? 0 : COMBO_WINDOW
  p.attackIndex = last ? 0 : p.attackIndex + 1
}

function spawnPlayerWave(w: World, p: Player, step: AttackStep, rng: Rng) {
  const wave = step.wave
  if (!wave) return
  w.waves.push({
    x: p.x + p.facing * step.reach * 0.9,
    vx: p.facing * wave.speed,
    life: wave.life,
    maxLife: wave.life,
    damage: wave.damage,
    height: wave.height,
    halfWidth: wave.halfWidth,
    blockCost: 0,
    struck: false,
    friendly: true,
    poise: wave.poise,
    knockback: wave.knockback,
    hit: new Set(),
  })
  burst(w, p.x + p.facing * step.reach * 0.9, p.y + 6, p.facing, rng, 16, DUST)
}

/** What lands on an enemy, whether from a blade or a wave of rock. */
type HitInfo = { damage: number; poise: number; knockback: number; hitStop: number; shake: number; dir: 1 | -1; finisher: boolean }

/** The blade is out: hurt every enemy in reach that this swing has not touched yet. */
function strike(w: World, step: AttackStep, rng: Rng) {
  const p = w.player
  const steps = heroOf(w).combos[p.attackKind]
  const finisher = step === steps[steps.length - 1]
  const x0 = p.facing < 0 ? p.x - step.reach : p.x - 10
  const x1 = p.facing > 0 ? p.x + step.reach : p.x + 10
  const y0 = p.y - 10
  const y1 = p.y + p.height + 10
  for (const e of w.enemies) {
    if (e.state === 'dying' || p.struck.has(e.id)) continue
    const stats = ENEMIES[e.kind]
    const overlaps = e.x - stats.halfWidth < x1 && e.x + stats.halfWidth > x0 && e.y < y1 && e.y + stats.height > y0
    if (!overlaps) continue
    p.struck.add(e.id)
    hitEnemy(w, e, { ...step, dir: p.facing, finisher }, rng)
  }
}

function hitEnemy(w: World, e: Enemy, hit: HitInfo, rng: Rng) {
  const stats = ENEMIES[e.kind]
  const dir = hit.dir

  // Catching an enemy off guard (mid-recovery, or staggered) hurts more.
  const exposed = e.state === 'recover' || e.state === 'stagger'
  const dealt = hit.damage * w.mods.damage * (hit.finisher ? w.mods.finisher : 1) * (exposed ? VULNERABLE_BONUS : 1)
  e.hp -= dealt
  e.flash = 0.1
  e.hitTime = 0.3
  e.poiseHit += hit.poise * w.mods.poise
  e.poiseTimer = POISE_RESET
  const breaks = stats.poise === 0 || e.poiseHit >= stats.poise
  const wasStaggered = e.state === 'stagger'

  if (e.hp <= 0) {
    e.state = 'dying'
    e.stateTime = 0
    e.facing = (dir * -1) as 1 | -1
    e.vx = dir * hit.knockback * 1.2 * Math.max(stats.knockScale, 0.4)
    e.vy = stats.heavy ? 0 : 380
    awardKill(w, stats)
  } else if (wasStaggered) {
    // Already reeling: it takes the damage and the shove, but the clock does not restart.
    e.vx = dir * hit.knockback * stats.knockScale * 0.5
  } else if (breaks) {
    e.poiseHit = 0
    e.state = stats.poise === 0 ? 'hurt' : 'stagger'
    e.stateTime = 0
    e.facing = (dir * -1) as 1 | -1
    e.vx = dir * hit.knockback * stats.knockScale
    e.vy = hit.knockback > 300 && !stats.heavy ? 260 : 0
    e.cooldown = Math.max(e.cooldown, 0.3)
    if (stats.poise > 0) floater(w, e.x, e.y + stats.labelHeight + 14, 'STAGGER!', '#ffd27a', 20)
  } else {
    // Poise soaks it up: the enemy keeps doing what it was doing, only nudged.
    e.vx += dir * hit.knockback * stats.knockScale * 0.3
  }

  const hx = e.x - dir * stats.halfWidth * 0.4
  const hy = e.y + stats.height * 0.55
  const big = hit.finisher || hit.knockback > 300
  floater(w, e.x + (rng() - 0.5) * 16, e.y + stats.height + 6, String(Math.max(1, Math.round(dealt))), exposed ? '#ffb347' : hit.finisher ? '#ffd27a' : '#ffffff', big ? 24 : 18)
  impact(w, hx, hy, dir, big ? 46 : 30, exposed ? '#ffb347' : '#ffffff')
  w.freeze = Math.max(w.freeze, hit.hitStop)
  w.shake = Math.max(w.shake, hit.shake)
  burst(w, hx, hy, dir, rng, hit.knockback > 300 ? 14 : 8, ['#ffe9a8', '#ffffff', '#a3bd6c'])
}

/**
 * Something hits the player. The shield stops a hit from the front (the back is always open):
 * raised just in time it parries, which refunds stamina and leaves the attacker open; later it
 * only blocks, which costs stamina, and with none left the guard breaks and part of the blow
 * lands anyway.
 */
function damagePlayer(w: World, amount: number, fromX: number, rng: Rng, baseBlockCost: number): HitResult {
  const p = w.player
  if (p.invuln > 0 || p.state === 'dead') return 'none'
  const blockCost = baseBlockCost * w.mods.blockCost
  const front = (fromX - p.x) * p.facing >= -10
  let result: HitResult = 'hit'

  if (p.state === 'block' && p.guardDelay === 0 && front) {
    const sparkX = p.x + p.facing * 34
    const sparkY = p.y + 70
    if (p.stateTime <= SHIELD.parryWindow + w.mods.parryWindow) {
      p.stamina = Math.min(p.maxStamina, p.stamina + SHIELD.parryStamina + w.mods.parryStamina)
      p.hp = Math.min(p.maxHp, p.hp + w.mods.parryHeal)
      p.parryFlash = 0.35
      p.invuln = 0.25
      w.parries += 1
      w.roundParries += 1
      w.score += SHIELD.parryScore
      w.freeze = Math.max(w.freeze, 0.13)
      w.shake = Math.max(w.shake, 6)
      burst(w, sparkX, sparkY, p.facing, rng, 18, STEEL_SPARKS)
      impact(w, sparkX, sparkY, p.facing, 56, '#ffd27a')
      floater(w, p.x, p.y + p.height + 14, 'PARRY!', '#ffd27a', 28)
      return 'parried'
    }
    if (p.stamina >= blockCost) {
      spend(p, blockCost)
      p.vx = -p.facing * SHIELD.knock * (blockCost > 30 ? 1.5 : 1)
      p.invuln = 0.12
      w.freeze = Math.max(w.freeze, 0.05)
      w.shake = Math.max(w.shake, 3)
      burst(w, sparkX, sparkY, p.facing, rng, 9, STEEL_SPARKS)
      impact(w, sparkX, sparkY, p.facing, 30, '#9fc4ff')
      floater(w, p.x, p.y + p.height + 10, 'BLOCK', '#9fc4ff', 17)
      return 'blocked'
    }
    amount = Math.ceil(amount * 0.5)
    p.stamina = 0
    p.staminaDelay = PLAYER.staminaDelay * 2
    result = 'broken'
    burst(w, sparkX, sparkY, p.facing, rng, 8, STEEL_SPARKS)
    floater(w, p.x, p.y + p.height + 34, 'GUARD BROKEN!', '#ff8f8f', 20)
  }

  const dir = p.x >= fromX ? 1 : -1
  const taken = Math.max(1, Math.round(amount * w.mods.damageTaken))
  p.hp = Math.max(0, p.hp - taken)
  p.hitTime = 0.34
  floater(w, p.x, p.y + p.height + 8, `-${taken}`, '#ff6b6b', 26)
  impact(w, p.x, p.y + p.height * 0.6, (dir * -1) as 1 | -1, 54, '#ff8f8f')
  w.hurtThisRound = true
  w.streak = 0
  w.streakTimer = 0
  // A phoenix feather turns a fatal blow into a second chance, once.
  if (p.hp === 0 && w.revivesUsed < w.mods.revive) {
    w.revivesUsed += 1
    p.hp = Math.ceil(p.maxHp / 3)
    p.invuln = 1.6
    burst(w, p.x, p.y + p.height * 0.5, 0, rng, 28, ['#ffd27a', '#ffffff', '#ff8f5c'])
  } else {
    p.invuln = PLAYER.invulnAfterHit
  }
  p.vx = dir * 320
  p.vy = 260
  p.grounded = false
  p.stateTime = 0
  w.freeze = Math.max(w.freeze, 0.07)
  w.shake = Math.max(w.shake, 7)
  burst(w, p.x, p.y + p.height * 0.6, dir, rng, 10, ['#ff8f8f', '#ffffff', '#f5a93a'])
  if (p.hp === 0) {
    p.state = 'dead'
    w.over = true
  } else {
    p.state = 'hurt'
  }
  return result
}

/* -- Enemies --------------------------------------------------------------- */

/** The boss is enraged once it is down to its last half. */
export const isEnraged = (e: Enemy) => {
  const boss = ENEMIES[e.kind].boss
  return Boolean(boss) && e.hp < e.maxHp * (boss?.enrageAt ?? 0)
}

/** How long an enemy winds up for its current attack. The boss's depends on which move it chose. */
export function windupTime(e: Enemy): number {
  const stats = ENEMIES[e.kind]
  const boss = stats.boss
  const base = boss && e.move === 'charge' ? boss.chargeWindup : boss && e.move === 'roar' ? boss.roarWindup : stats.windup
  return base * (isEnraged(e) ? 0.85 : 1)
}

const aliveCount = (w: World) => w.enemies.filter((e) => e.state !== 'dying').length

function stepEnemy(w: World, e: Enemy, dt: number, rng: Rng) {
  const stats = ENEMIES[e.kind]
  const p = w.player
  e.stateTime += dt
  e.flash = Math.max(0, e.flash - dt)
  e.hitTime = Math.max(0, e.hitTime - dt)
  e.cooldown = Math.max(0, e.cooldown - dt)
  e.poiseTimer = Math.max(0, e.poiseTimer - dt)
  e.jumpCooldown = Math.max(0, e.jumpCooldown - dt)
  if (e.poiseTimer === 0) e.poiseHit = 0
  const dx = p.x - e.x
  const toward = dx >= 0 ? 1 : -1
  const enraged = isEnraged(e)

  switch (e.state) {
    case 'walk':
      e.facing = toward
      if (w.over) {
        e.vx = approach(e.vx, 0, 2600 * dt)
        break
      }
      e.vx = approach(e.vx, toward * stats.speed * (enraged ? 1.3 : 1), 2600 * dt)
      if (stats.style === 'boss') {
        if (e.cooldown === 0 && e.grounded) chooseBossMove(w, e, stats, Math.abs(dx))
      } else if (Math.abs(dx) < stats.attackRange && e.cooldown === 0 && e.grounded && Math.abs(p.y - e.y) < 60) {
        e.state = 'windup'
        e.stateTime = 0
      } else if (stats.canJump && e.grounded && e.jumpCooldown === 0 && !w.over) hopTowardPlayer(w, e)
      break
    case 'windup':
      e.facing = toward
      e.vx = approach(e.vx, 0, 3000 * dt)
      if (e.stateTime >= windupTime(e)) beginEnemyAttack(w, e, stats, rng)
      break
    case 'attack':
      stepEnemyAttack(w, e, stats, rng)
      break
    case 'recover':
      e.vx = approach(e.vx, 0, 2600 * dt)
      if (e.stateTime >= stats.recover) {
        e.state = 'walk'
        e.stateTime = 0
        e.cooldown = stats.attackCooldown * (enraged ? 0.7 : 1)
      }
      break
    case 'hurt':
      e.vx = approach(e.vx, 0, 900 * dt)
      if (e.stateTime >= stats.hurtTime) {
        e.state = 'walk'
        e.stateTime = 0
      }
      break
    case 'stagger':
      e.vx = approach(e.vx, 0, 700 * dt)
      if (e.stateTime >= stats.staggerTime) {
        e.state = 'walk'
        e.stateTime = 0
        e.cooldown = 0.5
      }
      break
    case 'dying':
      e.vx = approach(e.vx, 0, 600 * dt)
      break
  }

  e.vy -= ENEMY_GRAVITY * dt
  e.x += e.vx * dt
  e.grounded = moveVertically(w, e, dt, false) !== null
}

/** The speed of an enemy's hop up onto a ledge: just enough to clear one. */
const ENEMY_HOP = 780

/** Light enemies climb to the player when they stand on a ledge, and come down to them when they do not. */
function hopTowardPlayer(w: World, e: Enemy) {
  const p = w.player
  const stats = ENEMIES[e.kind]
  const rise = p.y - e.y
  // The player is up on a ledge nearby: jump for it.
  if (rise > 40 && p.grounded && Math.abs(p.x - e.x) < stats.halfWidth + 140) {
    e.vy = ENEMY_HOP
    e.grounded = false
    e.jumpCooldown = 1.1
    return
  }
  // Waiting under a ledge the player is on, or boxed in on a ledge: a short wait before trying again.
  e.jumpCooldown = 0.25
}

/** The boss cycles through its moves: close in, it slams or roars; at range, it charges or roars. */
function chooseBossMove(w: World, e: Enemy, stats: EnemyStats, distance: number) {
  const n = e.pattern++
  const roomForGoblins = aliveCount(w) < 4
  const near = distance < stats.attackRange
  if (near) e.move = n % 3 === 2 && roomForGoblins ? 'roar' : 'slam'
  else e.move = n % 2 === 1 && roomForGoblins ? 'roar' : 'charge'
  e.state = 'windup'
  e.stateTime = 0
}

function pushWave(w: World, e: Enemy, stats: EnemyStats, dir: 1 | -1) {
  const wave = stats.wave
  if (!wave) return
  w.waves.push({
    x: e.x + dir * stats.reach * 0.8,
    vx: dir * wave.speed,
    life: wave.life,
    maxLife: wave.life,
    damage: wave.damage * e.power,
    height: wave.height,
    halfWidth: wave.halfWidth,
    blockCost: wave.blockCost,
    struck: false,
    friendly: false,
  })
}

function beginEnemyAttack(w: World, e: Enemy, stats: EnemyStats, rng: Rng) {
  e.state = 'attack'
  e.stateTime = 0
  e.struckPlayer = false
  if (stats.style === 'leap') {
    e.vx = e.facing * stats.leapSpeed
    e.vy = stats.leapLift
  } else if (stats.style === 'slam') {
    // The club hits the ground and a wave of rock runs out ahead of it.
    pushWave(w, e, stats, e.facing)
    w.shake = Math.max(w.shake, 9)
    burst(w, e.x + e.facing * stats.reach * 0.8, 6, e.facing, rng, 16, DUST)
  } else if (stats.style === 'boss' && stats.boss) {
    if (e.move === 'charge') {
      e.vx = e.facing * stats.boss.chargeSpeed
      w.shake = Math.max(w.shake, 4)
    } else if (e.move === 'roar') {
      // Goblins answer the call from both edges of the arena.
      for (let i = 0; i < stats.boss.summon; i++) spawnEnemy(w, 'goblin', i % 2 === 0 ? -ROUNDS.margin - 20 : ARENA.width + ROUNDS.margin + 20)
      w.shake = Math.max(w.shake, 8)
      floater(w, e.x, e.y + stats.labelHeight, 'ROAR!', '#c9a3ff', 24)
      burst(w, e.x, e.y + stats.height * 0.7, e.facing, rng, 20, ['#c9a3ff', '#ffffff', '#8a6fd6'])
    } else {
      pushWave(w, e, stats, e.facing)
      if (isEnraged(e)) pushWave(w, e, stats, (e.facing * -1) as 1 | -1)
      w.shake = Math.max(w.shake, 12)
      burst(w, e.x + e.facing * stats.reach * 0.8, 6, e.facing, rng, 22, DUST)
    }
  }
}

function stepEnemyAttack(w: World, e: Enemy, stats: EnemyStats, rng: Rng) {
  if (stats.style === 'leap') {
    if (!e.struckPlayer && overlapsPlayer(w, e, stats.halfWidth + 10)) settleStrike(e, stats, damagePlayer(w, stats.damage * e.power, e.x, rng, stats.blockCost))
    if (e.grounded && e.stateTime > 0.05) {
      e.state = 'recover'
      e.stateTime = 0
      e.vx = 0
    }
    return
  }
  const boss = stats.boss
  if (boss && e.move === 'charge') {
    // A charge keeps its heading until it hits something: the player, or a wall.
    e.vx = e.facing * boss.chargeSpeed
    // Only what is in front of it is hit: once the player has slipped past, the charge cannot turn on them.
    const inFront = (w.player.x - e.x) * e.facing > -10
    if (!e.struckPlayer && inFront && overlapsPlayer(w, e, stats.halfWidth + 6)) {
      settleStrike(e, stats, damagePlayer(w, boss.chargeDamage * e.power, e.x, rng, boss.chargeBlockCost))
    }
    const atWall = (e.facing < 0 && e.x <= stats.halfWidth + 12) || (e.facing > 0 && e.x >= ARENA.width - stats.halfWidth - 12)
    if (atWall) {
      // It runs headlong into the wall and is left reeling: the opening to punish.
      e.state = 'stagger'
      e.stateTime = 0
      e.vx = 0
      w.shake = Math.max(w.shake, 16)
      w.freeze = Math.max(w.freeze, 0.08)
      burst(w, e.x + e.facing * stats.halfWidth, 80, -e.facing, rng, 26, DUST)
      floater(w, e.x, e.y + stats.labelHeight, 'STUNNED!', '#ffd27a', 24)
    } else if (e.stateTime >= boss.chargeTime) {
      e.state = 'recover'
      e.stateTime = 0
    }
    return
  }
  if (boss && e.move === 'roar') {
    if (e.stateTime >= 0.12) {
      e.state = 'recover'
      e.stateTime = 0
    }
    return
  }
  if (!e.struckPlayer && inStrikeZone(w, e, stats)) settleStrike(e, stats, damagePlayer(w, stats.damage * e.power, e.x, rng, stats.blockCost))
  if (e.stateTime >= stats.active) {
    e.state = 'recover'
    e.stateTime = 0
  }
}

/** What an attack that has just connected (or been stopped) does to the attacker. */
function settleStrike(e: Enemy, stats: EnemyStats, result: HitResult) {
  if (result === 'none') return
  e.struckPlayer = true
  if (result === 'parried') {
    e.state = 'stagger'
    e.stateTime = 0
    e.vx = -e.facing * (stats.heavy ? 70 : 240)
  } else if (result === 'blocked') {
    e.vx = -e.facing * (stats.heavy ? 40 : 170)
    if (stats.style === 'leap') {
      e.state = 'recover'
      e.stateTime = 0
    }
  }
}

function overlapsPlayer(w: World, e: Enemy, reach: number) {
  const p = w.player
  const stats = ENEMIES[e.kind]
  return Math.abs(p.x - e.x) < p.halfWidth + reach && e.y < p.y + p.height && e.y + stats.height > p.y
}

/** The ground a chop or slam covers, in front of the enemy. */
function inStrikeZone(w: World, e: Enemy, stats: EnemyStats) {
  const p = w.player
  const x0 = e.facing > 0 ? e.x - stats.halfWidth * 0.5 : e.x - stats.reach
  const x1 = e.facing > 0 ? e.x + stats.reach : e.x + stats.halfWidth * 0.5
  return p.x + p.halfWidth > x0 && p.x - p.halfWidth < x1 && p.y < e.y + stats.hitHeight && p.y + p.height > e.y
}

function stepWaves(w: World, dt: number, rng: Rng) {
  const p = w.player
  for (const wave of w.waves) {
    wave.life -= dt
    wave.x += wave.vx * dt
    if (wave.friendly) {
      // The player's own wave hurts enemies on the ground, each once, and runs on through them.
      for (const e of w.enemies) {
        const stats = ENEMIES[e.kind]
        if (e.state === 'dying' || wave.hit?.has(e.id) || e.y >= wave.height) continue
        if (Math.abs(e.x - wave.x) > wave.halfWidth + stats.halfWidth * 0.8) continue
        wave.hit?.add(e.id)
        hitEnemy(w, e, { damage: wave.damage, poise: wave.poise ?? 0, knockback: wave.knockback ?? 0, hitStop: 0.05, shake: 3, dir: wave.vx >= 0 ? 1 : -1, finisher: false }, rng)
      }
      continue
    }
    if (wave.struck || Math.abs(p.x - wave.x) >= wave.halfWidth + p.halfWidth * 0.8 || p.y >= wave.height) continue
    const result = damagePlayer(w, wave.damage, wave.x - Math.sign(wave.vx) * 30, rng, wave.blockCost)
    if (result === 'none') continue
    wave.struck = true
    // A shield that meets the wave splits it; it is spent either way.
    if (result === 'blocked' || result === 'parried') wave.life = 0
  }
  w.waves = w.waves.filter((wave) => wave.life > 0 && wave.x > -60 && wave.x < ARENA.width + 60)
}

/**
 * Bodies are solid. Heavy enemies shove the player aside; lighter ones are pushed back by
 * the player and by each other, so a crowd spreads out instead of stacking on one spot.
 * A dashing player passes through everyone.
 */
function keepApart(w: World) {
  const p = w.player
  const live = w.enemies.filter((e) => e.state !== 'dying')
  if (p.state !== 'dash' && p.state !== 'dead') {
    for (const e of live) {
      const stats = ENEMIES[e.kind]
      if (p.y > stats.height * 0.7) continue
      const dx = p.x - e.x
      const overlap = stats.halfWidth + p.halfWidth * 0.5 - Math.abs(dx)
      if (overlap <= 0) continue
      const side = dx === 0 ? p.facing : Math.sign(dx)
      if (stats.heavy) p.x = clamp(p.x + side * overlap, WALL_MARGIN, ARENA.width - WALL_MARGIN)
      else {
        p.x = clamp(p.x + (side * overlap) / 2, WALL_MARGIN, ARENA.width - WALL_MARGIN)
        e.x -= (side * overlap) / 2
      }
    }
  }
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

/* -- Feedback -------------------------------------------------------------- */

/** A number or word that floats up from where something happened. */
function floater(w: World, x: number, y: number, text: string, color: string, size = 18) {
  w.floaters.push({ x, y, text, color, size, life: 0.95, maxLife: 0.95 })
  if (w.floaters.length > 30) w.floaters.splice(0, w.floaters.length - 30)
}

/** A ring and slash mark where a blow landed. */
function impact(w: World, x: number, y: number, dir: 1 | -1, size: number, color: string) {
  w.impacts.push({ x, y, size, color, dir, life: 0.24, maxLife: 0.24 })
  if (w.impacts.length > 12) w.impacts.splice(0, w.impacts.length - 12)
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
  for (const f of w.floaters) {
    f.life -= dt
    f.y += 58 * dt
  }
  w.floaters = w.floaters.filter((f) => f.life > 0)
  for (const i of w.impacts) i.life -= dt
  w.impacts = w.impacts.filter((i) => i.life > 0)
  for (const q of w.particles) {
    q.life -= dt
    q.vy -= 1500 * dt
    q.x += q.vx * dt
    const before = q.y
    q.y += q.vy * dt
    // Sparks and dust settle on a ledge as on the ground.
    if (q.vy < 0) q.y = Math.max(q.y, floorBelow(w, q.x, before))
    else q.y = Math.max(q.y, 0)
  }
  w.particles = w.particles.filter((q) => q.life > 0)
}
