/**
 * The rules of the game, with no drawing and no browser: `stepWorld` moves the world forward by
 * a small slice of time given what the player is pressing. The random source is passed in so a
 * test can play the same game twice.
 */
import { ARENA, COMBO_WINDOW, DASH, ENEMIES, PLAYER, POISE_RESET, SHIELD, SWAP, VULNERABLE_BONUS } from './config'
import type { AttackStep, ComboKind, EnemyStats } from './config'
import { awardKill, stepRound } from './rounds'
import type { Enemy, FrameInput, Player, World } from './types'
import { WEAPONS } from './weapons'
import type { WeaponDef } from './weapons'
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
  if (input.swapPressed) buffer.swap = PLAYER.inputBuffer
  w.shake *= Math.exp(-dt * 10)

  // Hit-stop: the whole world holds its breath for a moment after a solid hit, and so do
  // the buffered button presses, so a press made during it is still there when time resumes.
  if (w.freeze > 0) {
    w.freeze -= dt
    return
  }

  buffer.jump = Math.max(0, buffer.jump - dt)
  buffer.dash = Math.max(0, buffer.dash - dt)
  // An attack pressed while a new weapon is still coming up waits for it instead of being lost.
  if (w.player.swapAnim >= SWAP.time) {
    buffer.light = Math.max(0, buffer.light - dt)
    buffer.heavy = Math.max(0, buffer.heavy - dt)
  }
  buffer.swap = Math.max(0, buffer.swap - dt)
  w.time += dt
  stepPlayer(w, input, dt, rng)
  for (const enemy of w.enemies) stepEnemy(w, enemy, dt, rng)
  stepWaves(w, dt, rng)
  stepArrows(w, dt, rng)
  keepApart(w)
  w.enemies = w.enemies.filter((e) => e.state !== 'dying' || e.stateTime < 0.7)
  stepRound(w, dt, rng)
  stepParticles(w, dt)
}

/* -- Player ---------------------------------------------------------------- */

/** The weapon in hand. */
export const weaponOf = (w: World): WeaponDef => WEAPONS[w.loadout[w.activeSlot]]

/** The step of the combo being swung. */
const stepOf = (w: World, p: Player): AttackStep => weaponOf(w).combos[p.attackKind][p.attackIndex]

function stepPlayer(w: World, input: FrameInput, dt: number, rng: Rng) {
  const p = w.player
  const weapon = weaponOf(w)
  p.stateTime += dt
  p.invuln = Math.max(0, p.invuln - dt)
  p.dashCooldown = Math.max(0, p.dashCooldown - dt)
  p.blockCooldown = Math.max(0, p.blockCooldown - dt)
  p.guardDelay = Math.max(0, p.guardDelay - dt)
  p.parryFlash = Math.max(0, p.parryFlash - dt)
  p.lowStamina = Math.max(0, p.lowStamina - dt)
  p.swapCooldown = Math.max(0, p.swapCooldown - dt)
  p.swapAnim += dt
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
      p.vx = approach(p.vx, input.move * PLAYER.speed * w.mods.moveSpeed, accel * dt)
      cutJump(p, input)
      if (tryJump(w, p)) break
      if (w.buffer.swap > 0 && trySwap(w, p, rng)) break
      if (w.buffer.dash > 0 && tryDash(w, p, input)) break
      if (w.buffer.heavy > 0 && tryAttack(w, p, input, 'heavy')) break
      if (w.buffer.light > 0 && tryAttack(w, p, input, 'light')) break
      if (input.blockHeld && weapon.canBlock && p.grounded && p.blockCooldown === 0 && p.swapAnim >= SWAP.time) {
        p.state = 'block'
        p.stateTime = 0
        p.guardDelay = 0
      }
      break
    }
    case 'block': {
      if (!input.blockHeld || !p.grounded || !weapon.canBlock) {
        lowerShield(p)
        break
      }
      // Turning round with the shield up leaves the back open for a moment.
      if (input.move !== 0 && input.move !== p.facing) {
        p.facing = input.move
        p.guardDelay = SHIELD.turnDelay
      }
      p.vx = approach(p.vx, input.move * PLAYER.speed * SHIELD.moveShare * w.mods.moveSpeed, PLAYER.groundAccel * dt)
      if (tryJump(w, p)) break
      if (w.buffer.swap > 0 && trySwap(w, p, rng)) break
      if (w.buffer.dash > 0 && tryDash(w, p, input)) break
      if (w.buffer.heavy > 0 && tryAttack(w, p, input, 'heavy')) break
      if (w.buffer.light > 0 && tryAttack(w, p, input, 'light')) break
      break
    }
    case 'attack': {
      const step = stepOf(w, p)
      if (step.charge && p.drawing) drawBow(p, step, input, dt)
      const t = p.stateTime
      if (t - dt < step.hitStart && t >= step.hitStart) {
        p.vx = p.facing * step.lunge
        if (step.projectile) fireArrow(w, p, step)
        if (step.wave) spawnPlayerWave(w, p, step, rng)
      } else if (step.charge && p.drawing) {
        // A drawn bow can be walked with, slowly, and aimed by turning.
        if (input.move !== 0) p.facing = input.move
        p.vx = approach(p.vx, input.move * PLAYER.speed * 0.4, PLAYER.groundAccel * dt)
      } else if (t < step.hitStart || t > step.hitEnd) p.vx = approach(p.vx, 0, 1500 * dt)
      cutJump(p, input)
      if (!step.projectile && t >= step.hitStart && t <= step.hitEnd) strike(w, step, rng)
      if (p.drawing) {
        if (w.buffer.dash > 0 && tryDash(w, p, input)) break
      } else if (t >= step.cancelAt) continueAttack(w, p, input, rng)
      if (p.state === 'attack' && !p.drawing && t >= step.duration) endAttack(w, p)
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
  const wanted = p.x + p.vx * dt
  p.x = clamp(wanted, WALL_MARGIN, ARENA.width - WALL_MARGIN)
  if (p.x !== wanted) p.vx = 0
  p.y += p.vy * dt
  if (p.y <= 0) {
    p.y = 0
    if (p.vy < 0) p.vy = 0
    p.grounded = true
  } else {
    p.grounded = false
  }
}

