/**
 * Organize: move the guides of the old shared layout (every image and project
 * zip in one pool at the folder root) into folders of their own.
 *
 * It only ever copies. Originals, root images and `guides.json` are never moved
 * or deleted, and `guides.json` is byte-copied to `legacy-backup/` first. Each
 * guide is all-or-nothing: its files are copied and verified, its references
 * rewritten, its `guide.json` mirror written, and only then does it get its
 * `folder` — a guide that fails stays exactly as it was and can be retried.
 */
import { collectGuideAssets, folderRelativePath, mapGuideAssets, normalizeRef } from './assets'
import type { AssetKind } from './assets'
import { isIgnoredName } from './fsNames'
import { findDir, findFile, isNotFoundError, isQuotaError, readTextFile, writeFileExact } from './fsOps'
import { GUIDE_FILENAME, GUIDES_DIR, allocateGuideFolder, claimedFolderNames, writeGuideMirror } from './guideFolders'
import { GUIDES_FILENAME, listImageFiles } from './guidesFolder'
import { uniqueSlug } from './slug'
import type { Guide } from '../types'

export const LEGACY_BACKUP_DIR = 'legacy-backup'

/** Longest `guides/<folder>/<file>` path Organize will create (Windows stops at 260 including the library's own path). */
export const PATH_BUDGET = 170

export type OrganizeAsset = {
  kind: AssetKind
  /** The reference as stored on the guide. */
  ref: string
  /** Root-relative source path, or null when the reference is not a safe relative path. */
  source: string | null
  /** Where it goes, relative to the guide's folder (`images/…` / `projects/…`). */
  target: string
  status: 'copy' | 'missing' | 'unsafe'
  size: number
  /** The target name was shortened to stay inside the path budget. */
  shortened: boolean
}

export type OrganizeGuidePlan = { guide: Guide; folder: string; assets: OrganizeAsset[] }

export type OrganizePlan = {
  guides: OrganizeGuidePlan[]
  /** Files that will be copied, bytes included — a file shared by two guides counts twice. */
  files: number
  bytes: number
  /** Files that two or more guides use; each gets a copy per guide. */
  sharedFiles: number
  /** References whose file is not in the folder (they were dead already). */
  missing: { guide: string; ref: string }[]
  unsafe: { guide: string; ref: string }[]
  shortened: number
  /** Images at the root (or one level down) that no guide refers to — left where they are. */
  unreferenced: string[]
}

/** Guides that have no folder of their own yet. */
export const isShared = (guide: Guide) => !guide.folder

/** Shared-pool guides that actually point at files — the ones worth nudging the user about. */
export const countGuidesToOrganize = (guides: Guide[]) =>
  guides.filter((g) => isShared(g) && collectGuideAssets(g).length > 0).length

/* -- naming --------------------------------------------------------------- */

function hash6(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).padStart(6, '0').slice(-6)
}

/**
 * Keep `target` (a folder-relative path) within `room` characters by truncating
 * the file stem and adding a short hash of the original name, so two long names
 * that share a prefix do not collide. The extension and sub-folders are kept.
 */
export function shortenTarget(target: string, room: number): string {
  if (target.length <= room) return target
  const slash = target.lastIndexOf('/')
  const dir = slash >= 0 ? target.slice(0, slash + 1) : ''
  const file = target.slice(slash + 1)
  const dot = file.lastIndexOf('.')
  const ext = dot > 0 ? file.slice(dot) : ''
  const stem = dot > 0 ? file.slice(0, dot) : file
  const keep = Math.max(8, room - dir.length - ext.length - 7)
  return `${dir}${stem.slice(0, keep).trimEnd()}-${hash6(target)}${ext}`
}

/* -- scanning ----------------------------------------------------------------- */

export type FolderMirror = { folder: string; id: string | null }

