import type { PageId } from './navigation'
import { NAV_ITEMS } from './navigation'

const ICONS: Record<PageId, React.ReactElement> = {
  voiceCall: (
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.6a1 1 0 0 1-.25 1L6.6 10.8Z" />
  ),
  rma: (
    <path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Zm0 2.3L6.2 7.5 12 10.7l5.8-3.2L12 4.3ZM5 9.2v5.6l6 3.4v-5.6L5 9.2Zm14 0-6 3.4v5.6l6-3.4V9.2Z" />
  ),
  cases: (
    <path d="M9 4h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V6a2 2 0 0 1 2-2Zm0 3h6V6H9v1Z" />
  ),
  guides: (
    <path d="M5 3h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10h12V6a1 1 0 0 0-1-1H5Z" />
  ),
}

type SidebarProps = {
  current: PageId
  onNavigate: (page: PageId) => void
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="border-line-strong bg-surface flex w-60 shrink-0 flex-col border-r px-3 py-5">
      <div className="px-3 pb-5">
        <h1 className="text-ink text-base font-semibold tracking-tight">
          Support Hub
        </h1>
        <p className="text-ink-faint mt-0.5 text-xs">Case Dashboard</p>
      </div>

      <nav className="border-line-soft flex flex-col gap-0.5 border-t pt-4">
        {NAV_ITEMS.map((item) => {
          const active = item.id === current
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-4 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-soft text-brand-strong before:bg-brand before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:content-[""]'
                  : 'text-ink-muted hover:bg-subtle hover:text-ink'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 fill-current ${active ? '' : 'text-ink-faint'}`}
                aria-hidden="true"
              >
                {ICONS[item.id]}
              </svg>
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
