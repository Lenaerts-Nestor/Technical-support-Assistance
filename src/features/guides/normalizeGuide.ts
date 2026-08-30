import type {
  Guide,
  GuideLink,
  GuidePart,
  GuideSection,
  GuideStep,
  GuidesFile,
  StepSubItem,
  SubItemKind,
  TablePart,
} from './types'

/**
 * Import adapter. Collapses any historical `guides-backup.json` shape into the
 * canonical {@link Guide} model the app renders and edits:
 *
 *  - step-level `callout` / `example` fields become `subItems`
 *  - `{ type: 'note', variant }` sub-items become `{ kind: 'info' | 'warning' }`
 *  - every part / step / sub-item is guaranteed a stable `id`
 *  - table rows are padded / trimmed to the header count
 *
 * Unknown part types are dropped; an entry without an `id` is rejected entirely.
 */

const uid = () => crypto.randomUUID()

const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
const asStr = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const withId = (v: unknown): string => (typeof v === 'string' && v ? v : uid())

function normalizeSubItem(raw: unknown): StepSubItem {
  const o = asObj(raw)
  let kind: SubItemKind
  if (o.kind === 'bullet' || o.kind === 'info' || o.kind === 'warning') {
    kind = o.kind
  } else if (o.type === 'note') {
    kind = o.variant === 'warning' ? 'warning' : 'info'
  } else {
    kind = 'bullet'
  }
  return { id: withId(o.id), kind, text: asStr(o.text) }
}

function normalizeStep(raw: unknown): GuideStep {
  const o = asObj(raw)
  const subItems = asArr(o.subItems).map(normalizeSubItem)

  // legacy: a single inline callout attached to the step
  const legacyCallout = asObj(o.callout)
  if (typeof legacyCallout.text === 'string' && legacyCallout.text.trim()) {
    subItems.push({
      id: uid(),
      kind: legacyCallout.variant === 'warning' ? 'warning' : 'info',
      text: legacyCallout.text,
    })
  }

  // legacy: a free-text "example" line
  if (typeof o.example === 'string' && o.example.trim()) {
    subItems.push({ id: uid(), kind: 'info', text: `Example: ${o.example}` })
  }

  const image = asStr(o.image).trim()
  return {
    id: withId(o.id),
    text: asStr(o.text),
    ...(image ? { image } : {}),
    subItems,
  }
}

function normalizeSection(raw: unknown): GuideSection {
  const o = asObj(raw)
  return {
    id: withId(o.id),
    heading: asStr(o.heading),
    body: asStr(o.body),
    steps: asArr(o.steps).map(normalizeStep),
  }
}

function normalizeTable(raw: unknown): TablePart {
  const o = asObj(raw)
  const t = asObj(o.table)
  let headers = asArr(t.headers).map((h) => asStr(h))
  if (headers.length === 0) headers = ['Column 1', 'Column 2']
  const rows = asArr(t.rows).map((row) => {
    const cells = asArr(row).map((c) => asStr(c))
    while (cells.length < headers.length) cells.push('')
    return cells.slice(0, headers.length)
  })
  return { type: 'table', id: withId(o.id), title: asStr(o.title), table: { headers, rows } }
}

function normalizePart(raw: unknown): GuidePart | null {
  const o = asObj(raw)
  switch (o.type) {
    case 'chapter':
      return {
        type: 'chapter',
        id: withId(o.id),
        subtitle: asStr(o.subtitle),
        sections: asArr(o.sections).map(normalizeSection),
      }
    case 'section':
      return {
        type: 'section',
        id: withId(o.id),
        heading: asStr(o.heading),
        body: asStr(o.body),
        steps: asArr(o.steps).map(normalizeStep),
      }
    case 'table':
      return normalizeTable(o)
    case 'callout':
      return {
        type: 'callout',
        id: withId(o.id),
        variant: o.variant === 'warning' ? 'warning' : 'info',
        text: asStr(o.text),
      }
    case 'term':
      return {
        type: 'term',
        id: withId(o.id),
        title: asStr(o.title),
        explanation: asStr(o.explanation),
        bullets: asArr(o.bullets).map((b) => asStr(b)).filter(Boolean),
      }
    default:
      return null
  }
}

function normalizeLink(raw: unknown): GuideLink {
  const o = asObj(raw)
  return {
    id: withId(o.id),
    title: asStr(o.title),
    description: asStr(o.description),
    url: asStr(o.url),
  }
}

/** Turn one raw entry from a backup file into a canonical Guide, or null if unusable. */
export function normalizeGuide(raw: unknown): Guide | null {
  const o = asObj(raw)
  if (typeof o.id !== 'string' || !o.id) return null

  const now = new Date().toISOString()
  const createdAt = asStr(o.createdAt) || now
  const updatedAt = asStr(o.updatedAt) || createdAt

  return {
    id: o.id,
    title: asStr(o.title),
    ...(asStr(o.description) ? { description: asStr(o.description) } : {}),
    ...(asStr(o.category) ? { category: asStr(o.category) } : {}),
    ...(asStr(o.author) ? { author: asStr(o.author) } : {}),
    pinned: o.pinned === true,
    ...(typeof o.order === 'number' ? { order: o.order } : {}),
    parts: asArr(o.parts)
      .map(normalizePart)
      .filter((p): p is GuidePart => p !== null),
    links: asArr(o.links).map(normalizeLink),
    tags: asArr(o.tags).map((t) => asStr(t)).filter(Boolean),
    createdAt,
    updatedAt,
  }
}

/**
 * Parse a whole backup file (either `{ guides: {...} }`, `{ guides: [...] }`, a
 * bare array, or a bare map) and normalise every entry. Throws on invalid JSON.
 */
export function parseGuidesFile(text: string): Guide[] {
  const data: unknown = JSON.parse(text)
  const container =
    data && typeof data === 'object' && 'guides' in data
      ? (data as { guides: unknown }).guides
      : data
  const list: unknown[] = Array.isArray(container)
    ? container
    : container && typeof container === 'object'
      ? Object.values(container as Record<string, unknown>)
      : []
  return list.map(normalizeGuide).filter((g): g is Guide => g !== null)
}

/** Canonical on-disk / export shape: a `{ [id]: Guide }` map plus a timestamp. */
export function toGuidesFile(guides: Guide[]): GuidesFile {
  return {
    exportedAt: new Date().toISOString(),
    guides: Object.fromEntries(guides.map((g) => [g.id, g])),
  }
}
