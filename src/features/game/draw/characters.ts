/**
 * Draws the hero and the enemies from their sprite sheets: which animation and frame to show
 * for what the rules say is happening, plus the flashes that make hits and warnings readable.
 */
import { ARENA, ENEMIES, PLAYER } from '../config'
import { lookOf } from '../enemyLooks'
import type { EnemyLook } from '../enemyLooks'
import { HEROES } from '../heroes'
import { windupTime } from '../sim'
import { SPRITES, attackFrame, phaseFrame } from '../spriteData'
import type { ClipId, SpriteId } from '../spriteData'
import type { Enemy, Player, World } from '../types'
import { drawFrame, filtered, silhouette } from './sprites'
import type { Sprites } from './sprites'

const { groundY } = ARENA

/** What to show: a clip of a character and the frame of it. */
type Pose = { clip: ClipId; frame: number }

const clampFrame = (sprite: SpriteId, clip: ClipId, frame: number) => Math.max(0, Math.min((SPRITES[sprite].frames[clip] ?? 1) - 1, frame))

/** The frame of a looping clip at `time`, `fps` frames a second, offset so a crowd does not march in step. */
const loop = (sprite: SpriteId, clip: ClipId, time: number, fps: number, offset = 0) => Math.floor(time * fps + offset) % (SPRITES[sprite].frames[clip] ?? 1)

/** Something moving along the ground cycles its walk; standing, it breathes. */
function groundPose(sprite: SpriteId, moving: boolean, time: number, offset: number): Pose {
  return moving ? { clip: 'walk', frame: loop(sprite, 'walk', time, 11, offset) } : { clip: 'idle', frame: loop(sprite, 'idle', time, 6, offset) }
}

function heroPose(w: World, p: Player): Pose {
  const hero = HEROES[w.hero]
  const sprite = hero.id
  switch (p.state) {
    case 'dead':
      return { clip: 'death', frame: clampFrame(sprite, 'death', Math.floor(p.stateTime / 0.16)) }
    case 'hurt':
      return { clip: 'hurt', frame: clampFrame(sprite, 'hurt', Math.floor((p.stateTime / PLAYER.hurtTime) * 3)) }
    case 'attack': {
      const step = hero.combos[p.attackKind][p.attackIndex]
      const phases = SPRITES[sprite].phases[step.clip]
      if (!phases) return { clip: step.clip, frame: 0 }
      return { clip: step.clip, frame: attackFrame(phases, p.stateTime, step.hitStart, step.hitEnd, step.duration) }
    }
    case 'dash':
      return { clip: 'walk', frame: loop(sprite, 'walk', p.stateTime, 30) }
    case 'block':
      // Shield up: the soldier's drawn-back pose, held.
      return { clip: 'attack03', frame: 3 }
    default:
      if (!p.grounded) return { clip: 'walk', frame: p.vy > 0 ? 1 : 5 }
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
  const info = SPRITES[hero.id]
  const pose = heroPose(w, p)
  const sheet = sprites.characters[hero.id][pose.clip]
  if (!sheet) return
  const y = groundY - p.y
  const at = (source: CanvasImageSource, x = p.x) => drawFrame(ctx, source, pose.frame, x, y, hero.scale, p.facing, info)

  ctx.save()
  // The dash leaves a trail of fading copies behind it.
  if (p.state === 'dash') {
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.16 * (4 - i)
      at(silhouette(sheet, '#9fd0ff'), p.x - p.facing * i * 26)
    }
  }
  // Blinking while nothing can touch the hero after a hit.
  const blink = p.invuln > 0 && p.state !== 'dash' && p.state !== 'dead' && p.state !== 'attack' && Math.floor(w.time * 14) % 2 === 0
  ctx.globalAlpha = blink ? 0.45 : 1
  at(sheet)
  wash(ctx, sheet, '#ffffff', p.hitTime > 0.24 ? 0.9 : 0, at)
  wash(ctx, sheet, '#ffd27a', p.parryFlash / 0.35, at)
  ctx.restore()
}

