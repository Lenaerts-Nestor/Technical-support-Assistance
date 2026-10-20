import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { NAME_MAX_LENGTH, defaultGroups, newGroup, newId, reviveGroups } from './nvxData'
import { readNvxFile, writeNvxFile } from './nvxFile'
import type { FolderLink } from '../sync/useFolderLifecycle'
import type { NvxCall, NvxGroup, NvxUnit } from './types'

const NVX_KEY = storageKey('nvx', 'groups')
const FILE_DEBOUNCE_MS = 600

/** A unit or call being saved: without an `id` it is new. */
type Draft<T extends { id: string }> = Omit<T, 'id'> & { id?: string }

export type NvxController = {
  groups: NvxGroup[]
  /** True once the groups are mirrored to `nvx.json` in the linked folder. */
  savedToFile: boolean
  /** Write `nvx.json` now (when a folder is linked and was read). */
  saveNow: () => Promise<void>
  /** Returns the new group's id. */
  addGroup: (name: string) => string
  renameGroup: (groupId: string, name: string) => void
  deleteGroup: (groupId: string) => void
  setUsername: (groupId: string, username: string) => void
  /** Add a unit, or replace the one with the same id. Returns its id. */
  saveUnit: (groupId: string, unit: Draft<NvxUnit>) => string
  removeUnit: (groupId: string, unitId: string) => void
  /** Add a call, or replace the one with the same id. Returns its id. */
  saveCall: (groupId: string, call: Draft<NvxCall>) => string
  removeCall: (groupId: string, callId: string) => void
  /** Returns the new folder's id. */
  addFolder: (groupId: string, name: string) => string
  renameFolder: (groupId: string, folderId: string, name: string) => void
  /** Deletes the folder only: its calls move to the top. */
  deleteFolder: (groupId: string, folderId: string) => void
}

/** Put `item` into `list`: in place of the entry with its id, else at the end. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
}

/**
 * The device groups: their units (label and IP) and saved calls. Kept in localStorage like the
 * other pages and mirrored to `nvx.json` in the linked folder, with the same rules as the
 * calendar: a file already in the folder wins when the folder is linked or rescanned, and
 * writes wait until that file has been read.
 */
export function useNvx(folder: FolderLink): NvxController {
  const { dir, epoch } = folder
  const [groups, setGroups] = usePersistentState<NvxGroup[]>(NVX_KEY, defaultGroups, reviveGroups)
  const [savedToFile, setSavedToFile] = useState(false)
  const loadedFor = useRef<FileSystemDirectoryHandle | null>(null)
  const groupsRef = useRef(groups)

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    loadedFor.current = null
    if (!dir) return
    let cancelled = false
    void readNvxFile(dir).then(async (fromFile) => {
      if (cancelled || fromFile === null) return
      if (fromFile) setGroups(fromFile)
      else await writeNvxFile(dir, groupsRef.current)
      if (cancelled) return
      loadedFor.current = dir
      setSavedToFile(true)
    })
    return () => {
      cancelled = true
    }
  }, [dir, epoch, setGroups])

  useEffect(() => {
    if (!dir || loadedFor.current !== dir) return
    const timer = window.setTimeout(() => {
      void writeNvxFile(dir, groups).then(setSavedToFile)
    }, FILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dir, groups])

  const saveNow = useCallback(async () => {
    if (dir && loadedFor.current === dir) await writeNvxFile(dir, groupsRef.current)
  }, [dir])

  const update = useCallback(
    (groupId: string, change: (group: NvxGroup) => NvxGroup) =>
      setGroups((prev) => prev.map((g) => (g.id === groupId ? change(g) : g))),
    [setGroups],
  )

  const addGroup = useCallback(
    (name: string) => {
      const group = newGroup(name)
      setGroups((prev) => [...prev, group])
      return group.id
    },
    [setGroups],
  )

  const renameGroup = useCallback(
    (groupId: string, name: string) =>
      update(groupId, (g) => ({ ...g, name: name.trim().slice(0, NAME_MAX_LENGTH) || g.name })),
    [update],
  )

  const deleteGroup = useCallback((groupId: string) => setGroups((prev) => prev.filter((g) => g.id !== groupId)), [setGroups])

  const setUsername = useCallback(
    (groupId: string, username: string) => update(groupId, (g) => ({ ...g, username: username.trim().slice(0, 64) })),
    [update],
  )

  const saveUnit = useCallback(
    (groupId: string, draft: Draft<NvxUnit>) => {
      const unit: NvxUnit = { ...draft, id: draft.id ?? newId() }
      update(groupId, (g) => ({ ...g, units: upsert(g.units, unit) }))
      return unit.id
    },
    [update],
  )

  const removeUnit = useCallback(
    (groupId: string, unitId: string) => update(groupId, (g) => ({ ...g, units: g.units.filter((u) => u.id !== unitId) })),
    [update],
  )

  const saveCall = useCallback(
    (groupId: string, draft: Draft<NvxCall>) => {
      const call: NvxCall = { ...draft, id: draft.id ?? newId() }
      update(groupId, (g) => ({ ...g, calls: upsert(g.calls, call) }))
      return call.id
    },
    [update],
  )

  const removeCall = useCallback(
    (groupId: string, callId: string) => update(groupId, (g) => ({ ...g, calls: g.calls.filter((c) => c.id !== callId) })),
    [update],
  )

  const addFolder = useCallback(
    (groupId: string, name: string) => {
      const id = newId()
      update(groupId, (g) => ({ ...g, folders: [...g.folders, { id, name: name.trim().slice(0, NAME_MAX_LENGTH) || 'Folder' }] }))
      return id
    },
    [update],
  )

  const renameFolder = useCallback(
    (groupId: string, folderId: string, name: string) =>
      update(groupId, (g) => ({
        ...g,
        folders: g.folders.map((f) => (f.id === folderId ? { ...f, name: name.trim().slice(0, NAME_MAX_LENGTH) || f.name } : f)),
      })),
    [update],
  )

  const deleteFolder = useCallback(
    (groupId: string, folderId: string) =>
      update(groupId, (g) => ({
        ...g,
        folders: g.folders.filter((f) => f.id !== folderId),
        calls: g.calls.map(({ folderId: inFolder, ...call }) => (inFolder === folderId ? call : { ...call, ...(inFolder ? { folderId: inFolder } : {}) })),
      })),
    [update],
  )

  return {
    groups,
    savedToFile: savedToFile && dir !== null,
    saveNow,
    addGroup,
    renameGroup,
    deleteGroup,
    setUsername,
    saveUnit,
    removeUnit,
    saveCall,
    removeCall,
    addFolder,
    renameFolder,
    deleteFolder,
  }
}
