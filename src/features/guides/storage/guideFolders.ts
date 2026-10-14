/**
 * A guide's own folder: `guides/<folder>/` holding a mirror of its `guide.json`,
 * its `images/` and its `projects/`. Everything here works on a linked folder
 * handle and never throws for "not there yet" — only for real failures.
 */
import { IMAGES_DIR, PROJECTS_DIR_NAME } from './assets'
import type { AssetKind } from './assets'
import { isIgnoredName } from './fsNames'
import { ensureDir, findDir, isNotFoundError, splitPath, writeFileExact } from './fsOps'
import { isImageName, isZipName } from './guidesFolder'
import { uniqueSlug } from './slug'
import { toPortableGuide } from '../normalizeGuide'
import type { Guide } from '../types'

export const GUIDES_DIR = 'guides'
export const GUIDE_FILENAME = 'guide.json'

/** Path prefix of a guide's assets: `guides/<folder>/`, or nothing for a guide without a folder. */
export const guideBase = (folder?: string) => (folder ? `${GUIDES_DIR}/${folder}/` : '')

async function hasFile(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch {
    return false
  }
}

/**
 * The lowercased names in `guides/` that are not free for a new guide: every file,
 * and every folder that already holds a `guide.json` (a guide's own, or a malformed
 * one — either way not ours to write into). A folder with no `guide.json` is a
 * leftover from an interrupted run or a hand-made empty folder and stays reusable.
 */
export async function claimedFolderNames(dir: FileSystemDirectoryHandle): Promise<Set<string>> {
  const claimed = new Set<string>()
  const root = await findDir(dir, [GUIDES_DIR])
  if (!root) return claimed
  for await (const [name, handle] of root.entries()) {
    if (isIgnoredName(name)) continue
    if (handle.kind === 'file' || (await hasFile(handle as FileSystemDirectoryHandle, GUIDE_FILENAME))) {
      claimed.add(name.toLowerCase())
    }
  }
  return claimed
}

/**
 * Pick and create a folder for a guide titled `title`. `taken` holds names already
 * spoken for in this session (lowercased) and is extended with the new one.
 */
export async function allocateGuideFolder(
  dir: FileSystemDirectoryHandle,
  title: string,
  taken: Set<string>,
): Promise<string> {
  for (const name of await claimedFolderNames(dir)) taken.add(name)
  const name = uniqueSlug(title, taken)
  await ensureDir(dir, [GUIDES_DIR, name])
  return name
}

/** Write (or refresh) the portable mirror `guides/<folder>/guide.json`. */
export function writeGuideMirror(dir: FileSystemDirectoryHandle, folder: string, guide: Guide): Promise<void> {
  return writeFileExact(
    dir,
    `${GUIDES_DIR}/${folder}/${GUIDE_FILENAME}`,
    JSON.stringify(toPortableGuide(guide), null, 2),
  )
}

/**
 * Delete a guide's folder with everything in it. `guide.json` goes first, so a
 * folder that fails to delete completely is left unclaimed rather than looking like
 * a guide. A folder that is already gone is not an error.
 */
export async function deleteGuideFolder(dir: FileSystemDirectoryHandle, folder: string): Promise<void> {
  splitPath(folder) // a single safe segment, never a path
  if (folder.includes('/')) throw new TypeError(`Not a folder name: "${folder}"`)
  const root = await findDir(dir, [GUIDES_DIR])
  const own = root && (await findDir(root, [folder]))
  if (!root || !own) return
  try {
    await own.removeEntry(GUIDE_FILENAME)
  } catch (e) {
    if (!isNotFoundError(e)) throw e
  }
  try {
    await root.removeEntry(folder, { recursive: true })
  } catch (e) {
    if (!isNotFoundError(e)) throw e
  }
}

const INVALID_NAME_CHARS = /[<>:"/\\|?*]/g

/**
 * Copy a file the author picked from elsewhere into the guide's `images/` or
 * `projects/`. A file of the same name and size is taken to be the same file and
 * reused; otherwise a free `name (2).ext` is used. Resolves to the folder-relative
 * reference to store on the guide.
 */
export async function copyIntoGuide(
  dir: FileSystemDirectoryHandle,
  folder: string,
  file: File,
  kind: AssetKind,
): Promise<string> {
  const sub = kind === 'image' ? IMAGES_DIR : PROJECTS_DIR_NAME
  const target = await ensureDir(dir, [GUIDES_DIR, folder, sub])
  const clean = file.name.replace(INVALID_NAME_CHARS, '_').trim() || 'file'
  const dot = clean.lastIndexOf('.')
  const stem = dot > 0 ? clean.slice(0, dot) : clean
  const ext = dot > 0 ? clean.slice(dot) : ''

  let name = clean
  for (let n = 2; ; n++) {
    let existing: File
    try {
      existing = await (await target.getFileHandle(name)).getFile()
    } catch (e) {
      if (isNotFoundError(e)) break
      throw e
    }
    if (existing.size === file.size) return `${sub}/${name}` // already there
    name = `${stem} (${n})${ext}`
  }

  await writeFileExact(dir, `${GUIDES_DIR}/${folder}/${sub}/${name}`, file, file.size)
  return `${sub}/${name}`
}

/** Files under `segments` (up to two folders deep) that match, as paths relative to `base`, sorted. */
async function listUnder(
  base: FileSystemDirectoryHandle,
  top: string,
  match: (name: string) => boolean,
  max: number,
): Promise<string[]> {
  const found: string[] = []
  const root = await findDir(base, [top])
  if (!root) return found
  const walk = async (dir: FileSystemDirectoryHandle, prefix: string, depth: number) => {
    for await (const [name, handle] of dir.entries()) {
      if (found.length >= max) return
      if (isIgnoredName(name)) continue
      if (handle.kind === 'file') {
        if (match(name)) found.push(`${prefix}${name}`)
      } else if (depth < 2) {
        await walk(handle as FileSystemDirectoryHandle, `${prefix}${name}/`, depth + 1)
      }
    }
  }
  try {
    await walk(root, `${top}/`, 0)
  } catch {
    // An unreadable sub-folder should not stall the editor.
  }
  return found.sort((a, b) => a.localeCompare(b))
}

/** The images and project zips a guide's folder holds, as folder-relative references. */
export async function listGuideAssets(
  dir: FileSystemDirectoryHandle,
  folder: string,
): Promise<{ images: string[]; zips: string[] }> {
  const base = await findDir(dir, [GUIDES_DIR, folder])
  if (!base) return { images: [], zips: [] }
  return {
    images: await listUnder(base, IMAGES_DIR, isImageName, 500),
    zips: await listUnder(base, PROJECTS_DIR_NAME, isZipName, 200),
  }
}
