import { describe, expect, it } from 'vitest'
import { collectGuideAssets, folderRelativePath, mapGuideAssets, normalizeRef } from './assets'
import { assetRichGuide } from '../../../test/fixtures'

describe('collectGuideAssets', () => {
  it('finds every asset-bearing field once, in order', () => {
    expect(collectGuideAssets(assetRichGuide())).toEqual([
      { kind: 'zip', ref: 'projects/chapter.zip' },
      { kind: 'zip', ref: 'projects/section.zip' },
      { kind: 'image', ref: 'one.png' },
      { kind: 'image', ref: 'screens/two.png' },
      { kind: 'zip', ref: 'standalone.zip' },
      { kind: 'image', ref: 'three.png' },
    ])
  })
})

describe('mapGuideAssets', () => {
  it('rewrites every reference without mutating the original', () => {
    const original = assetRichGuide()
    const mapped = mapGuideAssets(original, ({ kind, ref }) => folderRelativePath(kind, ref))
    expect(collectGuideAssets(mapped).map((a) => a.ref)).toEqual([
      'projects/chapter.zip',
      'projects/section.zip',
      'images/one.png',
      'images/screens/two.png',
      'projects/standalone.zip',
      'images/three.png',
    ])
    expect(collectGuideAssets(original).map((a) => a.ref)).toContain('one.png')
  })

  it('leaves steps without an image alone', () => {
    const mapped = mapGuideAssets(assetRichGuide(), () => 'x')
    const chapter = mapped.parts[0]
    if (chapter.type !== 'chapter') throw new Error('fixture changed')
    expect(chapter.sections[1].steps[1]).not.toHaveProperty('image')
  })
})

describe('normalizeRef', () => {
  it.each([
    ['a.png', 'a.png'],
    ['  screens\\a.png ', 'screens/a.png'],
    ['./images//a.png', 'images/a.png'],
    ['Connect Touchpanel (control processor).png', 'Connect Touchpanel (control processor).png'],
  ])('%s -> %s', (input, expected) => expect(normalizeRef(input)).toBe(expected))

  it.each(['', '   ', '../a.png', 'a/../../b.png', 'C:/a.png', 'a\u0000b.png'])(
    'rejects %j',
    (input) => expect(normalizeRef(input)).toBeNull(),
  )
})

describe('folderRelativePath', () => {
  it('puts images under images/ and zips under projects/', () => {
    expect(folderRelativePath('image', 'screens/a.png')).toBe('images/screens/a.png')
    expect(folderRelativePath('zip', 'projects/app.zip')).toBe('projects/app.zip')
    expect(folderRelativePath('zip', 'app.zip')).toBe('projects/app.zip')
  })
})
