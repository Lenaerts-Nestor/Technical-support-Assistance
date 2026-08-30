/**
 * Thin helpers over the File System Access API, scoped to one linked directory:
 * read / write `guides.json` and resolve a step's image by (possibly nested)
 * filename. Every call is defensive — a missing file resolves to `null` rather
 * than throwing.
 */

export const GUIDES_FILENAME = 'guides.json'

/** Chrome / Edge / other Chromium desktop browsers only. */
export function isFolderSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Resolve to `true` when we hold read-write permission on `handle`. With
 * `withPrompt`, ask the user for it (must be called from a click handler).
 */
export async function verifyPermission(
  handle: FileSystemHandle,
  withPrompt: boolean,
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  if (withPrompt && (await handle.requestPermission(opts)) === 'granted') return true
  return false
}

/** `guides.json` text, or `null` if the file does not exist yet. */
export async function readGuidesJson(
  dir: FileSystemDirectoryHandle,
): Promise<string | null> {
  try {
    const fileHandle = await dir.getFileHandle(GUIDES_FILENAME)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

/** Create or overwrite `guides.json` with `text`. */
export async function writeGuidesJson(
  dir: FileSystemDirectoryHandle,
  text: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(GUIDES_FILENAME, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(text)
  await writable.close()
}

/**
 * Load an image referenced by a step. `path` may include forward-slash
 * sub-folders (`screens/step-1.png`). Returns `null` if anything along the way
 * is missing.
 */
export async function readImageFile(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<Blob | null> {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return null
  try {
    let folder = dir
    for (const segment of parts.slice(0, -1)) {
      folder = await folder.getDirectoryHandle(segment)
    }
    const fileHandle = await folder.getFileHandle(parts[parts.length - 1])
    return await fileHandle.getFile()
  } catch {
    return null
  }
}
