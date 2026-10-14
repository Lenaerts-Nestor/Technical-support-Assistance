/**
 * Reading and writing the packages the Sync page trades in: a `.zip` holding one
 * kind of content (Links, Case snippets, Guides) or a full backup. Every package
 * says what it is in a small `tsa-manifest.json`; packages made by hand or by an
 * older version are recognised from the files inside, and a wrong pick is
 * answered with the button to use instead.
 */
import { ZipArchive, ZipError } from '../guides/storage/zipReader'
import { textSource } from '../guides/storage/zipWriter'
import type { ZipSource } from '../guides/storage/zipWriter'
import { parseGuidesFile } from '../guides/normalizeGuide'
import { reviveSections } from '../links/linksData'
import { reviveSnippets } from '../cases/snippetsFile'
import type { Guide } from '../guides/types'
import type { LinkSection } from '../links/types'
import type { Snippet } from '../cases/types'

export const MANIFEST_NAME = 'tsa-manifest.json'
export const LINKS_ENTRY = 'links.json'
export const SNIPPETS_ENTRY = 'cases-snippets.json'
export const LEGACY_GUIDES_ENTRY = 'guides.json'

export type PackageKind = 'links' | 'snippets' | 'guides' | 'backup' | 'legacy-backup' | 'unknown'

/** What each kind is called to the user, and which Sync card handles it. */
export const KIND_LABEL: Record<PackageKind, string> = {
  links: 'a Links export',
  snippets: 'a Case snippets export',
  guides: 'a Guides package',
  backup: 'a full backup',
  'legacy-backup': 'a full backup (older layout)',
  unknown: 'something the app does not recognise',
}

const KIND_CARD: Record<PackageKind, string> = {
  links: 'Links',
  snippets: 'Case snippets',
  guides: 'Guides',
  backup: 'Full backup',
  'legacy-backup': 'Full backup',
  unknown: '',
}

/** A readable reason an import was refused — safe to show as-is. */
export class PackageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PackageError'
  }
}

/** Message for a zip / file that belongs on a different card. */
export const wrongCardMessage = (found: PackageKind, expected: string) =>
  found === 'unknown'
    ? `That file is not ${expected}.`
    : `That file is ${KIND_LABEL[found]} — use the ${KIND_CARD[found]} card instead.`

/* -- Manifest ------------------------------------------------------------ */