/* -- Enemies ----------------------------------------------------------------- */

function enemyPose(w: World, e: Enemy, look: EnemyLook): Pose {
  const stats = ENEMIES[e.kind]
  const sprite = look.sprite
  const info = SPRITES[sprite]
  const boss = look.boss
  const clip: 'attack01' | 'attack02' | 'attack03' = boss ? (e.move === 'charge' ? boss.charge : e.move === 'roar' ? boss.roar : boss.slam) : look.melee
  const phases = info.phases[clip]
  switch (e.state) {
    case 'dying':
      return { clip: 'death', frame: clampFrame(sprite, 'death', Math.floor(e.stateTime / 0.13)) }
    case 'hurt':
      return { clip: 'hurt', frame: clampFrame(sprite, 'hurt', Math.floor((e.stateTime / stats.hurtTime) * 3)) }
    case 'stagger':
      return { clip: 'hurt', frame: clampFrame(sprite, 'hurt', 2) }
    case 'windup':
      if (!phases) return { clip, frame: 0 }
      if (boss && e.move === 'roar') return { clip, frame: boss.roarFrame }
      return { clip, frame: phaseFrame(phases.windup, e.stateTime / windupTime(e)) }
    case 'attack':
      if (!phases) return { clip, frame: 0 }
      if (boss && e.move === 'roar') return { clip, frame: boss.roarFrame }
      // A charge runs on, so its strike frames repeat; the rest play once over the time the blow is out.
      if (boss && e.move === 'charge') return { clip, frame: phaseFrame(phases.strike, (e.stateTime * 7) % 1) }
      return { clip, frame: phaseFrame(phases.strike, e.stateTime / Math.max(0.2, stats.active || 0.3)) }
    case 'recover':
      if (!phases) return { clip, frame: 0 }
      if (boss && e.move === 'roar') return { clip, frame: boss.roarFrame }
      return { clip, frame: phaseFrame(phases.recover, e.stateTime / stats.recover) }
    default:
      if (!e.grounded) return { clip: 'walk', frame: 2 }
      return groundPose(sprite, Math.abs(e.vx) > 12, w.time, e.id)
  }
}

export function drawEnemy(ctx: CanvasRenderingContext2D, w: World, e: Enemy, sprites: Sprites) {
  const look = lookOf(e.kind, e.variant)
  const pose = enemyPose(w, e, look)
  const sheet = sprites.characters[look.sprite][pose.clip]
  if (!sheet) return
  const stats = ENEMIES[e.kind]
  // Wearing the hero's own body, an enemy is turned a different colour so it is not mistaken for the hero.
  const recolour = look.sprite === w.hero
  const source = (img: HTMLImageElement): CanvasImageSource => (recolour ? filtered(img, 'hue-rotate(150deg) saturate(1.1)') : img)
  const heavy = stats.heavy
  const shake = e.state === 'windup' && heavy ? (Math.random() - 0.5) * 3 : 0
  const x = e.x + shake
  const y = groundY - e.y
  const at = (src: CanvasImageSource) => drawFrame(ctx, src, pose.frame, x, y, look.scale, e.facing, SPRITES[look.sprite])

  ctx.save()
  ctx.globalAlpha = e.state === 'dying' ? Math.max(0, 1 - Math.max(0, e.stateTime - 0.4) / 0.3) : 1
  at(source(sheet))
  // The warning reddens a body as the blow gets close; a hit flashes it white; a stagger tints it gold.
  if (e.state === 'windup') wash(ctx, sheet, '#ff3b3b', 0.12 + 0.4 * Math.min(1, e.stateTime / windupTime(e)), at)
  if (e.state === 'stagger') wash(ctx, sheet, '#ffd27a', 0.22 + 0.12 * Math.sin(w.time * 18), at)
  wash(ctx, sheet, '#ffffff', e.flash > 0 ? 0.6 : 0, at)
  ctx.restore()
}
