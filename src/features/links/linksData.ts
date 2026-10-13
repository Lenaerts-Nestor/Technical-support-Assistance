import type { LinkEntry, LinkFolder, LinkSection, SectionItem } from './types'

/**
 * The sections a fresh install starts with. They are empty on purpose — the
 * links are added by hand (or edited straight in `links.json`) and kept there.
 * Rename, delete or add sections from the page.
 */
export const DEFAULT_SECTIONS: LinkSection[] = [
  { id: 'crestron-com', title: 'Crestron.com', items: [] },
  { id: 'crestron-internal', title: 'Crestron Internal', items: [] },
  { id: 'support-tools', title: 'Support Tools', items: [] },
  { id: 'tech-resources', title: 'Tech Resources', items: [] },
  { id: 'other', title: 'Other', items: [] },
]

/** Accent per section, by position. Class names are spelled out for Tailwind. */
export const SECTION_TONES = [
  { bar: 'border-l-sky-400', icon: 'text-sky-300' },
  { bar: 'border-l-emerald-400', icon: 'text-emerald-300' },
  { bar: 'border-l-violet-400', icon: 'text-violet-300' },
  { bar: 'border-l-amber-400', icon: 'text-amber-300' },
  { bar: 'border-l-rose-400', icon: 'text-rose-300' },
  { bar: 'border-l-cyan-400', icon: 'text-cyan-300' },
]

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * Turn what was typed into a URL that is safe to put in an `href`: a bare
 * `crestron.com` gets `https://`, and anything that isn't http(s) / mailto
 * (`javascript:`, `data:`) is refused. `null` when there's nothing usable.
 */
export function normalizeUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/]*:\d+/.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

/* -- Reading links.json -------------------------------------------------- */

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const asId = (value: unknown) => (typeof value === 'string' && value ? value : crypto.randomUUID())

function reviveLink(raw: unknown): LinkEntry | null {
  const r = raw as Partial<LinkEntry> | null
  const url = normalizeUrl(asString(r?.url))
  if (!r || !url) return null
  return { id: asId(r.id), kind: 'link', label: asString(r.label) || url, url }
}

function reviveItem(raw: unknown): SectionItem | null {
  const r = raw as { links?: unknown; label?: unknown; id?: unknown } | null
  if (!r || typeof r !== 'object') return null
  // A folder is anything carrying a `links` list, so a hand-written
  // `{ "label": "...", "links": [...] }` needs no `kind`.
  if (Array.isArray(r.links)) {
    const links = r.links.flatMap((l) => reviveLink(l) ?? [])
    return { id: asId(r.id), kind: 'folder', label: asString(r.label) || 'Folder', links }
  }
  return reviveLink(raw)
}

/** Validate parsed JSON into sections, dropping anything malformed. */
export function reviveSections(raw: unknown): LinkSection[] | null {
  const list = Array.isArray(raw) ? raw : (raw as { sections?: unknown } | null)?.sections
  if (!Array.isArray(list)) return null
  return list.flatMap((item): LinkSection[] => {
    const s = item as { id?: unknown; title?: unknown; items?: unknown } | null
    if (!s || typeof s !== 'object') return []
    const items = Array.isArray(s.items) ? s.items.flatMap((i) => reviveItem(i) ?? []) : []
    return [{ id: asId(s.id), title: asString(s.title) || 'Untitled', items }]
  })
}

/* -- Searching ----------------------------------------------------------- */

const tokens = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean)

const matchesAll = (haystack: string, words: string[]) => {
  const text = haystack.toLowerCase()
  return words.every((w) => text.includes(w))
}

/** Links of a folder that match `query`; the whole folder when its name does. */
export function filterFolderLinks(folder: LinkFolder, query: string): LinkEntry[] {
  const words = tokens(query)
  if (words.length === 0 || matchesAll(folder.label, words)) return folder.links
  return folder.links.filter((l) => matchesAll(`${l.label} ${l.url}`, words))
}

/**
 * Narrow every section to what matches `query`, looking inside folders too.
 * Sections (and folders) left with nothing are dropped; no query returns the
 * sections untouched.
 */
export function filterSections(sections: LinkSection[], query: string): LinkSection[] {
  const words = tokens(query)
  if (words.length === 0) return sections
  return sections.flatMap((section): LinkSection[] => {
    const items = section.items.flatMap((item): SectionItem[] => {
      if (item.kind === 'link') return matchesAll(`${item.label} ${item.url}`, words) ? [item] : []
      const links = filterFolderLinks(item, query)
      return links.length > 0 ? [{ ...item, links }] : []
    })
    return items.length > 0 ? [{ ...section, items }] : []
  })
}
