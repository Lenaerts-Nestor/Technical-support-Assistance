import { useCallback, useEffect, useRef, useState } from 'react'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { readSnippetsFile, reviveSnippets, writeSnippetsFile } from './snippetsFile'
import type { CaseLanguage, Snippet } from './types'

const SNIPPETS_KEY = storageKey('cases', 'snippets')
const FILE_DEBOUNCE_MS = 600

export type SnippetsController = {
  snippets: Snippet[]
  /** True once the list is mirrored to `cases-snippets.json` in the linked folder. */
  savedToFile: boolean
  add: (label: string, text: string, language: CaseLanguage) => void
  remove: (id: string) => void
}

/**
 * The user's own insertable texts. Kept in localStorage like the draft, and
 * mirrored to `cases-snippets.json` in the folder linked on the Guides page
 * (when one is linked and writable). A file already in that folder wins on load.
 */
export function useSnippets(): SnippetsController {
  const [snippets, setSnippets] = usePersistentState<Snippet[]>(
    SNIPPETS_KEY,
    () => [],
    reviveSnippets,
  )
  const [savedToFile, setSavedToFile] = useState(false)
  /** Don't write until the folder's file has had its chance to be adopted. */
  const loaded = useRef(false)

  useEffect(() => {
    let cancelled = false
    void readSnippetsFile().then((fromFile) => {
      if (cancelled) return
      if (fromFile) setSnippets(fromFile)
      loaded.current = true
      if (fromFile !== null) setSavedToFile(true)
    })
    return () => {
      cancelled = true
    }
  }, [setSnippets])

  useEffect(() => {
    if (!loaded.current) return
    const timer = window.setTimeout(() => {
      void writeSnippetsFile(snippets).then(setSavedToFile)
    }, FILE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [snippets])

  const add = useCallback(
    (label: string, text: string, language: CaseLanguage) =>
      setSnippets((prev) => [...prev, { id: crypto.randomUUID(), label, text, language }]),
    [setSnippets],
  )

  const remove = useCallback(
    (id: string) => setSnippets((prev) => prev.filter((s) => s.id !== id)),
    [setSnippets],
  )

  return { snippets, savedToFile, add, remove }
}
