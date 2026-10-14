import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useFolderLifecycle } from '../features/sync/useFolderLifecycle'
import { useGuidesLibrary } from '../features/guides/useGuidesLibrary'
import { useLinks } from '../features/links/useLinks'
import { useSnippets } from '../features/cases/useSnippets'
import {
  EditingContext,
  FolderContext,
  GuidesContext,
  LinksContext,
  SnippetsContext,
} from './appDataContext'

/** Owns the shared data (see `appDataContext.ts`); renders nothing of its own. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const folder = useFolderLifecycle()
  const guides = useGuidesLibrary(folder)
  const links = useLinks(folder)
  const snippets = useSnippets(folder)
  const [editing, setEditing] = useState(false)
  const editingValue = useMemo(() => ({ editing, setEditing }), [editing])

  return (
    <FolderContext value={folder}>
      <GuidesContext value={guides}>
        <LinksContext value={links}>
          <SnippetsContext value={snippets}>
            <EditingContext value={editingValue}>{children}</EditingContext>
          </SnippetsContext>
        </LinksContext>
      </GuidesContext>
    </FolderContext>
  )
}