function spend(p: Player, amount: number) {
  p.stamina = Math.max(0, p.stamina - amount)
  p.staminaDelay = PLAYER.staminaDelay
}

/** Starts a jump if one was asked for and the player stands on the ground. */
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
  const cost = DASH.stamina * w.mods.dashCost
  if (p.stamina < cost) {
    w.buffer.dash = 0
    p.lowStamina = 0.5
    return false
  }
  spend(p, cost)
  p.facing = input.move !== 0 ? input.move : p.facing
  p.state = 'dash'
  p.stateTime = 0
  p.drawing = false
  p.vy = 0
  p.dashCooldown = DASH.cooldown * w.mods.dashCooldown
  p.invuln = Math.max(p.invuln, DASH.invuln)
  w.buffer.dash = 0
  return true
}

/** Q: take the other weapon. It takes a moment to come up, and cannot be done again at once. */
function trySwap(w: World, p: Player, rng: Rng) {
  w.buffer.swap = 0
  if (p.swapCooldown > 0 || p.state === 'dead') return false
  w.activeSlot = w.activeSlot === 0 ? 1 : 0
  p.swapCooldown = SWAP.cooldown
  p.swapAnim = 0
  p.comboWindow = 0
  p.attackIndex = 0
  p.drawing = false
  p.state = 'free'
  p.stateTime = 0
  burst(w, p.x + p.facing * 30, p.y + 70, p.facing, rng, 10, ['#ffd27a', '#ffffff', '#c9d1de'])
  return true
}

