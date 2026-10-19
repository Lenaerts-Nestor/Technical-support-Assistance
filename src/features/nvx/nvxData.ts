import type { ChangeLogEntry, ChangeOutcome, ChangeStatus, CompareRow, DeviceReply, NvxCall, NvxGroup, NvxUnit, RunResult, SettingValue } from './types'

export const NAME_MAX_LENGTH = 40
const PATH_MAX_LENGTH = 500

/**
 * The calls a new group starts with: the two the NVX API manual itself uses as examples.
 * Edit or delete them, and add your own from the explorer.
 */
export const STARTER_CALLS: Omit<NvxCall, 'id'>[] = [
  { title: 'Device info', path: '/Device/DeviceInfo' },
  { title: 'Hostname', path: '/Device/Ethernet/HostName' },
]

export const newId = () => crypto.randomUUID()

/** Whether a call is one of the starters that every new group begins with. */
export const isStarterCall = (call: NvxCall) =>
  STARTER_CALLS.some((starter) => starter.title === call.title && starter.path === call.path)

export function newGroup(name: string): NvxGroup {
  return {
    id: newId(),
    name: name.trim().slice(0, NAME_MAX_LENGTH) || 'New group',
    username: 'admin',
    units: [],
    calls: STARTER_CALLS.map((call) => ({ id: newId(), ...call })),
  }
}

export const defaultGroups = (): NvxGroup[] => [newGroup('NVX API')]

/* -- What was typed ------------------------------------------------------ */

/** A dotted IPv4 address with each part 0–255, or `null`. Whether it is on a private network is checked by the app. */
export function normalizeIp(input: string): string | null {
  const text = input.trim()
  const parts = text.split('.')
  if (parts.length !== 4) return null
  if (!parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null
  return parts.map(Number).join('.')
}

/**
 * A path on the device. A pasted address (`https://10.0.0.5/Device/DeviceInfo`) is cut down to its
 * path, and a missing leading slash is added. `null` for anything the app would refuse to send.
 */
export function normalizePath(input: string): string | null {
  let text = input.trim()
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text)
      text = url.pathname + url.search
    } catch {
      return null
    }
  }
  if (!text) return null
  if (!text.startsWith('/')) text = `/${text}`
  if (text.length > PATH_MAX_LENGTH || text.startsWith('//') || !/^\/[\x21-\x7e]*$/.test(text)) return null
  return text
}

/**
 * A stream address as it will be stored: `rtsp://` or `rtsps://` and an IPv4 address, with no user
 * name or password (the player asks for those, so they never end up in `nvx.json`). `''` means none;
 * `null` means what was typed cannot be used.
 */
export function normalizeStreamUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return ''
  return /^rtsps?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d{1,5})?(\/[\x21-\x7e]*)?$/i.test(text) ? text : null
}

/* -- Showing an answer --------------------------------------------------- */

export type FlatValue = { path: string; value: string }

const showScalar = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value))

/** Every value in an answer on its own line: `Device.Ethernet.HostName` → `NVX-LAB`. */
export function flatten(data: unknown, prefix = ''): FlatValue[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [{ path: prefix, value: '[]' }]
    return data.flatMap((item, i) => flatten(item, `${prefix}[${i}]`))
  }
  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return [{ path: prefix, value: '{}' }]
    return entries.flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key))
  }
  return [{ path: prefix, value: showScalar(data) }]
}

/**
 * A path split for reading: the part before the last dot (shown dim, without the `Device.` every
 * path starts with) and the last part (the property itself, shown bright).
 */
export function splitPath(path: string): { prefix: string; leaf: string } {
  const dot = path.lastIndexOf('.')
  if (dot < 0) return { prefix: '', leaf: path }
  return { prefix: path.slice(0, dot + 1).replace(/^Device\./, ''), leaf: path.slice(dot + 1) }
}

/** The run's answers in reading order: unit by unit (in the order given), each unit's calls in call order. */
export function sortResults(results: RunResult[], units: NvxUnit[]): RunResult[] {
  const position = new Map(units.map((u, i) => [u.id, i]))
  return [...results].sort(
    (a, b) => (position.get(a.unit.id) ?? 0) - (position.get(b.unit.id) ?? 0) || a.callIndex - b.callIndex,
  )
}

/**
 * Every property any unit answered, with each unit's value side by side, so the odd one out stands
 * out. A unit with no answer at all shows `null` everywhere and is left out of the comparison, so
 * an unreachable unit does not make every row look different. Rows keep the order they first appear in.
 */
