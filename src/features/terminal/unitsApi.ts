import type { Unit } from './types'

/** Served by the local SSH bridge (`bridge/sshBridge.ts`) on the dev server. */
const UNITS_URL = '/tsa-bridge/units'

export const SSH_SOCKET_PATH = '/tsa-bridge/ssh'

const asString = (v: unknown) => (typeof v === 'string' ? v : '')

function reviveUnits(raw: unknown): Unit[] {
  const list = (raw as { units?: unknown } | null)?.units
  if (!Array.isArray(list)) return []
  return list.flatMap((item): Unit[] => {
    const u = item as Record<string, unknown> | null
    const id = asString(u?.id)
    const host = asString(u?.host)
    if (!u || !id || !host) return []
    const port = Number(u.port)
    return [
      {
        id,
        host,
        name: asString(u.name) || host,
        port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 22,
        model: asString(u.model),
      },
    ]
  })
}

/** Saved units, or throws when the bridge can't be reached. */
export async function fetchUnits(): Promise<Unit[]> {
  const res = await fetch(UNITS_URL)
  if (!res.ok) throw new Error(`Bridge answered ${res.status}`)
  return reviveUnits(await res.json())
}

export async function saveUnits(units: Unit[]): Promise<void> {
  const res = await fetch(UNITS_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ units }),
  })
  if (!res.ok) throw new Error(`Bridge answered ${res.status}`)
}
