import { describe, expect, it } from 'vitest'
import { ENEMIES } from './config'
import { ENEMY_LOOKS, bossVariantFor, lookOf } from './enemyLooks'
import { DEFAULT_HERO, HERO_LIST, isHeroId, stepsOf } from './heroes'
import { SPRITES, SPRITE_IDS, attackFrame, phaseFrame } from './spriteData'

const sheets = import.meta.glob('./sprites/characters/*/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>

/** The size of a sheet, read from the PNG header, so the tests need no image library. */
function pngSize(path: string) {
  const bytes = atob(sheets[path].split(',')[1].slice(0, 32))
  const read = (at: number) => ((bytes.charCodeAt(at) << 24) | (bytes.charCodeAt(at + 1) << 16) | (bytes.charCodeAt(at + 2) << 8) | bytes.charCodeAt(at + 3)) >>> 0
  return { width: read(16), height: read(20) }
}

describe('sprite data', () => {
  it('matches the frames in the sheets that ship with the game', () => {
    for (const id of SPRITE_IDS) {
      const info = SPRITES[id]
      for (const [clip, frames] of Object.entries(info.frames)) {
        const size = pngSize(`./sprites/characters/${id}/${clip}.png`)
        expect(size.width, `${id} ${clip}`).toBe((frames ?? 0) * info.frameW)
        expect(size.height, `${id} ${clip}`).toBe(info.frameH)
      }
    }
  })

  it('keeps every attack inside the frames of its clip, in order', () => {
    for (const id of SPRITE_IDS) {
      for (const [name, phases] of Object.entries(SPRITES[id].moves)) {
        const frames = SPRITES[id].frames[phases.clip] ?? 0
        expect(frames, `${id} ${name}`).toBeGreaterThan(0)
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
    const phases = SPRITES.soldier.moves.chop
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
  it('are the three SHADOW Series characters, with a safe default', () => {
    expect(HERO_LIST.map((h) => h.id)).toEqual(['huntress', 'hallokin', 'warden'])
    expect(isHeroId(DEFAULT_HERO)).toBe(true)
    expect(isHeroId('soldier')).toBe(false)
    expect(isHeroId('monster')).toBe(false)
  })

  it('have well-formed moves that use animations the sprite has', () => {
    for (const hero of HERO_LIST) {
      for (const kind of ['light', 'heavy', 'airUp', 'airDown', 'airForward', 'dashAttack'] as const) {
        for (const step of stepsOf(hero, kind)) {
          expect(step.hitStart).toBeGreaterThan(0)
          expect(step.hitEnd).toBeGreaterThan(step.hitStart)
          expect(step.cancelAt).toBeGreaterThanOrEqual(step.hitEnd)
          expect(step.duration).toBeGreaterThanOrEqual(step.cancelAt)
          expect(SPRITES[hero.id].moves[step.move], `${hero.id} ${step.move}`).toBeDefined()
        }
      }
      expect(hero.combos.light.length).toBeGreaterThan(0)
      expect(hero.combos.heavy.length).toBeGreaterThan(0)
    }
  })

  it('lets only the Warden guard, and only the Hallokin jump twice', () => {
    expect(HERO_LIST.filter((h) => h.canBlock).map((h) => h.id)).toEqual(['warden'])
    expect(HERO_LIST.filter((h) => h.airJumps > 0).map((h) => h.id)).toEqual(['hallokin'])
  })

  it('makes heavy attacks hit harder than the first light one and cost stamina', () => {
    for (const hero of HERO_LIST) {
      expect(hero.combos.heavy[0].damage).toBeGreaterThan(hero.combos.light[0].damage)
      expect(hero.combos.heavy[0].stamina).toBeGreaterThan(0)
    }
  })

  it('draws the heroes smaller than before, but still clearly visible', () => {
    for (const hero of HERO_LIST) {
      const drawn = SPRITES[hero.id].bodyHeight * hero.scale
      expect(drawn, hero.id).toBeGreaterThan(60)
      expect(drawn, hero.id).toBeLessThan(110)
    }
  })
})

describe('enemy looks', () => {
  it('gives every kind at least one look whose attack exists on its sprite', () => {
    for (const kind of Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]) {
      expect(ENEMY_LOOKS[kind].length).toBeGreaterThan(0)
      for (const look of ENEMY_LOOKS[kind]) {
        const moves = SPRITES[look.sprite].moves
        expect(moves[look.melee], `${kind} ${look.name}`).toBeDefined()
        if (look.boss) for (const move of [look.boss.slam, look.boss.charge, look.boss.roar]) expect(moves[move], `${look.name} ${move}`).toBeDefined()
      }
    }
  })

  it('makes the demons the main crowd and the Shadeflit the lancer', () => {
    expect(ENEMY_LOOKS.imp[0].sprite).toBe('demon')
    expect(ENEMY_LOOKS.demon.every((look) => look.sprite === 'demon')).toBe(true)
    expect(ENEMY_LOOKS.lancer[0].sprite).toBe('flit')
  })

  it('gives the boss a different look in each place', () => {
    expect([5, 10, 15, 20, 25].map((round) => bossVariantFor(round))).toEqual([0, 1, 2, 0, 1])
    expect(new Set(ENEMY_LOOKS.warlord.map((look) => look.name)).size).toBe(ENEMY_LOOKS.warlord.length)
    for (const look of ENEMY_LOOKS.warlord) expect(look.boss).toBeDefined()
    expect(lookOf('warlord', 4)).toBe(ENEMY_LOOKS.warlord[1])
  })
})
