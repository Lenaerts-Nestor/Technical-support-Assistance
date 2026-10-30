/**
 * Draws the hero and the enemies from their sprite sheets: which animation and frame to show
 * for what the rules say is happening, plus the flashes that make hits and warnings readable.
 */
import { ARENA, ENEMIES, PLAYER } from '../config'
import { lookOf } from '../enemyLooks'
import type { EnemyLook } from '../enemyLooks'
import { HEROES, stepsOf } from '../heroes'
import { windupTime } from '../sim'
import { SPRITES, attackFrame, phaseFrame } from '../spriteData'
import type { ClipId, Phases, SpriteId } from '../spriteData'
import type { Enemy, Player, World } from '../types'
import { drawFrame, filtered, silhouette } from './sprites'
import type { Sprites } from './sprites'

const { groundY } = ARENA

/** What to show: a clip of a character and the frame of it. */
type Pose = { clip: ClipId; frame: number }

const framesOf = (sprite: SpriteId, clip: ClipId) => SPRITES[sprite].frames[clip] ?? 0
const has = (sprite: SpriteId, clip: ClipId) => framesOf(sprite, clip) > 0
const clampFrame = (sprite: SpriteId, clip: ClipId, frame: number) => Math.max(0, Math.min(framesOf(sprite, clip) - 1, frame))

/** The frame of a looping clip at `time`, `fps` frames a second, offset so a crowd does not march in step. */
const loop = (sprite: SpriteId, clip: ClipId, time: number, fps: number, offset = 0) => Math.floor(time * fps + offset) % Math.max(1, framesOf(sprite, clip))

/** Something moving along the ground cycles its walk; standing, it breathes. */
function groundPose(sprite: SpriteId, moving: boolean, time: number, offset: number): Pose {
  return moving ? { clip: 'walk', frame: loop(sprite, 'walk', time, 11, offset) } : { clip: 'idle', frame: loop(sprite, 'idle', time, 8, offset) }
}

/** Going down: the death clip, or for a character without one the hurt frame (it fades out). */
function deathPose(sprite: SpriteId, time: number, perFrame: number): Pose {
  if (has(sprite, 'death')) return { clip: 'death', frame: clampFrame(sprite, 'death', Math.floor(time / perFrame)) }
  return { clip: 'hurt', frame: 0 }
}

/** In the air: rising and falling clips if the character has them, otherwise a frame of its walk. */
function airPose(sprite: SpriteId, vy: number, time: number): Pose {
  const clip: ClipId = vy > 0 ? 'jump' : 'fall'
  if (has(sprite, clip)) return { clip, frame: loop(sprite, clip, time, 10) }
  return { clip: 'walk', frame: vy > 0 ? 1 : Math.min(5, framesOf(sprite, 'walk') - 1) }
}

function heroPose(w: World, p: Player): Pose {
  const hero = HEROES[w.hero]
  const sprite = hero.id
  switch (p.state) {
    case 'dead':
      return deathPose(sprite, p.stateTime, 0.05)
    case 'hurt':
      return { clip: 'hurt', frame: clampFrame(sprite, 'hurt', Math.floor((p.stateTime / PLAYER.hurtTime) * 3)) }
    case 'attack': {
      const step = stepsOf(hero, p.attackKind)[p.attackIndex]
      const phases = SPRITES[sprite].moves[step.move]
      return { clip: phases.clip, frame: attackFrame(phases, p.stateTime, step.hitStart, step.hitEnd, step.duration) }
    }
    case 'dash':
      if (has(sprite, 'dash')) return { clip: 'dash', frame: loop(sprite, 'dash', p.stateTime, 24) }
      return { clip: 'walk', frame: loop(sprite, 'walk', p.stateTime, 30) }
    case 'block':
      return SPRITES[sprite].guard ?? { clip: 'idle', frame: 0 }
    default:
      if (!p.grounded) return airPose(sprite, p.vy, w.time)
      return groundPose(sprite, Math.abs(p.vx) > 30, w.time, 0)
  }
}

/** A flat colour laid over a character, fading with `alpha`. */
function wash(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, color: string, alpha: number, draw: (source: CanvasImageSource) => void) {
  if (alpha <= 0) return
  ctx.globalAlpha *= Math.min(1, alpha)
  draw(silhouette(sheet, color))
  ctx.globalAlpha /= Math.min(1, alpha)
}

