import { useCallback, useEffect, useMemo, useRef } from 'react'
import { parseGuidesFile, toGuidesFile, toPortableGuide } from './normalizeGuide'
import {
  allocateGuideFolder,
  deleteGuideFolder,
  writeGuideMirror,
} from './storage/guideFolders'
import { readGuidesJson, writeGuidesJson } from './storage/guidesFolder'
import type { FolderController } from '../sync/useFolderLifecycle'
import type { GuideAssetIo } from './useGuideAssets'
import type { Guide } from './types'

/** How long edits settle before the debounced write to `guides.json`. */
const SAVE_DEBOUNCE_MS = 800

type UseGuidesStorageArgs = {
  folder: FolderController
  /** Current in-memory guides — watched for autosave, seeded into a fresh file. */
  guides: Guide[]
  /** A just-created guide that has never been saved: written to `guides.json` but not mirrored yet. */
  pendingNewId: string | null
  /** Called with the folder's guides when the folder is linked, reconnected or rescanned. */
  onAdopt: (guides: Guide[]) => void
  /** Called when a guide has been given its own folder. */
  onFolderAssigned: (guideId: string, folderName: string) => void
}

export type GuidesStorage = {
  /** Write `guides.json` (and changed guide folders) now, skipping the debounce. */
  saveNow: () => Promise<void>
  /** Give a guide that has none a folder named after its title; resolves to the folder, or null when no folder is linked. */
  ensureFolder: GuideAssetIo['ensureFolder']
  /** Delete a guide's folder and everything in it. Throws when it cannot be removed. */
  deleteFolder: (folderName: string) => Promise<void>
  /** What `useGuideAssets` needs to resolve and add files for the open guide. */
  assetIo: GuideAssetIo
}

/**
 * Keeps the guides list and the linked folder in step: hydrates from `guides.json`
 * whenever the folder is linked, reconnected or rescanned, debounce-writes it back
 * on every edit, and mirrors each guide that has its own folder to
 * `guides/<folder>/guide.json`. `guides.json` stays the single source of truth —
 * the mirrors are derived copies so a guide folder is self-contained. With no
 * folder linked it is inert and the guides stay an in-memory scratchpad. The
 * folder itself (link / permission / epoch) is owned by `useFolderLifecycle`.
 */
