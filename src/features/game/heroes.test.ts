import { describe, expect, it } from 'vitest'
import { ENEMIES } from './config'
import { ENEMY_LOOKS, bossVariantFor, lookOf } from './enemyLooks'
import { DEFAULT_HERO, HERO_LIST, isHeroId } from './heroes'
import { FRAME, SPRITES, SPRITE_IDS, attackFrame, phaseFrame } from './spriteData'
import type { ClipId } from './spriteData'

const sheets = import.meta.glob('./sprites/characters/*/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>

/** The width of a sheet, read from the PNG header, so the tests need no image library. */
function pngWidth(path: string) {
  const bytes = atob(sheets[path].split(',')[1].slice(0, 32))
  return ((bytes.charCodeAt(16) << 24) | (bytes.charCodeAt(17) << 16) | (bytes.charCodeAt(18) << 8) | bytes.charCodeAt(19)) >>> 0
}

describe('sprite data', () => {
  it('matches the frames in the sheets that ship with the game', () => {
    for (const id of SPRITE_IDS) {
      for (const [clip, frames] of Object.entries(SPRITES[id].frames)) {
        expect(pngWidth(`./sprites/characters/${id}/${clip}.png`), `${id} ${clip}`).toBe((frames ?? 0) * FRAME)
      }
    }
  })

  it('keeps every attack phase inside the frames of its clip, in order', () => {
    for (const id of SPRITE_IDS) {
      for (const [clip, phases] of Object.entries(SPRITES[id].phases)) {
        const frames = SPRITES[id].frames[clip as ClipId] ?? 0
        for (const range of [phases.windup, phases.strike, phases.recover]) {
          expect(range[0]).toBeGreaterThanOrEqual(0)
          expect(range[1]).toBeLessThan(frames)
          expect(range[0]).toBeLessThanOrEqual(range[1])
        }
        expect(phases.strike[0]).toBeGreaterThanOrEqual(phases.windup[0])
        expect(phases.recover[1]).toBeGreaterThanOrEqual(phases.strike[1])
      }
    }
  })

  it('plays wind-up, strike and recovery frames at the moments the rules give', () => {
    const phases = SPRITES.soldier.phases.attack01!
    const frames = [0, 0.05, 0.1, 0.15, 0.25, 0.4].map((t) => attackFrame(phases, t, 0.1, 0.2, 0.32))
    expect(frames[0]).toBe(phases.windup[0])
    expect(frames[1]).toBeLessThanOrEqual(phases.windup[1])
    expect(frames[2]).toBe(phases.strike[0])
    expect(frames[3]).toBeGreaterThanOrEqual(phases.strike[0])
    expect(frames[4]).toBeGreaterThanOrEqual(phases.recover[0])
    expect(frames[5]).toBe(phases.recover[1])
    expect(phaseFrame([2, 4], 0)).toBe(2)
    expect(phaseFrame([2, 4], 1)).toBe(4)
  })
})

describe('heroes', () => {
  it('has four, each with its own sprite, and a safe default', () => {
    expect(HERO_LIST.map((h) => h.id)).toEqual(['soldier', 'orc', 'demon', 'monster'])
    expect(isHeroId(DEFAULT_HERO)).toBe(true)
    expect(isHeroId('knight')).toBe(false)
  })

  it('has well-formed moves that use animations the sprite has', () => {
    for (const hero of HERO_LIST) {
      for (const kind of ['light', 'heavy'] as const) {
        expect(hero.combos[kind].length).toBeGreaterThan(0)
        for (const step of hero.combos[kind]) {
          expect(step.hitStart).toBeGreaterThan(0)
          expect(step.hitEnd).toBeGreaterThan(step.hitStart)
          expect(step.cancelAt).toBeGreaterThanOrEqual(step.hitEnd)
          expect(step.duration).toBeGreaterThanOrEqual(step.cancelAt)
          expect(SPRITES[hero.id].phases[step.clip], `${hero.id} ${step.clip}`).toBeDefined()
        }
      }
    }
  })

  it('lets only the soldier raise a shield', () => {
    expect(HERO_LIST.filter((h) => h.canBlock).map((h) => h.id)).toEqual(['soldier'])
  })

  it('makes heavy attacks hit harder than the first light one and cost stamina', () => {
    for (const hero of HERO_LIST) {
      expect(hero.combos.heavy[0].damage).toBeGreaterThan(hero.combos.light[0].damage)
      expect(hero.combos.heavy[0].stamina).toBeGreaterThan(0)
    }
  })
})

describe('enemy looks', () => {
  it('gives every kind at least one look on an existing sprite', () => {
    for (const kind of Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]) {
      expect(ENEMY_LOOKS[kind].length).toBeGreaterThan(0)
      for (const look of ENEMY_LOOKS[kind]) expect(SPRITES[look.sprite].phases[look.melee], `${kind} ${look.name}`).toBeDefined()
    }
  })

  it('gives the boss a different look in each place', () => {
    expect([5, 10, 15, 20, 25].map((round) => bossVariantFor(round))).toEqual([0, 1, 2, 0, 1])
    expect(new Set(ENEMY_LOOKS.warlord.map((look) => look.name)).size).toBe(ENEMY_LOOKS.warlord.length)
    for (const look of ENEMY_LOOKS.warlord) expect(look.boss).toBeDefined()
    expect(lookOf('warlord', 4)).toBe(ENEMY_LOOKS.warlord[1])
  })
})
