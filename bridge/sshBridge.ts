/**
 * Local SSH bridge, mounted on the Vite dev / preview server.
 *
 * A browser cannot open an SSH connection, so the Terminal page talks to this
 * process over a WebSocket and this process talks SSH to the unit. It runs on
 * the technician's own laptop, so the unit's address, username and password
 * never leave that machine — and nothing here ever writes a credential to disk:
 * they arrive in the first WebSocket message and live only as long as the
 * session.
 *
 *   GET / PUT  /tsa-bridge/units   the saved unit cards (name + address only)
 *   WS         /tsa-bridge/ssh     one SSH shell per connection
 *
 * Because it can reach every machine on the laptop's network, it is locked
 * down: loopback clients only, and browser requests must come from the page the
 * server itself is serving (same Origin and Host).
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { Client } from 'ssh2'
import type { ClientChannel } from 'ssh2'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

const BASE = '/tsa-bridge'
const UNITS_PATH = `${BASE}/units`
const SSH_PATH = `${BASE}/ssh`
const DATA_DIR = '.tsa-data'
const UNITS_FILE = 'units.json'
const MAX_BODY_BYTES = 1_000_000
const CONNECT_TIMEOUT_MS = 15_000

/** What a unit card persists. Credentials are deliberately not part of it. */
type StoredUnit = { id: string; name: string; host: string; port: number; model: string }

type ConnectMessage = {
  type: 'connect'
  host: string
  port: number
  username: string
  password: string
  cols: number
  rows: number
}

/* -- Request guards -------------------------------------------------------- */

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/** Loopback client, and any browser Origin matches the host it was served from. */
function isTrusted(req: IncomingMessage): boolean {
  if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return false
  const origin = req.headers.origin
  if (!origin) return true // not a browser (curl, tests) — loopback is enough
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/* -- Saved units ----------------------------------------------------------- */

function unitsFile(root: string): string {
  return path.join(root, DATA_DIR, UNITS_FILE)
}

const toPort = (value: unknown): number => {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : 22
}

/** Keep only the known, well-typed fields — a stray `password` is dropped here. */
function reviveUnits(raw: unknown): StoredUnit[] {
  const list = Array.isArray(raw) ? raw : (raw as { units?: unknown } | null)?.units
  if (!Array.isArray(list)) return []
  return list.flatMap((item): StoredUnit[] => {
    const u = item as Partial<Record<keyof StoredUnit, unknown>> | null
    if (!u || typeof u.id !== 'string' || typeof u.name !== 'string' || typeof u.host !== 'string') {
      return []
    }
    return [
      {
        id: u.id,
        name: u.name,
        host: u.host,
        port: toPort(u.port),
        model: typeof u.model === 'string' ? u.model : '',
      },
    ]
  })
}

async function readUnits(root: string): Promise<StoredUnit[]> {
  try {
    return reviveUnits(JSON.parse(await readFile(unitsFile(root), 'utf8')))
  } catch {
    return [] // no file yet, or unreadable — start empty rather than fail
  }
}

async function writeUnits(root: string, units: StoredUnit[]): Promise<void> {
  const file = unitsFile(root)
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify({ units }, null, 2), 'utf8')
  await rename(tmp, file) // atomic: a crash mid-write can't corrupt the list
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function handleUnits(root: string, req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method === 'GET') return sendJson(res, 200, { units: await readUnits(root) })
    if (req.method === 'PUT') {
      const units = reviveUnits(JSON.parse(await readBody(req)))
      await writeUnits(root, units)
      return sendJson(res, 200, { units })
    }
    return sendJson(res, 405, { error: 'Method not allowed' })
  } catch (err) {
    return sendJson(res, 400, { error: err instanceof Error ? err.message : 'Bad request' })
  }
}

/* -- SSH sessions ---------------------------------------------------------- */

