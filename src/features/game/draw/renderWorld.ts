import { ENEMIES } from '../config'
import type { Enemy, World } from '../types'
import { drawGoblin } from './goblin'
import { drawBars, drawDizzy, drawWarning } from './heavies'
import { drawKnight } from './knight'
import { drawOgre } from './ogre'
import { drawOrc } from './orc'
import {
  drawArrows,
  drawBackground,
  drawBanner,
  drawBossBar,
  drawDangerZones,
  drawFloaters,
  drawHud,
  drawHurtVignette,
  drawImpacts,
  drawIncoming,
  drawParticles,
  drawRoundHud,
  drawShadow,
  drawWaves,
  drawWeaponHud,
} from './scene'

/** Biggest first, so the big ones stand behind the small ones; anyone down goes furthest back. */
const DEPTH: Record<Enemy['kind'], number> = { warlord: 0, ogre: 1, orc: 2, goblin: 3 }
const depth = (e: Enemy) => (e.state === 'dying' ? -1 : DEPTH[e.kind])

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, w: World, dt: number) {
  if (e.kind === 'goblin') drawGoblin(ctx, e, w.time, dt)
  else if (e.kind === 'orc') drawOrc(ctx, e, w.time, dt)
  else drawOgre(ctx, e, w.time, dt)

  if (e.state === 'dying') return
  // The boss has a bar of its own at the top of the screen.
  if (e.kind !== 'goblin' && e.kind !== 'warlord') drawBars(ctx, e)
  if (e.kind !== 'goblin' && e.state === 'windup') drawWarning(ctx, e, e.kind === 'warlord' ? 24 : 34)
  if (e.state === 'stagger' && e.kind !== 'goblin') drawDizzy(ctx, e, w.time)
}

/**
 * Paint one frame of the world into a canvas whose drawing space is the arena. `dt` is the real
 * time since the last frame, which the animation smoothing needs; the rules do not use it.
 */
export function renderWorld(ctx: CanvasRenderingContext2D, w: World, dt: number) {
  ctx.save()
  const shake = w.shake > 0.3 ? w.shake : 0
  if (shake) ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2)

  drawBackground(ctx, w.player.x)
  drawDangerZones(ctx, w)
  const ordered = [...w.enemies].sort((a, b) => depth(a) - depth(b))
  for (const e of ordered) drawShadow(ctx, e.x, e.y, ENEMIES[e.kind].halfWidth * (e.kind === 'warlord' ? 1.7 : 1.4))
  drawShadow(ctx, w.player.x, w.player.y, 30)
  for (const e of ordered) drawEnemy(ctx, e, w, dt)
  drawWaves(ctx, w)
  drawKnight(ctx, w, dt)
  drawArrows(ctx, w)
  drawParticles(ctx, w)
  drawImpacts(ctx, w)
  drawFloaters(ctx, w)
  drawIncoming(ctx, w.enemies, w.time)
  ctx.restore()
  drawHurtVignette(ctx, w)
  drawHud(ctx, w)
  drawRoundHud(ctx, w)
  drawBossBar(ctx, w)
  drawWeaponHud(ctx, w)
  drawBanner(ctx, w)
}
