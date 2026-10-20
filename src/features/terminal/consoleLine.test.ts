import { describe, expect, it } from 'vitest'
import { ConsoleScreen, HISTORY_LIMIT, LocalLine, historyFor } from './consoleLine'

const PROMPT = 'DM-NVX-384C>'
const UP = '\x1b[A'
const DOWN = '\x1b[B'
const LEFT = '\x1b[D'
const RIGHT = '\x1b[C'

/** A line editor that has been typed into; `type` returns what it asked the screen to draw. */
function editor(history: string[] = [], commands: string[] = []) {
  const line = new LocalLine(history, () => commands)
  return {
    line,
    type: (data: string) => line.input(data, PROMPT),
  }
}

describe('LocalLine', () => {
  it('shows typing from the line it keeps and sends nothing until Enter', () => {
    const { type } = editor()
    const r = type('ver')
    expect(r.send).toBe('')
    expect(r.write).toBe(`\r${PROMPT}ver\x1b[K`)
  })

  it('sends the whole line at Enter, and draws it once itself', () => {
    const { type } = editor()
    type('ver -v')
    const r = type('\r')
    expect(r.send).toBe('ver -v\r')
    expect(r.echo).toBe('ver -v')
    expect(r.write).toBe(`\r${PROMPT}ver -v\x1b[K\r\n`)
  })

  it('recalls the last command with Up and redraws the whole line, never relying on the unit to erase', () => {
    const { type } = editor(['ver -vll', 'ver -v'])
    expect(type(UP).write).toBe(`\r${PROMPT}ver -v\x1b[K`)
    expect(type(UP).write).toBe(`\r${PROMPT}ver -vll\x1b[K`)
    // a shorter line replaces a longer one: the rest is erased by the redraw
    expect(type(DOWN).write).toBe(`\r${PROMPT}ver -v\x1b[K`)
    expect(type(DOWN).write).toBe(`\r${PROMPT}\x1b[K`)
    expect(type(UP).send).toBe('')
  })

  it('keeps what was typed when browsing starts, and gives it back with Down', () => {
    const { type } = editor(['reboot'])
    type('he')
    expect(type(UP).write).toContain('reboot')
    expect(type(DOWN).write).toBe(`\r${PROMPT}he\x1b[K`)
  })

  it('does not stack the same command twice in a row, and ignores empty lines', () => {
    const history: string[] = []
    const { type } = editor(history)
    type('ver\r')
    type('ver\r')
    type('\r')
    type('   \r')
    expect(history).toEqual(['ver'])
  })

  it('keeps only the most recent commands', () => {
    const history: string[] = []
    const { type } = editor(history)
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) type(`cmd${i}\r`)
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history.at(-1)).toBe(`cmd${HISTORY_LIMIT + 4}`)
  })

  it('edits in the middle of the line and puts the cursor back where it was', () => {
    const { type } = editor()
    type('verr')
    type(LEFT)
    const r = type('\x7f') // Backspace deletes the "r" before the cursor
    expect(r.write).toBe(`\r${PROMPT}ver\x1b[K\x1b[1D`)
    type(RIGHT)
    expect(type('\r').send).toBe('ver\r')
  })

  it('supports Home, End, Delete and the Ctrl shortcuts', () => {
    const { type } = editor()
    type('one two')
    type('\x1b[H')
    type('\x1b[3~') // Delete the "o"
    expect(type('\x1b[F').write).toBe(`\r${PROMPT}ne two\x1b[K`)
    type('\x17') // Ctrl+W removes "two"
    expect(type('\x15').write).toBe(`\r${PROMPT}\x1b[K`) // Ctrl+U
  })

  it('sends Enter with whatever follows it in the same burst', () => {
    const { type } = editor()
    type('a')
    const r = type('\rb')
    expect(r.send).toBe('a\rb')
  })

  it('passes a paste containing several lines through the first Enter', () => {
    const { type } = editor()
    expect(type('x\ry\r').send).toBe('x\ry\r')
  })

  it('passes keys straight through when the unit is not at a prompt', () => {
    const line = new LocalLine([])
    expect(line.input(UP, '')).toEqual({ send: UP, write: '', hint: null })
    expect(line.input('abc', '').send).toBe('abc')
  })

  it('sends Ctrl+D and other control keys to the unit as they are', () => {
    const { type } = editor()
    expect(type('\x04').send).toBe('\x04')
  })

  describe('Tab', () => {
    const commands = ['reboot', 'restore', 'ver', 'version']

    it('finishes a command when only one matches', () => {
      const { type } = editor([], commands)
      type('reb')
      expect(type('\t').write).toBe(`\r${PROMPT}reboot \x1b[K`)
    })

    it('adds what the matches share and lists them when there are several', () => {
      const { type } = editor([], commands)
      type('re')
      const r = type('\t')
      expect(r.hint).toEqual(['reboot', 'restore'])
      expect(r.write).toBe(`\r${PROMPT}re\x1b[K`)
      type('s')
      expect(type('\t').write).toBe(`\r${PROMPT}restore \x1b[K`)
    })

    it('does nothing after the first word', () => {
      const { type } = editor([], commands)
      type('ver -v re')
      expect(type('\t').write).toBe(`\r${PROMPT}ver -v re\x1b[K`)
    })
  })

  it('knows whether a line is in progress', () => {
    const { line, type } = editor()
    expect(line.hasText).toBe(false)
    type('x')
    expect(line.hasText).toBe(true)
    type('\x03')
    expect(line.hasText).toBe(false)
  })

  it('redraws the line with the prompt and the cursor in place', () => {
    const { line, type } = editor()
    type('abc')
    type(LEFT)
    expect(line.draw('X>')).toBe('\rX>abc\x1b[K\x1b[1D')
  })
})

