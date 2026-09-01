import { ExternalLinkIcon } from '../components/icons'
import type { GuideLink } from '../types'

/** External reference links, rendered as clickable cards. Shared shape with the editor. */
export function QuickLinks({ links }: { links: GuideLink[] }) {
  if (links.length === 0) {
    return <p className="text-ink-faint text-xs">No quick links on this guide.</p>
  }

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="border-line hover:border-brand-line hover:bg-brand-soft group flex items-start gap-2 rounded-lg border p-2.5 transition-colors"
          >
            <ExternalLinkIcon className="group-hover:text-brand text-ink-faint mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0">
              <span className="group-hover:text-brand-strong text-ink block truncate text-xs font-semibold">
                {link.title || link.url}
              </span>
              {link.description && (
                <span className="text-ink-muted mt-0.5 block text-[11px] leading-snug">
                  {link.description}
                </span>
              )}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
