import { useMemo } from 'react'
import { useScrollSpy } from './useScrollSpy'
import { QuickLinks } from './QuickLinks'
import type { GuideLink } from '../types'

export type TocEntry = { id: string; label: string; level: 0 | 1 }

type GuideRailProps = {
  toc: TocEntry[]
  links: GuideLink[]
}

/** Sticky navigator: scroll-spy chapter/section tree + Quick Links. */
export function GuideRail({ toc, links }: GuideRailProps) {
  const ids = useMemo(() => toc.map((t) => t.id), [toc])
  const active = useScrollSpy(ids)

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <aside className="sticky top-16 flex max-h-[calc(100vh-6rem)] flex-col gap-5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
      {toc.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            On this page
          </h3>
          <nav className="space-y-0.5">
            {toc.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => jump(entry.id)}
                className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${
                  entry.level === 1 ? 'pl-5' : 'font-medium'
                } ${
                  active === entry.id
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Quick Links
        </h3>
        <QuickLinks links={links} />
      </div>
    </aside>
  )
}
