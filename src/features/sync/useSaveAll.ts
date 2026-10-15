import { useCallback } from 'react'
import { useCalendarData, useGuidesData, useLinksData, useSnippetsData } from '../../app/appDataContext'

/** Write guides, links, case snippets and the calendar to the linked folder right now. */
export function useSaveAll() {
  const { saveNow: saveGuides } = useGuidesData()
  const { saveNow: saveLinks } = useLinksData()
  const { saveNow: saveSnippets } = useSnippetsData()
  const { saveNow: saveCalendar } = useCalendarData()
  return useCallback(async () => {
    await saveGuides()
    await saveLinks()
    await saveSnippets()
    await saveCalendar()
  }, [saveGuides, saveLinks, saveSnippets, saveCalendar])
}
