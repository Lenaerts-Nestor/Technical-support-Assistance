import { describe, expect, it } from 'vitest'
import { normalizeGuide, parseGuidesFile, toGuidesFile, toPortableGuide } from './normalizeGuide'

const raw = (extra: Record<string, unknown> = {}) => ({ id: 'g1', title: 'T', parts: [], links: [], ...extra })

describe('guide folder field', () => {
  it('keeps a plain folder name and survives the guides.json round trip', () => {
    const guide = normalizeGuide(raw({ folder: ' dm-nvx-dir80 ' }))!
    expect(guide.folder).toBe('dm-nvx-dir80')
    const again = parseGuidesFile(JSON.stringify(toGuidesFile([guide])))
    expect(again[0].folder).toBe('dm-nvx-dir80')
  })

  it.each(['', '  ', '..', '.', 'a/b', 'a\\b', 42, null])('drops %j', (folder) => {
    expect(normalizeGuide(raw({ folder }))).not.toHaveProperty('folder')
  })

  it('leaves old guides.json files without a folder as they were', () => {
    expect(normalizeGuide(raw())).not.toHaveProperty('folder')
  })
})

describe('toPortableGuide', () => {
  it('strips what only means something in this library', () => {
    const guide = normalizeGuide(raw({ folder: 'f', pinned: true, order: 4 }))!
    const portable = toPortableGuide(guide)
    expect(portable).not.toHaveProperty('folder')
    expect(portable).not.toHaveProperty('pinned')
    expect(portable).not.toHaveProperty('order')
    expect(guide.folder).toBe('f') // the original is untouched
  })
})
