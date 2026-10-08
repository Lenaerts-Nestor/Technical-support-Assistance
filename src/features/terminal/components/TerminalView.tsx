import { useEffect, useRef, useState } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { CommandHistory } from '../commandHistory'
import { SSH_SOCKET_PATH } from '../unitsApi'
import type { ConnectionState, Session } from '../types'
import { GHOST_BTN } from '../../../shared/ui/styles'

type TerminalViewProps = {
  session: Session
  /** The visible tab: gets keyboard focus and a refit when it comes forward. */
  active: boolean
  onState: (state: ConnectionState) => void
  /** The login was refused: close this tab and ask for the credentials again. */
  onReauth: () => void
}

type ServerMessage =
  | { type: 'status'; state: 'connecting' | 'authenticated' | 'ready' }
  | { type: 'data'; data: string }
  | { type: 'error'; message: string; auth?: boolean }
  | { type: 'closed' }

const THEME = {
  background: '#1a1a1c',
  foreground: '#f2f2f4',
  cursor: '#e0952f',
  cursorAccent: '#1a1a1c',
  selectionBackground: '#6b5327',
}

function socketUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}${SSH_SOCKET_PATH}`
}

/**
 * One SSH terminal. The xterm instance lives as long as the tab; the socket to
 * the local bridge is re-opened by "Reconnect" without losing the scrollback.
 */
export function TerminalView({ session, active, onState, onReauth }: TerminalViewProps) {
  const container = useRef<HTMLDivElement>(null)
  const term = useRef<Terminal | null>(null)
  const fit = useRef<FitAddon | null>(null)
  const socket = useRef<WebSocket | null>(null)
  const history = useRef(new CommandHistory())
  const onStateRef = useRef(onState)
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<{ text: string; auth: boolean } | null>(null)
  // An error already reported must not be downgraded to a plain closed state.
  const failed = useRef(false)

  useEffect(() => {
    onStateRef.current = onState
  })

  const send = (message: object) => {
    const ws = socket.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
  }
  const sendRef = useRef(send)
  useEffect(() => {
    sendRef.current = send
  })

  // The terminal itself: created once per tab.
  useEffect(() => {
    const el = container.current
    if (!el) return
    const t = new Terminal({
      theme: THEME,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
    })
    const fitAddon = new FitAddon()
    t.loadAddon(fitAddon)
    t.open(el)
    term.current = t
    fit.current = fitAddon

    t.onData((data) => {
      // A full-screen program (editor, pager) owns the keyboard; leave it be.
      if (t.buffer.active.type === 'alternate') history.current.abandonLine()
      else history.current.record(data)
      sendRef.current({ type: 'data', data })
    })
    t.onResize(({ cols, rows }) => sendRef.current({ type: 'resize', cols, rows }))
    t.attachCustomKeyEventHandler((e) => {
      const plain = !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey
      if (e.type !== 'keydown' || !plain) return true
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return true
      if (t.buffer.active.type === 'alternate') return true
      const replacement = history.current.navigate(e.key === 'ArrowUp' ? 'up' : 'down')
      if (replacement === null) return true // let the unit's own shell handle it
      e.preventDefault()
      if (replacement) sendRef.current({ type: 'data', data: replacement })
      return false
    })

    // Hidden tabs measure 0×0; only refit when there is room to measure.
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) fitAddon.fit()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      t.dispose()
      term.current = null
      fit.current = null
    }
  }, [])

  // The connection: opened on mount and again on Reconnect.
  useEffect(() => {
    const t = term.current
    if (!t) return
    let disposed = false
    const ws = new WebSocket(socketUrl())
    socket.current = ws
    failed.current = false
    onStateRef.current('connecting')

    ws.onopen = () => {
      if (disposed) return
      const { host, port } = session.unit
      send({
        type: 'connect',
        host,
        port,
        username: session.username,
        password: session.password,
        cols: t.cols,
        rows: t.rows,
      })
    }
    ws.onmessage = (event) => {
      let message: ServerMessage
      try {
        message = JSON.parse(String(event.data))
      } catch {
        return
      }
      if (message.type === 'data') {
        history.current.observeOutput(message.data)
        t.write(message.data)
      } else if (message.type === 'status' && message.state === 'ready') {
        onStateRef.current('ready')
        setNotice(null)
        if (active) t.focus()
      } else if (message.type === 'error') {
        failed.current = true
        setNotice({ text: message.message, auth: !!message.auth })
        onStateRef.current('error')
      } else if (message.type === 'closed') {
        onStateRef.current('closed')
      }
    }
    ws.onclose = () => {
      if (disposed) return
      setNotice((current) => current ?? { text: 'Connection closed.', auth: false })
      if (!failed.current) onStateRef.current('closed')
    }
    ws.onerror = () => {
      if (disposed) return
      failed.current = true
      setNotice({
        text: 'Could not reach the local bridge. Is the app running with npm run dev?',
        auth: false,
      })
      onStateRef.current('error')
    }

    return () => {
      disposed = true
      ws.close()
      if (socket.current === ws) socket.current = null
    }
    // `session` is fixed for the life of a tab; `attempt` is the Reconnect trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  // Coming to the front: size to the now-visible area and take the keyboard.
  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => {
      fit.current?.fit()
      term.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [active])

  const reconnect = () => {
    term.current?.write('\r\n\x1b[2m— reconnecting —\x1b[0m\r\n')
    history.current.abandonLine()
    setNotice(null)
    setAttempt((n) => n + 1)
  }

  return (
    <div className="relative h-full min-h-0">
      <div ref={container} className="h-full w-full px-3 py-2" />
      {notice && (
        <div className="border-line bg-surface absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs shadow-lg">
          <span className="text-rose-300">{notice.text}</span>
          <button type="button" onClick={notice.auth ? onReauth : reconnect} className={GHOST_BTN}>
            {notice.auth ? 'Enter credentials again' : 'Reconnect'}
          </button>
        </div>
      )}
    </div>
  )
}
