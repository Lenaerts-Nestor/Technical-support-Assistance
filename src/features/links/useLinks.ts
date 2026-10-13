import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { DEFAULT_SECTIONS, normalizeUrl, reviveSections } from './linksData'
import { readLinksFile, writeLinksFile } from './linksFile'
import type { LinkEntry, LinkFolder, LinkSection, SectionItem } from './types'

const LINKS_KEY = storageKey('links', 'sections')
const FILE_DEBOUNCE_MS = 600

export type LinksController = {
  sections: LinkSection[]
  /** True once the list is mirrored to `links.json` in the linked folder. */
  savedToFile: boolean
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
 * mirrored to `links.json` in the folder linked on the Guides page (when one is
 * linked and writable). A file already in that folder wins on load.
 */
export function useLinks(): LinksController {
  const [sections, setSections] = usePersistentState<LinkSection[]>(
    LINKS_KEY,
    () => DEFAULT_SECTIONS,
    reviveSections,
  )
  const [savedToFile, setSavedToFile] = useState(false)
  /** Don't write until the folder's file has had its chance to be adopted. */
  const loaded = useRef(false)

  useEffect(() => {
    let cancelled = false
    void readLinksFile().then((fromFile) => {
      if (cancelled) return
      if (fromFile) setSections(fromFile)
      loaded.current = true
      if (fromFile !== null) setSavedToFile(true)
    })
    return () => {
      cancelled = true
    }
  }, [setSections])

  useEffect(() => {
    if (!loaded.current) return
    const timer = window.setTimeout(() => {
      void writeLinksFile(sections).then(setSavedToFile)
    }, FILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [sections])

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
    savedToFile,
    addSection,
    renameSection,
    removeSection,
    addLink,
    addFolder,
    updateItem,
    removeItem,
  }
}
