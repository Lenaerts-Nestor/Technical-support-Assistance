/**
 * Small, careful write primitives over the File System Access API, shared by
 * Organize, guide import and backup restore. Two rules they keep: every path
 * segment is validated before it touches the disk, and a write that fails leaves
 * nothing half-made behind (the browser discards its swap file; a file this call
 * created is removed again).
 */
import { isSafeSegment } from './fsNames'

export const isNotFoundError = (e: unknown) => e instanceof DOMException && e.name === 'NotFoundError'

export const isQuotaError = (e: unknown) => e instanceof DOMException && e.name === 'QuotaExceededError'

/** Split and validate a forward-slash path; throws on anything that is not a plain relative path. */
export function splitPath(path: string): string[] {
  const segments = path.split('/')
  if (segments.length === 0 || !segments.every(isSafeSegment)) {
    throw new TypeError(`Not a valid path: "${path}"`)
  }
  return segments
}

/** The folder at `segments` under `root`, creating each level on the way. */
export async function ensureDir(
  root: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle> {
  let dir = root
  for (const segment of segments) dir = await dir.getDirectoryHandle(segment, { create: true })
  return dir
}

/** The folder at `segments`, or `null` when any level is missing. */
export async function findDir(
  root: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle | null> {
  let dir = root
  try {
    for (const segment of segments) dir = await dir.getDirectoryHandle(segment)
    return dir
  } catch {
    return null
  }
}

/** The file at `path` under `root`, or `null` when it is not there. */
export async function findFile(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<File | null> {
  try {
    const segments = splitPath(path)
    const dir = await findDir(root, segments.slice(0, -1))
    return dir ? await (await dir.getFileHandle(segments[segments.length - 1])).getFile() : null
  } catch {
    return null
  }
}

/** Text of `name` in `dir`, or `null` when the file does not exist. Other errors are thrown. */
export async function readTextFile(dir: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    return await (await (await dir.getFileHandle(name)).getFile()).text()
  } catch (e) {
    if (isNotFoundError(e)) return null
    throw e
  }
}

type Body = Blob | string | ((writable: WritableStream<Uint8Array>) => Promise<void>)

/**
 * Write `body` to `path` (overwriting), creating folders as needed. With
 * `expectedSize` the result is checked afterwards. On any failure a file this call
 * created is removed, so a retry never finds a zero-byte stub.
 */
export async function writeFileExact(
  root: FileSystemDirectoryHandle,
  path: string,
  body: Body,
  expectedSize?: number,
): Promise<void> {
  const segments = splitPath(path)
  const name = segments[segments.length - 1]
  const dir = await ensureDir(root, segments.slice(0, -1))

  let created = false
  try {
    await dir.getFileHandle(name)
  } catch (e) {
    if (!isNotFoundError(e)) throw e
    created = true
  }

  const remove = async () => {
    if (created) await dir.removeEntry(name).catch(() => {})
  }

  const handle = await dir.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  try {
    if (typeof body === 'string') {
      await writable.write(body)
      await writable.close()
    } else if (body instanceof Blob) {
      await body.stream().pipeTo(writable)
    } else {
      await body(writable)
    }
  } catch (e) {
    await writable.abort().catch(() => {})
    await remove()
    throw e
  }

  if (expectedSize !== undefined) {
    const size = (await handle.getFile()).size
    if (size !== expectedSize) {
      await remove()
      throw new Error(`"${path}" was written incompletely (${size} of ${expectedSize} bytes).`)
    }
  }
}

/** Remove a file if it exists; resolves to whether something was removed. */
export async function removeFileIfExists(root: FileSystemDirectoryHandle, path: string): Promise<boolean> {
  const segments = splitPath(path)
  const dir = await findDir(root, segments.slice(0, -1))
  if (!dir) return false
  try {
    await dir.removeEntry(segments[segments.length - 1])
    return true
  } catch (e) {
    if (isNotFoundError(e)) return false
    throw e
  }
}
