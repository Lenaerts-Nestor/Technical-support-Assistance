import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseGuidesFile, toGuidesFile } from './normalizeGuide'
import {
  clearFolderHandle,
  loadFolderHandle,
  saveFolderHandle,
} from './storage/handleStore'
import {
  isFolderSyncSupported,
  readGuidesJson,
  readImageFile,
  verifyPermission,
  writeGuidesJson,
} from './storage/guidesFolder'
import type { GuideAssets } from './view/GuideAssetsContext'
import type { Guide } from './types'

/** How long edits settle before the debounced write to `guides.json`. */
const SAVE_DEBOUNCE_MS = 800

export type FolderStatus =
  /** Browser has no File System Access API. */
  | 'unsupported'
  /** Supported, but no folder linked. */
  | 'idle'
  /** Reading the stored handle on startup. */
  | 'checking'
  /** A folder is remembered but needs a click to re-grant permission. */
  | 'reconnect'
  /** Linked and in sync. */
  | 'ready'
  | 'saving'
  | 'saved'
  | 'error'

type UseGuidesFolderArgs = {
  /** Current in-memory guides — watched for autosave, seeded into a fresh file. */
  guides: Guide[]
  /** Called with the folder's guides when a folder is linked or reconnected. */
  onAdopt: (guides: Guide[]) => void
}

export type GuidesFolderController = {
  supported: boolean
  status: FolderStatus
  folderName: string | null
  lastSyncedAt: string | null
  error: string | null
  assets: GuideAssets
  /** Pick a folder (also used to change to a different one). */
  link: () => Promise<void>
  /** Re-grant permission on the remembered folder. */
  reconnect: () => Promise<void>
  /** Forget the folder (leaves the files on disk untouched). */
  unlink: () => Promise<void>
  /** Write `guides.json` now, skipping the debounce. */
  saveNow: () => Promise<void>
}

/** Every image filename referenced by a step, across all guides. */
function collectImageNames(guides: Guide[]): Set<string> {
  const names = new Set<string>()
  const scan = (steps: { image?: string }[]) => {
    for (const step of steps) if (step.image) names.add(step.image)
  }
  for (const guide of guides) {
    for (const part of guide.parts) {
      if (part.type === 'chapter') part.sections.forEach((s) => scan(s.steps))
      else if (part.type === 'section') scan(part.steps)
    }
  }
  return names
}

/**
 * Links one on-disk folder to the guides list: remembers the directory handle in
 * IndexedDB, hydrates from its `guides.json` on load, debounce-writes it back on
 * every edit, and resolves step images out of the same folder. With no folder
 * linked it is inert — the app stays a pure in-memory scratchpad.
 */
