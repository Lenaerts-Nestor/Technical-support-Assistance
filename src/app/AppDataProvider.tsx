import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useFolderLifecycle } from '../features/sync/useFolderLifecycle'
import { useGuidesLibrary } from '../features/guides/useGuidesLibrary'
import { useLinks } from '../features/links/useLinks'
import { useSnippets } from '../features/cases/useSnippets'
import { useCalendar } from '../features/calendar/useCalendar'
import { useNvx } from '../features/nvx/useNvx'
import { useAppUpdate } from '../features/sync/useAppUpdate'
import {
  CalendarContext,
  EditingContext,
  AppUpdateContext,
  FolderContext,
  GuidesContext,
  LinksContext,
  NvxContext,
  SnippetsContext,
} from './appDataContext'

/** Owns the shared data (see `appDataContext.ts`); renders nothing of its own. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const folder = useFolderLifecycle()
  const guides = useGuidesLibrary(folder)
  const links = useLinks(folder)
  const snippets = useSnippets(folder)
  const calendar = useCalendar(folder)
  const nvx = useNvx(folder)
  const appUpdate = useAppUpdate()
  const [editing, setEditing] = useState(false)
  const editingValue = useMemo(() => ({ editing, setEditing }), [editing])

  return (
    <FolderContext value={folder}>
      <GuidesContext value={guides}>
        <LinksContext value={links}>
          <SnippetsContext value={snippets}>
            <CalendarContext value={calendar}>
              <NvxContext value={nvx}>
                <AppUpdateContext value={appUpdate}>
                  <EditingContext value={editingValue}>{children}</EditingContext>
                </AppUpdateContext>
              </NvxContext>
            </CalendarContext>
          </SnippetsContext>
        </LinksContext>
      </GuidesContext>
    </FolderContext>
  )
}