/** Start the first hit of a combo, or the next one while the chain is still alive. */
function tryAttack(w: World, p: Player, input: FrameInput, button: 'light' | 'heavy') {
  if (p.swapAnim < SWAP.time) return false
  const weapon = weaponOf(w)
  // With an enemy right in the bow's face, a light press kicks instead of shooting.
  const close = button === 'light' && weapon.closeRange > 0 && weapon.combos.close.length > 0 && nearestEnemy(w, weapon.closeRange) !== null
  const kind: ComboKind = close ? 'close' : button
  const continues = p.comboWindow > 0 && p.attackKind === kind
  return beginAttack(w, p, input, button, kind, continues ? p.attackIndex : 0)
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

function beginAttack(w: World, p: Player, input: FrameInput, button: 'light' | 'heavy', kind: ComboKind, index: number) {
  const weapon = weaponOf(w)
  const step = weapon.combos[kind][index]
  if (!step) return false
  if (p.stamina < step.stamina) {
    w.buffer[button] = 0
    p.lowStamina = 0.5
    return false
  }
  spend(p, step.stamina)
  p.state = 'attack'
  p.stateTime = 0
  p.attackKind = kind
  p.attackIndex = index
  p.comboWindow = 0
  p.struck.clear()
  p.drawing = Boolean(step.charge)
  p.drawTime = 0
  p.drawPower = 0
  w.buffer[button] = 0
  if (input.move !== 0) p.facing = input.move
  else {
    // Nothing held: turn towards the closest enemy in reach, so a swing is rarely wasted.
    const target = nearestEnemy(w, kind === 'close' ? weapon.closeRange : weapon.aimRange)
    if (target) p.facing = target.x >= p.x ? 1 : -1
  }
  return true
}

/** Late in a swing the next action may cut the recovery short. */
function continueAttack(w: World, p: Player, input: FrameInput, rng: Rng) {
  const combo = weaponOf(w).combos
  const steps = combo[p.attackKind]
  const last = p.attackIndex >= steps.length - 1
  if (w.buffer.dash > 0 && tryDash(w, p, input)) return
  if (w.buffer.swap > 0 && trySwap(w, p, rng)) return
  if (w.buffer.heavy > 0) {
    // Heavy follows a light hit, and a heavy chop leads into the next heavy one.
    if (p.attackKind !== 'heavy' && combo.heavy.length > 0 && beginAttack(w, p, input, 'heavy', 'heavy', 0)) return
    if (p.attackKind === 'heavy' && !last && beginAttack(w, p, input, 'heavy', 'heavy', p.attackIndex + 1)) return
  }
  if (w.buffer.light > 0 && p.attackKind === 'light' && !last && beginAttack(w, p, input, 'light', 'light', p.attackIndex + 1)) return
  if (tryJump(w, p)) endAttack(w, p)
}

function endAttack(w: World, p: Player) {
  const steps = weaponOf(w).combos[p.attackKind]
  const last = p.attackIndex >= steps.length - 1
  p.state = 'free'
  p.stateTime = 0
  p.drawing = false
  p.comboWindow = last ? 0 : COMBO_WINDOW
  p.attackIndex = last ? 0 : p.attackIndex + 1
}

/** A bow held drawn: it waits at the point of release until the button is let go or the draw is full. */
function drawBow(p: Player, step: AttackStep, input: FrameInput, dt: number) {
  const charge = step.charge
  if (!charge) return
  p.drawTime += dt
  p.drawPower = clamp((p.drawTime - charge.min) / (charge.max - charge.min), 0, 1)
  if (p.drawTime >= charge.max || (!input.heavyHeld && p.drawTime >= charge.min)) {
    p.drawing = false
    p.stateTime = step.hitStart
  } else {
    p.stateTime = Math.min(p.stateTime, step.hitStart - 0.001)
  }
}

function fireArrow(w: World, p: Player, step: AttackStep) {
  const shot = step.projectile
  if (!shot) return
  const power = step.charge ? step.charge.minPower + (1 - step.charge.minPower) * p.drawPower : 1
  w.arrows.push({
    x: p.x + p.facing * 40,
    y: p.y + 62,
    vx: p.facing * shot.speed,
    damage: step.damage * power,
    poise: step.poise * power,
    knockback: step.knockback * power,
    hitStop: step.hitStop,
    shake: step.shake * power,
    pierce: shot.pierce,
    charged: Boolean(step.charge),
    hit: new Set(),
    life: shot.life,
    maxLife: shot.life,
  })
  p.vx = -p.facing * 90
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
  burst(w, p.x + p.facing * step.reach * 0.9, 6, p.facing, rng, 16, DUST)
}

/** What lands on an enemy, whether from a blade, an arrow or a wave of rock. */
type HitInfo = { damage: number; poise: number; knockback: number; hitStop: number; shake: number; dir: 1 | -1; finisher: boolean }

/** The blade is out: hurt every enemy in reach that this swing has not touched yet. */
function strike(w: World, step: AttackStep, rng: Rng) {
  const p = w.player
  const steps = weaponOf(w).combos[p.attackKind]
  const finisher = p.attackKind !== 'close' && step === steps[steps.length - 1]
  const x0 = step.bothSides || p.facing < 0 ? p.x - step.reach : p.x - 10
  const x1 = step.bothSides || p.facing > 0 ? p.x + step.reach : p.x + 10
  const y0 = p.y - 10
  const y1 = p.y + PLAYER.height + 10
  for (const e of w.enemies) {
    if (e.state === 'dying' || p.struck.has(e.id)) continue
    const stats = ENEMIES[e.kind]
    const overlaps = e.x - stats.halfWidth < x1 && e.x + stats.halfWidth > x0 && e.y < y1 && e.y + stats.height > y0
    if (!overlaps) continue
    p.struck.add(e.id)
    const dir = step.bothSides ? (e.x >= p.x ? 1 : -1) : p.facing
    hitEnemy(w, e, { ...step, dir, finisher }, rng)
  }
}

function stepArrows(w: World, dt: number, rng: Rng) {
  for (const arrow of w.arrows) {
    arrow.life -= dt
    arrow.x += arrow.vx * dt
    const dir = arrow.vx >= 0 ? 1 : -1
    for (const e of w.enemies) {
      if (arrow.life <= 0) break
      if (e.state === 'dying' || arrow.hit.has(e.id)) continue
      const stats = ENEMIES[e.kind]
      if (Math.abs(arrow.x - e.x) > stats.halfWidth + 6 || arrow.y < e.y || arrow.y > e.y + stats.height) continue
      arrow.hit.add(e.id)
      hitEnemy(w, e, { ...arrow, dir, finisher: arrow.charged }, rng)
      if (arrow.pierce-- <= 0) arrow.life = 0
    }
  }
  w.arrows = w.arrows.filter((a) => a.life > 0 && a.x > -60 && a.x < ARENA.width + 60)
}

function hitEnemy(w: World, e: Enemy, hit: HitInfo, rng: Rng) {
  const stats = ENEMIES[e.kind]
  const dir = hit.dir

  // Catching an enemy off guard (mid-recovery, or staggered) hurts more.
  const exposed = e.state === 'recover' || e.state === 'stagger'
  e.hp -= hit.damage * w.mods.damage * (hit.finisher ? w.mods.finisher : 1) * (exposed ? VULNERABLE_BONUS : 1)
  e.flash = 0.1
  e.poiseHit += hit.poise * w.mods.poise
  e.poiseTimer = POISE_RESET
  const breaks = stats.poise === 0 || e.poiseHit >= stats.poise

  if (e.hp <= 0) {
    e.state = 'dying'
    e.stateTime = 0
    e.facing = (dir * -1) as 1 | -1
    e.vx = dir * hit.knockback * 1.2 * Math.max(stats.knockScale, 0.4)
    e.vy = stats.heavy ? 0 : 380
    awardKill(w, stats)
  } else if (e.state === 'stagger') {
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
  } else {
    // Poise soaks it up: the enemy keeps doing what it was doing, only nudged.
    e.vx += dir * hit.knockback * stats.knockScale * 0.3
  }

  w.freeze = Math.max(w.freeze, hit.hitStop)
  w.shake = Math.max(w.shake, hit.shake)
  burst(w, e.x - dir * stats.halfWidth * 0.4, e.y + stats.height * 0.55, dir, rng, hit.knockback > 300 ? 14 : 8, ['#ffe9a8', '#ffffff', '#a3bd6c'])
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
      return 'parried'
    }
    if (p.stamina >= blockCost) {
      spend(p, blockCost)
      p.vx = -p.facing * SHIELD.knock * (blockCost > 30 ? 1.5 : 1)
      p.invuln = 0.12
      w.freeze = Math.max(w.freeze, 0.05)
      w.shake = Math.max(w.shake, 3)
      burst(w, sparkX, sparkY, p.facing, rng, 9, STEEL_SPARKS)
      return 'blocked'
    }
    amount = Math.ceil(amount * 0.5)
    p.stamina = 0
    p.staminaDelay = PLAYER.staminaDelay * 2
    result = 'broken'
    burst(w, sparkX, sparkY, p.facing, rng, 8, STEEL_SPARKS)
  }

  const dir = p.x >= fromX ? 1 : -1
  p.drawing = false
  p.hp = Math.max(0, p.hp - Math.max(1, Math.round(amount * w.mods.damageTaken)))
  w.hurtThisRound = true
  w.streak = 0
  w.streakTimer = 0
  // A phoenix feather turns a fatal blow into a second chance, once.
  if (p.hp === 0 && w.revivesUsed < w.mods.revive) {
    w.revivesUsed += 1
    p.hp = Math.ceil(p.maxHp / 3)
    p.invuln = 1.6
    burst(w, p.x, p.y + PLAYER.height * 0.5, 0, rng, 28, ['#ffd27a', '#ffffff', '#ff8f5c'])
  } else {
    p.invuln = PLAYER.invulnAfterHit
  }
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
  return result
}