/** The guide id in every `guides/<folder>/guide.json` (null when the file cannot be read as a guide). */
export async function scanGuideMirrors(dir: FileSystemDirectoryHandle): Promise<FolderMirror[]> {
  const root = await findDir(dir, [GUIDES_DIR])
  const found: FolderMirror[] = []
  if (!root) return found
  for await (const [name, handle] of root.entries()) {
    if (isIgnoredName(name) || handle.kind !== 'directory') continue
    let text: string | null
    try {
      text = await readTextFile(handle as FileSystemDirectoryHandle, GUIDE_FILENAME)
    } catch {
      text = ''
    }
    if (text === null) continue // not a guide folder (no guide.json)
    let id: string | null = null
    try {
      const parsed = JSON.parse(text) as { id?: unknown }
      if (typeof parsed.id === 'string' && parsed.id) id = parsed.id
    } catch {
      // unreadable guide.json: still listed, with no id
    }
    found.push({ folder: name, id })
  }
  return found.sort((a, b) => a.folder.localeCompare(b.folder))
}

/* -- plan --------------------------------------------------------------------------- */

export async function planOrganize(dir: FileSystemDirectoryHandle, guides: Guide[]): Promise<OrganizePlan> {
  const candidates = guides.filter(isShared)
  const mirrors = new Map<string, string>()
  for (const m of await scanGuideMirrors(dir)) if (m.id && !mirrors.has(m.id)) mirrors.set(m.id, m.folder)

  // Names already spoken for: claimed folders on disk plus folders the library already uses.
  const taken = await claimedFolderNames(dir)
  for (const g of guides) if (g.folder) taken.add(g.folder.toLowerCase())
  for (const folder of mirrors.values()) taken.add(folder.toLowerCase())

  const plan: OrganizePlan = {
    guides: [],
    files: 0,
    bytes: 0,
    sharedFiles: 0,
    missing: [],
    unsafe: [],
    shortened: 0,
    unreferenced: [],
  }
  const uses = new Map<string, number>()
  const referenced = new Set<string>()

  for (const guide of candidates) {
    const folder = mirrors.get(guide.id) ?? uniqueSlug(guide.title, taken)
    const assets: OrganizeAsset[] = []
    for (const { kind, ref } of collectGuideAssets(guide)) {
      const source = normalizeRef(ref)
      let target = source ? folderRelativePath(kind, source) : folderRelativePath(kind, ref)
      let shortened = false
      const room = PATH_BUDGET - (GUIDES_DIR.length + 1 + folder.length + 1)
      if (target.length > room) {
        target = shortenTarget(target, room)
        shortened = true
      }
      if (!source) {
        plan.unsafe.push({ guide: guide.title, ref })
        assets.push({ kind, ref, source, target, status: 'unsafe', size: 0, shortened: false })
        continue
      }
      referenced.add(source)
      const file = await findFile(dir, source)
      if (!file) {
        plan.missing.push({ guide: guide.title, ref })
        assets.push({ kind, ref, source, target, status: 'missing', size: 0, shortened })
        continue
      }
      uses.set(source, (uses.get(source) ?? 0) + 1)
      plan.files++
      plan.bytes += file.size
      if (shortened) plan.shortened++
      assets.push({ kind, ref, source, target, status: 'copy', size: file.size, shortened })
    }
    plan.guides.push({ guide, folder, assets })
  }

  plan.sharedFiles = [...uses.values()].filter((n) => n > 1).length
  plan.unreferenced = (await listImageFiles(dir, 2000)).filter((p) => !referenced.has(p))
  return plan
}

/* -- run ----------------------------------------------------------------------------- */

export type OrganizeResult = {
  /** Guides that now have a folder, with references rewritten — apply these to the library. */
  done: Guide[]
  /** Guides left exactly as they were, and why. */
  failed: { id: string; title: string; reason: string }[]
  copied: number
  /** Files that were already in place (an earlier, interrupted run). */
  alreadyThere: number
}

/** The run could not start or has to stop — nothing it did is undone, and a re-run picks up from there. */
export class OrganizeAbort extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrganizeAbort'
  }
}

