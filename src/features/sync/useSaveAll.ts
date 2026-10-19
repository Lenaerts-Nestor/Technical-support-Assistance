import { useCallback } from 'react'
import { useCalendarData, useGuidesData, useLinksData, useNvxData, useSnippetsData } from '../../app/appDataContext'

/** Write guides, links, case snippets, the calendar and the device groups to the linked folder right now. */
export function useSaveAll() {
  const { saveNow: saveGuides } = useGuidesData()
  const { saveNow: saveLinks } = useLinksData()
  const { saveNow: saveSnippets } = useSnippetsData()
  const { saveNow: saveCalendar } = useCalendarData()
  const { saveNow: saveNvx } = useNvxData()
  return useCallback(async () => {
    await saveGuides()
    await saveLinks()
    await saveSnippets()
    await saveCalendar()
    await saveNvx()
  }, [saveGuides, saveLinks, saveSnippets, saveCalendar, saveNvx])
}
