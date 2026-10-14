/**
 * A tiny in-memory stand-in for the File System Access API, so the storage code
 * (Organize, import, restore …) can run in unit tests. It mimics the behaviours
 * the app depends on: creating a file makes it visible immediately, names are
 * validated, lookups can be case-insensitive (Windows / macOS), a failed or
 * aborted write leaves a freshly created file empty, and `removeEntry` refuses a
 * non-empty folder unless `recursive`.
 */

type Hooks = {
  /** Called when a write is committed; throw to simulate a full disk / locked file. */
  beforeCommit?: (path: string, size: number) => void
}

type FsOptions = { caseInsensitive?: boolean; hooks?: Hooks }

const domError = (name: string, message: string) => new DOMException(message, name)

function assertName(name: string) {
  if (!name || name === '.' || name === '..' || /[\\/]/.test(name)) {
    throw new TypeError(`Name is not allowed: "${name}"`)
  }
}

async function toBytes(data: unknown): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer())
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  if (data && typeof data === 'object' && 'data' in data) return toBytes((data as { data: unknown }).data)
  throw new TypeError('Unsupported write payload')
}

class MemFile {
  kind = 'file' as const
  name: string
  data = new Uint8Array(0)
  modified = Date.now()
  path: string
  private opts: FsOptions

  constructor(name: string, path: string, opts: FsOptions) {
    this.name = name
    this.path = path
    this.opts = opts
  }

  async getFile(): Promise<File> {
    return new File([this.data.slice()], this.name, { lastModified: this.modified })
  }

  async createWritable(): Promise<WritableStream<Uint8Array> & { write(data: unknown): Promise<void> }> {
    const chunks: Uint8Array[] = []
    let closed = false
    const commit = () => {
      const size = chunks.reduce((n, c) => n + c.length, 0)
      this.opts.hooks?.beforeCommit?.(this.path, size)
      const out = new Uint8Array(size)
      let at = 0
      for (const c of chunks) {
        out.set(c, at)
        at += c.length
      }
      this.data = out
      this.modified = Date.now()
    }
    const stream = new WritableStream<Uint8Array>({
      async write(chunk) {
        chunks.push(await toBytes(chunk))
      },
      close() {
        closed = true
        commit()
      },
      abort() {
        closed = true
      },
    })
    return Object.assign(stream, {
      async write(data: unknown) {
        if (closed) throw new TypeError('Stream is closed')
        chunks.push(await toBytes(data))
      },
    })
  }
}

class MemDir {
  kind = 'directory' as const
  name: string
  path: string
  private children = new Map<string, MemDir | MemFile>()
  private opts: FsOptions

  constructor(name: string, path: string, opts: FsOptions) {
    this.name = name
    this.path = path
    this.opts = opts
  }

  private key(name: string) {
    return this.opts.caseInsensitive === false ? name : name.toLowerCase()
  }

  private childPath(name: string) {
    return this.path ? `${this.path}/${name}` : name
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemFile> {
    assertName(name)
    const existing = this.children.get(this.key(name))
    if (existing) {
      if (existing.kind !== 'file') throw domError('TypeMismatchError', `${name} is a directory`)
      return existing
    }
    if (!options?.create) throw domError('NotFoundError', `${name} not found`)
    const file = new MemFile(name, this.childPath(name), this.opts)
    this.children.set(this.key(name), file)
    return file
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemDir> {
    assertName(name)
    const existing = this.children.get(this.key(name))
    if (existing) {
      if (existing.kind !== 'directory') throw domError('TypeMismatchError', `${name} is a file`)
      return existing
    }
    if (!options?.create) throw domError('NotFoundError', `${name} not found`)
    const dir = new MemDir(name, this.childPath(name), this.opts)
    this.children.set(this.key(name), dir)
    return dir
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    assertName(name)
    const existing = this.children.get(this.key(name))
    if (!existing) throw domError('NotFoundError', `${name} not found`)
    if (existing.kind === 'directory' && existing.children.size > 0 && !options?.recursive) {
      throw domError('InvalidModificationError', `${name} is not empty`)
    }
    this.children.delete(this.key(name))
  }

  async *entries(): AsyncGenerator<[string, MemDir | MemFile]> {
    for (const child of [...this.children.values()]) yield [child.name, child]
  }

  async resolve(target: MemDir | MemFile): Promise<string[] | null> {
    if (target === this) return []
    for (const child of this.children.values()) {
      if (child === target) return [child.name]
      if (child.kind === 'directory') {
        const inner = await child.resolve(target)
        if (inner) return [child.name, ...inner]
      }
    }
    return null
  }

  async queryPermission() {
    return 'granted' as const
  }

  async requestPermission() {
    return 'granted' as const
  }
}

export type MemoryFs = {
  root: MemDir
  /** The root typed as the real handle, to pass to the code under test. */
  handle: FileSystemDirectoryHandle
  /** Shared by every node, so `options.hooks` can be set after the fixture has been seeded. */
  options: FsOptions
}

export function createMemoryFs(options: FsOptions = {}): MemoryFs {
  const shared: FsOptions = { ...options }
  const root = new MemDir('library', '', shared)
  return { root, handle: root as unknown as FileSystemDirectoryHandle, options: shared }
}

/** Create (or overwrite) `path` with `content`, making folders as needed. */
export async function put(fs: MemoryFs, path: string, content: string | Uint8Array = ''): Promise<void> {
  const parts = path.split('/')
  let dir = fs.root
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true })
  const file = await dir.getFileHandle(parts[parts.length - 1], { create: true })
  const writable = await file.createWritable()
  await writable.write(content)
  await writable.close()
}

/** File bytes at `path`, or null when missing. */
export async function read(fs: MemoryFs, path: string): Promise<Uint8Array | null> {
  try {
    let dir = fs.root
    const parts = path.split('/')
    for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part)
    return new Uint8Array(await (await (await dir.getFileHandle(parts[parts.length - 1])).getFile()).arrayBuffer())
  } catch {
    return null
  }
}

export async function readText(fs: MemoryFs, path: string): Promise<string | null> {
  const bytes = await read(fs, path)
  return bytes ? new TextDecoder().decode(bytes) : null
}

/** Every file path under the root, sorted — folders only appear through their files. */
export async function listFiles(fs: MemoryFs): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: MemDir, prefix: string) => {
    for await (const [name, child] of dir.entries()) {
      if (child.kind === 'directory') await walk(child, `${prefix}${name}/`)
      else out.push(`${prefix}${name}`)
    }
  }
  await walk(fs.root, '')
  return out.sort()
}

/** Every folder path under the root (including empty ones), sorted. */
export async function listDirs(fs: MemoryFs): Promise<string[]> {
  const out: string[] = []
  const walk = async (dir: MemDir, prefix: string) => {
    for await (const [name, child] of dir.entries()) {
      if (child.kind === 'directory') {
        out.push(`${prefix}${name}`)
        await walk(child, `${prefix}${name}/`)
      }
    }
  }
  await walk(fs.root, '')
  return out.sort()
}
