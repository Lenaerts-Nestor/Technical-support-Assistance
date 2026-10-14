import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collectGuideAssets, normalizeRef } from './storage/assets'
import { copyIntoGuide, GUIDES_DIR, guideBase, listGuideAssets } from './storage/guideFolders'
import { importIntoFolder, listImageFiles, listZipFiles } from './storage/guidesFolder'
import { downloadBlob } from './storage/folderZip'
import { findFile } from './storage/fsOps'
import type { FolderController, FolderReport } from '../sync/useFolderLifecycle'
import type { GuideAssets } from './view/GuideAssetsContext'
import type { Guide } from './types'

/** What resolving and adding files for a guide needs from the storage layer. */
export type GuideAssetIo = {
  dir: FileSystemDirectoryHandle | null
  epoch: number
  pendingNewId: string | null
  ensureFolder: (guide: Pick<Guide, 'id' | 'title' | 'folder'>) => Promise<string | null>
  runExclusive: FolderController['runExclusive']
  report: FolderReport
}

const IMAGE_TYPES = [
  {
    description: 'Images',
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'] },
  },
]

/**
 * The files of the guide that is open: its images as blob URLs, the lists the
 * pickers browse, and picking / copying in new ones. A guide with its own folder
 * reads and writes `guides/<folder>/…`; a guide without one (the original shared
 * layout) uses the linked folder's root exactly as before. Only the open guide's
 * images are ever loaded.
 */
