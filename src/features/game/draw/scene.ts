import { BIOMES, startsBiome } from '../biomes'
import { ARENA, COST, ENEMIES } from '../config'
import { bossVariantFor, lookOf } from '../enemyLooks'
import { HEROES } from '../heroes'
import { OBJECTIVE, objectiveProgress, objectiveText } from '../objectives'
import { isEnraged, windupTime } from '../sim'
import { SPRITES } from '../spriteData'
import { streakMultiplier } from '../rounds'
import type { World } from '../types'
import { drawFrame } from './sprites'
import type { Sprites } from './sprites'

const { width: W, height: H, groundY } = ARENA

/** A soft dark oval on whatever the character stands over; it shrinks and fades as they leave it. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, lift: number, floor: number, width: number) {
  const k = Math.min(1, lift / 220)
  ctx.save()
  ctx.globalAlpha = 0.3 * (1 - k * 0.7)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, groundY - floor + 4, width * (1 - k * 0.4), 6 * (1 - k * 0.4), 0, 0, Math.PI * 2)
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

/** A chevron at the edge an enemy is about to walk in from, at the height it is coming in at. */
export function drawIncoming(ctx: CanvasRenderingContext2D, w: World) {
  for (const e of w.enemies) {
    const stats = ENEMIES[e.kind]
    if (e.state === 'dying' || (e.x > -stats.halfWidth && e.x < W + stats.halfWidth)) continue
    const left = e.x < 0
    const pulse = 0.55 + 0.45 * Math.sin(w.time * 14)
    const y = clampView(groundY - e.y + w.camY - 44)
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.fillStyle = e.elite ? '#b9f3ff' : '#f5a93a'
    const x = left ? 14 : W - 14
    const dir = left ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(x - dir * 8, y - 16)
    ctx.lineTo(x + dir * 8, y)
    ctx.lineTo(x - dir * 8, y + 16)
    ctx.lineTo(x - dir * 2, y)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

const clampView = (y: number) => Math.max(110, Math.min(H - 24, y))

/** An arrow in flight, the pack's own arrow picture. */
export function drawArrows(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  for (const a of w.arrows) {
    ctx.save()
    ctx.translate(a.x, groundY - a.y)
    ctx.scale(a.vx >= 0 ? 1 : -1, 1)
    ctx.drawImage(sprites.arrow, -32, -32, 64, 64)
    ctx.restore()
  }
}

/** A soul shard: a pale crystal hovering over its ledge. */
function drawShard(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const bob = Math.sin(time * 3 + x) * 5
  const cy = groundY - y - 40 + bob
  const glow = ctx.createRadialGradient(x, cy, 1, x, cy, 34)
  glow.addColorStop(0, 'rgba(159,240,255,.55)')
  glow.addColorStop(1, 'rgba(159,240,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 34, cy - 34, 68, 68)
  // A blocky diamond, in art pixels of 3.
  const rows = [1, 3, 5, 5, 3, 3, 1]
  rows.forEach((n, i) => {
    ctx.fillStyle = i < 3 ? '#e6fbff' : '#7fd8ef'
    ctx.fillRect(Math.round(x - (n * 3) / 2), Math.round(cy - 10 + i * 3), n * 3, 3)
  })
  ctx.fillStyle = '#1b2f39'
  ctx.fillRect(Math.round(x), Math.round(cy - 4), 3, 9)
}

/** A shrine: a stone on its ledge with a ring of light that fills as it is lit. */
function drawShrine(ctx: CanvasRenderingContext2D, sprites: Sprites, x: number, y: number, charge: number, lit: boolean, time: number) {
  const img = sprites.env.pillar
  const sw = img.width * 1.1
  const sh = img.height * 1.1
  const base = groundY - y
  ctx.drawImage(img, Math.round(x - sw / 2), Math.round(base - sh + 6), sw, sh)
  // Runes glow as it charges, steady once lit.
  const k = lit ? 1 : charge
  const cy = base - sh * 0.55
  ctx.fillStyle = `rgba(159,240,255,${0.3 + 0.7 * k})`
  for (const [dx, dy, w, h] of [[-12, -18, 3, 9], [-3, -24, 6, 3], [9, -18, 3, 9], [-9, 0, 3, 6], [6, 0, 3, 6], [-3, 9, 6, 3]]) ctx.fillRect(Math.round(x + dx), Math.round(cy + dy), w, h)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const glow = ctx.createRadialGradient(x, cy, 2, x, cy, 30 + 30 * k)
  glow.addColorStop(0, `rgba(159,240,255,${0.15 + 0.6 * k})`)
  glow.addColorStop(1, 'rgba(159,240,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x - 70, cy - 70, 140, 140)
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = 'rgba(159,240,255,.22)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x, cy, 30, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = lit ? '#9ff0ff' : 'rgba(159,240,255,.9)'
  ctx.beginPath()
  ctx.arc(x, cy, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
  ctx.stroke()
  if (!lit) {
    // Where to stand.
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 4)
    ctx.fillStyle = '#9ff0ff'
    ctx.fillRect(x - OBJECTIVE.shrineRange, base - 3, OBJECTIVE.shrineRange * 2, 3)
  }
  ctx.restore()
}

/** The round's shards and shrines, where they are in the arena. */
export function drawObjective(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  for (const shard of w.objective.shards) if (!shard.taken) drawShard(ctx, shard.x, shard.y, w.time)
  for (const shrine of w.objective.shrines) drawShrine(ctx, sprites, shrine.x, shrine.y, shrine.charge, shrine.lit, w.time)
}

/** A shard or shrine above the top of the view gets a marker pointing up at it, so the climb has a direction. */
export function drawObjectivePointers(ctx: CanvasRenderingContext2D, w: World) {
  const targets = [...w.objective.shards.filter((s) => !s.taken), ...w.objective.shrines.filter((s) => !s.lit)]
  for (const t of targets) {
    const screenY = groundY - t.y + w.camY - 60
    if (screenY > 96) continue
    const pulse = 0.6 + 0.4 * Math.sin(w.time * 6)
    ctx.save()
    ctx.globalAlpha = pulse
    ctx.fillStyle = '#9ff0ff'
    ctx.beginPath()
    ctx.moveTo(t.x, 100)
    ctx.lineTo(t.x + 11, 116)
    ctx.lineTo(t.x - 11, 116)
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
  roundRect(ctx, 76, 18, barW + 8, 22, 8)
  ctx.fill()
  const hp = p.hp / p.maxHp
  const grad = ctx.createLinearGradient(0, 22, 0, 38)
  grad.addColorStop(0, '#ff8f8f')
  grad.addColorStop(1, '#d6525c')
  ctx.fillStyle = grad
  roundRect(ctx, 80, 22, Math.max(0, barW * hp), 14, 5)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 12px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 88, 30)

  // Stamina: spent by the dash, heavy swings and blocking; it flashes red when you asked for more than you had.
  const stamina = p.stamina / p.maxStamina
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, 76, 46, 164, 12, 5)
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  ctx.fill()
  const short = p.lowStamina > 0 && Math.floor(p.lowStamina * 12) % 2 === 0
  ctx.fillStyle = short ? '#ff6b6b' : stamina < 0.2 ? '#c9a24a' : '#5fd1a0'
  roundRect(ctx, 78, 48, 160 * stamina, 8, 4)
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

/** Rock racing along the ground ahead of a brute's or a boss's slam. */
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
  const o = w.objective
  let progress: number
  let count = ''
  if (o.kind === 'slay') {
    const aliveCost = w.enemies.reduce((sum, e) => sum + (e.state === 'dying' ? 0 : COST[e.kind]), 0)
    progress = 1 - (Math.max(0, w.budget) + aliveCost) / w.roundBudget
  } else if (o.kind === 'shards' || o.kind === 'shrines') {
    const { done, needed } = objectiveProgress(o)
    progress = done / Math.max(1, needed)
    count = `  ${done} / ${needed}`
  } else {
    const boss = w.enemies.find((e) => e.kind === 'warlord' && e.state !== 'dying')
    progress = w.bossSpawned && !boss ? 1 : boss ? 1 - boss.hp / boss.maxHp : 0
  }
  if (w.stage !== 'fight') progress = 1
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.font = '800 14px Inter, system-ui, sans-serif'
  ctx.fillText(`ROUND ${w.round}`, W / 2, 22)
  ctx.fillStyle = '#9ff0ff'
  ctx.font = '700 12px Inter, system-ui, sans-serif'
  ctx.fillText(`${objectiveText(o.kind).toUpperCase()}${count}`, W / 2, 40)
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, W / 2 - 90, 50, 180, 8, 4)
  ctx.fill()
  ctx.fillStyle = o.kind === 'slay' || o.kind === 'boss' ? '#f5a93a' : '#9ff0ff'
  roundRect(ctx, W / 2 - 88, 52, 176 * Math.max(0, Math.min(1, progress)), 4, 2)
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
  if (w.stage === 'fight' && w.stageTime < 2.2) {
    title = `ROUND ${w.round}`
    sub = objectiveText(w.objective.kind)
    // A new place after every boss.
    if (startsBiome(w.round)) sub = `${BIOMES[w.biome].name} · ${sub}`
    alpha = Math.min(1, (2.2 - w.stageTime) / 0.6, w.stageTime / 0.2)
    if (w.objective.kind === 'boss') {
      sub = lookOf('warlord', bossVariantFor(w.round)).name.toUpperCase()
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
  ctx.fillText(title, W / 2, H / 2 - 110)
  if (sub) {
    ctx.fillStyle = w.stage === 'cleared' ? '#ffffff' : 'rgba(255,255,255,.85)'
    ctx.font = '700 17px Inter, system-ui, sans-serif'
    ctx.fillText(sub, W / 2, H / 2 - 72)
  }
  ctx.restore()
}

/** The hero's face by the health bars. */
export function drawHeroHud(ctx: CanvasRenderingContext2D, w: World, sprites: Sprites) {
  const hero = HEROES[w.hero]
  const sheet = sprites.characters[hero.id].idle
  ctx.save()
  ctx.fillStyle = 'rgba(10,10,14,.65)'
  roundRect(ctx, 20, 16, 48, 48, 10)
  ctx.fill()
  if (sheet) {
    ctx.beginPath()
    ctx.roundRect(20, 16, 48, 48, 10)
    ctx.clip()
    // Head and shoulders: the body scaled so its top sits near the top of the box, the head in the middle.
    const info = SPRITES[hero.id]
    const scale = 64 / info.bodyHeight
    drawFrame(ctx, sheet, 0, 44 - (info.headX - info.centerX) * scale, 20 + info.bodyHeight * scale, scale, 1, hero.id)
  }
  ctx.restore()
}

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
    if (e.kind === 'imp') {
      x0 = e.x
      x1 = e.x + dir * 150
    } else if (e.kind === 'lancer') {
      x0 = e.x
      x1 = e.x + dir * ((stats.dashSpeed ?? 600) * stats.active + stats.reach)
    } else if (e.kind === 'archer') {
      continue
    } else if (e.kind === 'warlord' && e.move === 'charge') {
      x0 = e.x
      x1 = dir > 0 ? W : 0
    } else if (e.kind === 'warlord' && e.move === 'roar') {
      continue
    } else {
      x0 = e.x - dir * stats.halfWidth * 0.5
      x1 = e.x + dir * stats.reach
    }
    const base = groundY - e.y
    const left = Math.min(x0, x1)
    const width = Math.abs(x1 - x0)
    const pulse = 0.5 + 0.5 * Math.sin(e.stateTime * (12 + 24 * k))
    const alpha = (0.1 + 0.42 * k * k) * (0.6 + 0.4 * pulse)
    ctx.save()
    const g = ctx.createLinearGradient(0, base - 8, 0, base + 20)
    g.addColorStop(0, `rgba(255,70,50,${alpha * 0.2})`)
    g.addColorStop(0.35, `rgba(255,70,50,${alpha})`)
    g.addColorStop(1, `rgba(255,70,50,${alpha * 0.25})`)
    ctx.fillStyle = g
    ctx.fillRect(left, base - 8, width, 28)
    ctx.strokeStyle = `rgba(255,140,110,${0.25 + 0.6 * k})`
    ctx.lineWidth = 2
    ctx.setLineDash([10, 8])
    ctx.lineDashOffset = -e.stateTime * 80 * dir
    ctx.strokeRect(left + 1, base - 7, width - 2, 26)
    if (e.kind === 'warlord' && e.move === 'charge') {
      // Chevrons run along a charge's path.
      ctx.setLineDash([])
      ctx.strokeStyle = `rgba(255,200,180,${0.3 + 0.5 * k})`
      ctx.lineWidth = 3
      for (let i = 0; i < 12; i++) {
        const cx = x0 + dir * (60 + i * 70 + ((e.stateTime * 180) % 70))
        if (cx < 0 || cx > W) continue
        ctx.beginPath()
        ctx.moveTo(cx - dir * 8, base - 2)
        ctx.lineTo(cx + dir * 4, base + 6)
        ctx.lineTo(cx - dir * 8, base + 14)
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
  const y = 78
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
  ctx.fillText(lookOf('warlord', boss.variant).name.toUpperCase(), x, y - 6)
  if (enraged) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ff8f8f'
    ctx.fillText('ENRAGED', x + width, y - 6)
  }
  ctx.restore()
}
