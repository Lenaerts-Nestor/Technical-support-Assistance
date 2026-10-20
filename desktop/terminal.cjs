// SSH terminals to Crestron devices, run in the app's main process. Each terminal is one SSH shell
// (like Crestron Toolbox's console) that the page draws with xterm.js; keystrokes go straight in
// and the unit's output comes straight out. Nothing is ever held back or hidden on it.
//
// The unit card (host name, firmware, PUF) and the list of console commands (for Tab completion) are
// read on a second, hidden shell on the same connection, which runs `hostname`, `ver -v` and
// `help all` and then closes. A slow unit can therefore never delay what you type.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('ssh2')
const { isPrivateIPv4 } = require('./nvx.cjs')

const SSH_PORT = 22
const MAX_SESSIONS = 12
const MAX_WRITE_BYTES = 64 * 1024
const MAX_COMMANDS = 2000
/** The console prompt at the end of the output: `DM-NAX-8ZSA>` on a line of its own. */
const PROMPT_AT_END = /(?:^|\n)[A-Za-z0-9][A-Za-z0-9._-]{1,63}>[ \t]*$/
/** Colour and cursor codes (ESC [ … letter); built from the character code so the pattern holds no raw control character. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`, 'g')
/** A line of `help all`: the command, then its access level (`8021XAUthenticate    Administrator    Enable/Disable …`). */
const HELP_LINE = /^\s*([A-Za-z0-9][\w-]*)\s{2,}(?:Administrator|Programmer|Operator|User|Connect|Guest)\b/i

const stripAnsi = (text) => text.replace(ANSI, '')

/**
 * What the unit card shows, from the output of `hostname` ("Host Name: Crestron-DM-NAX-8ZSA-2121CRO00284")
 * and `ver -v` (first line "DM-NAX-8ZSA [v3.1.0103.18484 (Aug 20 2025), #91A1011C] …", and a "PUF: 3.1.0103.18484" line).
 * Anything not found is left out.
 */
function parseUnitInfo({ hostnameOutput = '', versionOutput = '' } = {}) {
  const hostname = /Host Name:[ \t]*(\S[^\r\n]*)/i.exec(hostnameOutput)?.[1]?.trim()
  const firmware = /\[(v?\d[\w.-]*)\s*\(/.exec(versionOutput)?.[1] ?? /\b(v\d+(?:\.\d+){2,})/.exec(versionOutput)?.[1]
  const puf = /^[ \t]*PUF:[ \t]*(\S+)/im.exec(versionOutput)?.[1]
  return { ...(hostname ? { hostname } : {}), ...(firmware ? { firmware } : {}), ...(puf ? { puf } : {}) }
}

/** The console's commands, from the output of `help all`: one per line, sorted, without duplicates. */
function parseCommandList(helpOutput = '') {
  const names = new Set()
  for (const line of helpOutput.split(/\r?\n/)) {
    const name = HELP_LINE.exec(line)?.[1]
    if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).slice(0, MAX_COMMANDS)
}

/** A host key's SHA-256 fingerprint the way OpenSSH shows it: `SHA256:` and base64 without padding. */
const fingerprint = (hexDigest) => `SHA256:${Buffer.from(hexDigest, 'hex').toString('base64').replace(/=+$/, '')}`

/**
 * The host keys seen so far, one per address, kept in a small file. The first time a unit is
 * contacted its key is remembered (as OpenSSH's "accept-new"); a different key later is refused.
 */
function createKnownHosts(file) {
  let hosts = null
  const load = () => {
    if (hosts) return hosts
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      hosts = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      hosts = {}
    }
    return hosts
  }
  const save = () => {
    if (!file) return
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(hosts, null, 2))
    } catch {
      // Not being able to remember a key only means asking again next time.
    }
  }
  return {
    get: (key) => (file ? load()[key] : (hosts ??= {})[key]),
    set: (key, value) => {
      if (!file) hosts ??= {}
      else load()
      hosts[key] = value
      save()
    },
    forget: (key) => {
      if (file) load()
      else hosts ??= {}
      delete hosts[key]
      save()
    },
  }
}

/** What a failed connection means, in a sentence for the person. */
function describeError(error, ip, port) {
  if (error.level === 'client-authentication') return 'Login refused: wrong username or password.'
  if (error.level === 'client-timeout' || error.code === 'ETIMEDOUT') return `No answer from ${ip} (timed out).`
  switch (error.code) {
    case 'ECONNREFUSED':
      return `${ip} refused the connection on SSH (port ${port}). Is SSH enabled on the device?`
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return `${ip} cannot be reached from this computer (no route to the device).`
    case 'ECONNRESET':
      return `${ip} closed the connection while connecting.`
    default:
      return `Could not connect to ${ip}: ${error.message}`
  }
}