describe('ConsoleScreen', () => {
  it('sees the prompt once the unit has printed it, and not while it is working', () => {
    const screen = new ConsoleScreen()
    expect(screen.prompt()).toBe('')
    screen.filter('\r\nDM-NVX-384C>')
    expect(screen.prompt()).toBe('DM-NVX-384C>')
    screen.filter('ver\r\n')
    expect(screen.prompt()).toBe('')
  })

  it('does not take ordinary output for a prompt', () => {
    const screen = new ConsoleScreen()
    screen.filter('Firmware version 1.2.3 > ok then more words')
    expect(screen.prompt()).toBe('')
  })

  it('takes the unit’s echo of a line already drawn out of the output', () => {
    const screen = new ConsoleScreen()
    screen.filter('DM-NVX-384C>')
    screen.expectEcho('ver -v')
    expect(screen.filter('ver -v\r\nDM-NVX-384C Version 1\r\nDM-NVX-384C>')).toBe('DM-NVX-384C Version 1\r\nDM-NVX-384C>')
    expect(screen.prompt()).toBe('DM-NVX-384C>')
  })

  it('copes with the echo arriving in pieces', () => {
    const screen = new ConsoleScreen()
    screen.expectEcho('ver')
    expect([screen.filter('v'), screen.filter('er'), screen.filter('\r'), screen.filter('\nout')].join('')).toBe('out')
  })

  it('shows everything when the unit does not echo', () => {
    const screen = new ConsoleScreen()
    screen.expectEcho('ver')
    expect(screen.filter('Version 1\r\n')).toBe('Version 1\r\n')
  })

  it('handles an empty line, which the unit echoes as a bare line break', () => {
    const screen = new ConsoleScreen()
    screen.expectEcho('')
    expect(screen.filter('\r\nDM-NVX-384C>')).toBe('DM-NVX-384C>')
  })

  it('ignores colour codes when finding the prompt', () => {
    const screen = new ConsoleScreen()
    screen.filter('\x1b[32mDM-NVX-384C>\x1b[0m')
    expect(screen.prompt()).toBe('DM-NVX-384C>')
  })
})

describe('historyFor', () => {
  it('keeps one list per unit', () => {
    historyFor('10.0.0.1').push('a')
    expect(historyFor('10.0.0.1')).toEqual(['a'])
    expect(historyFor('10.0.0.2')).toEqual([])
  })
})
