import { ENEMIES } from '../config'
import type { Enemy, World } from '../types'
import { drawGoblin } from './goblin'
import { drawBars, drawDizzy, drawWarning } from './heavies'
import { drawKnight } from './knight'
import { drawOgre } from './ogre'
import { drawOrc } from './orc'
import { drawArrows, drawBackground, drawBanner, drawHud, drawIncoming, drawParticles, drawRoundHud, drawShadow, drawWaves, drawWeaponHud } from './scene'

/** Biggest first, so the big ones stand behind the small ones; anyone down goes furthest back. */
const DEPTH: Record<Enemy['kind'], number> = { ogre: 0, orc: 1, goblin: 2 }
const depth = (e: Enemy) => (e.state === 'dying' ? -1 : DEPTH[e.kind])

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, w: World) {
  if (e.kind === 'goblin') drawGoblin(ctx, e)
  else if (e.kind === 'orc') drawOrc(ctx, e)
  else drawOgre(ctx, e)

  if (e.state === 'dying') return
  if (e.kind !== 'goblin') {
    drawBars(ctx, e)
    if (e.state === 'windup') drawWarning(ctx, e, 34)
  }
  if (e.state === 'stagger' && e.kind !== 'goblin') drawDizzy(ctx, e, w.time)
}

/** Paint one frame of the world into a canvas whose drawing space is the arena. */
export function renderWorld(ctx: CanvasRenderingContext2D, w: World) {
  ctx.save()
  const shake = w.shake > 0.3 ? w.shake : 0
  if (shake) ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2)

  drawBackground(ctx, w.player.x)
  const ordered = [...w.enemies].sort((a, b) => depth(a) - depth(b))
  for (const e of ordered) drawShadow(ctx, e.x, e.y, ENEMIES[e.kind].halfWidth * 1.4)
  drawShadow(ctx, w.player.x, w.player.y, 30)
  for (const e of ordered) drawEnemy(ctx, e, w)
  drawWaves(ctx, w)
  drawKnight(ctx, w)
  drawArrows(ctx, w)
  drawParticles(ctx, w)
  drawIncoming(ctx, w.enemies, w.time)
  ctx.restore()
  drawHud(ctx, w)
  drawRoundHud(ctx, w)
  drawWeaponHud(ctx, w)
  drawBanner(ctx, w)
}