export function compareRows(results: RunResult[], units: NvxUnit[]): CompareRow[] {
  const rows = new Map<string, (string | null)[]>()
  const answered = new Set<number>()
  for (const result of sortResults(results, units)) {
    if (!result.reply.ok || result.reply.data === undefined) continue
    const column = units.findIndex((u) => u.id === result.unit.id)
    if (column < 0) continue
    answered.add(column)
    for (const { path, value } of flatten(result.reply.data)) {
      const values = rows.get(path) ?? units.map(() => null)
      values[column] ??= value // the same property answered by two calls keeps the first value
      rows.set(path, values)
    }
  }
  return [...rows].map(([path, values]) => ({
    path,
    values,
    differs: new Set(values.filter((_, column) => answered.has(column))).size > 1,
  }))
}

/** The answer as it should be shown or copied as JSON: pretty when it was JSON, the raw text otherwise. */
export function prettyAnswer(reply: DeviceReply): string {
  if (reply.data !== undefined) return JSON.stringify(reply.data, null, 2)
  return (reply.text ?? '').trim()
}

const RAW_TEXT_LIMIT = 2000

/** One result as plain text for a case note. */
export function formatResult(result: RunResult): string {
  const { reply } = result
  const heading = `== ${result.title} · ${result.unit.label || result.unit.ip} (${result.unit.ip}) · ${result.path} ==`
  if (!reply.ok) return `${heading}\nERROR: ${reply.error ?? 'No answer.'}`
  const lines =
    reply.data !== undefined
      ? flatten(reply.data).map(({ path, value }) => `${path}: ${value}`)
      : [(reply.text ?? '').trim().slice(0, RAW_TEXT_LIMIT)]
  return [heading, ...lines].join('\n')
}

export const formatReport = (results: RunResult[]) => results.map(formatResult).join('\n\n')

/* -- Reading nvx.json ---------------------------------------------------- */

const asText = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const asId = (value: unknown) => (typeof value === 'string' && value ? value : newId())

function reviveUnit(raw: unknown): NvxUnit | null {
  const r = raw as Partial<NvxUnit> | null
  const ip = normalizeIp(asText(r?.ip, 20))
  if (!r || !ip) return null
  const streamUrl = normalizeStreamUrl(asText(r.streamUrl, 300))
  return { id: asId(r.id), label: asText(r.label, NAME_MAX_LENGTH), ip, ...(streamUrl ? { streamUrl } : {}) }
}

function reviveCall(raw: unknown): NvxCall | null {
  const r = raw as Partial<NvxCall> | null
  const path = normalizePath(asText(r?.path, PATH_MAX_LENGTH))
  return r && path ? { id: asId(r.id), title: asText(r.title, NAME_MAX_LENGTH) || path, path } : null
}

const reviveList = <T,>(raw: unknown, one: (item: unknown) => T | null): T[] =>
  Array.isArray(raw) ? raw.map(one).filter((item): item is T => item !== null) : []

/**
 * The groups from `nvx.json` or localStorage, with anything unusable dropped. `null` when the
 * whole value is not a list of groups, so the caller can fall back to the defaults.
 */
export function reviveGroups(raw: unknown): NvxGroup[] | null {
  if (!Array.isArray(raw)) return null
  const seen = new Set<string>()
  const groups: NvxGroup[] = []
  for (const item of raw) {
    const r = item as Partial<NvxGroup> | null
    if (!r || typeof r !== 'object') continue
    const id = asId(r.id)
    if (seen.has(id)) continue
    seen.add(id)
    groups.push({
      id,
      name: asText(r.name, NAME_MAX_LENGTH) || 'Group',
      username: asText(r.username, 64),
      units: reviveList(r.units, reviveUnit),
      calls: reviveList(r.calls, reviveCall),
    })
  }
  return groups
}

/* -- Changing settings --------------------------------------------------- */

/** `Device.Ethernet.HostName` → `/Device/Ethernet/HostName`, to read a property back. `null` for a path with a list index. */
export function propertyUrl(path: string): string | null {
  return path.startsWith('Device.') && !path.includes('[') ? `/${path.replaceAll('.', '/')}` : null
}

/** The partial object to send for one property: `Device.A.B` and `x` → `{"Device":{"A":{"B":"x"}}}`. `null` for a path that cannot be sent. */
export function buildChangeBody(path: string, value: SettingValue): Record<string, unknown> | null {
  if (!propertyUrl(path)) return null
  const keys = path.split('.')
  return keys.reduceRight<unknown>((inner, key) => ({ [key]: inner }), value) as Record<string, unknown>
}

/** Whether a value in an answer can be edited in place: a plain value on a plain `Device.…` path. */
export const isEditable = (path: string, value: unknown): value is SettingValue =>
  propertyUrl(path) !== null && ['string', 'number', 'boolean'].includes(typeof value)

