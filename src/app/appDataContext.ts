import { createContext, useContext, useEffect } from 'react'
import type { FolderController } from '../features/sync/useFolderLifecycle'
import type { GuidesLibrary } from '../features/guides/useGuidesLibrary'
import type { LinksController } from '../features/links/useLinks'
import type { SnippetsController } from '../features/cases/useSnippets'
import type { CalendarController } from '../features/calendar/useCalendar'

/**
 * The data that more than one page needs: the linked folder, the guides, the
 * links, the case snippets and the calendar. `AppDataProvider` owns it above the sidebar and
 * every page, so the Sync page can read and update the same state the Guides,
 * Links and Cases pages show. One context per domain, so a page only re-renders
 * for the data it actually uses.
 */
export const FolderContext = createContext<FolderController | null>(null)
export const GuidesContext = createContext<GuidesLibrary | null>(null)
export const LinksContext = createContext<LinksController | null>(null)
export const SnippetsContext = createContext<SnippetsController | null>(null)
export const CalendarContext = createContext<CalendarController | null>(null)

function required<T>(value: T | null, hook: string): T {
  if (value === null) throw new Error(`${hook} must be used inside <AppDataProvider>`)
  return value
}

export const useFolder = () => required(useContext(FolderContext), 'useFolder')
export const useGuidesData = () => required(useContext(GuidesContext), 'useGuidesData')
export const useLinksData = () => required(useContext(LinksContext), 'useLinksData')
export const useSnippetsData = () => required(useContext(SnippetsContext), 'useSnippetsData')
export const useCalendarData = () => required(useContext(CalendarContext), 'useCalendarData')

/** Whether a guide is open in the editor — Sync actions that replace data wait for it. */
export type EditingState = { editing: boolean; setEditing: (on: boolean) => void }

export const EditingContext = createContext<EditingState>({ editing: false, setEditing: () => {} })

export const useIsEditingGuide = () => useContext(EditingContext).editing

/** Held by the Guides page while its editor is open; released when it closes or the page unmounts. */
export function useReportEditingGuide(on: boolean) {
  const { setEditing } = useContext(EditingContext)
  useEffect(() => {
    setEditing(on)
    return () => setEditing(false)
  }, [on, setEditing])
}
