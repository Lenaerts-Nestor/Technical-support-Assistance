import type { DeviceReply, NvxCall, NvxGroup, NvxUnit, RunResult } from './types'

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
  return r && ip ? { id: asId(r.id), label: asText(r.label, NAME_MAX_LENGTH), ip } : null
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
