import type { ReactNode } from 'react'
import { CARD, CARD_HEADER } from '../../../shared/ui/styles'
import type { Notice } from '../useNotice'

type PackageCardProps = {
  icon: ReactNode
  title: string
  /** One plain sentence on what this card covers. */
  description: string
  /** What the file looks like, e.g. "A .zip containing links.json". */
  format?: string
  notice: Notice | null
  /** A reason the actions are unavailable right now; shown above them. */
  blocked?: string | null
  children: ReactNode
}

/** The shared shell of the Links / Case snippets / Guides / Full backup cards. */
export function PackageCard({ icon, title, description, format, notice, blocked, children }: PackageCardProps) {
  return (
    <section className={`${CARD} flex flex-col`}>
      <div className={CARD_HEADER}>
        <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <span className="text-brand-strong">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-ink-muted text-sm leading-relaxed">{description}</p>
        {format && <p className="text-ink-faint text-xs">{format}</p>}
        {blocked && <p className="text-xs text-amber-200">{blocked}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">{children}</div>
        {notice && (
          <p
            role="status"
            className={`rounded-lg border px-2.5 py-2 text-xs ${
              notice.tone === 'ok'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                : 'border-rose-400/40 bg-rose-400/10 text-rose-200'
            }`}
          >
            {notice.text}
          </p>
        )}
      </div>
    </section>
  )
}