export function manifestSource(type: Exclude<PackageKind, 'unknown' | 'legacy-backup'>): ZipSource {
  return textSource(
    MANIFEST_NAME,
    JSON.stringify(
      {
        app: 'technical-support-assistance',
        formatVersion: 1,
        type,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
}

/* -- Classification ------------------------------------------------------ */

/** Depth ≤ 3: `guide.json`, `<slug>/guide.json`, `guides/<slug>/guide.json`. */
export const isGuideEntry = (path: string) => {
  const parts = path.toLowerCase().split('/')
  return parts[parts.length - 1] === 'guide.json' && parts.length <= 3
}

/** What a zip holds: the manifest's word if it has one, otherwise the files inside. */
export async function classifyArchive(archive: ZipArchive): Promise<PackageKind> {
  const manifest = archive.find(MANIFEST_NAME)
  if (manifest && manifest.size < 64 * 1024) {
    try {
      const type = (JSON.parse(await archive.readText(manifest)) as { type?: unknown }).type
      if (type === 'links' || type === 'snippets' || type === 'guides' || type === 'backup') return type
    } catch {
      // A damaged manifest falls back to looking at the files.
    }
  }

  const has = (name: string) => archive.entries.some((e) => e.path.toLowerCase() === name)
  const links = has(LINKS_ENTRY)
  const snippets = has(SNIPPETS_ENTRY)
  const legacyGuides = has(LEGACY_GUIDES_ENTRY)
  const guideFolders = archive.entries.some((e) => isGuideEntry(e.path))

  if (legacyGuides && guideFolders) return 'backup'
  if (legacyGuides) return 'legacy-backup'
  if (guideFolders) return links || snippets ? 'backup' : 'guides'
  if (links && snippets) return 'backup'
  if (links) return 'links'
  if (snippets) return 'snippets'
  return 'unknown'
}

/** What a parsed JSON document looks like, judged by shape before any reviving. */
export function classifyJson(data: unknown): 'links' | 'snippets' | 'guides' | 'unknown' {
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  if (!obj) return 'unknown'
  if (!Array.isArray(data)) {
    if (Array.isArray(obj.sections)) return 'links'
    if (Array.isArray(obj.snippets)) return 'snippets'
    if ('guides' in obj || Array.isArray(obj.parts)) return 'guides'
    return 'unknown'
  }

  const tally = { links: 0, snippets: 0, guides: 0 }
  for (const raw of data) {
    const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    if (!item) continue
    if (Array.isArray(item.parts)) tally.guides++
    else if (Array.isArray(item.items)) tally.links++
    else if (typeof item.label === 'string' && typeof item.text === 'string') tally.snippets++
  }
  const [best, count] = (Object.entries(tally) as ['links' | 'snippets' | 'guides', number][]).sort(
    (a, b) => b[1] - a[1],
  )[0]
  const runnerUp = Object.values(tally).sort((a, b) => b - a)[1]
  return count > 0 && count > runnerUp ? best : 'unknown'
}

/* -- Opening a picked file ---------------------------------------------- */

const looksLikeZip = async (file: File) => {
  if (file.name.toLowerCase().endsWith('.zip')) return true
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  return head[0] === 0x50 && head[1] === 0x4b // "PK"
}

function describeZipError(error: unknown): PackageError {
  if (error instanceof PackageError) return error
  if (error instanceof ZipError) return new PackageError(error.message)
  return new PackageError('That file could not be read.')
}

/** The text of `entry` in `archive`, or a PackageError. */
async function entryText(archive: ZipArchive, name: string): Promise<string> {
  const entry = archive.find(name)
  if (!entry) throw new PackageError(`The zip has no ${name}.`)
  return archive.readText(entry)
}

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new PackageError(`${what} is not valid JSON.`)
  }
}

/**
 * Sections from a picked file: a Links zip, a full backup (only its `links.json`
 * is used), or a bare `links.json`.
 */
export async function readLinksPackage(file: File): Promise<LinkSection[]> {
  try {
    let data: unknown
    if (await looksLikeZip(file)) {
      const archive = await ZipArchive.open(file)
      const kind = await classifyArchive(archive)
      if (kind !== 'links' && kind !== 'backup' && kind !== 'legacy-backup') {
        throw new PackageError(wrongCardMessage(kind, 'a Links export'))
      }
      data = parseJson(await entryText(archive, LINKS_ENTRY), LINKS_ENTRY)
    } else {
      data = parseJson(await file.text(), file.name)
    }
    const shape = classifyJson(data)
    if (shape !== 'links') throw new PackageError(wrongCardMessage(shape, 'a Links export'))
    return reviveSections(data) ?? []
  } catch (error) {
    throw describeZipError(error)
  }
}

/** Snippets from a picked file: a Case snippets zip, a full backup, or a bare `cases-snippets.json`. */
export async function readSnippetsPackage(file: File): Promise<Snippet[]> {
  try {
    let data: unknown
    if (await looksLikeZip(file)) {
      const archive = await ZipArchive.open(file)
      const kind = await classifyArchive(archive)
      if (kind !== 'snippets' && kind !== 'backup' && kind !== 'legacy-backup') {
        throw new PackageError(wrongCardMessage(kind, 'a Case snippets export'))
      }
      data = parseJson(await entryText(archive, SNIPPETS_ENTRY), SNIPPETS_ENTRY)
    } else {
      data = parseJson(await file.text(), file.name)
    }
    const shape = classifyJson(data)
    if (shape !== 'snippets') throw new PackageError(wrongCardMessage(shape, 'a Case snippets export'))
    return reviveSnippets(data) ?? []
  } catch (error) {
    throw describeZipError(error)
  }
}

/** Guides from a picked guides JSON (text only — a zip package is handled by the guide importer). */
export async function readGuidesJsonFile(file: File): Promise<Guide[]> {
  if (await looksLikeZip(file)) {
    throw new PackageError('That is a zip — use "Import guide package" for zips; this button reads a guides JSON.')
  }
  const data = parseJson(await file.text(), file.name)
  const shape = classifyJson(data)
  if (shape !== 'guides') throw new PackageError(wrongCardMessage(shape, 'a guides JSON'))
  const guides = parseGuidesFile(JSON.stringify(Array.isArray(data) || 'guides' in (data as object) ? data : [data]))
  if (guides.length === 0) throw new PackageError('That file contains no guides.')
  return guides
}

/* -- Writing ------------------------------------------------------------- */

export const linksPackage = (sections: LinkSection[]): ZipSource[] => [
  manifestSource('links'),
  textSource(LINKS_ENTRY, JSON.stringify({ sections }, null, 2)),
]

export const snippetsPackage = (snippets: Snippet[]): ZipSource[] => [
  manifestSource('snippets'),
  textSource(SNIPPETS_ENTRY, JSON.stringify({ snippets }, null, 2)),
]

/** `YYYY-MM-DD` for file names. */
export const datestamp = () => new Date().toISOString().slice(0, 10)
