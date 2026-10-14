/**
 * The one place that knows which parts of a guide point at files: a step's
 * `image`, and the `projectZip` on a section, a chapter or a standalone section
 * part. Organize, export / import and the missing-file checks all go through
 * these two traversals, so a new asset field only has to be added here.
 */
import { isSafeSegment } from './fsNames'
import type { Guide, GuidePart, GuideSection, GuideStep } from '../types'

export type AssetKind = 'image' | 'zip'
export type AssetRef = { kind: AssetKind; ref: string }

/** Folder (inside a guide's own folder) each kind of asset lives in. */
export const IMAGES_DIR = 'images'
export const PROJECTS_DIR_NAME = 'projects'

/**
 * A stored reference as a safe, forward-slash, NFC-normalised relative path, or
 * `null` when it is empty or would climb out of its folder (`..`, a drive letter).
 */
export function normalizeRef(ref: string): string | null {
  const segments = ref
    .trim()
    .replace(/\\/g, '/')
    .normalize('NFC')
    .split('/')
    .filter((s) => s !== '' && s !== '.')
  if (segments.length === 0 || /^[a-zA-Z]:$/.test(segments[0])) return null
  return segments.every(isSafeSegment) ? segments.join('/') : null
}

/**
 * Where a root-relative reference ends up inside a guide's own folder:
 * images under `images/`, project zips under `projects/` (a `projects/x.zip`
 * reference keeps that path as it is).
 */
export function folderRelativePath(kind: AssetKind, ref: string): string {
  const clean = normalizeRef(ref) ?? ref
  if (kind === 'image') return `${IMAGES_DIR}/${clean}`
  return clean.startsWith(`${PROJECTS_DIR_NAME}/`) ? clean : `${PROJECTS_DIR_NAME}/${clean}`
}

type Remap = (asset: AssetRef) => string

const mapStep = (step: GuideStep, fn: Remap): GuideStep =>
  step.image ? { ...step, image: fn({ kind: 'image', ref: step.image }) } : step

const mapZip = <T extends { projectZip?: string }>(item: T, fn: Remap): T =>
  item.projectZip ? { ...item, projectZip: fn({ kind: 'zip', ref: item.projectZip }) } : item

const mapSection = (section: GuideSection, fn: Remap): GuideSection => ({
  ...mapZip(section, fn),
  steps: section.steps.map((s) => mapStep(s, fn)),
})

function mapPart(part: GuidePart, fn: Remap): GuidePart {
  if (part.type === 'chapter') {
    return { ...mapZip(part, fn), sections: part.sections.map((s) => mapSection(s, fn)) }
  }
  if (part.type === 'section') {
    return { ...mapZip(part, fn), steps: part.steps.map((s) => mapStep(s, fn)) }
  }
  return part // tables, callouts, terms and panels hold no files
}

/** A copy of `guide` with every file reference passed through `fn`. */
export function mapGuideAssets(guide: Guide, fn: Remap): Guide {
  return { ...guide, parts: guide.parts.map((p) => mapPart(p, fn)) }
}

/** Every distinct file the guide points at, in the order it first appears. */
export function collectGuideAssets(guide: Guide): AssetRef[] {
  const seen = new Set<string>()
  const found: AssetRef[] = []
  mapGuideAssets(guide, (asset) => {
    const key = `${asset.kind}:${asset.ref}`
    if (!seen.has(key)) {
      seen.add(key)
      found.push(asset)
    }
    return asset.ref
  })
  return found
}