export function useGuideAssets(guide: Guide | null, io: GuideAssetIo): GuideAssets {
  const { dir, epoch } = io
  const guideId = guide?.id
  const folderName = guide?.folder
  const base = guideBase(folderName)

  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [imageNames, setImageNames] = useState<readonly string[]>([])
  const [zipNames, setZipNames] = useState<readonly string[]>([])

  const ioRef = useRef(io)
  const guideRef = useRef(guide)
  const requestedRef = useRef<Set<string>>(new Set())
  const objectUrlsRef = useRef<Set<string>>(new Set())
  /** Bumped whenever the open guide / folder changes, so a slow load for the old one is dropped. */
  const scopeRef = useRef(0)

  useEffect(() => {
    ioRef.current = io
    guideRef.current = guide
  })

  /* ---- scope: which guide's files are on show ----------------------------- */

  useEffect(() => {
    scopeRef.current++
    const objectUrls = objectUrlsRef.current
    const requested = requestedRef.current
    if (!dir || !guideId) return
    let cancelled = false
    void (async () => {
      try {
        const lists = folderName
          ? await listGuideAssets(dir, folderName)
          : { images: await listImageFiles(dir), zips: await listZipFiles(dir) }
        if (cancelled) return
        setImageNames(lists.images)
        setZipNames(lists.zips)
      } catch {
        // Unreadable listing: the pickers just start empty.
      }
    })()
    return () => {
      cancelled = true
      for (const url of objectUrls) URL.revokeObjectURL(url)
      objectUrls.clear()
      requested.clear()
      setUrls(new Map())
      setImageNames([])
      setZipNames([])
    }
  }, [dir, epoch, guideId, folderName])

  /* ---- images the guide shows ----------------------------------------------- */

  const imageRefs = useMemo(
    () => (guide ? collectGuideAssets(guide).flatMap((a) => (a.kind === 'image' ? [a.ref] : [])) : []),
    [guide],
  )

  useEffect(() => {
    if (!dir) return
    const scope = scopeRef.current
    const pending = imageRefs.filter((ref) => !requestedRef.current.has(base + ref))
    if (pending.length === 0) return
    pending.forEach((ref) => requestedRef.current.add(base + ref))
    void (async () => {
      for (const ref of pending) {
        const rel = normalizeRef(ref)
        const file = rel ? await findFile(dir, base + rel) : null
        if (scopeRef.current !== scope) return // a different guide is open now
        if (!file) continue
        const url = URL.createObjectURL(file)
        objectUrlsRef.current.add(url)
        setUrls((prev) => new Map(prev).set(base + ref, url))
      }
    })()
  }, [dir, epoch, base, imageRefs])

  const resolveImage = useCallback((ref: string) => urls.get(base + ref), [urls, base])

  /* ---- picking / adding files ------------------------------------------------ */

  /** The folder to add files to: the guide's own, or a new one for a guide that has never been saved. */
  const folderForWrite = useCallback(async (): Promise<string | null> => {
    const g = guideRef.current
    if (!g) return null
    if (g.folder) return g.folder
    return ioRef.current.pendingNewId === g.id ? ioRef.current.ensureFolder(g) : null
  }, [])

  const pick = useCallback(
    async (kind: 'image' | 'zip'): Promise<string | null> => {
      const root = ioRef.current.dir
      if (!root || typeof window.showOpenFilePicker !== 'function') return null
      const target = await folderForWrite()

      let handle: FileSystemFileHandle
      try {
        ;[handle] = await window.showOpenFilePicker({
          id: kind === 'image' ? 'support-hub-guide-image' : 'support-hub-guide-zip',
          startIn: root,
          multiple: false,
          types: kind === 'image' ? IMAGE_TYPES : [{ description: 'Zip archives', accept: { 'application/zip': ['.zip'] } }],
        })
      } catch {
        return null // cancelled
      }

      const segments = await root.resolve(handle).catch(() => null)
      const { report, runExclusive } = ioRef.current
      let ref: string
      let writtenPath: string | null = null

      if (!target) {
        // Shared-pool guide: reference the file where it is; an outside zip is copied into the root `projects/`.
        if (segments && segments.length > 0) {
          ref = segments.join('/')
        } else if (kind === 'image') {
          ref = handle.name
        } else {
          try {
            ref = await runExclusive(async () => importIntoFolder(root, await handle.getFile()))
            writtenPath = ref
          } catch {
            report.warn('Could not copy that zip into the linked folder.')
            return null
          }
        }
      } else {
        const own = `${GUIDES_DIR}/${target}/`
        if (segments && segments.join('/').startsWith(own)) {
          ref = segments.join('/').slice(own.length)
        } else {
          try {
            const file = await handle.getFile()
            ref = await runExclusive(() => copyIntoGuide(root, target, file, kind))
            writtenPath = own + ref
          } catch {
            report.warn('Could not copy that file into the guide’s folder.')
            return null
          }
        }
      }

      if (writtenPath) requestedRef.current.delete(writtenPath) // a miss before the copy must not stick
      const add = (prev: readonly string[]) => (prev.includes(ref) ? prev : [...prev, ref].sort())
      if (kind === 'image') setImageNames(add)
      else setZipNames(add)
      report.clearError()
      return ref
    },
    [folderForWrite],
  )

  const pickImage = useCallback(() => pick('image'), [pick])
  const pickZip = useCallback(() => pick('zip'), [pick])

  const hasZip = useCallback((path: string) => zipNames.includes(path), [zipNames])

  const downloadZip = useCallback(
    async (path: string): Promise<boolean> => {
      const root = ioRef.current.dir
      const rel = normalizeRef(path)
      const file = root && rel ? await findFile(root, guideBase(guideRef.current?.folder) + rel) : null
      if (!file) {
        ioRef.current.report.warn(`"${path}" is not in the ${guideRef.current?.folder ? 'guide’s' : 'linked'} folder.`)
        return false
      }
      downloadBlob(file, path.split('/').pop() || path)
      ioRef.current.report.clearError()
      return true
    },
    [],
  )

  return useMemo<GuideAssets>(
    () => ({ resolveImage, imageNames, pickImage, zipNames, hasZip, pickZip, downloadZip }),
    [resolveImage, imageNames, pickImage, zipNames, hasZip, pickZip, downloadZip],
  )
}