type RunIo = {
  /** The text of `guides.json` as it is on disk now (null when there is none). */
  guidesJson: string | null
  /** Stamp used to name a backup when `legacy-backup/guides.json` already exists. */
  now: string
  onProgress?: (done: number, total: number) => void
  /** Called as each guide finishes, so the library can adopt it straight away. */
  onGuide?: (guide: Guide) => void
}

async function writeLegacyBackup(dir: FileSystemDirectoryHandle, io: RunIo): Promise<void> {
  if (io.guidesJson === null) return
  const folder = await findDir(dir, [LEGACY_BACKUP_DIR])
  let name = GUIDES_FILENAME
  if (folder) {
    try {
      await folder.getFileHandle(name)
      name = `guides.${io.now.replace(/[^0-9A-Za-z]/g, '')}.json`
    } catch (e) {
      if (!isNotFoundError(e)) throw e
    }
  }
  try {
    await writeFileExact(dir, `${LEGACY_BACKUP_DIR}/${name}`, io.guidesJson)
  } catch {
    throw new OrganizeAbort('Could not write the backup copy of guides.json, so nothing was changed.')
  }
}

export async function runOrganize(
  dir: FileSystemDirectoryHandle,
  plan: OrganizePlan,
  io: RunIo,
): Promise<OrganizeResult> {
  const result: OrganizeResult = { done: [], failed: [], copied: 0, alreadyThere: 0 }
  if (plan.guides.length === 0) return result

  await writeLegacyBackup(dir, io)

  // A folder already holding this guide's mirror (an interrupted earlier run) is reused, not duplicated.
  const mirrors = new Map<string, string>()
  for (const m of await scanGuideMirrors(dir)) if (m.id && !mirrors.has(m.id)) mirrors.set(m.id, m.folder)
  const taken = await claimedFolderNames(dir)
  for (const g of plan.guides) if (g.guide.folder) taken.add(g.guide.folder.toLowerCase())
  for (const folder of mirrors.values()) taken.add(folder.toLowerCase())

  let finished = 0
  for (const item of plan.guides) {
    const { guide } = item
    try {
      const folder = mirrors.get(guide.id) ?? (await allocateGuideFolder(dir, guide.title, taken))
      const rewrites = new Map<string, string>() // `${kind}:${ref}` -> new reference

      for (const asset of item.assets) {
        if (asset.status !== 'copy' || !asset.source) {
          // A dead or unsafe reference is not copied. A dead one still moves under the guide's
          // folder (it was dead before and stays so until the file is dropped there); an unsafe one is left alone.
          if (asset.status === 'missing') rewrites.set(`${asset.kind}:${asset.ref}`, asset.target)
          continue
        }
        const source = await findFile(dir, asset.source)
        if (!source) throw new Error(`"${asset.source}" is no longer in the folder.`)
        const dest = `${GUIDES_DIR}/${folder}/${asset.target}`
        const existing = await findFile(dir, dest)
        if (existing && existing.size === source.size) {
          result.alreadyThere++
        } else {
          await writeFileExact(dir, dest, source, source.size)
          result.copied++
        }
        rewrites.set(`${asset.kind}:${asset.ref}`, asset.target)
      }

      const rewritten = mapGuideAssets(guide, ({ kind, ref }) => rewrites.get(`${kind}:${ref}`) ?? ref)
      const organized: Guide = { ...rewritten, folder }
      await writeGuideMirror(dir, folder, organized)
      result.done.push(organized)
      io.onGuide?.(organized)
    } catch (error) {
      if (isQuotaError(error)) throw new OrganizeAbort('The disk is full — Organize stopped. Free some space and run it again.')
      result.failed.push({
        id: guide.id,
        title: guide.title || 'Untitled guide',
        reason: error instanceof Error ? error.message : 'a file could not be copied',
      })
    }
    io.onProgress?.(++finished, plan.guides.length)
  }
  return result
}
