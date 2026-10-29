import { ARENA, DASH, ENEMIES } from '../config'
import type { Enemy, World } from '../types'

const { width: W, height: H, groundY } = ARENA

/** Dusk over a ruined keep. Two mountain ridges drift a little against the player for depth. */
export function drawBackground(ctx: CanvasRenderingContext2D, playerX: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, '#15161f')
  sky.addColorStop(0.55, '#2a2434')
  sky.addColorStop(1, '#5a3d3c')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // A low sun behind the ridges.
  const shift = (playerX - W / 2) / W
  ctx.fillStyle = '#f5a93a'
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(660 - shift * 14, groundY - 120, 46, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.18
  ctx.beginPath()
  ctx.arc(660 - shift * 14, groundY - 120, 92, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ridge(ctx, -shift * 22, groundY - 92, '#2f2a3a', [0, 40, 90, 10, 170, 60, 260, 0, 350, 70, 460, 20, 560, 80, 680, 14, 780, 66, 880, 22, 960, 50])
  castle(ctx, 150 - shift * 34)
  ridge(ctx, -shift * 46, groundY - 44, '#241f2c', [0, 30, 120, 0, 220, 40, 330, 6, 450, 46, 560, 10, 690, 50, 800, 4, 900, 36, 960, 20])

  const ground = ctx.createLinearGradient(0, groundY, 0, H)
  ground.addColorStop(0, '#2b2630')
  ground.addColorStop(1, '#16141a')
  ctx.fillStyle = ground
  ctx.fillRect(0, groundY, W, H - groundY)
  ctx.fillStyle = '#3a3340'
  ctx.fillRect(0, groundY, W, 3)
  // Flagstones on the ground.
  ctx.strokeStyle = 'rgba(0,0,0,.28)'
  ctx.lineWidth = 2
  for (let x = ((-shift * 80) % 120) - 120; x < W + 120; x += 120) {
    ctx.beginPath()
    ctx.moveTo(x, groundY + 3)
    ctx.lineTo(x - 28, H)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(0, groundY + 38)
  ctx.lineTo(W, groundY + 38)
  ctx.stroke()
}

/** A ridge from `[x, height, x, height, …]` pairs, filled down to the ground line. */
function ridge(ctx: CanvasRenderingContext2D, dx: number, base: number, color: string, points: number[]) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(points[0] + dx - 40, groundY + 2)
  ctx.lineTo(points[0] + dx - 40, base - points[1])
  for (let i = 0; i < points.length; i += 2) ctx.lineTo(points[i] + dx, base - points[i + 1])
  ctx.lineTo(points[points.length - 2] + dx + 40, groundY + 2)
  ctx.closePath()
  ctx.fill()
}

function castle(ctx: CanvasRenderingContext2D, x: number) {
  const y = groundY - 92
  ctx.fillStyle = '#231f2d'
  ctx.fillRect(x, y - 110, 150, 112)
  for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 32, y - 124, 18, 16)
  ctx.fillRect(x - 24, y - 170, 42, 172)
  ctx.beginPath()
  ctx.moveTo(x - 30, y - 170)
  ctx.lineTo(x - 3, y - 210)
  ctx.lineTo(x + 24, y - 170)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(x + 118, y - 150, 40, 152)
  ctx.beginPath()
  ctx.moveTo(x + 112, y - 150)
  ctx.lineTo(x + 138, y - 188)
  ctx.lineTo(x + 164, y - 150)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f5a93a'
  ctx.globalAlpha = 0.55
  ctx.fillRect(x - 6, y - 140, 8, 16)
  ctx.fillRect(x + 132, y - 118, 8, 16)
  ctx.fillRect(x + 60, y - 70, 8, 14)
  ctx.globalAlpha = 1
}

/** A soft dark oval under a character; it shrinks and fades as they leave the ground. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, height: number, width: number) {
  const lift = Math.min(1, height / 220)
  ctx.save()
  ctx.globalAlpha = 0.38 * (1 - lift * 0.7)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, groundY + 4, width * (1 - lift * 0.4), 6 * (1 - lift * 0.4), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawParticles(ctx: CanvasRenderingContext2D, w: World) {
  for (const q of w.particles) {
    ctx.globalAlpha = Math.max(0, q.life / q.maxLife)
    ctx.fillStyle = q.color
    const s = q.size * (0.5 + 0.5 * (q.life / q.maxLife))
    ctx.fillRect(q.x - s / 2, groundY - q.y - s / 2, s, s)
  }
  ctx.globalAlpha = 1
}

/** Little amber chevrons at the edge a goblin is about to walk in from. */
export function drawIncoming(ctx: CanvasRenderingContext2D, enemies: readonly Enemy[], time: number) {
  for (const e of enemies) {
    const stats = ENEMIES[e.kind]
    if (e.state === 'dying' || (e.x > -stats.halfWidth && e.x < W + stats.halfWidth)) continue
    const left = e.x < 0
    const pulse = 0.55 + 0.45 * Math.sin(time * 14)
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.fillStyle = '#f5a93a'
    const x = left ? 14 : W - 14
    const dir = left ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(x - dir * 8, groundY - 60)
    ctx.lineTo(x + dir * 8, groundY - 44)
    ctx.lineTo(x - dir * 8, groundY - 28)
    ctx.lineTo(x - dir * 2, groundY - 44)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

export function drawHud(ctx: CanvasRenderingContext2D, w: World) {
  const p = w.player
  // Health.
  const barW = 240
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, 20, 18, barW + 8, 22, 8)
  ctx.fill()
  const hp = p.hp / p.maxHp
  const grad = ctx.createLinearGradient(0, 22, 0, 38)
  grad.addColorStop(0, '#ff8f8f')
  grad.addColorStop(1, '#d6525c')
  ctx.fillStyle = grad
  roundRect(ctx, 24, 22, Math.max(0, barW * hp), 14, 5)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 12px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 32, 30)

  // Dash: fills back up while it cools down.
  const ready = p.dashCooldown <= 0
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, 20, 46, 120, 10, 5)
  ctx.fill()
  ctx.fillStyle = ready ? '#f5a93a' : '#8d6a35'
  roundRect(ctx, 22, 48, 116 * (ready ? 1 : 1 - p.dashCooldown / DASH.cooldown), 6, 3)
  ctx.fill()

  // Score.
  ctx.textAlign = 'right'
  ctx.fillStyle = '#fff'
  ctx.font = '700 22px Inter, system-ui, sans-serif'
  ctx.fillText(String(w.score), W - 24, 30)
  ctx.fillStyle = 'rgba(255,255,255,.62)'
  ctx.font = '700 11px Inter, system-ui, sans-serif'
  ctx.fillText(`SCORE · ${w.kills} KILL${w.kills === 1 ? '' : 'S'}`, W - 24, 52)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.roundRect(x, y, Math.max(0, w), h, radius)
}
