import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseGuidesFile, toGuidesFile } from './normalizeGuide'
import { collectGuideAssets } from './storage/assets'
import {
  importIntoFolder,
  listImageFiles,
  listZipFiles,
  readFileFromFolder,
  readGuidesJson,
  readImageFile,
  writeGuidesJson,
} from './storage/guidesFolder'
import { downloadBlob } from './storage/folderZip'
import type { FolderController } from '../sync/useFolderLifecycle'
import type { GuideAssets } from './view/GuideAssetsContext'
import type { Guide } from './types'

/** How long edits settle before the debounced write to `guides.json`. */
const SAVE_DEBOUNCE_MS = 800

type UseGuidesStorageArgs = {
  folder: FolderController
  /** Current in-memory guides — watched for autosave, seeded into a fresh file. */
  guides: Guide[]
  /** Called with the folder's guides when the folder is linked, reconnected or rescanned. */
  onAdopt: (guides: Guide[]) => void
}

export type GuidesStorage = {
  assets: GuideAssets
  /** Write `guides.json` now, skipping the debounce. */
  saveNow: () => Promise<void>
}

/** Every image filename referenced by a step, across all guides. */
function collectImageNames(guides: Guide[]): Set<string> {
  const names = new Set<string>()
  for (const guide of guides) {
    for (const asset of collectGuideAssets(guide)) if (asset.kind === 'image') names.add(asset.ref)
  }
  return names
}

/**
 * Keeps the guides list and the linked folder in step: hydrates from its
 * `guides.json` whenever the folder is linked, reconnected or rescanned,
 * debounce-writes it back on every edit, and resolves step images out of the same
 * folder. With no folder linked it is inert — the guides stay an in-memory
 * scratchpad. The folder itself (link / permission / epoch) is owned by
 * `useFolderLifecycle`.
 */
