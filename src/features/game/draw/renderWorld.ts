import { ENEMIES } from '../config'
import { floorBelow } from '../sim'
import type { Enemy, World } from '../types'
import { drawArena, drawBackdrop, drawForeground } from './biome'
import { drawEnemy, drawHero } from './characters'
import { drawClimbBanner, drawClimbHud, drawSentryLanes, drawTowerMarks } from './climb'
import { drawBars, drawDizzy, drawWarning } from './heavies'
import {
  drawArrows,
  drawBanner,
  drawBossBar,
  drawDangerZones,
  drawFloaters,
  drawHeroHud,
  drawHud,
  drawHurtVignette,
  drawImpacts,
  drawIncoming,
  drawObjective,
  drawObjectivePointers,
  drawParticles,
  drawRoundHud,
  drawShadow,
  drawWaves,
} from './scene'
import { getSprites } from './sprites'

/** Biggest first, so the big ones stand behind the small ones; anyone down goes furthest back. */
const DEPTH: Record<Enemy['kind'], number> = { warlord: 0, brute: 1, demon: 2, lancer: 2, archer: 2, imp: 3 }
const depth = (e: Enemy) => (e.state === 'dying' ? -1 : DEPTH[e.kind])

/**
 * Paint one frame of the world into a canvas whose drawing space is the view. The sky and far
 * silhouettes are drawn in screen space; the arena and everyone in it are moved down by however
 * far the camera has risen; the HUD goes on top. The pictures must be loaded (`loadSprites`)
 * first; until they are, nothing is drawn.
 */
export function renderWorld(ctx: CanvasRenderingContext2D, w: World) {
  const sprites = getSprites()
  if (!sprites) return
  const climbing = w.mode === 'climb'
  ctx.imageSmoothingEnabled = false
  ctx.save()
  const shake = w.shake > 0.3 ? w.shake : 0
  if (shake) ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2)

  drawBackdrop(ctx, w, sprites)
  ctx.save()
  ctx.translate(0, Math.round(w.camY))
  drawArena(ctx, w, sprites)
  if (climbing) {
    drawTowerMarks(ctx, w)
    // An archer's arrow is marked by its lane; a melee guard's blow by the usual strike box (archers have none of their own).
    drawSentryLanes(ctx, w)
    drawDangerZones(ctx, w)
  } else {
    drawObjective(ctx, w, sprites)
    drawDangerZones(ctx, w)
  }
  const ordered = [...w.enemies].sort((a, b) => depth(a) - depth(b))
  for (const e of ordered) {
    const floor = floorBelow(w, e.x, e.y)
    drawShadow(ctx, e.x, e.y - floor, floor, ENEMIES[e.kind].halfWidth * (e.kind === 'warlord' ? 1.4 : 1.2))
  }
  const p = w.player
  const floor = floorBelow(w, p.x, p.y)
  drawShadow(ctx, p.x, p.y - floor, floor, p.halfWidth * 1.6)
  for (const e of ordered) {
    drawEnemy(ctx, w, e, sprites)
    if (e.state === 'dying') continue
    // The boss has a bar of its own at the top of the screen.
    if (e.kind !== 'imp' && e.kind !== 'warlord') drawBars(ctx, e)
    if (e.kind !== 'imp' && e.state === 'windup') drawWarning(ctx, e, e.kind === 'warlord' ? 24 : 30)
    if (e.state === 'stagger' && e.kind !== 'imp') drawDizzy(ctx, e, w.time)
  }
  drawWaves(ctx, w)
  drawArrows(ctx, w, sprites)
  drawHero(ctx, w, sprites)
  drawParticles(ctx, w)
  drawImpacts(ctx, w)
  drawFloaters(ctx, w)
  drawForeground(ctx, w)
  ctx.restore()
  if (!climbing) {
    drawIncoming(ctx, w)
    drawObjectivePointers(ctx, w)
  }
  ctx.restore()
  drawHurtVignette(ctx, w)
  drawHeroHud(ctx, w, sprites)
  if (climbing) {
    drawClimbHud(ctx, w)
    drawClimbBanner(ctx, w)
    return
  }
  drawHud(ctx, w)
  drawRoundHud(ctx, w)
  drawBossBar(ctx, w)
  drawBanner(ctx, w)
}
