import type { Guide, GuideSection, GuideStep } from '../features/guides/types'

const NOW = '2026-01-01T00:00:00.000Z'

export const step = (id: string, image?: string): GuideStep => ({
  id,
  text: `Step ${id}`,
  ...(image ? { image } : {}),
  subItems: [],
})

export const section = (id: string, steps: GuideStep[], projectZip?: string): GuideSection => ({
  id,
  heading: `Section ${id}`,
  body: '',
  steps,
  blocks: [],
  ...(projectZip ? { projectZip } : {}),
})

export function guide(id: string, title: string, parts: Guide['parts'], extra: Partial<Guide> = {}): Guide {
  return { id, title, parts, links: [], pinned: false, createdAt: NOW, updatedAt: NOW, ...extra }
}

/** A chapter with images + zips at every level, a standalone section with an image, and an asset-free table. */
export function assetRichGuide(id = 'g1', title = 'Asset guide'): Guide {
  return guide(id, title, [
    {
      type: 'chapter',
      id: 'c1',
      subtitle: 'Chapter',
      projectZip: 'projects/chapter.zip',
      blocks: [],
      sections: [
        section('s1', [step('a', 'one.png'), step('b', 'screens/two.png')], 'projects/section.zip'),
        section('s2', [step('c', 'one.png'), step('d')]),
      ],
    },
    {
      type: 'section',
      id: 'p1',
      heading: 'Standalone',
      body: '',
      blocks: [],
      projectZip: 'standalone.zip',
      steps: [step('e', 'three.png')],
    },
    { type: 'table', id: 't1', title: 'Table', table: { headers: ['A'], rows: [['x']] } },
  ])
}
