import { describe, expect, it } from 'vitest'
import { Smoother, easeOutBack, smootherOf } from './draw/anim'
import { ARMORS, COLOR_IDS, DEFAULT_LOOK, HELMETS, reviveLook } from './appearance'
import { buildKnight, knightRig } from './art/knight'
import { WARLORD } from './art/warlord'
import { OGRE } from './art/ogre'

describe('Smoother', () => {
  it('starts at the target so nothing slides in on the first frame', () => {
    const s = new Smoother()
    expect(s.ease('a', 5, 20, 1 / 60)).toBe(5)
    expect(s.spring('b', 3, 1 / 60)).toBe(3)
  })

  it('eases towards a new target without jumping, faster at a higher rate', () => {
    const slow = new Smoother()
    const fast = new Smoother()
    slow.ease('x', 0, 10, 1 / 60)
    fast.ease('x', 0, 10, 1 / 60)
    const a = slow.ease('x', 1, 8, 1 / 60)
    const b = fast.ease('x', 1, 40, 1 / 60)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(1)
    let v = 0
    for (let i = 0; i < 120; i++) v = slow.ease('x', 1, 8, 1 / 60)
    expect(v).toBeCloseTo(1, 3)
  })

  it('is steady whatever the frame length', () => {
    const run = (dt: number) => {
      const s = new Smoother()
      s.ease('x', 0, 20, dt)
      let v = 0
      for (let t = 0; t < 0.5; t += dt) v = s.ease('x', 1, 20, dt)
      return v
    }
    expect(run(1 / 30)).toBeCloseTo(run(1 / 120), 1)
  })

  it('a spring overshoots a little and then settles', () => {
    const s = new Smoother()
    s.spring('c', 0, 1 / 60)
    let peak = 0
    let v = 0
    for (let i = 0; i < 240; i++) {
      v = s.spring('c', 1, 1 / 60, 4, 0.3)
      peak = Math.max(peak, v)
    }
    expect(peak).toBeGreaterThan(1.05)
    expect(v).toBeCloseTo(1, 2)
  })

  it('a spring stays stable on a very long frame', () => {
    const s = new Smoother()
    s.spring('c', 0, 0.01, 6, 0.2)
    const v = s.spring('c', 1, 0.05, 6, 0.2)
    expect(Number.isFinite(v)).toBe(true)
    expect(Math.abs(v)).toBeLessThan(5)
  })

  it('keeps one smoother per character', () => {
    const a = {}
    const b = {}
    expect(smootherOf(a)).toBe(smootherOf(a))
    expect(smootherOf(a)).not.toBe(smootherOf(b))
  })
})

describe('easeOutBack', () => {
  it('runs from 0 to 1, passing a little beyond on the way', () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 5)
    expect(easeOutBack(1)).toBeCloseTo(1, 5)
    const peak = Math.max(...Array.from({ length: 50 }, (_, i) => easeOutBack(i / 49)))
    expect(peak).toBeGreaterThan(1)
  })
})

describe('the hero\'s look', () => {
  it('accepts every combination and nothing else', () => {
    for (const h of HELMETS) for (const a of ARMORS) for (const color of COLOR_IDS) expect(reviveLook({ helmet: h.id, armor: a.id, color })).not.toBeNull()
    expect(reviveLook(null)).toBeNull()
    expect(reviveLook({ helmet: 'crown', armor: 'plate', color: 'amber' })).toBeNull()
    expect(reviveLook({ helmet: 'great', armor: 'plate' })).toBeNull()
    expect(reviveLook('great')).toBeNull()
  })

  it('builds a full set of parts for every combination, with pieces that can be drawn', () => {
    for (const helmet of HELMETS) {
      for (const armor of ARMORS) {
        for (const color of COLOR_IDS) {
          const rig = buildKnight({ helmet: helmet.id, armor: armor.id, color })
          for (const part of Object.values(rig)) {
            for (const piece of part.pieces) expect(piece.d.length).toBeGreaterThan(3)
          }
          expect(rig.body.pieces.length).toBeGreaterThan(8)
          // The horned helm has no plume.
          expect(rig.plume.pieces.length > 0).toBe(helmet.id !== 'horned')
        }
      }
    }
  })

  it('looks different for different choices, and is built once', () => {
    const fills = (l: Parameters<typeof knightRig>[0]) => JSON.stringify(knightRig(l))
    expect(fills(DEFAULT_LOOK)).not.toBe(fills({ ...DEFAULT_LOOK, color: 'azure' }))
    expect(fills(DEFAULT_LOOK)).not.toBe(fills({ ...DEFAULT_LOOK, armor: 'leather' }))
    expect(fills(DEFAULT_LOOK)).not.toBe(fills({ ...DEFAULT_LOOK, helmet: 'open' }))
    expect(knightRig(DEFAULT_LOOK)).toBe(knightRig({ ...DEFAULT_LOOK }))
  })
})

describe('the boss\'s armour', () => {
  it('is the ogre dressed in iron, with every part present', () => {
    for (const key of Object.keys(OGRE) as (keyof typeof OGRE)[]) {
      expect(WARLORD[key].pivot).toEqual(OGRE[key].pivot)
      expect(WARLORD[key].pieces.length).toBeGreaterThanOrEqual(OGRE[key].pieces.length)
    }
    expect(WARLORD.head.pieces.length).toBeGreaterThan(OGRE.head.pieces.length)
    expect(JSON.stringify(WARLORD.body)).not.toBe(JSON.stringify(OGRE.body))
  })
})
