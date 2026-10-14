import { useCallback } from 'react'
import { useGuidesData, useLinksData, useSnippetsData } from '../../app/appDataContext'

/** Write guides, links and case snippets to the linked folder right now. */
export function useSaveAll() {
  const { saveNow: saveGuides } = useGuidesData()
  const { saveNow: saveLinks } = useLinksData()
  const { saveNow: saveSnippets } = useSnippetsData()
  return useCallback(async () => {
    await saveGuides()
    await saveLinks()
    await saveSnippets()
  }, [saveGuides, saveLinks, saveSnippets])
}
