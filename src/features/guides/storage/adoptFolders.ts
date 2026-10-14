/**
 * Guide folders that are on disk but not in the library: a folder a coworker
 * sent, one unzipped into `guides/` by hand, or one left by an earlier library.
 * `guides.json` stays the index, so these are only ever *offered* for adding.
 */
import { collectGuideAssets, normalizeRef } from './assets'
import { findFile, readTextFile } from './fsOps'
import { GUIDE_FILENAME, GUIDES_DIR, guideBase } from './guideFolders'
import { scanGuideMirrors } from './organize'
import { normalizeGuide } from '../normalizeGuide'
import type { Guide } from '../types'

export type FoundGuideFolder = {
  folder: string
  guide: Guide
  /** References whose file is not in the guide's folder. */
  missing: string[]
}

export type FolderScan = {
  found: FoundGuideFolder[]
  /** Folders whose guide.json could not be read as a guide. */
  unreadable: string[]
  /** Folders skipped because the library already has that guide (the library's copy wins). */
  alreadyInLibrary: number
}

export async function findUnindexedGuideFolders(
  dir: FileSystemDirectoryHandle,
  library: Guide[],
): Promise<FolderScan> {
  const ids = new Set(library.map((g) => g.id))
  const folders = new Set(library.flatMap((g) => (g.folder ? [g.folder.toLowerCase()] : [])))
  const scan: FolderScan = { found: [], unreadable: [], alreadyInLibrary: 0 }
  const seenIds = new Set<string>()

  for (const mirror of await scanGuideMirrors(dir)) {
    if (folders.has(mirror.folder.toLowerCase())) {
      scan.alreadyInLibrary++
      continue
    }
    const guide = await readGuide(dir, mirror.folder)
    if (!guide) {
      scan.unreadable.push(mirror.folder)
      continue
    }
    if (ids.has(guide.id) || seenIds.has(guide.id)) {
      scan.alreadyInLibrary++
      continue
    }
    seenIds.add(guide.id)

    const adopted: Guide = { ...guide, folder: mirror.folder, pinned: false }
    delete adopted.order
    const missing: string[] = []
    for (const { ref } of collectGuideAssets(adopted)) {
      const rel = normalizeRef(ref)
      if (!rel || !(await findFile(dir, guideBase(mirror.folder) + rel))) missing.push(ref)
    }
    scan.found.push({ folder: mirror.folder, guide: adopted, missing })
  }
  return scan
}

/** The guide in `guides/<folder>/guide.json`, or null when it cannot be read as one. */
async function readGuide(dir: FileSystemDirectoryHandle, folder: string): Promise<Guide | null> {
  try {
    const own = await (await dir.getDirectoryHandle(GUIDES_DIR)).getDirectoryHandle(folder)
    const text = await readTextFile(own, GUIDE_FILENAME)
    return text === null ? null : normalizeGuide(JSON.parse(text))
  } catch {
    return null
  }
}