function parseConnect(raw: unknown): ConnectMessage | null {
  const m = raw as Partial<Record<keyof ConnectMessage, unknown>> | null
  if (!m || m.type !== 'connect') return null
  if (typeof m.host !== 'string' || !m.host.trim()) return null
  if (typeof m.username !== 'string' || !m.username) return null
  const size = (v: unknown, fallback: number) =>
    Number.isInteger(v) && (v as number) > 0 && (v as number) < 1000 ? (v as number) : fallback
  return {
    type: 'connect',
    host: m.host.trim(),
    port: toPort(m.port),
    username: m.username,
    password: typeof m.password === 'string' ? m.password : '',
    cols: size(m.cols, 80),
    rows: size(m.rows, 24),
  }
}

function send(ws: WebSocket, message: object): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message))
}

/** One WebSocket ⇄ one SSH shell. Everything is torn down when either side ends. */
function runSession(ws: WebSocket): void {
  const ssh = new Client()
  let shell: ClientChannel | null = null
  let started = false

  const close = () => {
    ssh.end()
    if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) ws.close()
  }

  ssh.on('ready', () => {
    send(ws, { type: 'status', state: 'authenticated' })
  })

  ssh.on('error', (err: Error & { level?: string }) => {
    // ssh2 words auth failures tersely; say what the technician needs to hear.
    const auth = err.level === 'client-authentication'
    const message = auth ? 'Authentication failed — check the username and password.' : err.message
    send(ws, { type: 'error', message, auth })
    close()
  })

  ssh.on('close', () => {
    send(ws, { type: 'closed' })
    close()
  })

  ws.on('message', (data, isBinary) => {
    if (isBinary) return
    let msg: { type?: string; data?: unknown; cols?: unknown; rows?: unknown }
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    if (!started) {
      const connect = parseConnect(msg)
      if (!connect) {
        send(ws, { type: 'error', message: 'Invalid connection request.' })
        return close()
      }
      started = true
      send(ws, { type: 'status', state: 'connecting' })

      ssh.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
        finish(prompts.map(() => connect.password))
      })
      ssh.on('ready', () => {
        ssh.shell(
          { term: 'xterm-256color', cols: connect.cols, rows: connect.rows },
          (err, stream) => {
            if (err) {
              send(ws, { type: 'error', message: err.message })
              return close()
            }
            shell = stream
            const decoder = new StringDecoder('utf8')
            stream.on('data', (chunk: Buffer) => {
              send(ws, { type: 'data', data: decoder.write(chunk) })
            })
            stream.on('close', close)
            send(ws, { type: 'status', state: 'ready' })
          },
        )
      })
      ssh.connect({
        host: connect.host,
        port: connect.port,
        username: connect.username,
        password: connect.password,
        tryKeyboard: true,
        readyTimeout: CONNECT_TIMEOUT_MS,
        keepaliveInterval: 15_000,
      })
      return
    }

    if (msg.type === 'data' && typeof msg.data === 'string') {
      shell?.write(msg.data)
    } else if (msg.type === 'resize') {
      const cols = Number(msg.cols)
      const rows = Number(msg.rows)
      if (cols > 0 && rows > 0) shell?.setWindow(rows, cols, 0, 0)
    }
  })

  ws.on('close', () => ssh.end())
  ws.on('error', () => ssh.end())
}

/* -- Vite plugin ----------------------------------------------------------- */

function mount(server: ViteDevServer | PreviewServer, root: string) {
  server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith(UNITS_PATH)) return next()
    if (!isTrusted(req)) return sendJson(res, 403, { error: 'Forbidden' })
    void handleUnits(root, req, res)
  })

  if (!server.httpServer) return
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1_000_000 })
  wss.on('connection', runSession)

  server.httpServer.on('upgrade', (req, socket, head) => {
    if (req.url?.split('?')[0] !== SSH_PATH) return // leave Vite's own HMR socket alone
    if (!isTrusted(req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  })
}

export function sshBridge(): Plugin {
  return {
    name: 'tsa-ssh-bridge',
    configureServer(server) {
      mount(server, server.config.root)
    },
    configurePreviewServer(server) {
      mount(server, server.config.root)
    },
  }
}
