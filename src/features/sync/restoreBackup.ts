import { parseGuidesFile } from '../guides/normalizeGuide'
import { isIgnoredName } from '../guides/storage/fsNames'
import { isQuotaError, writeFileExact } from '../guides/storage/fsOps'
import { GUIDES_FILENAME } from '../guides/storage/guidesFolder'
import type { ZipArchive } from '../guides/storage/zipReader'
import { countLinks } from '../links/linksMerge'
import { LINKS_FILENAME } from '../links/linksFile'
import { reviveSections } from '../links/linksData'
import { SNIPPETS_FILENAME, reviveSnippets } from '../cases/snippetsFile'
import { MANIFEST_NAME } from './packages'

/** What is in the linked folder, counted the way the app reads it. */
export type FolderContent = { guides: number; links: number; snippets: number; other: number }

export const folderIsEmpty = (c: FolderContent) => c.guides + c.links + c.snippets + c.other === 0

/**
 * The folder's content at its top level. The three data files count by what they
 * hold — an empty `guides.json` / `links.json` that the app wrote itself on first
 * link is not content — and anything else (images, other folders) counts as other.
 */
export async function describeFolderContent(dir: FileSystemDirectoryHandle): Promise<FolderContent> {
  const content: FolderContent = { guides: 0, links: 0, snippets: 0, other: 0 }
  for await (const [name, handle] of dir.entries()) {
    if (isIgnoredName(name)) continue
    if (handle.kind !== 'file') {
      content.other++
      continue
    }
    try {
      const text = await (await (handle as FileSystemFileHandle).getFile()).text()
      if (name === GUIDES_FILENAME) content.guides += parseGuidesFile(text).length
      else if (name === LINKS_FILENAME) content.links += countLinks(reviveSections(JSON.parse(text)) ?? [])
      else if (name === SNIPPETS_FILENAME) content.snippets += reviveSnippets(JSON.parse(text))?.length ?? 0
      else content.other++
    } catch {
      content.other++ // unreadable: treat as content rather than risk overwriting it
    }
  }
  return content
}

export type RestoreResult = { written: number; failed: { path: string; message: string }[] }

/** Data documents go last, so an interrupted restore never leaves a guide pointing at files that are not there yet. */
function rank(path: string): number {
  const name = path.toLowerCase().split('/').pop() ?? ''
  if ([GUIDES_FILENAME, LINKS_FILENAME, SNIPPETS_FILENAME].includes(name) && !path.includes('/')) return 2
  return name === 'guide.json' ? 1 : 0
}

/**
 * Write every file of a backup into `dir` (which the caller has checked is
 * empty). Failures are collected per file; running out of space stops the run.
 */
export async function restoreBackup(
  dir: FileSystemDirectoryHandle,
  archive: ZipArchive,
  onProgress?: (done: number, total: number) => void,
): Promise<RestoreResult> {
  const entries = archive.entries
    .filter((e) => e.path !== MANIFEST_NAME && !isIgnoredName(e.path.split('/').pop() ?? ''))
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry.path) - rank(b.entry.path) || a.index - b.index)
    .map((x) => x.entry)

  const result: RestoreResult = { written: 0, failed: [] }
  for (const entry of entries) {
    try {
      await writeFileExact(dir, entry.path, (writable) => archive.copyTo(entry, writable), entry.size)
      result.written++
    } catch (error) {
      if (isQuotaError(error)) throw error
      result.failed.push({ path: entry.path, message: error instanceof Error ? error.message : 'could not be written' })
    }
    onProgress?.(result.written + result.failed.length, entries.length)
  }
  return result
}
