/** Shared bits for the enemies that take more than a hit or two: the telegraph, health bars and the dizzy stars. */
import { ARENA, ENEMIES } from '../config'
import type { Enemy } from '../types'

/** The warning above an enemy winding up: jump, dash, parry or get out of the way. */
export function drawWarning(ctx: CanvasRenderingContext2D, e: Enemy, lift: number) {
  const y = ARENA.groundY - e.y - ENEMIES[e.kind].labelHeight - lift
  ctx.save()
  ctx.translate(e.x, y)
  // Amber for the light hitters, red for the heavy ones, and the boss's moves each have a colour of their own.
  ctx.fillStyle = e.kind === 'archer' ? '#f5a93a' : e.move === 'roar' ? '#c9a3ff' : e.move === 'charge' || e.kind === 'lancer' ? '#ff4d4d' : '#ff7a5c'
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(12, 10)
  ctx.lineTo(-12, 10)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#16171b'
  ctx.fillRect(-1.6, -4, 3.2, 8)
  ctx.fillRect(-1.6, 6, 3.2, 2.4)
  ctx.restore()
}

/** Health and poise over an enemy that takes more than a hit or two. */
export function drawBars(ctx: CanvasRenderingContext2D, e: Enemy) {
  const stats = ENEMIES[e.kind]
  const width = stats.halfWidth * 1.7
  const x = e.x - width / 2
  const y = ARENA.groundY - e.y - stats.labelHeight - 14
  ctx.save()
  ctx.fillStyle = 'rgba(10,10,14,.72)'
  ctx.fillRect(x - 1.5, y - 1.5, width + 3, 9)
  ctx.fillStyle = e.elite ? '#b9f3ff' : '#d6525c'
  ctx.fillRect(x, y, width * Math.max(0, e.hp / e.maxHp), 6)
  if (stats.poise > 0 && e.poiseHit > 0 && e.state !== 'stagger') {
    ctx.fillStyle = 'rgba(10,10,14,.72)'
    ctx.fillRect(x - 1.5, y + 8, width + 3, 5)
    ctx.fillStyle = '#ffd27a'
    ctx.fillRect(x, y + 9.5, width * Math.min(1, e.poiseHit / stats.poise), 2)
  }
  ctx.restore()
}

/** Little stars circling the head of a staggered enemy: it is open, hit it now. */
export function drawDizzy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  const stats = ENEMIES[e.kind]
  const cy = ARENA.groundY - e.y - stats.labelHeight - 16
  ctx.save()
  ctx.fillStyle = '#ffd27a'
  for (let i = 0; i < 3; i++) {
    const a = time * 5 + (i * Math.PI * 2) / 3
    const x = e.x + Math.cos(a) * stats.halfWidth * 0.7
    const y = cy + Math.sin(a) * 6
    ctx.beginPath()
    for (let k = 0; k < 8; k++) {
      const r = k % 2 === 0 ? 6 : 2.4
      const t = (k * Math.PI) / 4 - Math.PI / 2
      ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r)
    }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}