/** The value at a dotted path (no list indices), or `undefined`. */
export function getAtPath(data: unknown, path: string): unknown {
  let node = data
  for (const key of path.split('.')) {
    if (node === null || typeof node !== 'object' || Array.isArray(node) || !(key in node)) return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

/** A copy of `data` with the value at `path` replaced, or `data` itself when that path is not in it. */
export function setAtPath<T>(data: T, path: string, value: SettingValue): T {
  if (getAtPath(data, path) === undefined) return data
  const set = (node: unknown, keys: string[]): unknown =>
    keys.length === 0 ? value : { ...(node as Record<string, unknown>), [keys[0]]: set((node as Record<string, unknown>)[keys[0]], keys.slice(1)) }
  return set(data, path.split('.')) as T
}

/** What the device means by a `StatusId` (see "Results Object" in the manual). */
export function describeStatus(statusId: number): string {
  switch (statusId) {
    case 0:
      return 'OK'
    case 1:
      return 'A device restart is required for this to take effect'
    case 2:
      return 'An out-of-the-box application reset is required'
    case 3:
      return 'The property is not supported'
    case -1:
      return 'The value is out of the allowed range'
    case -2:
      return 'The property is read only'
    case -3:
      return 'A required property is missing'
    case -4:
      return 'The device reported an error'
    default:
      return statusId < 0 ? `The device reported error ${statusId}` : `The device reported status ${statusId}`
  }
}

/** The per-property results out of a device's reply to a change (`Actions[].Results[]`). */
export function parseChangeStatuses(data: unknown): ChangeStatus[] {
  const actions = (data as { Actions?: unknown } | null)?.Actions
  if (!Array.isArray(actions)) return []
  return actions.flatMap((action) => {
    const results = (action as { Results?: unknown } | null)?.Results
    if (!Array.isArray(results)) return []
    return results.flatMap((raw): ChangeStatus[] => {
      const r = raw as { Path?: unknown; Property?: unknown; StatusId?: unknown; StatusInfo?: unknown } | null
      if (!r || typeof r.StatusId !== 'number') return []
      return [{ path: String(r.Path ?? ''), property: String(r.Property ?? ''), statusId: r.StatusId, statusInfo: typeof r.StatusInfo === 'string' ? r.StatusInfo : '' }]
    })
  })
}

/**
 * How a change went overall: failed when any property was refused (an error, or "not supported"),
 * restart when everything was taken but something needs a restart or reset, applied otherwise.
 */
export function summarizeStatuses(statuses: ChangeStatus[]): { outcome: ChangeOutcome; detail: string } {
  if (statuses.length === 0) return { outcome: 'applied', detail: 'The device accepted the change and gave no list of results.' }
  const failed = statuses.filter((s) => s.statusId < 0 || s.statusId === 3)
  const restart = statuses.filter((s) => s.statusId === 1 || s.statusId === 2)
  const words = (list: ChangeStatus[]) =>
    list.map((s) => `${s.property || s.path}: ${describeStatus(s.statusId)}${s.statusInfo ? ` (${s.statusInfo})` : ''}`).join('; ')
  if (failed.length > 0) return { outcome: 'failed', detail: words(failed) }
  if (restart.length > 0) return { outcome: 'restart', detail: words(restart) }
  return { outcome: 'applied', detail: 'The device reported OK.' }
}

export const OUTCOME_LABEL: Record<ChangeOutcome, string> = {
  applied: 'Applied',
  restart: 'Applied, restart needed',
  failed: 'Not applied',
}

/** A value as shown in a change line: text in quotes, the rest as it is. */
export const showSetting = (value: unknown) =>
  typeof value === 'string' ? `"${value}"` : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)

/**
 * One line of a change: `Device.Ethernet.HostName: "old" → "new"`, with what the device reports
 * afterwards when that is known. `before` is left out when the old value was not on screen.
 */
export function changeLine(path: string, after: unknown, before?: unknown, now?: unknown): string {
  const from = before === undefined ? '' : `${showSetting(before)} → `
  const reported = now === undefined ? '' : ` · the device now reports ${showSetting(now)}`
  return `${path}: ${from}${showSetting(after)}${reported}`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** The session's changes as plain text for a case note, oldest first. */
export function formatChangeLog(entries: ChangeLogEntry[]): string {
  return [...entries]
    .sort((a, b) => a.at - b.at)
    .map((entry) => {
      const d = new Date(entry.at)
      const when = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
      return [`${when} · ${entry.unit.label || entry.unit.ip} (${entry.unit.ip}) · ${OUTCOME_LABEL[entry.outcome]}`, ...entry.lines.map((l) => `  ${l}`), ...(entry.detail ? [`  ${entry.detail}`] : [])].join('\n')
    })
    .join('\n\n')
}
