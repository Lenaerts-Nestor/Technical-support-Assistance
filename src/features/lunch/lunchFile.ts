import { LANGUAGES } from './config'
import { nameKey, newAgent, reviveAgents } from './roster'
import { reviveHistory } from './history'
import type { Agent, HistoryEntry, ShiftNo } from './types'

/**
 * Import / export. The roster travels as CSV (opens in Excel) or JSON; the JSON
 * file can also carry the history, so it doubles as a full backup.
 */

export const CSV_HEADER = ['Agent name', 'Languages', 'Chat agent', 'Early shift', 'Available today', "Yesterday's shift"]

/* -- CSV -------------------------------------------------------------------- */

const quote = (cell: string) => (/[",;\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
const yesNo = (b: boolean) => (b ? 'Yes' : 'No')

export function rosterToCsv(agents: Agent[]): string {
  const rows = agents.map((a) => [
    a.name,
    a.languages.join('; '),
    yesNo(a.chat),
    yesNo(a.earlyShift),
    yesNo(a.available),
    a.yesterdayShift === null ? '' : String(a.yesterdayShift),
  ])
  return [CSV_HEADER, ...rows].map((row) => row.map(quote).join(',')).join('\r\n')
}

/** Splits CSV text into rows of cells. Handles quotes, doubled quotes and newlines inside a cell. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') inQuotes = false
      else cell += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delimiter) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** Excel saves with `;` in many European locales, `,` elsewhere, and a pasted table has tabs. */
function detectDelimiter(text: string): string {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  return [';', '\t', ','].map((d) => [d, header.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0]
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Header spellings accepted for each field, squashed (case, spaces and punctuation ignored). */
const HEADERS: Record<'name' | 'languages' | 'chat' | 'earlyShift' | 'available' | 'yesterdayShift', string[]> = {
  name: ['agentname', 'name', 'agent'],
  languages: ['languages', 'language', 'lang'],
  chat: ['chatagent', 'chat'],
  earlyShift: ['earlyshift', 'early'],
  available: ['availabletoday', 'available'],
  yesterdayShift: ['yesterdaysshift', 'yesterdayshift', 'yesterday'],
}

const YES = new Set(['yes', 'y', 'true', '1', 'x', 'ja', 'oui', 'si', 'sí', 'wahr'])
const NO = new Set(['no', 'n', 'false', '0', 'nee', 'non', 'nein'])

function parseBool(cell: string | undefined, fallback: boolean): boolean {
  const v = (cell ?? '').trim().toLowerCase()
  if (YES.has(v)) return true
  if (NO.has(v)) return false
  return fallback
}

function parseShift(cell: string | undefined): ShiftNo | null {
  const m = /^(?:shift\s*)?([12])(?:st|nd)?$/i.exec((cell ?? '').trim())
  return m ? (Number(m[1]) as ShiftNo) : null
}

/** Maps a typed language ("dutch", "NL") to its configured name; `null` when it is not one. */
export function canonicalLanguage(token: string): string | null {
  const t = token.trim().toLowerCase()
  const hit = LANGUAGES.find((l) => l.name.toLowerCase() === t || l.code.toLowerCase() === t)
  return hit ? hit.name : null
}

export type RosterImport = {
  agents: Agent[]
  /** Rows left out: no name, or a name already seen. */
  skipped: number
  /** Languages not in `LANGUAGES`; they were kept as typed. */
  unknownLanguages: string[]
}

export function parseRosterCsv(text: string): RosterImport {
  const clean = text.replace(/^\uFEFF/, '')
  const rows = parseCsv(clean, detectDelimiter(clean))
  const header = (rows[0] ?? []).map(squash)
  const column = (field: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[field].includes(h))
  const at = Object.fromEntries((Object.keys(HEADERS) as (keyof typeof HEADERS)[]).map((f) => [f, column(f)])) as Record<
    keyof typeof HEADERS,
    number
  >
  if (at.name < 0) throw new Error('No "Agent name" column found. The first row must hold the column headings.')

  const agents: Agent[] = []
  const seen = new Set<string>()
  const unknown = new Set<string>()
  let skipped = 0
  for (const row of rows.slice(1)) {
    const cell = (field: keyof typeof HEADERS) => (at[field] < 0 ? undefined : row[at[field]])
    const name = (cell('name') ?? '').trim()
    if (!name || seen.has(nameKey(name))) {
      skipped++
      continue
    }
    seen.add(nameKey(name))
    const languages: string[] = []
    for (const token of (cell('languages') ?? '').split(/[,;/|]+/)) {
      const trimmed = token.trim()
      if (!trimmed) continue
      const language = canonicalLanguage(trimmed)
      if (!language) unknown.add(trimmed)
      const kept = language ?? trimmed
      if (!languages.includes(kept)) languages.push(kept)
    }
    agents.push(
      newAgent({
        name,
        languages,
        chat: parseBool(cell('chat'), false),
        earlyShift: parseBool(cell('earlyShift'), false),
        available: parseBool(cell('available'), true),
        yesterdayShift: parseShift(cell('yesterdayShift')),
      }),
    )
  }
  return { agents, skipped, unknownLanguages: [...unknown] }
}

/* -- JSON ------------------------------------------------------------------- */

export function exportJson(agents: Agent[], history: HistoryEntry[]): string {
  return JSON.stringify({ app: 'support-hub-lunch-planner', version: 1, agents, history }, null, 2)
}

export type LunchImport = RosterImport & {
  /** `null` when the file holds no history key (a CSV, or a roster-only JSON). */
  history: HistoryEntry[] | null
}

/** Reads a roster file of either kind. Throws an `Error` with a message fit to show. */
export function parseImport(text: string): LunchImport {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) throw new Error('That file is empty.')
  if (trimmed[0] !== '{' && trimmed[0] !== '[') return { ...parseRosterCsv(trimmed), history: null }

  let json: unknown
  try {
    json = JSON.parse(trimmed)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const rawAgents = Array.isArray(json) ? json : (json as { agents?: unknown } | null)?.agents
  if (!Array.isArray(rawAgents)) throw new Error('No "agents" list found in that file.')
  const agents = reviveAgents(rawAgents)
  const known = new Set(LANGUAGES.map((l) => l.name))
  const unknownLanguages = [...new Set(agents.flatMap((a) => a.languages).filter((l) => !known.has(l)))]
  const rawHistory = Array.isArray(json) ? undefined : (json as { history?: unknown }).history
  return {
    agents,
    skipped: rawAgents.length - agents.length,
    unknownLanguages,
    history: Array.isArray(rawHistory) ? reviveHistory(rawHistory) : null,
  }
}
