import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { CARD, DANGER_BTN, GHOST_BTN, GHOST_BTN_MD, ICON_BTN } from '../../../shared/ui/styles'
import { ConsoleScreen, LocalLine, historyFor } from '../consoleLine'
import type { TerminalEntry } from '../types'

/** Matches the app: a touch darker than the page, bright text, the amber accent for the cursor. */
const THEME = {
  background: '#121214',
  foreground: '#f2f2f4',
  cursor: '#e0952f',
  cursorAccent: '#121214',
  selectionBackground: '#6b5327',
}

type Status = 'connecting' | 'connected' | 'closed' | 'failed'
type Info = { hostname?: string; firmware?: string; puf?: string }

const STATUS: Record<Status, { dot: string; label: string }> = {
  connecting: { dot: 'bg-sky-400 animate-pulse', label: 'Connecting…' },
  connected: { dot: 'bg-emerald-400', label: 'Connected' },
  closed: { dot: 'bg-ink-faint', label: 'Disconnected' },
  failed: { dot: 'bg-rose-400', label: 'Could not connect' },
}

function Detail({ label, value, wait }: { label: string; value: string | undefined; wait: boolean }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink min-w-0 font-mono font-medium break-all">{value ?? <span className="text-ink-faint">{wait ? 'reading…' : '—'}</span>}</dd>
    </>
  )
}

type TerminalCardProps = {
  entry: TerminalEntry
  onClose: () => void
}

/**
 * One SSH terminal to one unit, with a small card above it: host name, firmware and PUF (read from the
 * unit with `hostname` and `ver -v`), and a Web button that opens the unit's web interface.
 * The connection lives as long as the card does; closing the card closes the session.
 */
export function TerminalCard({ entry, onClose }: TerminalCardProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('connecting')
  const [info, setInfo] = useState<Info | null>(null)
  const [problem, setProblem] = useState<{ text: string; keyChanged: boolean } | null>(null)
  /** The commands Tab could not choose between, shown until the next key. */
  const [hint, setHint] = useState<string[] | null>(null)
  /** Bumped to connect again: the effect below runs afresh with a clean terminal. */
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const bridge = window.desktop?.terminal
    const host = hostRef.current
    if (!bridge || !host) return
    const id = crypto.randomUUID()
    let disposed = false
    let connected = false
    /** The unit's command names, for Tab. They arrive a moment after the terminal opens. */
    let commands: string[] = []
    const screen = new ConsoleScreen()
    const local = new LocalLine(historyFor(entry.ip), () => commands)
    const decoder = new TextDecoder()

    const term = new Terminal({
      theme: THEME,
      fontFamily: '"Cascadia Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      scrollback: 5000,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    // A hidden page has no size; fitting then would collapse the terminal.
    const refit = () => {
      if (host.clientWidth > 0 && host.clientHeight > 0) fit.fit()
    }
    refit()
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true
      // Ctrl+C copies when text is selected, and is the usual interrupt otherwise.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && term.hasSelection()) {
        void navigator.clipboard.writeText(term.getSelection())
        return false
      }
      return true
    })
    const observer = new ResizeObserver(refit)
    observer.observe(host)

    const stopListening = bridge.onEvent((message) => {
      if (message.id !== id) return
      if (message.type === 'data') {
        // The unit's echo of a line drawn here is dropped; a line being typed is redrawn after any output.
        term.write(screen.filter(decoder.decode(message.data, { stream: true })))
        const prompt = screen.prompt()
        if (local.hasText && prompt) term.write(local.draw(prompt))
      }
      else if (message.type === 'info') setInfo({ hostname: message.hostname, firmware: message.firmware, puf: message.puf })
      else if (message.type === 'commands') commands = message.commands
      else {
        setStatus('closed')
        setProblem({ text: message.reason, keyChanged: false })
      }
    })
    const typing = term.onData((data) => {
      if (!connected) {
        setHint(null)
        bridge.write(id, data)
        return
      }
      const result = local.input(data, screen.prompt())
      if (result.write) term.write(result.write)
      if (result.echo !== undefined) screen.expectEcho(result.echo)
      if (result.send) bridge.write(id, result.send)
      setHint(result.hint)
    })
    const resizing = term.onResize(({ cols, rows }) => bridge.resize(id, cols, rows))

    void bridge.open({ id, ip: entry.ip, username: entry.username, password: entry.password, cols: term.cols, rows: term.rows }).then((result) => {
      if (disposed) {
        if (result.ok) void bridge.close(result.id)
        return
      }
      if (result.ok) {
        connected = true
        setStatus('connected')
        term.focus()
      } else {
        setStatus('failed')
        setProblem({ text: result.error, keyChanged: result.hostKeyChanged === true })
      }
    })

    return () => {
      disposed = true
      observer.disconnect()
      stopListening()
      typing.dispose()
      resizing.dispose()
      void bridge.close(id)
      term.dispose()
    }
  }, [entry, attempt])

  const reconnect = () => {
    setStatus('connecting')
    setInfo(null)
    setProblem(null)
    setAttempt((n) => n + 1)
  }
  const trustNewKey = async () => {
    await window.desktop?.terminal.forgetHost(entry.ip)
    reconnect()
  }

  const { dot, label } = STATUS[status]
  const down = status === 'closed' || status === 'failed'

  return (
    <article className={`${CARD} flex min-w-0 flex-col`}>
      <header className="border-line-soft flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={`${dot} h-2.5 w-2.5 shrink-0 rounded-full`} role="img" aria-label={label} title={label} />
            <h3 className="text-ink truncate text-base font-semibold">{entry.label || entry.ip}</h3>
            <span className="text-ink-muted font-mono text-xs">{entry.ip}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <Detail label="Host name" value={info?.hostname} wait={status === 'connected' && info === null} />
            <Detail label="Firmware" value={info?.firmware} wait={status === 'connected' && info === null} />
            <Detail label="PUF" value={info?.puf} wait={status === 'connected' && info === null} />
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a href={`https://${entry.ip}/`} target="_blank" rel="noreferrer" className={GHOST_BTN} title={`Open https://${entry.ip}/ in your browser`}>
            Web
          </a>
          <button type="button" className={ICON_BTN} aria-label={`Close the terminal for ${entry.label || entry.ip}`} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </header>
      <div className="relative rounded-b-xl bg-[#121214] p-2">
        <div ref={hostRef} className="h-[26rem]" aria-label={`Terminal for ${entry.label || entry.ip}`} />
        {hint && (
          <p className="bg-subtle/95 text-ink absolute inset-x-3 bottom-3 rounded-md px-3 py-1.5 font-mono text-xs" role="status">
            {hint.slice(0, 14).join('   ')}
            {hint.length > 14 && `   … +${hint.length - 14}`}
          </p>
        )}
        {down && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-b-xl bg-black/75 p-6 text-center" role="alert">
            <p className="text-ink max-w-sm text-sm">{problem?.text ?? 'The terminal is not connected.'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {problem?.keyChanged ? (
                <button type="button" className={DANGER_BTN} onClick={() => void trustNewKey()}>
                  Trust the new key and connect
                </button>
              ) : (
                <button type="button" className={GHOST_BTN_MD} onClick={reconnect}>
                  Connect again
                </button>
              )}
              <button type="button" className={GHOST_BTN_MD} onClick={onClose}>
                Close terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
