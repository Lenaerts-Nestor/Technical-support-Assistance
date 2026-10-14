import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearFolderHandle,
  loadFolderHandle,
  saveFolderHandle,
} from '../guides/storage/handleStore'
import { isFolderSyncSupported, verifyPermission } from '../guides/storage/guidesFolder'

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

/** What the data hooks (guides, links, snippets) need to follow the linked folder. */
export type FolderLink = {
  /** The folder, only once read-write access is confirmed. */
  dir: FileSystemDirectoryHandle | null
  /**
   * Bumped whenever the folder's contents may have changed under the app — link,
   * reconnect, unlink, rescan, restore. Data hooks re-read their file on `[dir, epoch]`.
   */
  epoch: number
}

/** What the guides library reports back so the status pill and sidebar dot stay truthful. */
export type FolderReport = {
  saving: () => void
  saved: () => void
  /** Reading or writing failed; `message` is shown to the user. */
  failed: (message: string) => void
  /** Show a message without marking the save as failed (a picker or download problem). */
  warn: (message: string) => void
  /** Clear a shown error. */
  clearError: () => void
  /** Stamp "synced at" without changing the save state. */
  synced: () => void
}

export type FolderController = FolderLink & {
  supported: boolean
  status: FolderStatus
  folderName: string | null
  lastSyncedAt: string | null
  error: string | null
  /** A long operation (Organize, import, restore …) holds the folder. */
  busy: boolean
  /** Pick a folder (also used to change to a different one). */
  link: () => Promise<void>
  /** Re-grant permission on the remembered folder. */
  reconnect: () => Promise<void>
  /** Forget the folder (leaves the files on disk untouched). */
  unlink: () => Promise<void>
  /** Ask every data hook to re-read the folder. */
  rescan: () => void
  /**
   * Run `fn` after every earlier exclusive operation has finished, so autosave,
   * copies, deletes, imports and restores never interleave their writes.
   * `quiet` operations (autosave) do not flip `busy`.
   */
  runExclusive: <T>(fn: () => Promise<T>, quiet?: boolean) => Promise<T>
  report: FolderReport
}

type Connection = 'unsupported' | 'idle' | 'checking' | 'reconnect' | 'ready'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Owns the one linked folder: remembers its handle in IndexedDB, re-checks
 * permission on startup, and tells the data hooks (through `dir` + `epoch`) when
 * to read it. It holds no guide, link or snippet data itself.
 */
export function useFolderLifecycle(): FolderController {
  const [connection, setConnection] = useState<Connection>(() =>
    isFolderSyncSupported() ? 'checking' : 'unsupported',
  )
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [folderName, setFolderName] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null)
  const [epoch, setEpoch] = useState(0)
  const [pending, setPending] = useState(0)

  /** The remembered handle, even while permission is missing (so Reconnect has something to ask about). */
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const chainRef = useRef<Promise<unknown>>(Promise.resolve())

  const adopt = useCallback((handle: FileSystemDirectoryHandle) => {
    handleRef.current = handle
    setFolderName(handle.name)
    setDir(handle)
    setConnection('ready')
    setSaveState('idle')
    setError(null)
    setEpoch((n) => n + 1)
  }, [])

  /* ---- startup: reuse a remembered folder ------------------------------- */

  useEffect(() => {
    if (!isFolderSyncSupported()) return
    let cancelled = false
    void (async () => {
      try {
        const handle = await loadFolderHandle()
        if (cancelled) return
        if (!handle) {
          setConnection('idle')
          return
        }
        handleRef.current = handle
        setFolderName(handle.name)
        if (await verifyPermission(handle, false)) {
          if (!cancelled) adopt(handle)
        } else if (!cancelled) {
          setConnection('reconnect')
        }
      } catch {
        // Anything unexpected on startup (a stale handle) must still land on a
        // state the Sync page offers a way out of.
        if (!cancelled) {
          setError('Could not open the remembered folder — reconnect to retry.')
          setConnection(handleRef.current ? 'reconnect' : 'idle')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [adopt])

  /* ---- actions ------------------------------------------------------ */

  const link = useCallback(async () => {
    if (!isFolderSyncSupported()) return
    let handle: FileSystemDirectoryHandle
    try {
      handle = await window.showDirectoryPicker({ id: 'support-hub-guides', mode: 'readwrite' })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError('Could not open that folder.')
      return
    }
    if (!(await verifyPermission(handle, true))) {
      setError('Read-write permission is needed to sync a folder.')
      return
    }
    await saveFolderHandle(handle).catch(() => {})
    adopt(handle)
  }, [adopt])

  const reconnect = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    if (!(await verifyPermission(handle, true))) {
      setError('Permission was not granted.')
      setConnection('reconnect')
      return
    }
    adopt(handle)
  }, [adopt])

  const unlink = useCallback(async () => {
    await clearFolderHandle().catch(() => {})
    handleRef.current = null
    setDir(null)
    setFolderName(null)
    setLastSyncedAt(null)
    setError(null)
    setSaveState('idle')
    setConnection('idle')
    setEpoch((n) => n + 1)
  }, [])

  const rescan = useCallback(() => setEpoch((n) => n + 1), [])

  const runExclusive = useCallback(<T,>(fn: () => Promise<T>, quiet = false): Promise<T> => {
    if (!quiet) setPending((n) => n + 1)
    const run = chainRef.current.then(
      () => fn(),
      () => fn(),
    )
    chainRef.current = run.catch(() => {})
    return run.finally(() => {
      if (!quiet) setPending((n) => n - 1)
    })
  }, [])

  const report = useMemo<FolderReport>(
    () => ({
      saving: () => setSaveState('saving'),
      saved: () => {
        setSaveState('saved')
        setLastSyncedAt(new Date().toISOString())
        setError(null)
      },
      failed: (message) => {
        setSaveState('error')
        setError(message)
      },
      warn: (message) => setError(message),
      clearError: () => setError(null),
      synced: () => setLastSyncedAt(new Date().toISOString()),
    }),
    [],
  )

  const status: FolderStatus =
    connection !== 'ready' ? connection : saveState === 'idle' ? 'ready' : saveState

  return useMemo(
    () => ({
      supported: connection !== 'unsupported',
      status,
      folderName,
      lastSyncedAt,
      error,
      busy: pending > 0,
      dir,
      epoch,
      link,
      reconnect,
      unlink,
      rescan,
      runExclusive,
      report,
    }),
    [connection, status, folderName, lastSyncedAt, error, pending, dir, epoch, link, reconnect, unlink, rescan, runExclusive, report],
  )
}
