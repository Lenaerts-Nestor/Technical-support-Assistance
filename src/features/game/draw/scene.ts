import { ARENA, COST, ENEMIES, SWAP } from '../config'
import { isBossRound } from '../pacing'
import { isEnraged, windupTime } from '../sim'
import { WEAPON_ICONS } from '../art/weaponIcons'
import { WEAPONS } from '../weapons'
import type { WeaponId } from '../weapons'
import { streakMultiplier } from '../rounds'
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

  // Stamina: spent by the dash, heavy swings and blocking; it flashes red when you asked for more than you had.
  const stamina = p.stamina / p.maxStamina
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, 20, 46, 164, 12, 5)
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  ctx.fill()
  const short = p.lowStamina > 0 && Math.floor(p.lowStamina * 12) % 2 === 0
  ctx.fillStyle = short ? '#ff6b6b' : stamina < 0.2 ? '#c9a24a' : '#5fd1a0'
  roundRect(ctx, 22, 48, 160 * stamina, 8, 4)
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

/** Rock racing along the ground ahead of an ogre's slam. */
export function drawWaves(ctx: CanvasRenderingContext2D, w: World) {
  for (const wave of w.waves) {
    const dir = Math.sign(wave.vx)
    const fade = Math.min(1, (wave.life / wave.maxLife) * 3)
    ctx.save()
    ctx.globalAlpha = fade
    ctx.translate(wave.x, groundY + 2)
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * wave.halfWidth * 0.55 * -dir
      const h = wave.height * (1 - i * 0.16) * (0.85 + 0.15 * Math.sin(w.time * 30 + i))
      ctx.fillStyle = wave.friendly ? (i % 2 ? '#e0c28a' : '#b08a4c') : i % 2 ? '#8a7a62' : '#6b5a44'
      ctx.beginPath()
      ctx.moveTo(x - 11, 0)
      ctx.lineTo(x + dir * 2, -h)
      ctx.lineTo(x + 11, 0)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

/** The round counter and its progress bar, top centre, and the kill streak under the score. */
export function drawRoundHud(ctx: CanvasRenderingContext2D, w: World) {
  const aliveCost = w.enemies.reduce((sum, e) => sum + (e.state === 'dying' ? 0 : COST[e.kind]), 0)
  const progress = w.stage === 'fight' ? 1 - (w.budget + aliveCost) / w.roundBudget : 1
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.font = '800 14px Inter, system-ui, sans-serif'
  ctx.fillText(`ROUND ${w.round}`, W / 2, 26)
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, W / 2 - 70, 38, 140, 8, 4)
  ctx.fill()
  ctx.fillStyle = '#f5a93a'
  roundRect(ctx, W / 2 - 68, 40, 136 * Math.max(0, Math.min(1, progress)), 4, 2)
  ctx.fill()

  if (w.streak >= 2) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffd27a'
    ctx.font = '800 13px Inter, system-ui, sans-serif'
    ctx.fillText(`STREAK ${w.streak}  ×${streakMultiplier(w.streak).toFixed(1)}`, W - 24, 70)
    const left = Math.min(1, w.streakTimer / (3 + w.mods.streakTime))
    ctx.fillStyle = 'rgba(10,10,14,.65)'
    roundRect(ctx, W - 24 - 90, 78, 90, 5, 2.5)
    ctx.fill()
    ctx.fillStyle = '#ffd27a'
    roundRect(ctx, W - 24 - 90, 78, 90 * left, 5, 2.5)
    ctx.fill()
  }
  ctx.restore()
}

