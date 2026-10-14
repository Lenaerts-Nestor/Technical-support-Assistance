import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_GUIDE_ORDER, TEMPLATE_FILE } from './guidesData'
import { mergeGuides } from './guidesMerge'
import type { ConflictMode, GuidesMergeResult } from './guidesMerge'
import { toGuidesFile } from './normalizeGuide'
import { useGuidesStorage } from './useGuidesStorage'
import type { FolderController } from '../sync/useFolderLifecycle'
import type { Guide } from './types'

/** Sort by manual order, then newest-updated first. */
function compareGuides(a: Guide, b: Guide): number {
  const oa = a.order ?? DEFAULT_GUIDE_ORDER
  const ob = b.order ?? DEFAULT_GUIDE_ORDER
  if (oa !== ob) return oa - ob
  return b.updatedAt.localeCompare(a.updatedAt)
}

/**
 * Move one guide up/down within its group (pinned or all) and renumber that
 * group's `order` values to lock in the new positions.
 */
function applyMove(guides: Guide[], id: string, dir: -1 | 1): Guide[] {
  const target = guides.find((g) => g.id === id)
  if (!target) return guides

  const group = guides.filter((g) => !!g.pinned === !!target.pinned).sort(compareGuides)
  const from = group.findIndex((g) => g.id === id)
  const to = from + dir
  if (to < 0 || to >= group.length) return guides

  ;[group[from], group[to]] = [group[to], group[from]]
  const orderById = new Map(group.map((g, i) => [g.id, i]))
  return guides.map((g) => (orderById.has(g.id) ? { ...g, order: orderById.get(g.id) } : g))
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // In the document and revoked a tick later: revoking synchronously after
  // click() races the browser's read of the blob.
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * The guides *data*: the list, its ordering and pinning, add / replace / remove,
 * import and export, and the folder storage behind it. Which screen the Guides
 * page shows (list / view / edit) is page state and lives in `useGuidesScreen`.
 */
export function useGuidesLibrary(folder: FolderController) {
  const [guides, setGuides] = useState<Guide[]>([])
  /** Id of a just-created guide that has never been saved — Cancel discards it. */
  const [pendingNewId, setPendingNewId] = useState<string | null>(null)

  /** Replace the whole list — only for what the folder holds when it is (re)adopted. */
  const adopt = useCallback((list: Guide[]) => {
    setGuides(list)
    setPendingNewId(null)
  }, [])

  /** A guide has been given its own folder (new guide saved, or a file added before its first save). */
  const assignFolder = useCallback((id: string, folderName: string) => {
    setGuides((list) => list.map((g) => (g.id === id && !g.folder ? { ...g, folder: folderName } : g)))
  }, [])

  const storage = useGuidesStorage({
    folder,
    guides,
    pendingNewId,
    onAdopt: adopt,
    onFolderAssigned: assignFolder,
  })

  const pinnedGuides = useMemo(() => guides.filter((g) => g.pinned).sort(compareGuides), [guides])
  const unpinnedGuides = useMemo(() => guides.filter((g) => !g.pinned).sort(compareGuides), [guides])

  const togglePin = useCallback((id: string) => {
    setGuides((list) => {
      const topOrder = Math.min(0, ...list.filter((g) => g.pinned).map((g) => g.order ?? 0)) - 1
      return list.map((g) =>
        g.id === id
          ? { ...g, pinned: !g.pinned, order: g.pinned ? DEFAULT_GUIDE_ORDER : topOrder }
          : g,
      )
    })
  }, [])

  const moveGuide = useCallback(
    (id: string, dir: -1 | 1) => setGuides((list) => applyMove(list, id, dir)),
    [],
  )

  /** Add a brand-new, not yet saved guide at the top. */
  const addDraftGuide = useCallback((draft: Guide) => {
    setGuides((list) => [draft, ...list])
    setPendingNewId(draft.id)
  }, [])

  /**
   * Commit an edited guide. The editor works on a copy made when it opened, so a
   * folder given to the guide meanwhile is kept from the stored one. A brand-new
   * guide gets its own folder now that it has a title.
   */
  const { ensureFolder, deleteFolder } = storage
  const saveGuide = useCallback(
    (saved: Guide) => {
      const isNew = pendingNewId === saved.id
      setGuides((list) =>
        list.map((g) => (g.id === saved.id ? { ...saved, folder: g.folder ?? saved.folder } : g)),
      )
      setPendingNewId((pending) => (pending === saved.id ? null : pending))
      if (isNew) void ensureFolder(saved)
    },
    [ensureFolder, pendingNewId],
  )

  /** Drop a never-saved guide (Cancel on a new guide), and the folder made for it if a file was added first. */
  const discardDraftGuide = useCallback(
    (id: string) => {
      const draft = guides.find((g) => g.id === id)
      if (draft?.folder) void deleteFolder(draft.folder).catch(() => {})
      setGuides((list) => list.filter((g) => g.id !== id))
      setPendingNewId((pending) => (pending === id ? null : pending))
    },
    [deleteFolder, guides],
  )

  /**
   * Delete a guide — and its folder with the images and project zips in it.
   * Resolves to false (and keeps the guide) when the folder could not be removed.
   */
  const removeGuide = useCallback(
    async (id: string): Promise<boolean> => {
      const guide = guides.find((g) => g.id === id)
      if (guide?.folder) {
        try {
          await deleteFolder(guide.folder)
        } catch {
          folder.report.warn(
            'Could not delete the guide’s folder, so nothing was removed. Close anything using its files and try again.',
          )
          return false
        }
      }
      setGuides((list) => list.filter((g) => g.id !== id))
      setPendingNewId((pending) => (pending === id ? null : pending))
      return true
    },
    [deleteFolder, folder.report, guides],
  )

  /**
   * Take the guides Organize has just given a folder (and rewritten references)
   * into the list by id. The local pin and position are kept.
   */
  const applyOrganized = useCallback((organized: Guide[]) => {
    const byId = new Map(organized.map((g) => [g.id, g]))
    setGuides((list) =>
      list.map((g) => {
        const done = byId.get(g.id)
        return done ? { ...done, pinned: g.pinned, order: g.order } : g
      }),
    )
  }, [])

  /** Add guides found in folders on disk. Anything already in the library is left as it is. */
  const adoptFolderGuides = useCallback((found: Guide[]) => {
    setGuides((list) => [...list, ...found.filter((f) => !list.some((g) => g.id === f.id))])
  }, [])

  /** Upsert guides from a guides JSON by id — never a list replacement. */
  const importGuides = useCallback(
    (incoming: Guide[], mode: ConflictMode): GuidesMergeResult => {
      const result = mergeGuides(guides, incoming, mode)
      setGuides(result.guides)
      return result
    },
    [guides],
  )

  /** The guides as text — without each guide's folder name, which means nothing elsewhere. */
  const exportGuidesJson = useCallback(
    () =>
      downloadJson(
        'guides-backup.json',
        toGuidesFile(
          guides.map((g) => {
            const copy: Guide = { ...g }
            delete copy.folder
            return copy
          }),
        ),
      ),
    [guides],
  )

  const downloadTemplate = useCallback(
    () => downloadJson('guides-template.json', TEMPLATE_FILE),
    [],
  )

  return {
    guides,
    pinnedGuides,
    unpinnedGuides,
    pendingNewId,
    assetIo: storage.assetIo,
    saveNow: storage.saveNow,
    togglePin,
    moveGuide,
    addDraftGuide,
    saveGuide,
    discardDraftGuide,
    removeGuide,
    applyOrganized,
    adoptFolderGuides,
    importGuides,
    exportGuidesJson,
    downloadTemplate,
  }
}

export type GuidesLibrary = ReturnType<typeof useGuidesLibrary>
