import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { readSnippetsFile, reviveSnippets, writeSnippetsFile } from './snippetsFile'
import { mergeSnippets } from './snippetsMerge'
import type { FolderLink } from '../sync/useFolderLifecycle'
import type { CaseLanguage, Snippet } from './types'

const SNIPPETS_KEY = storageKey('cases', 'snippets')
const FILE_DEBOUNCE_MS = 600

export type SnippetsImportResult = { added: number; skipped: number; renamed: number }

export type SnippetsController = {
  snippets: Snippet[]
  /** True once the list is mirrored to `cases-snippets.json` in the linked folder. */
  savedToFile: boolean
  /** Write `cases-snippets.json` now (when a folder is linked and was read). */
  saveNow: () => Promise<void>
  /** Bring in texts from an export: `merge` adds what is missing, `replace` swaps the lot. */
  importSnippets: (incoming: Snippet[], mode: 'merge' | 'replace') => SnippetsImportResult
  add: (label: string, text: string, language: CaseLanguage) => void
  remove: (id: string) => void
}

/**
 * The user's own insertable texts. Kept in localStorage like the draft, and
 * mirrored to `cases-snippets.json` in the linked folder (when one is linked and
 * writable). A file already in that folder wins whenever the folder is linked,
 * reconnected or rescanned; a folder without one gets it created from what is
 * on screen.
 */
export function useSnippets(folder: FolderLink): SnippetsController {
  const { dir, epoch } = folder
  const [snippets, setSnippets] = usePersistentState<Snippet[]>(
    SNIPPETS_KEY,
    () => [],
    reviveSnippets,
  )
  const [savedToFile, setSavedToFile] = useState(false)
  /** The folder whose file has been read — writes wait for it, so a failed read can't overwrite the file. */
  const loadedFor = useRef<FileSystemDirectoryHandle | null>(null)
  const snippetsRef = useRef(snippets)

  useEffect(() => {
    snippetsRef.current = snippets
  }, [snippets])

  useEffect(() => {
    loadedFor.current = null
    if (!dir) return
    let cancelled = false
    void readSnippetsFile(dir).then(async (fromFile) => {
      if (cancelled || fromFile === null) return
      if (fromFile) setSnippets(fromFile)
      else await writeSnippetsFile(dir, snippetsRef.current)
      if (cancelled) return
      loadedFor.current = dir
      setSavedToFile(true)
    })
    return () => {
      cancelled = true
    }
  }, [dir, epoch, setSnippets])

  useEffect(() => {
    if (!dir || loadedFor.current !== dir) return
    const timer = window.setTimeout(() => {
      void writeSnippetsFile(dir, snippets).then(setSavedToFile)
    }, FILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dir, snippets])

  const saveNow = useCallback(async () => {
    if (dir && loadedFor.current === dir) await writeSnippetsFile(dir, snippetsRef.current)
  }, [dir])

  const importSnippets = useCallback(
    (incoming: Snippet[], mode: 'merge' | 'replace'): SnippetsImportResult => {
      if (mode === 'replace') {
        setSnippets(incoming)
        return { added: incoming.length, skipped: 0, renamed: 0 }
      }
      const result = mergeSnippets(snippetsRef.current, incoming)
      setSnippets(result.snippets)
      return { added: result.added, skipped: result.skipped, renamed: result.renamed }
    },
    [setSnippets],
  )

  const add = useCallback(
    (label: string, text: string, language: CaseLanguage) =>
      setSnippets((prev) => [...prev, { id: crypto.randomUUID(), label, text, language }]),
    [setSnippets],
  )

  const remove = useCallback(
    (id: string) => setSnippets((prev) => prev.filter((s) => s.id !== id)),
    [setSnippets],
  )

  return { snippets, savedToFile: savedToFile && dir !== null, saveNow, importSnippets, add, remove }
}