/* -- Enemies --------------------------------------------------------------- */

function stepEnemy(w: World, e: Enemy, dt: number, rng: Rng) {
  const stats = ENEMIES[e.kind]
  const p = w.player
  e.stateTime += dt
  e.flash = Math.max(0, e.flash - dt)
  e.cooldown = Math.max(0, e.cooldown - dt)
  e.poiseTimer = Math.max(0, e.poiseTimer - dt)
  if (e.poiseTimer === 0) e.poiseHit = 0
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
      if (Math.abs(dx) < stats.attackRange && e.cooldown === 0 && e.y === 0) {
        e.state = 'windup'
        e.stateTime = 0
      }
      break
    case 'windup':
      e.facing = toward
      e.vx = approach(e.vx, 0, 3000 * dt)
      if (e.stateTime >= stats.windup) beginEnemyAttack(w, e, stats, rng)
      break
    case 'attack':
      stepEnemyAttack(w, e, stats, rng)
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
  e.y += e.vy * dt
  if (e.y <= 0) {
    e.y = 0
    if (e.vy < 0) e.vy = 0
  }
}

function beginEnemyAttack(w: World, e: Enemy, stats: EnemyStats, rng: Rng) {
  e.state = 'attack'
  e.stateTime = 0
  e.struckPlayer = false
  if (stats.style === 'leap') {
    e.vx = e.facing * stats.leapSpeed
    e.vy = stats.leapLift
  } else if (stats.style === 'slam' && stats.wave) {
    // The club hits the ground and a wave of rock runs out ahead of it.
    const wave = stats.wave
    w.waves.push({
      x: e.x + e.facing * stats.reach * 0.8,
      vx: e.facing * wave.speed,
      life: wave.life,
      maxLife: wave.life,
      damage: wave.damage * e.power,
      height: wave.height,
      halfWidth: wave.halfWidth,
      blockCost: wave.blockCost,
      struck: false,
    })
    w.shake = Math.max(w.shake, 9)
    burst(w, e.x + e.facing * stats.reach * 0.8, 6, e.facing, rng, 16, DUST)
  }
}