export function useGuidesStorage({
  folder,
  guides,
  pendingNewId,
  onAdopt,
  onFolderAssigned,
}: UseGuidesStorageArgs): GuidesStorage {
  const { dir, epoch, report, runExclusive } = folder

  const dirRef = useRef<FileSystemDirectoryHandle | null>(dir)
  const linkedRef = useRef(false)
  /** `JSON.stringify` of the guides last known to be in `guides.json` — guards redundant writes. */
  const syncedSnapshotRef = useRef('')
  /** Portable JSON of each guide as last written to (or found in) its folder mirror. */
  const mirrorsRef = useRef<Map<string, string>>(new Map())
  const guidesRef = useRef(guides)
  const pendingRef = useRef(pendingNewId)
  const onAdoptRef = useRef(onAdopt)
  const onFolderAssignedRef = useRef(onFolderAssigned)

  useEffect(() => {
    dirRef.current = dir
  }, [dir])
  useEffect(() => {
    guidesRef.current = guides
  }, [guides])
  useEffect(() => {
    pendingRef.current = pendingNewId
  }, [pendingNewId])
  useEffect(() => {
    onAdoptRef.current = onAdopt
    onFolderAssignedRef.current = onFolderAssigned
  }, [onAdopt, onFolderAssigned])

  /** Trust the mirrors that are on disk: only guides that change from here on are rewritten. */
  const trustMirrors = useCallback((list: Guide[]) => {
    mirrorsRef.current = new Map(
      list.filter((g) => g.folder).map((g) => [g.id, JSON.stringify(toPortableGuide(g))]),
    )
  }, [])

  /* ---- adopt the folder's guides whenever the folder (re)appears ----------- */

  useEffect(() => {
    if (!dir) return
    let cancelled = false
    void runExclusive(async () => {
      if (cancelled) return
      try {
        const text = await readGuidesJson(dir)
        if (cancelled) return
        if (text !== null) {
          let parsed: Guide[]
          try {
            parsed = parseGuidesFile(text)
          } catch {
            report.failed('The guides.json in that folder is not valid JSON.')
            return
          }
          syncedSnapshotRef.current = JSON.stringify(parsed)
          trustMirrors(parsed)
          onAdoptRef.current(parsed)
        } else {
          const seed = guidesRef.current
          await writeGuidesJson(dir, JSON.stringify(toGuidesFile(seed), null, 2))
          syncedSnapshotRef.current = JSON.stringify(seed)
          trustMirrors(seed)
        }
        linkedRef.current = true
        report.synced()
        report.clearError()
      } catch {
        if (!cancelled) report.failed('Could not read that folder — link it again.')
      }
    })
    return () => {
      cancelled = true
      linkedRef.current = false
    }
  }, [dir, epoch, report, runExclusive, trustMirrors])

  /* ---- debounced autosave -------------------------------------------- */

  const flush = useCallback(
    () =>
      runExclusive(async () => {
        const handle = dirRef.current
        if (!handle || !linkedRef.current) return
        const list = guidesRef.current
        const current = JSON.stringify(list)
        if (current === syncedSnapshotRef.current) return
        report.saving()
        try {
          await writeGuidesJson(handle, JSON.stringify(toGuidesFile(list), null, 2))
          syncedSnapshotRef.current = current
        } catch {
          report.failed('Could not write to the folder — check it still exists.')
          return
        }

        // Mirrors come second and only for guides that changed; a never-saved guide waits for its Save.
        let mirrorFailed = false
        for (const guide of list) {
          if (!guide.folder || guide.id === pendingRef.current) continue
          const json = JSON.stringify(toPortableGuide(guide))
          if (mirrorsRef.current.get(guide.id) === json) continue
          try {
            await writeGuideMirror(handle, guide.folder, guide)
            mirrorsRef.current.set(guide.id, json)
          } catch {
            mirrorFailed = true
          }
        }
        if (mirrorFailed) {
          syncedSnapshotRef.current = '' // so the next save retries the mirrors
          report.failed('Could not update a guide’s own folder — check the folder is still there.')
        } else {
          report.saved()
        }
      }, true),
    [report, runExclusive],
  )

  useEffect(() => {
    if (!linkedRef.current || !dirRef.current) return
    if (JSON.stringify(guides) === syncedSnapshotRef.current) return
    const timer = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [guides, flush])

  /* ---- guide folders -------------------------------------------------- */

  const ensureFolder = useCallback<GuidesStorage['ensureFolder']>(
    (guide) =>
      runExclusive(async () => {
        if (guide.folder) return guide.folder
        const handle = dirRef.current
        if (!handle || !linkedRef.current) return null
        const known = guidesRef.current.find((g) => g.id === guide.id)
        if (known?.folder) return known.folder
        try {
          const taken = new Set(guidesRef.current.flatMap((g) => (g.folder ? [g.folder.toLowerCase()] : [])))
          const title = guide.title.trim() || `new-guide-${guide.id.slice(0, 8)}`
          const name = await allocateGuideFolder(handle, title, taken)
          // Visible straight away to a second call, before React has re-rendered.
          guidesRef.current = guidesRef.current.map((g) => (g.id === guide.id ? { ...g, folder: name } : g))
          onFolderAssignedRef.current(guide.id, name)
          return name
        } catch {
          report.warn('Could not create a folder for this guide.')
          return null
        }
      }),
    [report, runExclusive],
  )

  const deleteFolder = useCallback(
    (folderName: string) =>
      runExclusive(async () => {
        const handle = dirRef.current
        if (handle) await deleteGuideFolder(handle, folderName)
      }),
    [runExclusive],
  )

  const assetIo = useMemo<GuideAssetIo>(
    () => ({ dir, epoch, pendingNewId, ensureFolder, runExclusive, report }),
    [dir, epoch, pendingNewId, ensureFolder, runExclusive, report],
  )

  return { saveNow: flush, ensureFolder, deleteFolder, assetIo }
}
