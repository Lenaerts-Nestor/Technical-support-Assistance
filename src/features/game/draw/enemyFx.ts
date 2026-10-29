import type { Enemy } from '../types'
import { clamp, easeOut } from './rigDraw'
import type { Tint } from './rigDraw'

/**
 * How an enemy is tinted: white for the instant after a hit, then, while it winds up for an
 * attack, a red that grows and pulses the nearer the blow gets, so the danger reads from across
 * the screen. A staggered enemy glows faintly gold: it is open.
 */
export function enemyTint(e: Enemy, windup: number): Tint | false {
  if (e.flash > 0) return { color: '#ffffff', amount: clamp(e.flash / 0.1, 0.45, 1) }
  if (e.state === 'windup') {
    const k = clamp(e.stateTime / Math.max(0.01, windup), 0, 1)
    const pulse = 0.5 + 0.5 * Math.sin(e.stateTime * (14 + 26 * k))
    return { color: '#ff3b2f', amount: (0.06 + 0.42 * k * k) * (0.5 + 0.5 * pulse) }
  }
  if (e.state === 'stagger') return { color: '#ffd27a', amount: 0.16 + 0.12 * Math.sin(e.stateTime * 12) }
  return false
}

/** How far into the shove of a fresh hit an enemy is: 1 at the blow, easing to 0. */
export const recoilOf = (e: Enemy) => easeOut(clamp(e.hitTime / 0.3, 0, 1))

/** A small shake in the last moment of a wind-up: the blow is about to fall. */
export function tremble(e: Enemy, windup: number, strength = 1.4) {
  if (e.state !== 'windup') return 0
  const k = clamp(e.stateTime / Math.max(0.01, windup), 0, 1)
  return k > 0.6 ? Math.sin(e.stateTime * 70) * strength * ((k - 0.6) / 0.4) : 0
}
