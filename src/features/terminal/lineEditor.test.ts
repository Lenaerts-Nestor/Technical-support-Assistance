import { describe, expect, it } from 'vitest'
import { CommandLine, HISTORY_LIMIT, historyFor } from './lineEditor'

/** Type text the way the terminal reports it, then press Enter. */
const run = (line: CommandLine, ...commands: string[]) => commands.forEach((c) => line.track(`${c}\r`))

describe('history with Up and Down', () => {
  it('brings back the previous command, then older ones, and stops at the oldest', () => {
    const line = new CommandLine([])
    run(line, 'help', 'ver -v', 'hostname')
    expect(line.previous()).toBe('hostname')
    expect(line.previous()).toBe('\x7f'.repeat('hostname'.length) + 'ver -v')
    expect(line.previous()).toBe('\x7f'.repeat('ver -v'.length) + 'help')
    expect(line.previous()).toBe('') // already the oldest: nothing to change
  })

  it('wipes what is typed first, and Down returns to it', () => {
    const line = new CommandLine([])
    run(line, 'help', 'ver -v')
    line.track('ho')
    expect(line.previous()).toBe('\x7f\x7fver -v')
    expect(line.next()).toBe('\x7f'.repeat('ver -v'.length) + 'ho')
    expect(line.next()).toBe('') // not browsing any more
  })

  it('walks forward through the history with Down', () => {
    const line = new CommandLine([])
    run(line, 'one', 'two', 'three')
    line.previous()
    line.previous()
    line.previous()
    expect(line.next()).toBe('\x7f'.repeat('one'.length) + 'two')
    expect(line.next()).toBe('\x7f'.repeat('two'.length) + 'three')
    expect(line.next()).toBe('\x7f'.repeat('three'.length)) // back to the empty line that was being typed
  })

  it('has nothing for Up when there is no history, and leaves the key to the unit', () => {
    expect(new CommandLine([]).previous()).toBeNull()
  })

  it('does not record empty lines or an immediate repeat, and keeps the newest first when full', () => {
    const history: string[] = []
    const line = new CommandLine(history)
    run(line, 'help', '', '   ', 'help', 'ver')
    expect(history).toEqual(['help', 'ver'])
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) run(line, `cmd${i}`)
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history.at(-1)).toBe(`cmd${HISTORY_LIMIT + 4}`)
    expect(history[0]).toBe('cmd5')
  })

  it('follows Backspace, so the line it replaces is the line on the screen', () => {
    const line = new CommandLine([])
    run(line, 'help')
    line.track('helx')
    line.track('\x7f')
    line.track('p')
    expect(line.previous()).toBe('\x7f\x7f\x7f\x7f' + 'help')
  })

  it('goes quiet for a line edited with arrow keys or control keys, and wakes up at Enter', () => {
    const line = new CommandLine([])
    run(line, 'help')
    for (const edit of ['\x1b[D', '\x01', '\x1b[H']) {
      line.track('ab')
      line.track(edit)
      expect(line.previous()).toBeNull()
      expect(line.next()).toBeNull()
      expect(line.complete(['abc'])).toBeNull()
      line.track('\r')
    }
    line.track('x')
    expect(line.previous()).toBe('\x7f' + 'help')
  })

  it('does not record a line it lost track of', () => {
    const history: string[] = []
    const line = new CommandLine(history)
    line.track('ab')
    line.track('\x1b[D')
    line.track('c\r')
    expect(history).toEqual([])
  })

  it('Ctrl+C and Ctrl+U clear the line', () => {
    const line = new CommandLine([])
    run(line, 'help')
    line.track('junk')
    line.track('\x03')
    expect(line.previous()).toBe('help')
    line.track('\x15')
    line.track('abc')
    line.track('\x15')
    expect(line.previous()).toBe('help') // nothing is left on the line to wipe
  })

  it('takes pasted text with line breaks as several commands', () => {
    const history: string[] = []
    new CommandLine(history).track('hostname\rver -v\r')
    expect(history).toEqual(['hostname', 'ver -v'])
  })

  it('shares history between terminals of one unit, and keeps units apart', () => {
    expect(historyFor('10.0.0.1')).toBe(historyFor('10.0.0.1'))
    expect(historyFor('10.0.0.1')).not.toBe(historyFor('10.0.0.2'))
  })
})

describe('Tab completion of command names', () => {
  const commands = ['8021XAUthenticate', 'ADDMaster', 'HELP', 'HOSTname', 'VER']

  it('finishes a command that is the only match, with a space', () => {
    const line = new CommandLine([])
    line.track('ADD')
    expect(line.complete(commands)).toEqual({ send: 'Master ', matches: ['ADDMaster'] })
  })

  it('replaces the typed letters when they are not spelled like the command', () => {
    const line = new CommandLine([])
    line.track('hos')
    expect(line.complete(commands)).toEqual({ send: '\x7f\x7f\x7fHOSTname ', matches: ['HOSTname'] })
  })

  it('adds the start that several matches share, and only offers the list when nothing more can be added', () => {
    const none = new CommandLine([])
    none.track('H')
    expect(none.complete(commands)).toEqual({ send: '', matches: ['HELP', 'HOSTname'] })

    const more = new CommandLine([])
    more.track('HE')
    expect(more.complete(['HELPme', 'HELPall', 'HOST'])).toEqual({ send: 'LP', matches: ['HELPme', 'HELPall'] })

    const lower = new CommandLine([])
    lower.track('he')
    expect(lower.complete(['HELPme', 'HELPall'])).toEqual({ send: '\x7f\x7fHELP', matches: ['HELPme', 'HELPall'] })
  })

  it('shows the whole list when what is typed is already a complete command that others extend', () => {
    const line = new CommandLine([])
    line.track('HELP')
    expect(line.complete(['HELP', 'HELPall'])).toEqual({ send: '', matches: ['HELP', 'HELPall'] })
  })

  it('passes Tab to the unit when there is nothing to complete', () => {
    const empty = new CommandLine([])
    expect(empty.complete(commands)).toBeNull() // nothing typed
    const args = new CommandLine([])
    args.track('help al')
    expect(args.complete(commands)).toBeNull() // after the command name
    const unknown = new CommandLine([])
    unknown.track('zzz')
    expect(unknown.complete(commands)).toBeNull()
    expect(new CommandLine([]).complete([])).toBeNull()
  })

  it('keeps Up working after a completion, wiping what the completion typed', () => {
    const line = new CommandLine([])
    run(line, 'ver')
    line.track('ADD')
    line.complete(commands)
    expect(line.previous()).toBe('\x7f'.repeat('ADDMaster '.length) + 'ver')
  })
})
