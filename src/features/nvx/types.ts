/** One device the calls are run on. */
export type NvxUnit = {
  id: string
  label: string
  /** The device's IPv4 address on the local network. */
  ip: string
}

/** A saved request: one click runs `GET path` and shows the answer under `title`. */
export type NvxCall = {
  id: string
  title: string
  /** A path on the device, such as `/Device/DeviceInfo`. */
  path: string
}

/** A family of devices that share a login and a set of calls (NVX, NAX, …). */
export type NvxGroup = {
  id: string
  name: string
  /** Remembered for the group. The password is never saved. */
  username: string
  units: NvxUnit[]
  calls: NvxCall[]
}

/** What the desktop app hands back for one request. It never throws. */
export type DeviceReply = {
  ok: boolean
  /** HTTP status, or `null` when nothing came back. */
  status: number | null
  ms: number
  /** The answer, when it was JSON. */
  data?: unknown
  /** The answer as text, whatever it was. */
  text?: string
  kind?: 'invalid' | 'auth' | 'network' | 'http'
  error?: string
}

/** One finished call, kept only on screen. */
export type RunResult = {
  key: string
  title: string
  path: string
  /** Where the call sits in the run, so answers that arrive out of order can be put back in order. */
  callIndex: number
  unit: NvxUnit
  reply: DeviceReply
}

/** One row of the comparison: a property and its value on each unit (`null` where a unit has none). */
export type CompareRow = {
  path: string
  values: (string | null)[]
  /** True when the units do not all show the same value. */
  differs: boolean
}
