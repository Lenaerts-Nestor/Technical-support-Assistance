/** What Jump Hunter draws on top of the shared scene: height marks on the wall, the level signs, the summit, and the HUD. */
import { ARENA, ENEMIES } from '../config'
import { CLIMB_LEVELS, METRE, TOWER, metres } from '../climb'
import type { World } from '../types'
import { drawStamina, roundRect } from './scene'

const { width: W, height: H, groundY } = ARENA

/** In world space (inside the camera translate): the marks that give the climb a sense of height. */
export function drawTowerMarks(ctx: CanvasRenderingContext2D, w: World) {
  const top = groundY + w.camY
  const bottom = top - H
  ctx.save()
  ctx.textBaseline = 'middle'

  // A mark on the left wall every five metres.
  ctx.font = '700 11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  const step = 5 * METRE
  for (let h = Math.max(step, Math.floor(bottom / step) * step); h <= top; h += step) {
    const y = groundY - h
    ctx.fillStyle = 'rgba(255,255,255,.16)'
    ctx.fillRect(0, y, 26, 2)
    ctx.fillStyle = 'rgba(255,255,255,.42)'
    ctx.fillText(`${metres(h)} m`, 32, y)
  }

  // Where each level begins: a faint line across the arena and its name.
  TOWER.levelStarts.forEach((start, i) => {
    const y = groundY - start
    if (y < -w.camY - 40 || y > H - w.camY + 40) return
    ctx.fillStyle = 'rgba(255,210,122,.14)'
    ctx.fillRect(0, y - 1, W, 2)
    ctx.fillStyle = 'rgba(255,210,122,.8)'
    ctx.font = '800 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`LEVEL ${i + 1} · ${CLIMB_LEVELS[i].name.toUpperCase()}`, W - 16, y - 12)
  })

  // The summit: a flag on the top ledge, with a glow.
  const summit = TOWER.platforms[TOWER.platforms.length - 1]
  const sy = groundY - summit.y
  const glow = ctx.createRadialGradient(summit.cx, sy - 60, 4, summit.cx, sy - 60, 190)
  glow.addColorStop(0, 'rgba(255,210,122,.4)')
  glow.addColorStop(1, 'rgba(255,210,122,0)')
  ctx.fillStyle = glow
  ctx.fillRect(summit.cx - 200, sy - 260, 400, 400)
  ctx.fillStyle = '#d9cdb4'
  ctx.fillRect(summit.cx - 2, sy - 96, 4, 96)
  const wave = Math.sin(w.time * 4) * 4
  ctx.fillStyle = '#ffd27a'
  ctx.beginPath()
  ctx.moveTo(summit.cx + 2, sy - 96)
  ctx.lineTo(summit.cx + 46, sy - 84 + wave)
  ctx.lineTo(summit.cx + 2, sy - 66)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * In world space: the line an archer's arrow will fly along, drawn across the whole arena while it
 * takes aim and for a moment after it looses, so the danger is marked before it arrives.
 */
export function drawSentryLanes(ctx: CanvasRenderingContext2D, w: World) {
  for (const e of w.enemies) {
    // Only archers shoot along a lane; a melee guard's blow is marked by its own strike box.
    if (e.kind !== 'archer') continue
    const aiming = e.state === 'windup'
    if (!aiming && e.state !== 'attack' && e.state !== 'recover') continue
    const stats = ENEMIES[e.kind]
    const y = groundY - e.y - stats.height * 0.55
    const dir = e.x < W / 2 ? 1 : -1
    const from = e.x + dir * 30
    const to = dir > 0 ? W : 0
    const k = aiming ? Math.min(1, e.stateTime / stats.windup) : Math.max(0, 1 - e.stateTime / (stats.recover + stats.active))
    const flash = aiming && Math.floor(e.stateTime * 10) % 2 === 0 ? 0.12 : 0
    ctx.save()
    // A soft red band, as tall as the arrow's reach on a hero, then the dashed line along its middle.
    ctx.globalAlpha = (aiming ? 0.1 + 0.2 * k : 0.12 * k) + flash
    ctx.fillStyle = '#ff4d4d'
    ctx.fillRect(Math.min(from, to), y - 18, Math.abs(to - from), 36)
    ctx.globalAlpha = aiming ? 0.35 + 0.5 * k : 0.4 * k
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 3
    ctx.setLineDash([16, 12])
    ctx.lineDashOffset = -w.time * 160 * dir
    ctx.beginPath()
    ctx.moveTo(from, y)
    ctx.lineTo(to, y)
    ctx.stroke()
    ctx.restore()
  }
}

/** In screen space: stamina, the height and the level. */
export function drawClimbHud(ctx: CanvasRenderingContext2D, w: World) {
  drawStamina(ctx, w.player)
  const c = w.climb

  ctx.save()
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.font = '700 22px Inter, system-ui, sans-serif'
  ctx.fillText(`${metres(c.best)} m`, W - 24, 30)
  ctx.fillStyle = 'rgba(255,255,255,.62)'
  ctx.font = '700 11px Inter, system-ui, sans-serif'
  ctx.fillText(`BEST HEIGHT · SUMMIT ${metres(TOWER.summit)} m`, W - 24, 52)

  const progress = Math.min(1, c.best / TOWER.summit)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.font = '800 14px Inter, system-ui, sans-serif'
  ctx.fillText(`LEVEL ${c.level + 1} OF ${CLIMB_LEVELS.length}`, W / 2, 22)
  ctx.fillStyle = '#9ff0ff'
  ctx.font = '700 12px Inter, system-ui, sans-serif'
  ctx.fillText(CLIMB_LEVELS[c.level].name.toUpperCase(), W / 2, 40)
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, W / 2 - 90, 50, 180, 8, 4)
  ctx.fill()
  ctx.fillStyle = '#ffd27a'
  roundRect(ctx, W / 2 - 88, 52, 176 * progress, 4, 2)
  ctx.fill()
  ctx.restore()
}

/** The big words in the middle: the start, and the summit. */
export function drawClimbBanner(ctx: CanvasRenderingContext2D, w: World) {
  let title = ''
  let sub = ''
  let alpha = 0
  let color = '#fff'
  if (w.climb.won) {
    title = 'SUMMIT REACHED'
    color = '#ffd27a'
    alpha = 1
  } else if (w.time < 2.4 && !w.over) {
    title = 'JUMP HUNTER'
    sub = 'Climb to the summit. Do not fall back to the ground.'
    alpha = Math.min(1, (2.4 - w.time) / 0.6, w.time / 0.2)
  }
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,.7)'
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.font = '900 44px Inter, system-ui, sans-serif'
  ctx.fillText(title, W / 2, H / 2 - 150)
  if (sub) {
    ctx.fillStyle = 'rgba(255,255,255,.85)'
    ctx.font = '700 17px Inter, system-ui, sans-serif'
    ctx.fillText(sub, W / 2, H / 2 - 112)
  }
  ctx.restore()
}
