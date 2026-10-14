/**
 * Thin helpers over the File System Access API, scoped to one linked directory:
 * read / write `guides.json` and resolve a step's image by (possibly nested)
 * filename. Every call is defensive — a missing file resolves to `null` rather
 * than throwing.
 */

import { isIgnoredName } from './fsNames'
import { readTextFile, writeFileExact } from './fsOps'

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

/**
 * `guides.json` text, or `null` if the file does not exist yet. Any other
 * failure (a locked file, `guides.json` being a folder) is thrown, so a read that
 * merely failed is never mistaken for "no file yet" and seeded over.
 */
export function readGuidesJson(dir: FileSystemDirectoryHandle): Promise<string | null> {
  return readTextFile(dir, GUIDES_FILENAME)
}

/** Create or overwrite `guides.json` with `text`. */
export function writeGuidesJson(dir: FileSystemDirectoryHandle, text: string): Promise<void> {
  return writeFileExact(dir, GUIDES_FILENAME, text)
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']

export const isImageName = (name: string) =>
  IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext))

export const isZipName = (name: string) => name.toLowerCase().endsWith('.zip')

/** Folder that picked project zips are copied into. */
export const PROJECTS_DIR = 'projects'

/**
 * Every image file in the linked folder, as paths relative to it — top level
 * plus one level of sub-folders (`screens/step-1.png`), which is as deep as
 * {@link readImageFile} is expected to resolve in practice. Sorted, and capped
 * so a folder full of assets can't stall the editor.
 */
export function listImageFiles(
  dir: FileSystemDirectoryHandle,
  max = 500,
): Promise<string[]> {
  return listFiles(dir, isImageName, max)
}

/** Every `.zip` in the linked folder — same scan depth as {@link listImageFiles}. */
export function listZipFiles(
  dir: FileSystemDirectoryHandle,
  max = 200,
): Promise<string[]> {
  return listFiles(dir, isZipName, max)
}

async function listFiles(
  dir: FileSystemDirectoryHandle,
  match: (name: string) => boolean,
  max: number,
): Promise<string[]> {
  const found: string[] = []
  try {
    for await (const [name, handle] of dir.entries()) {
      if (found.length >= max) break
      if (isIgnoredName(name)) continue
      if (handle.kind === 'file') {
        if (match(name)) found.push(name)
        continue
      }
      try {
        for await (const [childName, child] of handle.entries()) {
          if (found.length >= max) break
          if (child.kind === 'file' && !isIgnoredName(childName) && match(childName)) {
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
export function readImageFile(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<Blob | null> {
  return readFileFromFolder(dir, path)
}

/** Any file in the folder by (possibly nested) path, or `null` if it isn't there. */
export async function readFileFromFolder(
  dir: FileSystemDirectoryHandle,
  path: string,
): Promise<File | null> {
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

/**
 * Copy a file the author picked from elsewhere into `projects/` in the linked
 * folder so it travels with it. An existing name is never overwritten
 * (`app.zip` -> `app (2).zip`). Resolves to the path relative to the folder.
 */
export async function importIntoFolder(
  dir: FileSystemDirectoryHandle,
  file: File,
  subfolder: string = PROJECTS_DIR,
): Promise<string> {
  const target = await dir.getDirectoryHandle(subfolder, { create: true })
  const dot = file.name.lastIndexOf('.')
  const stem = dot > 0 ? file.name.slice(0, dot) : file.name
  const ext = dot > 0 ? file.name.slice(dot) : ''

  let name = file.name
  for (let n = 2; await hasFile(target, name); n++) name = `${stem} (${n})${ext}`

  const fileHandle = await target.getFileHandle(name, { create: true })
  const writable = await fileHandle.createWritable()
  await file.stream().pipeTo(writable) // streams, so a big zip is never held in memory
  return `${subfolder}/${name}`
}

async function hasFile(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch {
    return false
  }
}
