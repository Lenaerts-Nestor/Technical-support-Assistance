/** One terminal on the page: the unit it is connected to and the login it was opened with (memory only). */
export type TerminalEntry = {
  key: string
  label: string
  ip: string
  username: string
  password: string
}