export function useGuidesFolder({
  guides,
  onAdopt,
}: UseGuidesFolderArgs): GuidesFolderController {
  const [status, setStatus] = useState<FolderStatus>(() =>
    isFolderSyncSupported() ? 'checking' : 'unsupported',
  )
  const [folderName, setFolderName] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Bumped after every link / reconnect / unlink so image loading re-scans. */
  const [syncEpoch, setSyncEpoch] = useState(0)
  const [imageUrls, setImageUrls] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  )

  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const linkedRef = useRef(false)
  /** `JSON.stringify` of the guides last known to be on disk — guards redundant writes. */
  const syncedSnapshotRef = useRef('')
  const guidesRef = useRef(guides)
  const onAdoptRef = useRef(onAdopt)
  const requestedImagesRef = useRef<Set<string>>(new Set())
  const objectUrlsRef = useRef<Set<string>>(new Set())

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
  }, [])

  /** Read the folder's guides into state, or seed the file if it's not there yet. */
  const adoptFromFolder = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const text = await readGuidesJson(handle)
      if (text !== null) {
        let parsed: Guide[]
        try {
          parsed = parseGuidesFile(text)
        } catch {
          setError('The guides.json in that folder is not valid JSON.')
          setStatus('error')
          return
        }
        syncedSnapshotRef.current = JSON.stringify(parsed)
        onAdoptRef.current(parsed)
      } else {
        const seed = guidesRef.current
        await writeGuidesJson(handle, JSON.stringify(toGuidesFile(seed), null, 2))
        syncedSnapshotRef.current = JSON.stringify(seed)
      }
      linkedRef.current = true
      setLastSyncedAt(new Date().toISOString())
      setError(null)
      setStatus('ready')
      setSyncEpoch((n) => n + 1)
    },
    [],
  )

  const flush = useCallback(async (snapshot: string) => {
    if (!handleRef.current || !linkedRef.current) return
    if (snapshot === syncedSnapshotRef.current) return
    setStatus('saving')
    try {
      await writeGuidesJson(
        handleRef.current,
        JSON.stringify(toGuidesFile(guidesRef.current), null, 2),
      )
      syncedSnapshotRef.current = snapshot
      setLastSyncedAt(new Date().toISOString())
      setError(null)
      setStatus('saved')
    } catch {
      setError('Could not write to the folder — check it still exists.')
      setStatus('error')
    }
  }, [])

  /* ---- startup: reuse a remembered folder ------------------------------- */

  useEffect(() => {
    if (!isFolderSyncSupported()) return
    let cancelled = false
    void (async () => {
      const handle = await loadFolderHandle()
      if (cancelled) return
      if (!handle) {
        setStatus('idle')
        return
      }
      handleRef.current = handle
      setFolderName(handle.name)
      if (await verifyPermission(handle, false)) {
        if (!cancelled) await adoptFromFolder(handle)
      } else if (!cancelled) {
        setStatus('reconnect')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [adoptFromFolder])

  /* ---- debounced autosave -------------------------------------------- */

  useEffect(() => {
    if (!linkedRef.current || !handleRef.current) return
    const snapshot = JSON.stringify(guides)
    if (snapshot === syncedSnapshotRef.current) return
    const timer = window.setTimeout(() => void flush(snapshot), SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [guides, flush])

  /* ---- pull step images out of the folder -------------------------- */

  useEffect(() => {
    const handle = handleRef.current
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
  }, [guides, syncEpoch])

  useEffect(() => () => releaseImages(), [releaseImages])

  /* ---- actions ------------------------------------------------------ */

  const link = useCallback(async () => {
    if (!isFolderSyncSupported()) return
    let handle: FileSystemDirectoryHandle
    try {
      handle = await window.showDirectoryPicker({
        id: 'support-hub-guides',
        mode: 'readwrite',
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError('Could not open that folder.')
      return
    }
    if (!(await verifyPermission(handle, true))) {
      setError('Read-write permission is needed to sync a folder.')
      return
    }
    releaseImages()
    handleRef.current = handle
    await saveFolderHandle(handle)
    setFolderName(handle.name)
    await adoptFromFolder(handle)
  }, [adoptFromFolder, releaseImages])

  const reconnect = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    if (!(await verifyPermission(handle, true))) {
      setError('Permission was not granted.')
      return
    }
    await adoptFromFolder(handle)
  }, [adoptFromFolder])

  const unlink = useCallback(async () => {
    await clearFolderHandle().catch(() => {})
    releaseImages()
    handleRef.current = null
    linkedRef.current = false
    syncedSnapshotRef.current = ''
    setFolderName(null)
    setLastSyncedAt(null)
    setError(null)
    setStatus('idle')
    setSyncEpoch((n) => n + 1)
  }, [releaseImages])

  const saveNow = useCallback(
    () => flush(JSON.stringify(guidesRef.current)),
    [flush],
  )

  const resolveImage = useCallback(
    (name: string) => imageUrls.get(name),
    [imageUrls],
  )
  const assets = useMemo<GuideAssets>(() => ({ resolveImage }), [resolveImage])

  return {
    supported: status !== 'unsupported',
    status,
    folderName,
    lastSyncedAt,
    error,
    assets,
    link,
    reconnect,
    unlink,
    saveNow,
  }
}