export function useGuidesStorage({ folder, guides, onAdopt }: UseGuidesStorageArgs): GuidesStorage {
  const { dir, epoch, report, runExclusive } = folder

  /** Set once the folder's guides have been adopted for the current `[dir, epoch]`. */
  const [adoptedEpoch, setAdoptedEpoch] = useState(0)
  const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(() => new Map())
  /** Image filenames present in the linked folder, for the step image picker. */
  const [imageNames, setImageNames] = useState<readonly string[]>([])
  /** Project zips present in the linked folder, for the zip picker and download buttons. */
  const [zipNames, setZipNames] = useState<readonly string[]>([])

  const dirRef = useRef<FileSystemDirectoryHandle | null>(dir)
  const linkedRef = useRef(false)
  /** `JSON.stringify` of the guides last known to be on disk — guards redundant writes. */
  const syncedSnapshotRef = useRef('')
  const guidesRef = useRef(guides)
  const onAdoptRef = useRef(onAdopt)
  const requestedImagesRef = useRef<Set<string>>(new Set())
  const objectUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    dirRef.current = dir
  }, [dir])
  useEffect(() => {
    guidesRef.current = guides
  }, [guides])
  useEffect(() => {
    onAdoptRef.current = onAdopt
  }, [onAdopt])

  const releaseImages = useCallback(() => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
    objectUrlsRef.current.clear()
    requestedImagesRef.current.clear()
    setImageUrls(new Map())
    setImageNames([])
    setZipNames([])
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
          onAdoptRef.current(parsed)
        } else {
          const seed = guidesRef.current
          await writeGuidesJson(dir, JSON.stringify(toGuidesFile(seed), null, 2))
          syncedSnapshotRef.current = JSON.stringify(seed)
        }
        linkedRef.current = true
        report.synced()
        report.clearError()
        setAdoptedEpoch(epoch)
        const [images, zips] = [await listImageFiles(dir), await listZipFiles(dir)]
        if (cancelled) return
        setImageNames(images)
        setZipNames(zips)
      } catch {
        if (!cancelled) report.failed('Could not read that folder — link it again.')
      }
    })
    return () => {
      cancelled = true
      linkedRef.current = false
      releaseImages()
    }
  }, [dir, epoch, report, runExclusive, releaseImages])

  /* ---- debounced autosave -------------------------------------------- */

  const flush = useCallback(
    () =>
      runExclusive(async () => {
        const handle = dirRef.current
        if (!handle || !linkedRef.current) return
        const current = JSON.stringify(guidesRef.current)
        if (current === syncedSnapshotRef.current) return
        report.saving()
        try {
          await writeGuidesJson(handle, JSON.stringify(toGuidesFile(guidesRef.current), null, 2))
          syncedSnapshotRef.current = current
          report.saved()
        } catch {
          report.failed('Could not write to the folder — check it still exists.')
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

  /* ---- pull step images out of the folder -------------------------- */

  useEffect(() => {
    const handle = dirRef.current
    if (!handle || !linkedRef.current) return
    const pending = [...collectImageNames(guides)].filter(
      (name) => !requestedImagesRef.current.has(name),
    )
    if (pending.length === 0) return
    pending.forEach((name) => requestedImagesRef.current.add(name))

    let cancelled = false
    void (async () => {
      for (const name of pending) {
        const blob = await readImageFile(handle, name)
        if (cancelled || !blob) continue
        const url = URL.createObjectURL(blob)
        objectUrlsRef.current.add(url)
        setImageUrls((prev) => new Map(prev).set(name, url))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [guides, adoptedEpoch])

  /* ---- assets ------------------------------------------------------- */

  const resolveImage = useCallback((name: string) => imageUrls.get(name), [imageUrls])

  /**
   * Open the OS file picker inside the linked folder and hand back the chosen
   * file's name, relative to that folder where we can work it out. Resolves to
   * `null` if the user cancels or no folder is linked.
   */
  const pickImage = useCallback(async (): Promise<string | null> => {
    const root = dirRef.current
    if (!root || typeof window.showOpenFilePicker !== 'function') return null
    let file: FileSystemFileHandle
    try {
      ;[file] = await window.showOpenFilePicker({
        id: 'support-hub-guide-image',
        startIn: root,
        multiple: false,
        types: [
          {
            description: 'Images',
            accept: {
              'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'],
            },
          },
        ],
      })
    } catch {
      return null // cancelled
    }
    // `resolve` gives the path segments from the folder to the file, so a file
    // in a sub-folder comes back as "screens/step-1.png" rather than a bare name.
    const segments = await root.resolve(file).catch(() => null)
    const name = segments && segments.length > 0 ? segments.join('/') : file.name
    setImageNames((prev) => (prev.includes(name) ? prev : [...prev, name].sort()))
    return name
  }, [])

  const hasZip = useCallback((path: string) => zipNames.includes(path), [zipNames])

  const addZipName = useCallback(
    (name: string) =>
      setZipNames((prev) => (prev.includes(name) ? prev : [...prev, name].sort())),
    [],
  )

  /**
   * Open the OS file picker for a project zip. A file already inside the linked
   * folder is referenced where it is; anything else is copied into `projects/`
   * so the folder stays self-contained when it is handed to someone else.
   */
  const pickZip = useCallback(async (): Promise<string | null> => {
    const root = dirRef.current
    if (!root || typeof window.showOpenFilePicker !== 'function') return null
    let handle: FileSystemFileHandle
    try {
      ;[handle] = await window.showOpenFilePicker({
        id: 'support-hub-guide-zip',
        startIn: root,
        multiple: false,
        types: [{ description: 'Zip archives', accept: { 'application/zip': ['.zip'] } }],
      })
    } catch {
      return null // cancelled
    }
    const segments = await root.resolve(handle).catch(() => null)
    if (segments && segments.length > 0) {
      const inside = segments.join('/')
      addZipName(inside)
      return inside
    }
    try {
      const path = await importIntoFolder(root, await handle.getFile())
      addZipName(path)
      report.clearError()
      return path
    } catch {
      report.warn('Could not copy that zip into the linked folder.')
      return null
    }
  }, [addZipName, report])

  const downloadZip = useCallback(
    async (path: string): Promise<boolean> => {
      const root = dirRef.current
      const file = root ? await readFileFromFolder(root, path) : null
      if (!file) {
        report.warn(`"${path}" is not in the linked folder.`)
        return false
      }
      downloadBlob(file, path.split('/').pop() || path)
      report.clearError()
      return true
    },
    [report],
  )

  const assets = useMemo<GuideAssets>(
    () => ({ resolveImage, imageNames, pickImage, zipNames, hasZip, pickZip, downloadZip }),
    [imageNames, pickImage, resolveImage, zipNames, hasZip, pickZip, downloadZip],
  )

  return { assets, saveNow: flush }
}
