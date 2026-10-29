import { ENEMIES } from '../config'
import type { World } from '../types'
import { drawGoblin } from './goblin'
import { drawKnight } from './knight'
import { drawBackground, drawHud, drawIncoming, drawParticles, drawShadow } from './scene'

/** Paint one frame of the world into a canvas whose drawing space is the arena. */
export function renderWorld(ctx: CanvasRenderingContext2D, w: World) {
  ctx.save()
  const shake = w.shake > 0.3 ? w.shake : 0
  if (shake) ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2)

  drawBackground(ctx, w.player.x)
  // Enemies that are down go behind the ones still fighting.
  const ordered = [...w.enemies].sort((a, b) => Number(b.state === 'dying') - Number(a.state === 'dying'))
  for (const e of ordered) drawShadow(ctx, e.x, e.y, ENEMIES[e.kind].halfWidth * 1.4)
  drawShadow(ctx, w.player.x, w.player.y, 30)
  for (const e of ordered) drawGoblin(ctx, e)
  drawKnight(ctx, w)
  drawParticles(ctx, w)
  drawIncoming(ctx, w.enemies, w.time)
  ctx.restore()
  drawHud(ctx, w)
}
