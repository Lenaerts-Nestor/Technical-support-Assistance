import { describe, expect, it } from 'vitest'
import { countLinks, mergeLinkSections } from '../links/linksMerge'
import { mergeSnippets } from '../cases/snippetsMerge'
import { mergeGuides } from '../guides/guidesMerge'
import { guide } from '../../test/fixtures'
import type { LinkSection } from '../links/types'
import type { Snippet } from '../cases/types'

const link = (id: string, label: string, url: string) => ({ id, kind: 'link' as const, label, url })

describe('mergeLinkSections', () => {
  const local: LinkSection[] = [
    {
      id: 'crestron-com',
      title: 'Crestron.com',
      items: [link('a', 'My label', 'https://crestron.com/support'), { id: 'f', kind: 'folder', label: 'Recovery', links: [] }],
    },
  ]
  const incoming: LinkSection[] = [
    {
      id: 'crestron-com', // the default sections share fixed ids on every install
      title: ' crestron.COM ',
      items: [
        link('x', 'Their label', 'https://crestron.com/support/#top'),
        link('y', 'New link', 'https://example.com/new'),
        { id: 'f2', kind: 'folder', label: 'recovery', links: [link('z', 'RMA', 'https://rma.example.com')] },
      ],
    },
    { id: 'other', title: 'Brand new', items: [link('w', 'W', 'https://w.example.com')] },
  ]

  it('adds what is missing, keeps local labels, ignores incoming ids', () => {
    const result = mergeLinkSections(local, incoming)
    expect(result.added).toEqual({ sections: 1, folders: 0, links: 3 })
    expect(result.skipped).toBe(1)
    const section = result.sections[0]
    expect(section.id).toBe('crestron-com')
    expect(section.items[0]).toMatchObject({ label: 'My label' })
    expect(section.items.some((i) => i.kind === 'link' && i.label === 'New link')).toBe(true)
    const folder = section.items.find((i) => i.kind === 'folder')
    expect(folder && folder.kind === 'folder' && folder.links.map((l) => l.label)).toEqual(['RMA'])
    const ids = result.sections.flatMap((s) => [s.id, ...s.items.flatMap((i) => (i.kind === 'folder' ? [i.id, ...i.links.map((l) => l.id)] : [i.id]))])
    expect(new Set(ids).size).toBe(ids.length)
    expect(result.sections.find((s) => s.title === 'Brand new')!.id).not.toBe('other')
  })

  it('is idempotent and never mutates its inputs', () => {
    const snapshot = JSON.stringify(local)
    const once = mergeLinkSections(local, incoming)
    const twice = mergeLinkSections(once.sections, incoming)
    expect(twice.added).toEqual({ sections: 0, folders: 0, links: 0 })
    expect(JSON.stringify(local)).toBe(snapshot)
    expect(countLinks(twice.sections)).toBe(countLinks(once.sections))
  })
})

describe('mergeSnippets', () => {
  const local: Snippet[] = [{ id: '1', label: 'Greeting', text: 'Hello\r\nthere', language: 'en' }]

  it('skips the same wording whatever the label, and renames a clashing label', () => {
    const result = mergeSnippets(local, [
      { id: 'a', label: 'Other name', text: 'Hello\nthere ', language: 'en' },
      { id: 'b', label: 'greeting', text: 'Something else', language: 'en' },
      { id: 'c', label: 'Greeting', text: 'Hello\nthere', language: 'nl' },
    ])
    expect(result).toMatchObject({ added: 2, skipped: 1, renamed: 1 })
    expect(result.snippets.map((s) => s.label)).toEqual(['Greeting', 'greeting (2)', 'Greeting'])
    expect(new Set(result.snippets.map((s) => s.id)).size).toBe(3)
  })

  it('is idempotent', () => {
    const incoming: Snippet[] = [{ id: 'z', label: 'Bye', text: 'Goodbye', language: 'en' }]
    const once = mergeSnippets(local, incoming)
    expect(mergeSnippets(once.snippets, incoming)).toMatchObject({ added: 0, skipped: 1 })
  })
})

describe('mergeGuides', () => {
  const local = [guide('g1', 'Local', [], { pinned: true, order: -2 }), guide('g2', 'Second', [])]
  const incoming = [guide('g1', 'Remote', [], { pinned: false, order: 9 }), guide('g3', 'Third', [], { pinned: true, order: 1 })]

  it('replace: takes the content, keeps the local pin and order', () => {
    const r = mergeGuides(local, incoming, 'replace')
    expect(r).toMatchObject({ added: 1, replaced: 1, copied: 0, skipped: 0 })
    expect(r.guides.find((g) => g.id === 'g1')).toMatchObject({ title: 'Remote', pinned: true, order: -2 })
    expect(r.guides.find((g) => g.id === 'g3')).toMatchObject({ pinned: false })
    expect(r.guides.find((g) => g.id === 'g3')!.order).toBeUndefined()
  })

  it('keep-both: adds a copy under a new id', () => {
    const r = mergeGuides(local, incoming, 'keep-both')
    expect(r).toMatchObject({ added: 1, replaced: 0, copied: 1 })
    const copy = r.guides.find((g) => g.title === 'Remote (imported)')!
    expect(copy.id).not.toBe('g1')
    expect(r.guides.find((g) => g.id === 'g1')!.title).toBe('Local')
  })

  it('skip: leaves the local guide alone and never touches the input list', () => {
    const snapshot = JSON.stringify(local)
    const r = mergeGuides(local, incoming, 'skip')
    expect(r).toMatchObject({ added: 1, skipped: 1 })
    expect(r.guides.find((g) => g.id === 'g1')!.title).toBe('Local')
    expect(JSON.stringify(local)).toBe(snapshot)
  })
})