/**
 * Runs `hostname`, `ver -v` and `help all` on a hidden shell and reports what they say. Every step is
 * limited in time; whatever was read by then is reported, and the shell is closed at the end.
 * `onInfo` gets `{ hostname?, firmware?, puf? }` as soon as the first two commands are done, and
 * `onCommands` gets the command names once `help all` is done. Neither is called twice.
 */
function readUnitDetails(client, { bannerTimeoutMs, commandTimeoutMs, helpTimeoutMs }, { isClosed, onInfo, onCommands }) {
  let infoSent = false
  const sendInfo = (outputs) => {
    if (infoSent) return
    infoSent = true
    onInfo(parseUnitInfo(outputs))
  }
  client.shell({ term: 'vt100', cols: 200, rows: 50 }, (error, shell) => {
    if (error || isClosed()) {
      sendInfo({}) // the unit would not open a second shell: the card shows dashes
      if (shell) shell.close()
      return
    }
    let text = ''
    let pending = null
    shell.on('data', (chunk) => {
      text += chunk.toString('utf8')
      pending?.check()
    })
    shell.on('close', () => pending?.finish(null))

    /** Resolves with everything printed up to the next prompt, or `null` when it does not come in time. */
    const untilPrompt = (ms) =>
      new Promise((resolve) => {
        const finish = (value) => {
          clearTimeout(timer)
          pending = null
          text = ''
          resolve(value)
        }
        const timer = setTimeout(() => finish(null), ms)
        pending = { finish, check: () => PROMPT_AT_END.test(stripAnsi(text)) && finish(stripAnsi(text)) }
        pending.check()
      })
    const run = async (command, ms) => {
      shell.write(`${command}\r`)
      return untilPrompt(ms)
    }

    void (async () => {
      const outputs = {}
      try {
        if ((await untilPrompt(bannerTimeoutMs)) === null) return
        outputs.hostnameOutput = (await run('hostname', commandTimeoutMs)) ?? ''
        outputs.versionOutput = (await run('ver -v', commandTimeoutMs)) ?? ''
        sendInfo(outputs)
        const help = await run('help all', helpTimeoutMs)
        if (help) onCommands(parseCommandList(help))
      } finally {
        sendInfo(outputs)
        shell.close()
      }
    })()
  })
}

/**
 * Keeps the open terminals. `emit(message)` is how a session talks back to the page that opened it:
 * `{ type: 'data', id, data }`, `{ type: 'info', id, hostname?, firmware?, puf? }`,
 * `{ type: 'commands', id, commands }` and `{ type: 'closed', id, reason }`.
 */
