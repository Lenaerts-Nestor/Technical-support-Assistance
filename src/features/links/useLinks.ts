import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { DEFAULT_SECTIONS, normalizeUrl, reviveSections } from './linksData'
import { readLinksFile, writeLinksFile } from './linksFile'
import { countLinks, mergeLinkSections } from './linksMerge'
import type { FolderLink } from '../sync/useFolderLifecycle'
import type { LinkEntry, LinkFolder, LinkSection, SectionItem } from './types'

const LINKS_KEY = storageKey('links', 'sections')
const FILE_DEBOUNCE_MS = 600

export type LinksImportResult = {
  added: { sections: number; folders: number; links: number }
  /** Links left out because the same URL was already there. */
  skipped: number
}

export type LinksController = {
  sections: LinkSection[]
  /** True once the list is mirrored to `links.json` in the linked folder. */
  savedToFile: boolean
  /** Write `links.json` now (when a folder is linked and was read). */
  saveNow: () => Promise<void>
  /** Bring in sections from an export: `merge` adds what is missing, `replace` swaps the lot. */
  importSections: (incoming: LinkSection[], mode: 'merge' | 'replace') => LinksImportResult
  addSection: (title: string) => void
  renameSection: (id: string, title: string) => void
  removeSection: (id: string) => void
  /** Add a link to a section, or into one of its folders. `false` when the URL is unusable. */
  addLink: (sectionId: string, folderId: string | null, label: string, url: string) => boolean
  addFolder: (sectionId: string, label: string) => void
  /** Rename a link or folder; `url` only applies to links. `false` when the URL is unusable. */
  updateItem: (id: string, patch: { label: string; url?: string }) => boolean
  /** Remove a link or a folder (with everything in it). */
  removeItem: (id: string) => void
}

/** Apply `fn` to every link and folder in the tree, including links inside folders. */
function mapItems(
  sections: LinkSection[],
  fn: (item: SectionItem) => SectionItem | null,
): LinkSection[] {
  const visit = (item: SectionItem): SectionItem | null => {
    const next = fn(item)
    if (next?.kind !== 'folder') return next
    return { ...next, links: next.links.flatMap((l) => fn(l) ?? []) as LinkEntry[] }
  }
  return sections.map((s) => ({ ...s, items: s.items.flatMap((i) => visit(i) ?? []) }))
}

/**
 * The Links page's data. Kept in localStorage like the other pages, and
 * mirrored to `links.json` in the linked folder (when one is linked and
 * writable). A file already in that folder wins whenever the folder is linked,
 * reconnected or rescanned; a folder without one gets it created from what is
 * on screen.
 */
export function useLinks(folder: FolderLink): LinksController {
  const { dir, epoch } = folder
  const [sections, setSections] = usePersistentState<LinkSection[]>(
    LINKS_KEY,
    () => DEFAULT_SECTIONS,
    reviveSections,
  )
  const [savedToFile, setSavedToFile] = useState(false)
  /** The folder whose file has been read — writes wait for it, so a failed read can't overwrite the file. */
  const loadedFor = useRef<FileSystemDirectoryHandle | null>(null)
  const sectionsRef = useRef(sections)

  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  useEffect(() => {
    loadedFor.current = null
    if (!dir) return
    let cancelled = false
    void readLinksFile(dir).then(async (fromFile) => {
      if (cancelled || fromFile === null) return
      if (fromFile) setSections(fromFile)
      else await writeLinksFile(dir, sectionsRef.current)
      if (cancelled) return
      loadedFor.current = dir
      setSavedToFile(true)
    })
    return () => {
      cancelled = true
    }
  }, [dir, epoch, setSections])

  useEffect(() => {
    if (!dir || loadedFor.current !== dir) return
    const timer = window.setTimeout(() => {
      void writeLinksFile(dir, sections).then(setSavedToFile)
    }, FILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dir, sections])

  const saveNow = useCallback(async () => {
    if (dir && loadedFor.current === dir) await writeLinksFile(dir, sectionsRef.current)
  }, [dir])

  const importSections = useCallback(
    (incoming: LinkSection[], mode: 'merge' | 'replace'): LinksImportResult => {
      if (mode === 'replace') {
        setSections(incoming)
        const folders = incoming.reduce((n, s) => n + s.items.filter((i) => i.kind === 'folder').length, 0)
        return { added: { sections: incoming.length, folders, links: countLinks(incoming) }, skipped: 0 }
      }
      const result = mergeLinkSections(sectionsRef.current, incoming)
      setSections(result.sections)
      return { added: result.added, skipped: result.skipped }
    },
    [setSections],
  )

  const addSection = useCallback(
    (title: string) =>
      setSections((prev) => [...prev, { id: crypto.randomUUID(), title, items: [] }]),
    [setSections],
  )

  const renameSection = useCallback(
    (id: string, title: string) =>
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s))),
    [setSections],
  )

  const removeSection = useCallback(
    (id: string) => setSections((prev) => prev.filter((s) => s.id !== id)),
    [setSections],
  )

  const addLink = useCallback(
    (sectionId: string, folderId: string | null, label: string, url: string) => {
      const href = normalizeUrl(url)
      if (!href) return false
      const link: LinkEntry = { id: crypto.randomUUID(), kind: 'link', label: label || href, url: href }
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s
          if (folderId === null) return { ...s, items: [...s.items, link] }
          return {
            ...s,
            items: s.items.map((i) =>
              i.kind === 'folder' && i.id === folderId ? { ...i, links: [...i.links, link] } : i,
            ),
          }
        }),
      )
      return true
    },
    [setSections],
  )

  const addFolder = useCallback(
    (sectionId: string, label: string) => {
      const folder: LinkFolder = { id: crypto.randomUUID(), kind: 'folder', label, links: [] }
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, folder] } : s)),
      )
    },
    [setSections],
  )

  const updateItem = useCallback(
    (id: string, patch: { label: string; url?: string }) => {
      let href: string | undefined
      if (patch.url !== undefined) {
        const normalized = normalizeUrl(patch.url)
        if (!normalized) return false
        href = normalized
      }
      setSections((prev) =>
        mapItems(prev, (item) => {
          if (item.id !== id) return item
          if (item.kind === 'folder') return { ...item, label: patch.label || item.label }
          return { ...item, label: patch.label || href || item.url, url: href ?? item.url }
        }),
      )
      return true
    },
    [setSections],
  )

  const removeItem = useCallback(
    (id: string) => setSections((prev) => mapItems(prev, (item) => (item.id === id ? null : item))),
    [setSections],
  )

  return {
    sections,
    savedToFile: savedToFile && dir !== null,
    saveNow,
    importSections,
    addSection,
    renameSection,
    removeSection,
    addLink,
    addFolder,
    updateItem,
    removeItem,
  }
}
