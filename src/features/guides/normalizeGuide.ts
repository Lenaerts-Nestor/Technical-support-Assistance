import { DEFAULT_DEVICE_ID } from './panel/devices'
import type {
  Guide,
  GuideLink,
  GuidePart,
  GuideSection,
  GuideStep,
  GuidesFile,
  PanelAction,
  PanelPart,
  SectionBlock,
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

/** Tables / callouts / terms nested inside a chapter or section. */
function normalizeBlocks(raw: unknown): SectionBlock[] {
  return asArr(raw)
    .map(normalizePart)
    .filter((p): p is SectionBlock =>
      p !== null &&
      (p.type === 'table' || p.type === 'callout' || p.type === 'term' || p.type === 'panel'),
    )
}

/** `{ projectZip }` when the entry names a zip, else nothing — keeps old files unchanged. */
function zipField(o: Record<string, unknown>): { projectZip?: string } {
  const projectZip = asStr(o.projectZip).trim()
  return projectZip ? { projectZip } : {}
}

function normalizeSection(raw: unknown): GuideSection {
  const o = asObj(raw)
  return {
    id: withId(o.id),
    heading: asStr(o.heading),
    body: asStr(o.body),
    steps: asArr(o.steps).map(normalizeStep),
    blocks: normalizeBlocks(o.blocks),
    ...zipField(o),
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

function normalizePanel(raw: unknown): PanelPart {
  const o = asObj(raw)
  return {
    type: 'panel',
    id: withId(o.id),
    title: asStr(o.title),
    deviceId: asStr(o.deviceId) || DEFAULT_DEVICE_ID,
    cards: Object.fromEntries(
      Object.entries(asObj(o.cards)).filter(
        (e): e is [string, string] => typeof e[1] === 'string' && !!e[1],
      ),
    ),
    endpoints: asArr(o.endpoints).map((e) => {
      const x = asObj(e)
      return {
        id: withId(x.id),
        side: x.side === 'display' ? ('display' as const) : ('source' as const),
        name: asStr(x.name),
        detail: asStr(x.detail),
        kind: asStr(x.kind) || (x.side === 'display' ? 'display' : 'source'),
        ...(asStr(x.model) ? { model: asStr(x.model) } : {}),
        ...(typeof asObj(x.pos).x === 'number' && typeof asObj(x.pos).y === 'number'
          ? { pos: { x: asObj(x.pos).x as number, y: asObj(x.pos).y as number } }
          : {}),
        info: asArr(x.info).map((i) => {
          const y = asObj(i)
          return { id: withId(y.id), key: asStr(y.key), value: asStr(y.value) }
        }),
      }
    }),
    cables: asArr(o.cables).map((c) => {
      const x = asObj(c)
      return { id: withId(x.id), from: asStr(x.from), to: asStr(x.to), label: asStr(x.label) }
    }),
    annotations: asArr(o.annotations).map((a) => {
      const x = asObj(a)
      return { id: withId(x.id), portId: asStr(x.portId), label: asStr(x.label), note: asStr(x.note) }
    }),
    scenarios: asArr(o.scenarios).map((s) => {
      const x = asObj(s)
      const links = (raw: unknown) =>
        asArr(raw).map((l) => {
          const y = asObj(l)
          return { id: withId(y.id), from: asStr(y.from), to: asStr(y.to) }
        })
      const ports = (raw: unknown) => asArr(raw).map((p) => asStr(p)).filter(Boolean)
      // Older saves kept a single text / ports / links on the check itself.
      const steps = Array.isArray(x.steps)
        ? x.steps.map((st) => {
            const y = asObj(st)
            const m = asObj(y.move)
            const actions: PanelAction[] = asArr(y.actions).flatMap((a): PanelAction[] => {
              const z = asObj(a)
              const id = withId(z.id)
              if (z.type === 'swap-cards') return [{ id, type: 'swap-cards', from: asStr(z.from), to: asStr(z.to) }]
              if (z.type === 'swap-units') return [{ id, type: 'swap-units', a: asStr(z.a), b: asStr(z.b) }]
              if (z.type === 'unplug') return [{ id, type: 'unplug', cableId: asStr(z.cableId) }]
              if (z.type === 'plug')
                return [{ id, type: 'plug', cableId: withId(z.cableId), from: asStr(z.from), to: asStr(z.to), label: asStr(z.label) }]
              return []
            })
            // Older saves had a single `move` (a card swap) per step.
            if (asStr(m.from) && asStr(m.to) && !actions.length)
              actions.push({ id: uid(), type: 'swap-cards', from: asStr(m.from), to: asStr(m.to) })
            return {
              id: withId(y.id),
              text: asStr(y.text),
              actions,
              portIds: ports(y.portIds),
              links: links(y.links),
              answers: asArr(y.answers).map((a) => {
                const z = asObj(a)
                return { id: withId(z.id), label: asStr(z.label), next: asStr(z.next), result: asStr(z.result) }
              }),
            }
          })
        : [{ id: uid(), text: asStr(x.text), actions: [], portIds: ports(x.portIds), links: links(x.links), answers: [] }]
      return { id: withId(x.id), title: asStr(x.title), steps }
    }),
  }
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
        blocks: normalizeBlocks(o.blocks),
        ...zipField(o),
      }
    case 'section':
      return {
        type: 'section',
        id: withId(o.id),
        heading: asStr(o.heading),
        body: asStr(o.body),
        steps: asArr(o.steps).map(normalizeStep),
        blocks: normalizeBlocks(o.blocks),
        ...zipField(o),
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
    case 'panel':
      return normalizePanel(o)
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
