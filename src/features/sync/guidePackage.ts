/**
 * One guide as a package you can hand to someone: a .zip with the guide's folder
 * in it (`<name>/guide.json`, `<name>/images/…`, `<name>/projects/…`) and a small
 * manifest. Importing merges it into the library by guide id and never touches
 * anything else. Unzipping a package into `guides/` by hand — or zipping a guide
 * folder in Explorer — gives the same thing.
 */
import { collectGuideAssets, folderRelativePath, mapGuideAssets, normalizeRef } from '../guides/storage/assets'
import { collectFolderSources } from '../guides/storage/folderZip'
import type { ZipSource } from '../guides/storage/folderZip'
import { findDir, findFile, isQuotaError, writeFileExact } from '../guides/storage/fsOps'
import { GUIDES_DIR, allocateGuideFolder, writeGuideMirror } from '../guides/storage/guideFolders'
import { PATH_BUDGET, shortenTarget } from '../guides/storage/organize'
import { slugify } from '../guides/storage/slug'
import { ZipArchive } from '../guides/storage/zipReader'
import type { ZipEntryInfo } from '../guides/storage/zipReader'
import { buildZip, textSource } from '../guides/storage/zipWriter'
import type { ConflictMode } from '../guides/guidesMerge'
import { normalizeGuide, toPortableGuide } from '../guides/normalizeGuide'
import type { Guide } from '../guides/types'
import { PackageError, classifyArchive, datestamp, isGuideEntry, manifestSource, wrongCardMessage } from './packages'

/* -- export ---------------------------------------------------------------- */

export type GuideExport = {
  blob: Blob
  filename: string
  files: number
  /** References the guide makes to files that could not be found, so the package lacks them. */
  missing: string[]
  /** No folder was available, so only the text of the guide is in the package. */
  textOnly: boolean
}

/**
 * Build the package for `guide`. A guide with a folder ships that folder; a guide
 * from the old shared pool has its files gathered from the folder root and laid
 * out the way Organize would, so the package looks the same either way.
 */
export async function exportGuideZip(dir: FileSystemDirectoryHandle | null, guide: Guide): Promise<GuideExport> {
  const wrapper = guide.folder ?? slugify(guide.title)
  const sources: ZipSource[] = []
  const missing: string[] = []
  let exported: Guide = toPortableGuide(guide)

  if (!dir) {
    for (const { ref } of collectGuideAssets(guide)) missing.push(ref)
  } else if (guide.folder) {
    const own = await findDir(dir, [GUIDES_DIR, guide.folder])
    if (own) {
      for (const source of await collectFolderSources(own, `${wrapper}/`)) {
        if (source.path !== `${wrapper}/guide.json`) sources.push(source)
      }
    }
    for (const { ref } of collectGuideAssets(guide)) {
      const rel = normalizeRef(ref)
      if (!rel || !own || !(await findFile(own, rel))) missing.push(ref)
    }
  } else {
    const rewrites = new Map<string, string>()
    const room = PATH_BUDGET - (GUIDES_DIR.length + 1 + wrapper.length + 1)
    for (const { kind, ref } of collectGuideAssets(guide)) {
      const source = normalizeRef(ref)
      const target = shortenTarget(folderRelativePath(kind, source ?? ref), room)
      rewrites.set(`${kind}:${ref}`, target)
      const file = source ? await findFile(dir, source) : null
      if (file) sources.push({ path: `${wrapper}/${target}`, blob: file, modified: new Date(file.lastModified) })
      else missing.push(ref)
    }
    exported = mapGuideAssets(exported, ({ kind, ref }) => rewrites.get(`${kind}:${ref}`) ?? ref)
  }

  const all = [
    textSource(`${wrapper}/guide.json`, JSON.stringify(exported, null, 2)),
    ...sources,
    manifestSource('guides'),
  ]
  return {
    blob: await buildZip(all),
    filename: `${wrapper}-${datestamp()}.zip`,
    files: sources.length,
    missing,
    textOnly: !dir,
  }
}

/* -- inspect ------------------------------------------------------------------ */

export type PackageGuide = {
  /** Path prefix of the guide inside the zip: "" , "dm-nvx/" or "guides/dm-nvx/". */
  root: string
  /** Name to base the guide's folder on. */
  folderName: string
  guide: Guide
  /** Files under the root, `guide.json` excluded. */
  files: ZipEntryInfo[]
  bytes: number
  /** References the package does not hold the file for. */
  missing: string[]
}

export type GuidePackage = {
  archive: ZipArchive
  guides: PackageGuide[]
  /** Guide files in the zip that could not be read as a guide. */
  unreadable: string[]
}

/** The guide in a `guide.json` entry, or null when it is not valid JSON or not a guide. */
async function readPackagedGuide(archive: ZipArchive, entry: ZipEntryInfo): Promise<Guide | null> {
  try {
    return normalizeGuide(JSON.parse(await archive.readText(entry)))
  } catch {
    return null
  }
}

