import { countSections, formatCardDate } from '../guidesData'
import { ArrowDownIcon, ArrowUpIcon, LayersIcon, LinkIcon, PinIcon } from './icons'
import type { Guide } from '../types'

type GuideCardProps = {
  guide: Guide
  canMoveUp: boolean
  canMoveDown: boolean
  onOpen: () => void
  onTogglePin: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

/** One guide summary card in the list. Clicking the body opens the guide. */
export function GuideCard({
  guide,
  canMoveUp,
  canMoveDown,
  onOpen,
  onTogglePin,
  onMoveUp,
  onMoveDown,
}: GuideCardProps) {
  const pinned = !!guide.pinned
  const sections = countSections(guide)
  const links = guide.links.length

  return (
    <article
      className={`relative flex flex-col rounded-xl border p-4 transition-colors ${
        pinned
          ? "border-rose-200 bg-rose-50/40 hover:border-rose-300 before:absolute before:left-0 before:inset-y-3 before:w-1 before:rounded-full before:bg-rose-400 before:content-['']"
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full cursor-pointer text-left"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {guide.title || 'Untitled Guide'}
            </span>
            {pinned && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                Pinned
              </span>
            )}
          </span>
          <span
            className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${
              pinned ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {pinned ? 'Pinned Guide' : 'Guide'}
          </span>
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <LayersIcon className="h-3.5 w-3.5" />
            {sections} {sections === 1 ? 'section' : 'sections'}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <LinkIcon className="h-3.5 w-3.5" />
            {links} {links === 1 ? 'link' : 'links'}
          </span>
          <span aria-hidden>·</span>
          <span>{formatCardDate(guide.updatedAt)}</span>
        </span>

        {guide.tags && guide.tags.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {guide.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </button>

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onTogglePin}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
            pinned
              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <PinIcon className="h-3.5 w-3.5" />
          {pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label="Move up"
          className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label="Move down"
          className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}
