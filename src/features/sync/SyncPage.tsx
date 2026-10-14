import { PAGE_SUBTITLE, PAGE_TITLE } from '../../shared/ui/styles'
import { BackupCard } from './components/BackupCard'
import { FolderCard } from './components/FolderCard'
import { GuidesCard } from './components/GuidesCard'
import { LinksCard } from './components/LinksCard'
import { SnippetsCard } from './components/SnippetsCard'

/**
 * Sync: link the folder everything is saved in, and move parts of the Support
 * Hub between computers — links, case snippets, guides, or everything at once.
 */
export function SyncPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-8 py-7">
      <header>
        <h2 className={PAGE_TITLE}>Sync</h2>
        <p className={PAGE_SUBTITLE}>
          Link a folder to keep everything saved on disk, then export or import just the part you need.
        </p>
      </header>

      <FolderCard />

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <LinksCard />
        <SnippetsCard />
        <GuidesCard />
        <BackupCard />
      </div>
    </div>
  )
}
