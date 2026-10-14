/**
 * Zip the linked folder's contents (images, `guides.json`, `cases-snippets.json`
 * and anything else in it) into one downloadable backup. See `zipWriter.ts` for
 * the archive format; files are kept as lazy `File` parts, so the whole folder is
 * never held in memory.
 */
import { isIgnoredName } from './fsNames'
import { buildZip } from './zipWriter'
import type { ZipSource } from './zipWriter'

export { textSource } from './zipWriter'
export type { ZipSource } from './zipWriter'

/** Files up to this size are copied into memory so a later write cannot break the archive; bigger ones stay lazy. */
const INLINE_LIMIT = 4 * 1024 * 1024

/** Every file under `dir`, recursively, as `path/inside/folder` + its content. */
export async function collectFolderSources(
  dir: FileSystemDirectoryHandle,
  prefix = '',
  out: ZipSource[] = [],
): Promise<ZipSource[]> {
  for await (const [name, handle] of dir.entries()) {
    if (isIgnoredName(name)) continue
    if (handle.kind === 'directory') {
      await collectFolderSources(handle as FileSystemDirectoryHandle, `${prefix}${name}/`, out)
    } else {
      const file = await (handle as FileSystemFileHandle).getFile()
      out.push({
        path: `${prefix}${name}`,
        // A File reads from the live file; if the app rewrites guides.json before the
        // download finishes, reading it would fail — so small files are snapshotted.
        blob: file.size <= INLINE_LIMIT ? new Blob([await file.arrayBuffer()]) : file,
        modified: new Date(file.lastModified),
      })
    }
  }
  return out
}

/** Zip the whole folder (plus any `extra` entries); resolves the archive and how many files went in. */
export async function zipFolder(
  dir: FileSystemDirectoryHandle,
  extra: ZipSource[] = [],
): Promise<{ blob: Blob; count: number }> {
  const sources = [...(await collectFolderSources(dir)), ...extra]
  return { blob: await buildZip(sources), count: sources.length }
}

export { buildZip }

/** Trigger a browser download of `blob` as `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
