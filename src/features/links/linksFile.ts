import { loadFolderHandle } from '../guides/storage/handleStore'
import { isFolderSyncSupported, verifyPermission } from '../guides/storage/guidesFolder'
import { reviveSections } from './linksData'
import type { LinkSection } from './types'

/** Lives next to `guides.json` in the folder linked from the Guides page. */
export const LINKS_FILENAME = 'links.json'

/** The linked folder, only if we already hold read-write access (no prompt). */
async function linkedFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFolderSyncSupported()) return null
  const handle = await loadFolderHandle()
  return handle && (await verifyPermission(handle, false)) ? handle : null
}

/** Sections on disk: `null` when no folder is usable, `undefined` when no file yet. */
export async function readLinksFile(): Promise<LinkSection[] | null | undefined> {
  try {
    const dir = await linkedFolder()
    if (!dir) return null
    let text: string
    try {
      text = await (await (await dir.getFileHandle(LINKS_FILENAME)).getFile()).text()
    } catch {
      return undefined
    }
    return reviveSections(JSON.parse(text)) ?? undefined
  } catch {
    return null
  }
}

/** Returns whether the file was written. */
export async function writeLinksFile(sections: LinkSection[]): Promise<boolean> {
  try {
    const dir = await linkedFolder()
    if (!dir) return false
    const fileHandle = await dir.getFileHandle(LINKS_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify({ sections }, null, 2))
    await writable.close()
    return true
  } catch {
    return false
  }
}
