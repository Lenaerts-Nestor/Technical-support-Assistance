/** How many past commands are kept per unit. */
export const HISTORY_LIMIT = 200

const ESC = '\x1b'
/** Erase from the cursor to the end of the line. */
const ERASE_TO_END = `${ESC}[K`
/** The unit's prompt: its name and ">" at the start of a line, such as `DM-NAX-8ZSA>`. */
const PROMPT = /^[A-Za-z0-9][A-Za-z0-9._-]{1,63}> ?$/
const ANSI = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, 'g')

/* -- Reading keystrokes ---------------------------------------------------- */

type Key =
  | { kind: 'char'; ch: string }
  | { kind: 'raw'; data: string }
  | { kind: 'enter' | 'backspace' | 'delete' | 'left' | 'right' | 'home' | 'end' | 'up' | 'down' | 'tab' | 'cancel' | 'killEnd' | 'killLine' | 'killWord' }

const CONTROL: Record<string, Key['kind']> = {
  '\x7f': 'backspace',
  '\b': 'backspace',
  '\t': 'tab',
  '\x01': 'home',
  '\x02': 'left',
  '\x05': 'end',
  '\x06': 'right',
  '\x0b': 'killEnd',
  '\x15': 'killLine',
  '\x17': 'killWord',
  '\x03': 'cancel',
}

/** What the final letter of an arrow-key sequence means (`ESC [ A`, `ESC O A`). */
const FINAL: Record<string, Key['kind']> = { A: 'up', B: 'down', C: 'right', D: 'left', H: 'home', F: 'end' }
/** `ESC [ <number> ~`: Home, Delete, End. */
const TILDE: Record<string, Key['kind']> = { '1': 'home', '7': 'home', '3': 'delete', '4': 'end', '8': 'end' }

/** The terminal reports keys as text: letters as they are, the rest as control characters and escape sequences. */
function tokenize(data: string): Key[] {
  const keys: Key[] = []
  const chars = [...data]
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (ch === ESC) {
      const next = chars[i + 1]
      if (next === '[') {
        let j = i + 2
        while (j < chars.length && !/[@-~]/.test(chars[j])) j++ // parameters, up to the final letter
        const params = chars.slice(i + 2, j).join('')
        const final = chars[j]
        const kind = final === '~' ? TILDE[params.split(';')[0]] : final ? FINAL[final] : undefined
        if (kind) keys.push({ kind } as Key)
        i = j
      } else if (next === 'O') {
        const kind = FINAL[chars[i + 2]]
        if (kind) keys.push({ kind } as Key)
        i += 2
      } // a lone Escape does nothing
      continue
    }
    if (ch === '\r') {
      if (chars[i + 1] === '\n') i++
      keys.push({ kind: 'enter' })
    } else if (ch === '\n') {
      keys.push({ kind: 'enter' })
    } else if (CONTROL[ch]) {
      keys.push({ kind: CONTROL[ch] } as Key)
    } else if (ch < ' ') {
      keys.push({ kind: 'raw', data: ch }) // Ctrl+D, Ctrl+L, … go to the unit as they are
    } else {
      keys.push({ kind: 'char', ch })
    }
  }
  return keys
}

/** Keys after an Enter, for the unit to take as they are: it is busy with the line just sent. */
function toRaw(keys: Key[]): string {
  return keys
    .map((key) => (key.kind === 'char' ? key.ch : key.kind === 'raw' ? key.data : key.kind === 'enter' ? '\r' : key.kind === 'tab' ? '\t' : key.kind === 'backspace' ? '\x7f' : ''))
    .join('')
}

/* -- The line being typed ---------------------------------------------------- */

/** What to do after a keystroke: draw `write` on the screen, give `send` to the unit. */
export type LineResult = {
  send: string
  write: string
  /** The commands Tab could not choose between. */
  hint: string[] | null
  /** Set when a line was sent: what the unit is about to echo back, which is already on the screen. */
  echo?: string
}

/**
 * The command line, edited here the way Crestron Toolbox does: while the unit waits at its prompt the
 * keys edit a line kept in this object, the screen is redrawn from it, and the whole line goes to the
 * unit only at Enter. Up/Down bring back past commands, Tab finishes a command name, and the arrow
 * keys, Home, End, Delete and Ctrl+A/E/U/K/W edit in place. Nothing depends on how the unit echoes an
 * erase. When the unit is not at a prompt, keys go straight through.
 */
export class LocalLine {
  private text = ''
  private cursor = 0
  /** Where Up/Down is in the history, or `null` when not browsing. */
  private browsing: number | null = null
  /** What was typed before browsing began, for coming back to it with Down. */
  private draft = ''
  private readonly history: string[]
  private readonly commands: () => readonly string[]

  /** `history` is kept by the caller (oldest first) so it outlives the terminal; `commands` are the names Tab completes. */
  constructor(history: string[], commands: () => readonly string[] = () => []) {
    this.history = history
    this.commands = commands
  }

  /** Whether a line has been started and not sent. */
  get hasText(): boolean {
    return this.text.length > 0
  }

