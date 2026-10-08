/**
 * Per-terminal command history for the Up / Down arrows.
 *
 * The units' own shells may not keep a history, so the page mirrors the line
 * being typed and replays earlier ones itself. Recall works by erasing the
 * typed line with backspaces and typing the remembered command in its place,
 * which any shell handles.
 *
 * The mirror is only trustworthy while the line was typed straight through. A
 * cursor move or Tab completion changes the line on the unit in ways we can't
 * see, so the line is then marked `dirty`: Enter records nothing and the arrows
 * pass through to the unit's own shell. The same goes for a password prompt —
 * what is typed there is never recorded.
 */

const MAX_ENTRIES = 500

/** Bracketed-paste markers wrap pasted text; they carry no keystroke. */
const PASTE_MARKERS = new Set(['\x1b[200~', '\x1b[201~'])

/** One escape sequence at the start of the string (CSI, SS3, or ESC + char). */
// eslint-disable-next-line no-control-regex -- matching ESC is the point
const ESCAPE_SEQUENCE = /^\x1b(?:\[[0-9;?]*[ -/]*[@-~]|O[\s\S]|[\s\S])/

const PASSWORD_PROMPT = /(?:password|passphrase|passcode|pin)[^\n]*:\s*$/i

const length = (s: string) => Array.from(s).length

export class CommandHistory {
  private entries: string[] = []
  private line = ''
  /** The line was changed in a way we can't mirror (cursor move, Tab, …). */
  private dirty = false
  /** Typing into a password prompt — keystrokes are not commands. */
  private secret = false
  /** Index into `entries` while browsing, or null when on the live line. */
  private cursor: number | null = null
  /** What was typed before the first Up, restored by Down past the newest. */
  private draft = ''

  /** Mirror what the user typed (keystrokes or a paste, exactly as sent). */
  record(data: string): void {
    let rest = data
    while (rest) {
      if (rest[0] === '\x1b') {
        const seq = ESCAPE_SEQUENCE.exec(rest)?.[0] ?? rest[0]
        if (!PASTE_MARKERS.has(seq)) this.dirty = true
        rest = rest.slice(seq.length)
        continue
      }
      const char = String.fromCodePoint(rest.codePointAt(0)!)
      rest = rest.slice(char.length)
      this.recordChar(char)
    }
  }

  private recordChar(char: string): void {
    switch (char) {
      case '\r':
      case '\n':
        this.submit()
        return
      case '\x7f':
      case '\b':
        this.line = Array.from(this.line).slice(0, -1).join('')
        return
      case '\x03': // Ctrl+C
      case '\x15': // Ctrl+U
        this.reset()
        return
      case '\x17': // Ctrl+W — delete the last word
        this.line = this.line.replace(/\S*\s*$/, '')
        return
      case '\t':
        this.dirty = true
        return
      default:
        if (char >= ' ') this.line += char
    }
  }

  private submit(): void {
    const command = this.line.trim()
    if (command && !this.dirty && !this.secret && this.entries.at(-1) !== command) {
      this.entries.push(command)
      if (this.entries.length > MAX_ENTRIES) this.entries.shift()
    }
    this.reset()
  }

  private reset(): void {
    this.line = ''
    this.dirty = false
    this.secret = false
    this.cursor = null
    this.draft = ''
  }

  /** Forget the line being typed, e.g. when a full-screen program takes over. */
  abandonLine(): void {
    this.reset()
  }

  /** Feed the unit's output so a password prompt can be recognised. */
  observeOutput(output: string): void {
    this.secret = PASSWORD_PROMPT.test(output.slice(-120))
  }

  /**
   * Bytes that replace the current line with the previous / next command, or
   * null when the key should go to the unit's own shell instead.
   */
  navigate(direction: 'up' | 'down'): string | null {
    if (this.dirty || this.secret) return null

    let next: number | null
    if (direction === 'up') {
      if (this.entries.length === 0) return null
      if (this.cursor === null) this.draft = this.line
      next = this.cursor === null ? this.entries.length - 1 : Math.max(0, this.cursor - 1)
    } else {
      if (this.cursor === null) return null
      next = this.cursor + 1 >= this.entries.length ? null : this.cursor + 1
    }

    const replacement = next === null ? this.draft : this.entries[next]
    const erase = '\x7f'.repeat(length(this.line))
    this.cursor = next
    this.line = replacement
    return erase + replacement
  }
}
