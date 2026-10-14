import type { LinkEntry, LinkFolder, LinkSection, SectionItem } from './types'

export type LinksMergeResult = {
  sections: LinkSection[]
  added: { sections: number; folders: number; links: number }
  /** Links left out because the same URL was already in that place. */
  skipped: number
}

const uid = () => crypto.randomUUID()
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** A URL without its fragment or trailing slash, so `https://a.com/x/` and `https://a.com/x#top` match. */
function urlKey(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.href.replace(/\/$/, '').toLowerCase()
  } catch {
    return url.trim().toLowerCase()
  }
}

/** Number of links in `sections`, folders included. */
export const countLinks = (sections: LinkSection[]): number =>
  sections.reduce(
    (n, s) => n + s.items.reduce((m, i) => m + (i.kind === 'folder' ? i.links.length : 1), 0),
    0,
  )

/**
 * Add what `incoming` has that `current` lacks. Sections match by title, folders
 * by name inside a section, and a link is a duplicate when its URL is already in
 * the same place (section or folder) — the local label wins. Ids in the incoming
 * data are ignored (the default sections share fixed ids on every install) and
 * everything added gets a fresh one.
 */
export function mergeLinkSections(
  current: LinkSection[],
  incoming: LinkSection[],
): LinksMergeResult {
  const added = { sections: 0, folders: 0, links: 0 }
  let skipped = 0

  /** Append `links` to `target`, skipping URLs it already holds. */
  const addLinks = (target: LinkEntry[], links: LinkEntry[]) => {
    const have = new Set(target.map((l) => urlKey(l.url)))
    for (const link of links) {
      const key = urlKey(link.url)
      if (have.has(key)) {
        skipped++
        continue
      }
      have.add(key)
      target.push({ ...link, id: uid() })
      added.links++
    }
  }

  const sections: LinkSection[] = current.map((s) => ({
    ...s,
    items: s.items.map((i): SectionItem => (i.kind === 'folder' ? { ...i, links: [...i.links] } : i)),
  }))

  for (const inSection of incoming) {
    let section = sections.find((s) => same(s.title, inSection.title))
    if (!section) {
      section = { id: uid(), title: inSection.title, items: [] }
      sections.push(section)
      added.sections++
    }

    const target = section
    for (const item of inSection.items) {
      if (item.kind === 'link') {
        const key = urlKey(item.url)
        if (target.items.some((i) => i.kind === 'link' && urlKey(i.url) === key)) {
          skipped++
        } else {
          target.items.push({ ...item, id: uid() })
          added.links++
        }
        continue
      }
      let folder = target.items.find((i): i is LinkFolder => i.kind === 'folder' && same(i.label, item.label))
      if (!folder) {
        folder = { id: uid(), kind: 'folder', label: item.label, links: [] }
        target.items.push(folder)
        added.folders++
      }
      addLinks(folder.links, item.links)
    }
  }

  return { sections, added, skipped }
}