function createTerminalManager({
  port = SSH_PORT,
  allowLoopback = false,
  knownHostsFile,
  bannerTimeoutMs = 6000,
  commandTimeoutMs = 8000,
  helpTimeoutMs = 10_000,
  connectTimeoutMs = 10_000,
} = {}) {
  const hosts = createKnownHosts(knownHostsFile)
  const sessions = new Map()
  const hostKey = (ip) => (port === SSH_PORT ? ip : `${ip}:${port}`)

  function end(session, reason) {
    if (!sessions.delete(session.id)) return
    session.closed = true
    if (reason) session.emit({ type: 'closed', id: session.id, reason })
    session.client.end() // closes the hidden shell with it
  }

  /** Open a console on a unit (`input.id` is optional). Resolves with `{ ok: true, id }` or `{ ok: false, error }`; it never throws. */
  function open(input, emit) {
    const { ip, username, password } = input ?? {}
    if (!isPrivateIPv4(ip, { allowLoopback })) return Promise.resolve({ ok: false, error: 'Enter the unit’s IPv4 address on your network (for example 10.0.0.5).' })
    if (typeof username !== 'string' || !username || typeof password !== 'string') return Promise.resolve({ ok: false, error: 'Enter the username and password for the unit.' })
    if (sessions.size >= MAX_SESSIONS) return Promise.resolve({ ok: false, error: `At most ${MAX_SESSIONS} terminals can be open at once.` })
    const clamp = (n, fallback) => (Number.isInteger(n) ? Math.min(500, Math.max(20, n)) : fallback)
    const cols = clamp(input.cols, 80)
    const rows = clamp(input.rows, 24)

    return new Promise((resolve) => {
      const client = new Client()
      // The page may choose the id, so output can be matched to its terminal from the very first byte.
      const id = typeof input.id === 'string' && /^[0-9a-f-]{36}$/i.test(input.id) && !sessions.has(input.id) ? input.id : crypto.randomUUID()
      const key = hostKey(ip)
      let settled = false
      let changedKey = null
      let newKey = null
      const settle = (result) => {
        if (settled) return
        settled = true
        resolve(result)
      }
      const failure = (error) =>
        changedKey
          ? { ok: false, hostKeyChanged: true, fingerprint: changedKey, error: `The SSH key of ${ip} is not the one seen before (${changedKey}). It changes when a unit is reset or replaced.` }
          : { ok: false, error }

      client.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => finish(prompts.map(() => password)))
      client.on('ready', () => {
        client.shell({ term: 'xterm-256color', cols, rows }, (error, stream) => {
          if (error) {
            client.end()
            settle({ ok: false, error: `The unit did not open a console: ${error.message}` })
            return
          }
          const session = { id, client, stream, emit, closed: false }
          sessions.set(id, session)
          stream.on('data', (chunk) => emit({ type: 'data', id, data: chunk }))
          stream.on('close', () => end(session, 'The unit closed the connection.'))
          settle({ ok: true, id, ...(newKey ? { newHostKey: newKey } : {}) })
          readUnitDetails(
            client,
            { bannerTimeoutMs, commandTimeoutMs, helpTimeoutMs },
            {
              isClosed: () => session.closed,
              onInfo: (info) => !session.closed && emit({ type: 'info', id, ...info }),
              onCommands: (commands) => !session.closed && emit({ type: 'commands', id, commands }),
            },
          )
        })
      })
      client.on('error', (error) => {
        if (!settled) {
          settle(failure(describeError(error, ip, port)))
          return
        }
        const session = sessions.get(id)
        if (session) end(session, describeError(error, ip, port))
      })
      client.on('close', () => {
        settle(failure(`${ip} closed the connection while connecting.`))
        const session = sessions.get(id)
        if (session) end(session, 'The connection to the unit was lost.')
      })

      client.connect({
        host: ip,
        port,
        username,
        password,
        tryKeyboard: true,
        readyTimeout: connectTimeoutMs,
        keepaliveInterval: 15_000,
        hostHash: 'sha256',
        hostVerifier: (digest) => {
          const seen = fingerprint(digest)
          const known = hosts.get(key)
          if (!known) {
            hosts.set(key, seen)
            newKey = seen
            return true
          }
          if (known === seen) return true
          changedKey = seen
          return false
        },
      })
    })
  }

  /** Keystrokes from the page, sent straight on. */
  function write(id, data) {
    const session = sessions.get(id)
    if (!session || typeof data !== 'string' || Buffer.byteLength(data) > MAX_WRITE_BYTES) return
    session.stream.write(data)
  }

  function resize(id, cols, rows) {
    const session = sessions.get(id)
    if (!session || !Number.isInteger(cols) || !Number.isInteger(rows)) return
    session.stream.setWindow(Math.min(500, Math.max(1, rows)), Math.min(500, Math.max(1, cols)), 0, 0)
  }

  const close = (id) => {
    const session = sessions.get(id)
    if (session) end(session)
  }

  return {
    open,
    write,
    resize,
    close,
    closeAll: () => [...sessions.values()].forEach((session) => end(session)),
    /** Forget a unit's remembered key, for when it was reset or replaced. */
    forgetHost: (ip) => hosts.forget(hostKey(ip)),
  }
}

/**
 * Wire the manager to the window. Only the app's own pages may use it. Output goes back to the page that
 * opened the session, as `terminal:event` messages.
 */
function registerTerminalIpc(ipcMain, manager, isTrusted) {
  const guard = (event) => {
    if (!isTrusted(event)) throw new Error('Untrusted sender')
  }
  ipcMain.handle('terminal:open', (event, input) => {
    guard(event)
    return manager.open(input, (message) => {
      if (!event.sender.isDestroyed()) event.sender.send('terminal:event', message)
    })
  })
  ipcMain.on('terminal:write', (event, id, data) => isTrusted(event) && manager.write(id, data))
  ipcMain.on('terminal:resize', (event, id, cols, rows) => isTrusted(event) && manager.resize(id, cols, rows))
  ipcMain.handle('terminal:close', (event, id) => {
    guard(event)
    manager.close(id)
  })
  ipcMain.handle('terminal:forgetHost', (event, ip) => {
    guard(event)
    if (isPrivateIPv4(ip)) manager.forgetHost(ip)
  })
}

module.exports = { createTerminalManager, registerTerminalIpc, parseUnitInfo, parseCommandList, fingerprint, stripAnsi }
