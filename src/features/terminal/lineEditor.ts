/** How many past commands are kept per unit. */
export const HISTORY_LIMIT = 200

const DELETE = '\x7f'

/**
 * Follows the command being typed in a terminal, so Up/Down can bring back past commands and Tab can
 * finish a command name — the way a normal terminal does — whatever the unit's own console supports.
 *
 * It only knows the line while it is typed at the end, with letters and Backspace. Anything else (arrow
 * keys, Home, Ctrl+A, a native Tab…) makes it lose track of the line ("dirty") until Enter, and then
 * Up/Down/Tab are passed on to the unit untouched. To replace the line it types Backspaces and then the
 * new text, exactly what a person would do, so the unit's own echo draws it.
 */
export class CommandLine {
  private buffer = ''
  private dirty = false
  /** Where Up/Down is in the history, or `null` when not browsing. */
  private browsing: number | null = null
  /** What was typed before browsing began, for coming back to it with Down. */
  private draft = ''

  private readonly history: string[]

  /** `history` is kept by the caller (oldest first), so it can outlive this object. */
  constructor(history: string[]) {
    this.history = history
  }

  /** Learn from keystrokes as the terminal reports them (they are sent to the unit as they are). */
  track(data: string): void {
    for (const ch of data) {
      if (ch === '\r' || ch === '\n') {
        this.commit()
      } else if (ch === DELETE || ch === '\b') {
        this.buffer = this.buffer.slice(0, -1)
        this.browsing = null
      } else if (ch === '\x03' || ch === '\x15') {
        this.reset() // Ctrl+C and Ctrl+U: the line is gone
      } else if (ch === '\x1b') {
        this.dirty = true // the rest is an escape sequence (arrows, Home, Delete…)
        return
      } else if (ch < ' ') {
        this.dirty = true // some other control key
      } else {
        this.buffer += ch
        this.browsing = null
      }
    }
  }

  /**
   * Up. What to send to the unit to replace the typed line with the previous command (possibly nothing, at
   * the oldest one), or `null` when the key should go to the unit as usual.
   */
  previous(): string | null {
    if (this.dirty || this.history.length === 0) return null
    if (this.browsing === null) {
      this.draft = this.buffer
      this.browsing = this.history.length - 1
    } else if (this.browsing > 0) {
      this.browsing -= 1
    } else {
      return ''
    }
    return this.replaceWith(this.history[this.browsing])
  }

  /** Down. The next command, then what was being typed before; `null` when the unit should handle the key. */
  next(): string | null {
    if (this.dirty) return null
    if (this.browsing === null) return ''
    if (this.browsing < this.history.length - 1) {
      this.browsing += 1
      return this.replaceWith(this.history[this.browsing])
    }
    this.browsing = null
    return this.replaceWith(this.draft)
  }

  /**
   * Tab on a command name. `send` is what to type to finish it (a space after a single match, the shared
   * start of several; the typed letters are replaced when they are not spelled like the command), `matches`
   * are all the candidates. `null` when there is nothing to do here and the key should go to the unit as
   * usual (typing arguments, no such command, line not known).
   */
  complete(commands: readonly string[]): { send: string; matches: string[] } | null {
    if (this.dirty || this.buffer === '' || /\s/.test(this.buffer)) return null
    const typed = this.buffer.toLowerCase()
    const matches = commands.filter((c) => c.toLowerCase().startsWith(typed))
    if (matches.length === 0) return null
    let target: string
    if (matches.length === 1) {
      target = `${matches[0]} `
    } else {
      let common = matches[0].length
      for (const m of matches) {
        let i = 0
        while (i < common && i < m.length && m[i].toLowerCase() === matches[0][i].toLowerCase()) i++
        common = i
      }
      // Several candidates: only go further when they agree on more than what is typed.
      target = common > this.buffer.length ? matches[0].slice(0, common) : this.buffer
    }
    this.browsing = null
    if (target === this.buffer) return { send: '', matches }
    const send = target.startsWith(this.buffer) ? target.slice(this.buffer.length) : this.replaceWith(target)
    this.buffer = target
    return { send, matches }
  }

  private replaceWith(text: string): string {
    const send = DELETE.repeat(this.buffer.length) + text
    this.buffer = text
    return send
  }

  private commit() {
    const line = this.buffer.trim()
    if (!this.dirty && line && this.history.at(-1) !== line) {
      this.history.push(line)
      if (this.history.length > HISTORY_LIMIT) this.history.splice(0, this.history.length - HISTORY_LIMIT)
    }
    this.reset()
  }

  private reset() {
    this.buffer = ''
    this.dirty = false
    this.browsing = null
    this.draft = ''
  }
}

/** Past commands per unit, kept in memory while the app runs: never saved, since a command can hold a password. */
const histories = new Map<string, string[]>()

export function historyFor(ip: string): string[] {
  let history = histories.get(ip)
  if (!history) {
    history = []
    histories.set(ip, history)
  }
  return history
}
