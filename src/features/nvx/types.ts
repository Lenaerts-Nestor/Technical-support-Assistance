export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

/** One device the calls are run on. */
export type NvxUnit = {
  id: string
  label: string
  /** The device's IPv4 address on the local network. */
  ip: string
}

/** What is sent to a device: a method and path, with optional headers and a raw body. */
export type DeviceRequest = {
  method: HttpMethod
  /** A path on the device, such as `/Device/DeviceInfo`. It may carry a query string. */
  path: string
  headers?: Record<string, string>
  /** The body exactly as typed (usually JSON). Not for GET. */
  body?: string
}

/** A saved request: one click runs a GET on the ticked units; anything else is reviewed first. */
export type NvxCall = DeviceRequest & {
  id: string
  title: string
  /** The folder it is kept in; none means it sits at the top. */
  folderId?: string
}

/** A named place to keep saved calls together. */
export type NvxFolder = {
  id: string
  name: string
}

/** A family of devices that share a login and a set of calls (NVX, NAX, …). */
export type NvxGroup = {
  id: string
  name: string
  /** Remembered for the group. The password is never saved. */
  username: string
  units: NvxUnit[]
  folders: NvxFolder[]
  calls: NvxCall[]
}

/** What the desktop app hands back for one request. It never throws. */
export type DeviceReply = {
  ok: boolean
  /** HTTP status, or `null` when nothing came back. */
  status: number | null
  ms: number
  /** Size of the answer in bytes. */
  bytes?: number
  /** The answer's headers (never the session cookies). */
  headers?: Record<string, string>
  /** The answer, when it was JSON. */
  data?: unknown
  /** The answer as text, unless it was a picture. */
  text?: string
  /** The answer, when it was a picture the page can show. */
  image?: { type: string; base64: string }
  kind?: 'invalid' | 'auth' | 'network' | 'http'
  error?: string
}

/** One finished call, kept only on screen. */
export type RunResult = {
  key: string
  title: string
  method: HttpMethod
  path: string
  /** Where the call sits in the run, so answers that arrive out of order can be put back in order. */
  callIndex: number
  unit: NvxUnit
  reply: DeviceReply
}

/** A value the app can write: text, a number or true/false. */
export type SettingValue = string | number | boolean

/** One property's answer in the device's reply to a change (`Actions[].Results[]` in the manual). */
export type ChangeStatus = {
  path: string
  property: string
  /** <0 error, 0 OK, >0 informational — see `describeStatus`. */
  statusId: number
  statusInfo: string
}

/** How a change went, in the words used on screen. */
export type ChangeOutcome = 'applied' | 'restart' | 'failed'

/** One change sent during this session, kept for the log. */
export type ChangeLogEntry = {
  id: string
  at: number
  unit: NvxUnit
  /** What was sent, one line per property or one line for the request. */
  lines: string[]
  outcome: ChangeOutcome
  /** The device's own words, or why it did not happen. */
  detail: string
}

/** One row of the comparison: a property and its value on each unit (`null` where a unit has none). */
export type CompareRow = {
  path: string
  values: (string | null)[]
  /** True when the units do not all show the same value. */
  differs: boolean
}