export async function inspectGuidePackage(file: Blob): Promise<GuidePackage> {
  const archive = await ZipArchive.open(file)
  const kind = await classifyArchive(archive)
  if (kind !== 'guides') throw new PackageError(wrongCardMessage(kind, 'a guide package'))

  const roots = archive.entries.filter((e) => isGuideEntry(e.path))
  const prefixes = roots.map((e) => e.path.slice(0, e.path.length - 'guide.json'.length))
  const result: GuidePackage = { archive, guides: [], unreadable: [] }
  const seen = new Set<string>()

  for (const [index, entry] of roots.entries()) {
    const root = prefixes[index]
    const guide = await readPackagedGuide(archive, entry)
    if (!guide || seen.has(guide.id)) {
      result.unreadable.push(entry.path)
      continue
    }
    seen.add(guide.id)

    const nested = prefixes.filter((p) => p.length > root.length && p.startsWith(root))
    const files = archive.entries.filter(
      (e) => e.path.startsWith(root) && e !== entry && !nested.some((p) => e.path.startsWith(p)),
    )
    const missing: string[] = []
    for (const { ref } of collectGuideAssets(guide)) {
      const rel = normalizeRef(ref)
      if (!rel || !archive.find(root + rel)) missing.push(ref)
    }
    result.guides.push({
      root,
      folderName: root.split('/').filter(Boolean).pop() ?? slugify(guide.title),
      guide,
      files,
      bytes: files.reduce((n, f) => n + f.size, 0),
      missing,
    })
  }
  return result
}

/* -- import -------------------------------------------------------------------- */

export type ImportOutcome = {
  /** Guides to upsert into the library by id (replaced guides keep their local pin and position). */
  guides: Guide[]
  added: number
  replaced: number
  copied: number
  skipped: number
  failed: { title: string; reason: string }[]
  /** Extra files that could not be written but that no reference needed. */
  warnings: number
}

/**
 * Write the package's guides into `dir` and say what to put in the library. Each
 * guide is all-or-nothing: its files go in first, its `guide.json` last, and a
 * guide that fails is not added (a retry reuses the same folder).
 */
export async function importGuidePackage(
  dir: FileSystemDirectoryHandle,
  pkg: GuidePackage,
  mode: ConflictMode,
  library: Guide[],
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { guides: [], added: 0, replaced: 0, copied: 0, skipped: 0, failed: [], warnings: 0 }
  const taken = new Set(library.flatMap((g) => (g.folder ? [g.folder.toLowerCase()] : [])))

  for (const item of pkg.guides) {
    const existing = library.find((g) => g.id === item.guide.id)
    if (existing && mode === 'skip') {
      outcome.skipped++
      continue
    }
    try {
      let guide: Guide = toPortableGuide(item.guide)
      let folder: string
      if (existing && mode === 'replace') {
        guide = { ...guide, pinned: existing.pinned, ...(existing.order !== undefined ? { order: existing.order } : {}) }
        folder = existing.folder ?? (await allocateGuideFolder(dir, item.folderName, taken))
      } else {
        if (existing) guide = { ...guide, id: crypto.randomUUID(), title: `${guide.title || 'Untitled guide'} (imported)` }
        guide = { ...guide, pinned: false }
        folder = await allocateGuideFolder(dir, item.folderName, taken)
      }

      // Which files a reference needs — a failure there fails the guide; any other file only warns.
      const referenced = new Map<string, string>() // lowercased zip-relative path -> actual
      for (const { ref } of collectGuideAssets(guide)) {
        const rel = normalizeRef(ref)
        const found = rel ? pkg.archive.find(item.root + rel) : undefined
        if (found) referenced.set(found.path.toLowerCase(), found.path.slice(item.root.length))
      }

      const renames = new Map<string, string>()
      const room = PATH_BUDGET - (GUIDES_DIR.length + 1 + folder.length + 1)
      for (const entry of item.files) {
        const rel = entry.path.slice(item.root.length)
        const dest = rel.length > room ? shortenTarget(rel, room) : rel
        if (dest !== rel) renames.set(rel, dest)
        try {
          await writeFileExact(dir, `${GUIDES_DIR}/${folder}/${dest}`, (w) => pkg.archive.copyTo(entry, w), entry.size)
        } catch (error) {
          if (isQuotaError(error) || referenced.has(entry.path.toLowerCase())) throw error
          outcome.warnings++
        }
      }

      const rewritten = mapGuideAssets(guide, ({ ref }) => {
        const rel = normalizeRef(ref)
        const actual = rel ? pkg.archive.find(item.root + rel)?.path.slice(item.root.length) : undefined
        return actual ? (renames.get(actual) ?? actual) : ref
      })
      await writeGuideMirror(dir, folder, rewritten)
      outcome.guides.push({ ...rewritten, folder })
      if (existing && mode === 'replace') outcome.replaced++
      else if (existing) outcome.copied++
      else outcome.added++
    } catch (error) {
      if (isQuotaError(error)) throw new PackageError('The disk is full — the import stopped. Free some space and try again.')
      outcome.failed.push({
        title: item.guide.title || 'Untitled guide',
        reason: error instanceof Error ? error.message : 'a file could not be written',
      })
    }
  }
  return outcome
}
