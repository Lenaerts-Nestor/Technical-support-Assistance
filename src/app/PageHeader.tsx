import type { ReactNode } from 'react'
import { formatEyebrow } from '../features/calendar/calendarData'
import { useToday } from '../features/calendar/useToday'
import { PAGE_TITLE, SECTION_LABEL } from '../shared/ui/styles'

type PageHeaderProps = {
  title: string
  /** Small uppercase line under the title naming the workspace ("LIVE CALL WORKSPACE"). */
  label?: string
  /** One calm sentence under the label. */
  description?: ReactNode
  /** Page-level actions, aligned to the right of the label. They come first in the tab order after the sidebar. */
  actions?: ReactNode
}

/**
 * The top of a page: today's date, the page title (the one large heading on a screen), then a
 * label + description with the page's actions beside them. The date stays near the title because it is
 * the first thing a support agent checks.
 */
export function PageHeader({ title, label, description, actions }: PageHeaderProps) {
  const today = useToday()
  return (
    <header className="flex flex-col gap-5">
      <div>
        <p className={SECTION_LABEL}>{formatEyebrow(today)}</p>
        <h1 className={`${PAGE_TITLE} mt-2`}>{title}</h1>
      </div>
      {(label || description || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            {label && <p className={SECTION_LABEL}>{label}</p>}
            {description && <p className="text-ink-muted mt-1.5 text-sm">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </header>
  )
}
