/**
 * A saved unit card. Only the name and address are ever stored — the username
 * and password are asked for each time a terminal is opened and never written
 * anywhere.
 */
export type Unit = {
  id: string
  name: string
  host: string
  port: number
  /** Free label such as "NVX" — shown as a chip on the card. */
  model: string
}

/** One open terminal tab. Credentials live here, in memory, for its lifetime. */
export type Session = {
  id: string
  unit: Unit
  username: string
  password: string
  /** "NVX-01", or "NVX-01 #2" when the same unit is open more than once. */
  label: string
}

export type Credentials = { username: string; password: string }

export type ConnectionState = 'connecting' | 'ready' | 'closed' | 'error'