/** The big words in the middle of the screen: a round starting, a round won. */
export function drawBanner(ctx: CanvasRenderingContext2D, w: World) {
  let title = ''
  let sub = ''
  let alpha = 0
  let color = '#fff'
  if (w.stage === 'fight' && w.stageTime < 1.8) {
    title = `ROUND ${w.round}`
    sub = w.round === 1 ? 'Hold the line' : 'They are back, and more of them'
    alpha = Math.min(1, (1.8 - w.stageTime) / 0.6, w.stageTime / 0.2)
    if (isBossRound(w.round)) {
      sub = 'THE OGRE WARLORD'
      color = '#ff9a8f'
    }
  } else if (w.stage === 'cleared' && w.summary) {
    title = `ROUND ${w.summary.round} CLEARED`
    sub = w.summary.flawlessBonus > 0 ? 'FLAWLESS' : ''
    color = '#ffd27a'
    alpha = Math.min(1, w.stageTime / 0.2)
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
  ctx.fillText(title, W / 2, H / 2 - 70)
  if (sub) {
    ctx.fillStyle = w.stage === 'cleared' ? '#ffffff' : 'rgba(255,255,255,.8)'
    ctx.font = '700 16px Inter, system-ui, sans-serif'
    ctx.fillText(sub, W / 2, H / 2 - 32)
  }
  ctx.restore()
}

/** Arrows in flight: a shaft with a head and feathers, longer and brighter when fully drawn. */
export function drawArrows(ctx: CanvasRenderingContext2D, w: World) {
  for (const a of w.arrows) {
    const dir = a.vx >= 0 ? 1 : -1
    const y = groundY - a.y
    const length = a.charged ? 52 : 34
    ctx.save()
    ctx.translate(a.x, y)
    ctx.scale(dir, 1)
    if (a.charged) {
      ctx.globalAlpha = 0.28
      ctx.fillStyle = '#ffd27a'
      ctx.beginPath()
      ctx.moveTo(8, 0)
      ctx.lineTo(-length - 40, -3)
      ctx.lineTo(-length - 40, 3)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.strokeStyle = '#c9b88f'
    ctx.lineWidth = 2.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-length, 0)
    ctx.lineTo(4, 0)
    ctx.stroke()
    ctx.fillStyle = '#e3e8f0'
    ctx.beginPath()
    ctx.moveTo(3, -4)
    ctx.lineTo(14, 0)
    ctx.lineTo(3, 4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#d6525c'
    ctx.beginPath()
    ctx.moveTo(-length, 0)
    ctx.lineTo(-length + 9, -4)
    ctx.lineTo(-length + 12, 0)
    ctx.lineTo(-length + 9, 4)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

/** One weapon's line icon, drawn from the same paths the menus use. */
export function drawWeaponIcon(ctx: CanvasRenderingContext2D, id: WeaponId, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const d of WEAPON_ICONS[id]) ctx.stroke(new Path2D(d))
  ctx.restore()
}

/** The two carried weapons, bottom left: the one in hand is lit, and Q swaps. */
export function drawWeaponHud(ctx: CanvasRenderingContext2D, w: World) {
  const size = 44
  const x0 = 20
  const y0 = H - size - 20
  ctx.save()
  w.loadout.forEach((id, slot) => {
    const x = x0 + slot * (size + 8)
    const active = slot === w.activeSlot
    ctx.fillStyle = active ? 'rgba(245,169,58,.22)' : 'rgba(10,10,14,.62)'
    roundRect(ctx, x, y0, size, size, 9)
    ctx.fill()
    ctx.strokeStyle = active ? '#f5a93a' : 'rgba(255,255,255,.18)'
    ctx.lineWidth = active ? 2.5 : 1.5
    roundRect(ctx, x + 0.5, y0 + 0.5, size - 1, size - 1, 9)
    ctx.stroke()
    drawWeaponIcon(ctx, id, x + 8, y0 + 8, size - 16, active ? '#ffd27a' : 'rgba(255,255,255,.5)')
    ctx.fillStyle = active ? '#ffd27a' : 'rgba(255,255,255,.45)'
    ctx.font = '800 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(String(slot + 1), x + 5, y0 + 4)
  })
  // The swap key, and a thin bar that fills while it is cooling down.
  const midX = x0 + size + 4
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.font = '800 10px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Q', midX, y0 + size + 9)
  if (w.player.swapCooldown > 0) {
    ctx.fillStyle = 'rgba(255,255,255,.35)'
    ctx.fillRect(x0, y0 + size + 16, (size * 2 + 8) * (w.player.swapCooldown / SWAP.cooldown), 2)
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)'
  ctx.font = '700 11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(WEAPONS[w.loadout[w.activeSlot]].name, x0 + size * 2 + 20, y0 + size / 2)
  ctx.restore()
}

/** The numbers and words that float up from a blow: damage, PARRY!, STAGGER!. */
export function drawFloaters(ctx: CanvasRenderingContext2D, w: World) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  for (const f of w.floaters) {
    const age = f.maxLife - f.life
    const pop = age < 0.14 ? 1.45 - 0.45 * (age / 0.14) : 1
    ctx.globalAlpha = Math.min(1, (f.life / f.maxLife) * 1.8)
    ctx.font = `900 ${Math.round(f.size * pop)}px Inter, system-ui, sans-serif`
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(10,10,14,.85)'
    ctx.strokeText(f.text, f.x, groundY - f.y)
    ctx.fillStyle = f.color
    ctx.fillText(f.text, f.x, groundY - f.y)
  }
  ctx.restore()
}

/** A ring and a slash mark where a blow landed, quick and bright. */
export function drawImpacts(ctx: CanvasRenderingContext2D, w: World) {
  ctx.save()
  ctx.lineCap = 'round'
  for (const hit of w.impacts) {
    const t = 1 - hit.life / hit.maxLife
    ctx.globalAlpha = 1 - t
    ctx.strokeStyle = hit.color
    ctx.lineWidth = 4 * (1 - t) + 1
    ctx.beginPath()
    ctx.arc(hit.x, groundY - hit.y, hit.size * (0.35 + 0.65 * t), 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 5 * (1 - t) + 1.5
    ctx.beginPath()
    ctx.moveTo(hit.x - hit.dir * hit.size * 0.8, groundY - hit.y + hit.size * 0.45)
    ctx.lineTo(hit.x + hit.dir * hit.size * 0.8 * (0.4 + t), groundY - hit.y - hit.size * 0.45)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * The ground an attack is about to hit, drawn red from the moment the enemy starts its wind-up
 * and brighter and pulsing as the blow gets closer: step out of it, jump, dash, or raise the shield.
 */
export function drawDangerZones(ctx: CanvasRenderingContext2D, w: World) {
  for (const e of w.enemies) {
    if (e.state !== 'windup') continue
    const stats = ENEMIES[e.kind]
    const windup = Math.max(0.01, windupTime(e))
    const k = Math.min(1, e.stateTime / windup)
    const dir = e.facing
    let x0: number
    let x1: number
    if (e.kind === 'goblin') {
      x0 = e.x
      x1 = e.x + dir * 150
    } else if (e.kind === 'warlord' && e.move === 'charge') {
      x0 = e.x
      x1 = dir > 0 ? W : 0
    } else if (e.kind === 'warlord' && e.move === 'roar') {
      continue
    } else {
      x0 = e.x - dir * stats.halfWidth * 0.5
      x1 = e.x + dir * stats.reach
    }
    const left = Math.min(x0, x1)
    const width = Math.abs(x1 - x0)
    const pulse = 0.5 + 0.5 * Math.sin(e.stateTime * (12 + 24 * k))
    const alpha = (0.1 + 0.42 * k * k) * (0.6 + 0.4 * pulse)
    ctx.save()
    const g = ctx.createLinearGradient(0, groundY - 8, 0, groundY + 20)
    g.addColorStop(0, `rgba(255,70,50,${alpha * 0.2})`)
    g.addColorStop(0.35, `rgba(255,70,50,${alpha})`)
    g.addColorStop(1, `rgba(255,70,50,${alpha * 0.25})`)
    ctx.fillStyle = g
    ctx.fillRect(left, groundY - 8, width, 28)
    ctx.strokeStyle = `rgba(255,140,110,${0.25 + 0.6 * k})`
    ctx.lineWidth = 2
    ctx.setLineDash([10, 8])
    ctx.lineDashOffset = -e.stateTime * 80 * dir
    ctx.strokeRect(left + 1, groundY - 7, width - 2, 26)
    if (e.kind === 'warlord' && e.move === 'charge') {
      // Chevrons run along a charge's path.
      ctx.setLineDash([])
      ctx.strokeStyle = `rgba(255,200,180,${0.3 + 0.5 * k})`
      ctx.lineWidth = 3
      for (let i = 0; i < 12; i++) {
        const cx = x0 + dir * (60 + i * 70 + ((e.stateTime * 180) % 70))
        if (cx < 0 || cx > W) continue
        ctx.beginPath()
        ctx.moveTo(cx - dir * 8, groundY - 2)
        ctx.lineTo(cx + dir * 4, groundY + 6)
        ctx.lineTo(cx - dir * 8, groundY + 14)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

/** A red glow round the edges of the screen for a moment after the hero is hit. */
export function drawHurtVignette(ctx: CanvasRenderingContext2D, w: World) {
  const t = w.player.hitTime / 0.34
  if (t <= 0) return
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95)
  g.addColorStop(0, 'rgba(255,40,40,0)')
  g.addColorStop(1, `rgba(255,40,40,${0.5 * t})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

/** The boss's health, poise and mood, in a wide bar of its own. */
export function drawBossBar(ctx: CanvasRenderingContext2D, w: World) {
  const boss = w.enemies.find((e) => e.kind === 'warlord' && e.state !== 'dying')
  if (!boss) return
  const stats = ENEMIES.warlord
  const width = 400
  const x = (W - width) / 2
  const y = 58
  const enraged = isEnraged(boss)
  ctx.save()
  ctx.fillStyle = 'rgba(10,10,14,.7)'
  roundRect(ctx, x - 4, y - 4, width + 8, 30, 8)
  ctx.fill()
  ctx.fillStyle = enraged ? '#ff4d4d' : '#d6525c'
  roundRect(ctx, x, y, Math.max(0, width * (boss.hp / boss.maxHp)), 14, 5)
  ctx.fill()
  // Where it turns enraged.
  ctx.fillStyle = 'rgba(255,255,255,.55)'
  ctx.fillRect(x + width * (stats.boss?.enrageAt ?? 0.5) - 1, y - 2, 2, 18)
  if (boss.state !== 'stagger' && boss.poiseHit > 0) {
    ctx.fillStyle = '#ffd27a'
    ctx.fillRect(x, y + 17, width * Math.min(1, boss.poiseHit / stats.poise), 3)
  }
  ctx.fillStyle = '#fff'
  ctx.font = '800 11px Inter, system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('OGRE WARLORD', x, y - 6)
  if (enraged) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ff8f8f'
    ctx.fillText('ENRAGED', x + width, y - 6)
  }
  ctx.restore()
}