export function drawHero(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const p = w.player
  const hero = HEROES[w.hero]
  const pose = heroPose(w, p)
  const sheet = sprites.characters[hero.id][pose.clip]
  if (!sheet) return
  const y = groundY - p.y
  const at = (source: CanvasImageSource, x = p.x) => drawFrame(ctx, source, pose.frame, x, y, hero.scale, p.facing, hero.id)

  ctx.save()
  // The dash leaves a trail of fading copies behind it.
  if (p.state === 'dash') {
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.16 * (4 - i)
      at(silhouette(sheet, '#9ff0ff'), p.x - p.facing * i * 22)
    }
  }
  // Blinking while nothing can touch the hero after a hit.
  const blink = p.invuln > 0 && p.state !== 'dash' && p.state !== 'dead' && p.state !== 'attack' && Math.floor(w.time * 14) % 2 === 0
  ctx.globalAlpha = blink ? 0.45 : p.state === 'dead' && !has(hero.id, 'death') ? Math.max(0, 1 - p.stateTime) : 1
  at(sheet)
  wash(ctx, sheet, '#ffffff', p.hitTime > 0.24 ? 0.9 : 0, at)
  wash(ctx, sheet, '#ffd27a', p.parryFlash / 0.35, at)
  ctx.restore()
}

/* -- Enemies ----------------------------------------------------------------- */

/** The attack an enemy is making: its own move, or for the boss the move of the attack it chose. */
function enemyMove(e: Enemy, look: EnemyLook): Phases {
  const boss = look.boss
  const name = boss ? (e.move === 'charge' ? boss.charge : e.move === 'roar' ? boss.roar : boss.slam) : look.melee
  return SPRITES[look.sprite].moves[name]
}

function enemyPose(w: World, e: Enemy, look: EnemyLook): Pose {
  const stats = ENEMIES[e.kind]
  const sprite = look.sprite
  const boss = look.boss
  const phases = enemyMove(e, look)
  const clip = phases.clip
  // A run (the lance, the boss's charge) loops its strike frames for as long as it lasts.
  const running = stats.style === 'lance' || (boss && e.move === 'charge')
  switch (e.state) {
    case 'dying':
      return deathPose(sprite, e.stateTime, 0.13)
    case 'hurt':
      return { clip: 'hurt', frame: clampFrame(sprite, 'hurt', Math.floor((e.stateTime / stats.hurtTime) * 3)) }
    case 'stagger':
      return { clip: 'hurt', frame: clampFrame(sprite, 'hurt', 2) }
    case 'windup':
      if (boss && e.move === 'roar') return { clip, frame: boss.roarFrame }
      return { clip, frame: phaseFrame(phases.windup, e.stateTime / windupTime(e)) }
    case 'attack':
      if (boss && e.move === 'roar') return { clip, frame: boss.roarFrame }
      if (running) return { clip, frame: phaseFrame(phases.strike, (e.stateTime * 6) % 1) }
      return { clip, frame: phaseFrame(phases.strike, e.stateTime / Math.max(0.2, stats.active || 0.3)) }
    case 'recover':
      if (boss && e.move === 'roar') return { clip, frame: boss.roarFrame }
      return { clip, frame: phaseFrame(phases.recover, e.stateTime / stats.recover) }
    default:
      if (!e.grounded) return airPose(sprite, e.vy, w.time)
      return groundPose(sprite, Math.abs(e.vx) > 12, w.time, e.id)
  }
}

export function drawEnemy(ctx: CanvasRenderingContext2D, w: World, e: Enemy, sprites: Sprites) {
  const look = lookOf(e.kind, e.variant)
  const pose = enemyPose(w, e, look)
  const sheet = sprites.characters[look.sprite][pose.clip]
  if (!sheet) return
  const stats = ENEMIES[e.kind]
  const source = (img: HTMLImageElement): CanvasImageSource => (look.filter ? filtered(img, look.filter) : img)
  const shake = e.state === 'windup' && stats.heavy ? (Math.random() - 0.5) * 3 : 0
  const x = e.x + shake
  const y = groundY - e.y
  const at = (src: CanvasImageSource, dx = 0, dy = 0) => drawFrame(ctx, src, pose.frame, x + dx, y + dy, look.scale, e.facing, look.sprite)

  ctx.save()
  const fade = e.state === 'dying' ? Math.max(0, 1 - Math.max(0, e.stateTime - 0.4) / 0.3) : 1
  // An elite is wreathed in shadow: a dark, flickering outline with a pale rim.
  if (e.elite && e.state !== 'dying') {
    const rim = silhouette(sheet, '#b9f3ff')
    const shade = silhouette(sheet, '#1a1022')
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(w.time * 9 + e.id)
    for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) at(shade, dx, dy)
    ctx.globalAlpha = 0.5
    for (const [dx, dy] of [[-1.5, 0], [1.5, 0], [0, -1.5]]) at(rim, dx, dy)
  }
  ctx.globalAlpha = fade
  at(source(sheet))
  // The warning reddens a body as the blow gets close; a hit flashes it white; a stagger tints it gold.
  if (e.state === 'windup') wash(ctx, sheet, '#ff3b3b', 0.12 + 0.4 * Math.min(1, e.stateTime / windupTime(e)), at)
  if (e.state === 'stagger') wash(ctx, sheet, '#ffd27a', 0.22 + 0.12 * Math.sin(w.time * 18), at)
  wash(ctx, sheet, '#ffffff', e.flash > 0 ? 0.6 : 0, at)
  ctx.restore()
}
