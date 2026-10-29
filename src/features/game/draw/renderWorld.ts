import { ENEMIES } from '../config'
import { floorBelow } from '../sim'
import type { Enemy, World } from '../types'
import { drawForeground, drawBackdrop, drawPlantsBehind } from './biome'
import { drawEnemy, drawHero } from './characters'
import { drawBars, drawDizzy, drawWarning } from './heavies'
import {
  drawBanner,
  drawBossBar,
  drawDangerZones,
  drawFloaters,
  drawHeroHud,
  drawHud,
  drawHurtVignette,
  drawImpacts,
  drawIncoming,
  drawParticles,
  drawRoundHud,
  drawShadow,
  drawWaves,
} from './scene'
import { getSprites } from './sprites'

/** Biggest first, so the big ones stand behind the small ones; anyone down goes furthest back. */
const DEPTH: Record<Enemy['kind'], number> = { warlord: 0, ogre: 1, orc: 2, goblin: 3 }
const depth = (e: Enemy) => (e.state === 'dying' ? -1 : DEPTH[e.kind])

/**
 * Paint one frame of the world into a canvas whose drawing space is the arena. The pictures
 * must be loaded (`loadSprites`) first; until they are, nothing is drawn.
 */
export function renderWorld(ctx: CanvasRenderingContext2D, w: World) {
  const sprites = getSprites()
  if (!sprites) return
  ctx.imageSmoothingEnabled = false
  ctx.save()
  const shake = w.shake > 0.3 ? w.shake : 0
  if (shake) ctx.translate((Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 2)

  drawBackdrop(ctx, w, sprites)
  drawPlantsBehind(ctx, w, sprites)
  drawDangerZones(ctx, w)
  const ordered = [...w.enemies].sort((a, b) => depth(a) - depth(b))
  for (const e of ordered) {
    const floor = floorBelow(w, e.x, e.y)
    drawShadow(ctx, e.x, e.y - floor, floor, ENEMIES[e.kind].halfWidth * (e.kind === 'warlord' ? 1.4 : 1.2))
  }
  const p = w.player
  const floor = floorBelow(w, p.x, p.y)
  drawShadow(ctx, p.x, p.y - floor, floor, p.halfWidth * 1.4)
  for (const e of ordered) {
    drawEnemy(ctx, w, e, sprites)
    if (e.state === 'dying') continue
    // The boss has a bar of its own at the top of the screen.
    if (e.kind !== 'goblin' && e.kind !== 'warlord') drawBars(ctx, e)
    if (e.kind !== 'goblin' && e.state === 'windup') drawWarning(ctx, e, e.kind === 'warlord' ? 24 : 34)
    if (e.state === 'stagger' && e.kind !== 'goblin') drawDizzy(ctx, e, w.time)
  }
  drawWaves(ctx, w)
  drawHero(ctx, w, sprites)
  drawParticles(ctx, w)
  drawImpacts(ctx, w)
  drawFloaters(ctx, w)
  drawForeground(ctx, w, sprites)
  drawIncoming(ctx, w.enemies, w.time)
  ctx.restore()
  drawHurtVignette(ctx, w)
  drawHud(ctx, w)
  drawHeroHud(ctx, w, sprites)
  drawRoundHud(ctx, w)
  drawBossBar(ctx, w)
  drawBanner(ctx, w)
}