  /** Screen codes that draw the prompt and the line, with the cursor where it belongs. */
  draw(prompt: string): string {
    const back = this.text.length - this.cursor
    return `\r${prompt}${this.text}${ERASE_TO_END}${back > 0 ? `${ESC}[${back}D` : ''}`
  }

  /** Take what the terminal reported for a key press (or a paste) while the unit shows `prompt` ('' when it is not at one). */
  input(data: string, prompt: string): LineResult {
    if (!prompt) return { send: data, write: '', hint: null }
    const keys = tokenize(data)
    let hint: string[] | null = null
    let changed = false
    for (const [index, key] of keys.entries()) {
      switch (key.kind) {
        case 'enter': {
          const line = this.text
          const write = `\r${prompt}${line}${ERASE_TO_END}\r\n`
          this.remember(line)
          this.reset()
          return { send: `${line}\r${toRaw(keys.slice(index + 1))}`, write, hint: null, echo: line }
        }
        case 'char':
          this.text = this.text.slice(0, this.cursor) + key.ch + this.text.slice(this.cursor)
          this.cursor += key.ch.length
          this.browsing = null
          break
        case 'raw':
          return { send: key.data + toRaw(keys.slice(index + 1)), write: '', hint: null }
        case 'backspace':
          if (this.cursor > 0) {
            this.text = this.text.slice(0, this.cursor - 1) + this.text.slice(this.cursor)
            this.cursor -= 1
          }
          this.browsing = null
          break
        case 'delete':
          this.text = this.text.slice(0, this.cursor) + this.text.slice(this.cursor + 1)
          this.browsing = null
          break
        case 'left':
          this.cursor = Math.max(0, this.cursor - 1)
          break
        case 'right':
          this.cursor = Math.min(this.text.length, this.cursor + 1)
          break
        case 'home':
          this.cursor = 0
          break
        case 'end':
          this.cursor = this.text.length
          break
        case 'killEnd':
          this.text = this.text.slice(0, this.cursor)
          this.browsing = null
          break
        case 'killLine':
        case 'cancel':
          this.reset()
          break
        case 'killWord': {
          const head = this.text.slice(0, this.cursor).replace(/\S+\s*$/, '')
          this.text = head + this.text.slice(this.cursor)
          this.cursor = head.length
          this.browsing = null
          break
        }
        case 'up':
          this.previous()
          break
        case 'down':
          this.next()
          break
        case 'tab':
          hint = this.complete() ?? hint
          break
      }
      changed = true
    }
    return { send: '', write: changed ? this.draw(prompt) : '', hint }
  }

  private previous() {
    if (this.history.length === 0) return
    if (this.browsing === null) {
      this.draft = this.text
      this.browsing = this.history.length - 1
    } else if (this.browsing > 0) {
      this.browsing -= 1
    }
    this.setText(this.history[this.browsing])
  }

  private next() {
    if (this.browsing === null) return
    if (this.browsing < this.history.length - 1) {
      this.browsing += 1
      this.setText(this.history[this.browsing])
    } else {
      this.browsing = null
      this.setText(this.draft)
    }
  }

  /**
   * Tab on a command name (only at the end of a first word): finish it with a space when it is the only
   * match, or add the start the matches share. Returns the matches when there are several.
   */
  private complete(): string[] | null {
    if (this.cursor !== this.text.length || this.text === '' || /\s/.test(this.text)) return null
    const typed = this.text.toLowerCase()
    const matches = this.commands().filter((c) => c.toLowerCase().startsWith(typed))
    if (matches.length === 0) return null
    if (matches.length === 1) {
      this.setText(`${matches[0]} `)
      return null
    }
    let common = matches[0].length
    for (const m of matches) {
      let i = 0
      while (i < common && i < m.length && m[i].toLowerCase() === matches[0][i].toLowerCase()) i++
      common = i
    }
    if (common > this.text.length) this.setText(matches[0].slice(0, common))
    this.browsing = null
    return matches
  }

  private setText(text: string) {
    this.text = text
    this.cursor = text.length
  }

  private remember(line: string) {
    const command = line.trim()
    if (!command || this.history.at(-1) === command) return
    this.history.push(command)
    if (this.history.length > HISTORY_LIMIT) this.history.splice(0, this.history.length - HISTORY_LIMIT)
  }

  private reset() {
    this.text = ''
    this.cursor = 0
    this.browsing = null
    this.draft = ''
  }
}

/* -- What the unit prints ---------------------------------------------------- */

/**
 * Follows the unit's output: where its prompt is (so the line can be edited here only while it waits at
 * one), and takes out the unit's echo of a line this terminal already drew, so nothing shows twice. If
 * the unit does not echo, there is nothing to take out.
 */
export class ConsoleScreen {
  /** The text of the current line of output: the prompt, once the unit has printed it. */
  private tail = ''
  /** The echo still to be removed: the line's text, then its line break. */
  private echo: { text: string; stage: 'text' | 'cr' | 'lf' } | null = null

  /** A line was just sent: its echo is on the screen already. */
  expectEcho(text: string) {
    this.echo = { text, stage: 'text' }
  }

  /** The unit's prompt (`DM-NAX-8ZSA>`) when it is waiting at one, otherwise an empty string. */
  prompt(): string {
    return PROMPT.test(this.tail) ? this.tail : ''
  }

  /** Take the unit's output; returns what to show. */
  filter(chunk: string): string {
    let shown = ''
    for (const ch of chunk) {
      if (this.echo && this.swallows(ch)) continue
      shown += ch
      if (ch === '\n' || ch === '\r') this.tail = ''
      else this.tail += ch
    }
    this.tail = this.tail.replace(ANSI, '')
    return shown
  }

  /** Whether `ch` is the unit's echo of the line just sent (and so is not shown). */
  private swallows(ch: string): boolean {
    const echo = this.echo!
    if (echo.stage === 'text') {
      if (echo.text && ch === echo.text[0]) {
        echo.text = echo.text.slice(1)
        return true
      }
      if (echo.text) {
        this.echo = null // not the echo after all
        return false
      }
      echo.stage = 'cr'
    }
    if (echo.stage === 'cr' && ch === '\r') {
      echo.stage = 'lf'
      return true
    }
    if ((echo.stage === 'cr' || echo.stage === 'lf') && ch === '\n') {
      this.echo = null
      return true
    }
    this.echo = null
    return false
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
