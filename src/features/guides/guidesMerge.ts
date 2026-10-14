import type { Guide } from './types'

/** What to do with an incoming guide whose id is already in the library. */
export type ConflictMode = 'replace' | 'keep-both' | 'skip'

export type GuidesMergeResult = {
  guides: Guide[]
  added: number
  replaced: number
  copied: number
  skipped: number
}

/**
 * Upsert `incoming` into `current` by guide id — never a list replacement.
 * New guides arrive unpinned and unordered (those are library-local). On an id
 * clash: `replace` takes the incoming content but keeps the local pin / order,
 * `keep-both` adds a copy under a new id titled "… (imported)", `skip` leaves
 * the local guide alone. A replaced guide keeps its local folder.
 */
export function mergeGuides(
  current: Guide[],
  incoming: Guide[],
  mode: ConflictMode,
): GuidesMergeResult {
  const guides = [...current]
  let added = 0
  let replaced = 0
  let copied = 0
  let skipped = 0

  for (const item of incoming) {
    const index = guides.findIndex((g) => g.id === item.id)
    const content: Guide = { ...item }
    delete content.order
    delete content.pinned
    delete content.folder // a folder name means nothing in another library

    if (index < 0) {
      guides.push({ ...content, pinned: false })
      added++
    } else if (mode === 'replace') {
      const local = guides[index]
      guides[index] = { ...content, pinned: local.pinned, order: local.order, folder: local.folder }
      replaced++
    } else if (mode === 'keep-both') {
      guides.push({
        ...content,
        id: crypto.randomUUID(),
        title: `${item.title || 'Untitled guide'} (imported)`,
        pinned: false,
      })
      copied++
    } else {
      skipped++
    }
  }

  return { guides, added, replaced, copied, skipped }
}