function stepEnemyAttack(w: World, e: Enemy, stats: EnemyStats, rng: Rng) {
  if (stats.style === 'leap') {
    if (!e.struckPlayer && overlapsPlayer(w, e, stats.halfWidth + 10)) settleStrike(e, stats, damagePlayer(w, stats.damage * e.power, e.x, rng, stats.blockCost))
    if (e.y <= 0 && e.stateTime > 0.05) {
      e.state = 'recover'
      e.stateTime = 0
      e.vx = 0
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
  return Math.abs(p.x - e.x) < PLAYER.halfWidth + reach && e.y < p.y + PLAYER.height && e.y + stats.height > p.y
}

/** The ground a chop or slam covers, in front of the enemy. */
function inStrikeZone(w: World, e: Enemy, stats: EnemyStats) {
  const p = w.player
  const x0 = e.facing > 0 ? e.x - stats.halfWidth * 0.5 : e.x - stats.reach
  const x1 = e.facing > 0 ? e.x + stats.reach : e.x + stats.halfWidth * 0.5
  return p.x + PLAYER.halfWidth > x0 && p.x - PLAYER.halfWidth < x1 && p.y < e.y + stats.hitHeight && p.y + PLAYER.height > e.y
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
    if (wave.struck || Math.abs(p.x - wave.x) >= wave.halfWidth + PLAYER.halfWidth * 0.8 || p.y >= wave.height) continue
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
      const overlap = stats.halfWidth + PLAYER.halfWidth * 0.5 - Math.abs(dx)
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
