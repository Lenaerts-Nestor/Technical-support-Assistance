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
  // Never let a browser that has dropped these methods (or throws on a stale
  // handle) leave the caller hanging — an unresolved check reads as "still
  // checking…" forever in the Sync panel.
  try {
    if ((await handle.queryPermission(opts)) === 'granted') return true
    if (withPrompt && (await handle.requestPermission(opts)) === 'granted') return true
  } catch {
    return false
  }
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

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']

const isImageName = (name: string) =>
  IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))

/**
 * Every image file in the linked folder, as paths relative to it — top level
 * plus one level of sub-folders (`screens/step-1.png`), which is as deep as
 * {@link readImageFile} is expected to resolve in practice. Sorted, and capped
 * so a folder full of assets can't stall the editor.
 */
export async function listImageFiles(
  dir: FileSystemDirectoryHandle,
  max = 500,
): Promise<string[]> {
  const found: string[] = []
  try {
    for await (const [name, handle] of dir.entries()) {
      if (found.length >= max) break
      if (handle.kind === 'file') {
        if (isImageName(name)) found.push(name)
        continue
      }
      try {
        for await (const [childName, child] of handle.entries()) {
          if (found.length >= max) break
          if (child.kind === 'file' && isImageName(childName)) {
            found.push(`${name}/${childName}`)
          }
        }
      } catch {
        // Unreadable sub-folder — skip it rather than failing the whole scan.
      }
    }
  } catch {
    return []
  }
  return found.sort((a, b) => a.localeCompare(b))
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
