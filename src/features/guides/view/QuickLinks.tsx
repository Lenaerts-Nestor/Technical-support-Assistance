import { ExternalLinkIcon } from '../components/icons'
import type { GuideLink } from '../types'

/** External reference links, rendered as clickable cards. Shared shape with the editor. */
export function QuickLinks({ links }: { links: GuideLink[] }) {
  if (links.length === 0) {
    return <p className="text-xs text-slate-400">No quick links on this guide.</p>
  }

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-1.5 rounded-lg border border-slate-200 p-2.5 hover:border-slate-300 hover:bg-slate-50"
          >
            <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-slate-700">
                {link.title || link.url}
              </span>
              {link.description && (
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
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
