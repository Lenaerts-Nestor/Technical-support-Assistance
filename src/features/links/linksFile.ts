import { readTextFile, writeFileExact } from '../guides/storage/fsOps'
import { reviveSections } from './linksData'
import type { LinkSection } from './types'

/** Lives next to `guides.json` in the linked folder. */
export const LINKS_FILENAME = 'links.json'

/** Sections on disk: `null` when the read failed, `undefined` when there is no file yet. */
export async function readLinksFile(
  dir: FileSystemDirectoryHandle,
): Promise<LinkSection[] | null | undefined> {
  try {
    const text = await readTextFile(dir, LINKS_FILENAME)
    if (text === null) return undefined
    return reviveSections(JSON.parse(text)) ?? undefined
  } catch {
    return null
  }
}

/** Returns whether the file was written. */
export async function writeLinksFile(
  dir: FileSystemDirectoryHandle,
  sections: LinkSection[],
): Promise<boolean> {
  try {
    await writeFileExact(dir, LINKS_FILENAME, JSON.stringify({ sections }, null, 2))
    return true
  } catch {
    return false
  }
}
