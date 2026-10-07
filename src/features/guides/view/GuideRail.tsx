import { useMemo } from 'react'
import { useScrollSpy } from './useScrollSpy'
import { QuickLinks } from './QuickLinks'
import { CARD, SECTION_LABEL } from '../../../shared/ui/styles'
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
    <aside
      className={`${CARD} sticky top-[72px] flex max-h-[calc(100vh-6rem)] flex-col gap-4 overflow-y-auto p-4`}
    >
      {toc.length > 0 && (
        <div>
          <h3 className={`mb-2 flex items-center justify-between ${SECTION_LABEL}`}>
            On this page
            <span className="text-ink-faint font-medium normal-case">
              {toc.length}
            </span>
          </h3>
          {/* Long guides produce a long contents list; cap it and scroll inside
              so Quick Links never gets pushed out of reach. */}
          <nav className="max-h-[45vh] space-y-px overflow-y-auto pr-1">
            {toc.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => jump(entry.id)}
                title={entry.label}
                className={`block w-full truncate rounded-md px-2 py-1 text-left transition-colors ${
                  entry.level === 1
                    ? 'border-line-soft ml-2 border-l pl-2.5 text-[11px]'
                    : 'text-xs font-semibold'
                } ${
                  active === entry.id
                    ? 'bg-brand-soft text-brand-strong'
                    : 'text-ink-muted hover:bg-subtle hover:text-ink'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {links.length > 0 && (
        <div className={toc.length > 0 ? 'border-line-soft border-t pt-4' : undefined}>
          <h3 className={`mb-2 ${SECTION_LABEL}`}>Quick Links</h3>
          <QuickLinks links={links} />
        </div>
      )}
    </aside>
  )
}
