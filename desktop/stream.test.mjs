import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'

const { parseStreamUrl, vlcCandidates, openStream } = createRequire(import.meta.url)('./stream.cjs')

/** A stand-in for the process VLC would start. */
function fakeSpawn({ fail = false } = {}) {
  const calls = []
  const spawn = (exe, args, options) => {
    calls.push({ exe, args, options })
    const child = new EventEmitter()
    child.unref = () => {}
    queueMicrotask(() => child.emit(fail ? 'error' : 'spawn', new Error('ENOENT')))
    return child
  }
  return { spawn, calls }
}

const winEnv = { ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)', LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' }

describe('parseStreamUrl', () => {
  it('accepts rtsp and rtsps on a private address, with or without a port and path', () => {
    for (const text of ['rtsp://10.0.0.5/', 'rtsp://172.16.4.224:554/live/main', 'rtsps://192.168.1.9:8554/stream?x=1']) {
      expect(parseStreamUrl(text)).not.toBeNull()
    }
  })

  it('refuses anything else', () => {
    for (const text of [
      'http://10.0.0.5/stream', // not a stream address
      'rtsp://8.8.8.8/x', // not on the private network
      'rtsp://camera.local/x', // a name, not an address
      'rtsp://admin:secret@10.0.0.5/x', // a password in the address
      'rtsp://10.0.0.5/a b', // a space
      'rtsp://10.0.0.5/\n--fullscreen',
      '--fullscreen',
      '',
      `rtsp://10.0.0.5/${'a'.repeat(400)}`,
      undefined,
      42,
    ]) {
      expect(parseStreamUrl(text)).toBeNull()
    }
  })
})

describe('openStream', () => {
  it('starts VLC with the address as its only argument', async () => {
    const { spawn, calls } = fakeSpawn()
    const result = await openStream('rtsp://10.0.0.5/live', { spawn, exists: () => true, env: winEnv, platform: 'win32' })
    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].exe).toBe('C:\\Program Files\\VideoLAN\\VLC\\vlc.exe')
    expect(calls[0].args).toEqual(['rtsp://10.0.0.5/live'])
    expect(calls[0].options).toMatchObject({ detached: true, stdio: 'ignore' })
    expect(calls[0].options.shell).toBeUndefined()
  })

  it('uses the first place VLC is installed', async () => {
    const { spawn, calls } = fakeSpawn()
    const only = 'C:\\Users\\me\\AppData\\Local\\Programs\\VideoLAN\\VLC\\vlc.exe'
    await openStream('rtsp://10.0.0.5/live', { spawn, exists: (p) => p === only, env: winEnv, platform: 'win32' })
    expect(calls[0].exe).toBe(only)
  })

  it('says so when VLC is not installed, and starts nothing', async () => {
    const { spawn, calls } = fakeSpawn()
    const result = await openStream('rtsp://10.0.0.5/live', { spawn, exists: () => false, env: winEnv, platform: 'win32' })
    expect(result).toMatchObject({ ok: false })
    expect(result.error).toContain('VLC was not found')
    expect(calls).toHaveLength(0)
  })

  it('says so when VLC will not start', async () => {
    const { spawn } = fakeSpawn({ fail: true })
    const result = await openStream('rtsp://10.0.0.5/live', { spawn, exists: () => true, env: winEnv, platform: 'win32' })
    expect(result).toMatchObject({ ok: false })
    expect(result.error).toContain('could not be started')
  })

  it('starts nothing for an address it will not open', async () => {
    const { spawn, calls } = fakeSpawn()
    const result = await openStream('rtsp://8.8.8.8/x', { spawn, exists: () => true, env: winEnv, platform: 'win32' })
    expect(result.ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('looks for VLC by name on the PATH outside Windows', () => {
    expect(vlcCandidates({}, 'linux')).toEqual(['vlc'])
    expect(vlcCandidates({}, 'darwin')[0]).toContain('VLC')
  })
})
