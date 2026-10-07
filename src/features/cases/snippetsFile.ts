import { loadFolderHandle } from '../guides/storage/handleStore'
import { isFolderSyncSupported, verifyPermission } from '../guides/storage/guidesFolder'
import type { Snippet } from './types'

/** Lives next to `guides.json` in the folder linked from the Guides page. */
export const SNIPPETS_FILENAME = 'cases-snippets.json'

/** Validate parsed JSON into snippets, dropping anything malformed. */
export function reviveSnippets(raw: unknown): Snippet[] | null {
  const list = Array.isArray(raw) ? raw : (raw as { snippets?: unknown } | null)?.snippets
  if (!Array.isArray(list)) return null
  return list.flatMap((item): Snippet[] => {
    const s = item as Partial<Snippet> | null
    if (!s || typeof s.id !== 'string' || typeof s.label !== 'string' || typeof s.text !== 'string') {
      return []
    }
    return [{ id: s.id, label: s.label, text: s.text }]
  })
}

/** The linked folder, only if we already hold read-write access (no prompt). */
async function linkedFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFolderSyncSupported()) return null
  const handle = await loadFolderHandle()
  return handle && (await verifyPermission(handle, false)) ? handle : null
}

/** Snippets on disk: `null` when no folder is usable, `undefined` when no file yet. */
export async function readSnippetsFile(): Promise<Snippet[] | null | undefined> {
  try {
    const dir = await linkedFolder()
    if (!dir) return null
    let text: string
    try {
      text = await (await (await dir.getFileHandle(SNIPPETS_FILENAME)).getFile()).text()
    } catch {
      return undefined
    }
    return reviveSnippets(JSON.parse(text)) ?? undefined
  } catch {
    return null
  }
}

/** Returns whether the file was written. */
export async function writeSnippetsFile(snippets: Snippet[]): Promise<boolean> {
  try {
    const dir = await linkedFolder()
    if (!dir) return false
    const fileHandle = await dir.getFileHandle(SNIPPETS_FILENAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify({ snippets }, null, 2))
    await writable.close()
    return true
  } catch {
    return false
  }
}
