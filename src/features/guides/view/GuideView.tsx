import { useCallback, useMemo, useState } from 'react'
import { formatCardDate } from '../guidesData'
import { ChevronLeftIcon } from '../components/icons'
import { DANGER_BTN, EMPTY, GHOST_BTN_MD } from '../../../shared/ui/styles'
import { GuideMasonry } from './GuideMasonry'
import { GuidePartView } from './GuidePartView'
import { GuideRail, type TocEntry } from './GuideRail'
import type { Guide, GuidePart } from '../types'

type GuideViewProps = {
  guide: Guide
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Term / callout parts render above the navigable body; these three drive the rail. */
const isStructural = (p: GuidePart) =>
  p.type === 'chapter' || p.type === 'section' || p.type === 'table'

export function GuideView({ guide, onBack, onEdit, onDelete }: GuideViewProps) {
  const { lead, body } = useMemo(() => {
    const first = guide.parts.findIndex(isStructural)
    const splitAt = first === -1 ? guide.parts.length : first
    return { lead: guide.parts.slice(0, splitAt), body: guide.parts.slice(splitAt) }
  }, [guide.parts])

  const chapterIds = useMemo(
    () => body.filter((p) => p.type === 'chapter').map((p) => p.id),
    [body],
  )

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const allCollapsed =
    chapterIds.length > 0 && chapterIds.every((id) => collapsed.has(id))

  const toggleChapter = useCallback(
    (id: string) =>
      setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(chapterIds))

  const toc = useMemo<TocEntry[]>(() => {
    const entries: TocEntry[] = []
    for (const part of body) {
      if (part.type === 'chapter') {
        entries.push({ id: part.id, label: part.subtitle || 'Chapter', level: 0 })
        for (const s of part.sections) {
          if (s.heading) entries.push({ id: s.id, label: s.heading, level: 1 })
        }
      } else if (part.type === 'section') {
        entries.push({ id: part.id, label: part.heading || 'Section', level: 0 })
      } else if (part.type === 'table') {
        entries.push({ id: part.id, label: part.title || 'Table', level: 0 })
      }
    }
    return entries
  }, [body])

  const items = useMemo(() => {
    const accentByChapter = new Map<string, number>()
    for (const part of body) {
      if (part.type === 'chapter') accentByChapter.set(part.id, accentByChapter.size)
    }
    return body.map((part) => ({
      id: part.id,
      node: (
        <GuidePartView
          part={part}
          accentIndex={accentByChapter.get(part.id) ?? 0}
          collapsed={collapsed.has(part.id)}
          onToggle={() => toggleChapter(part.id)}
        />
      ),
    }))
  }, [body, collapsed, toggleChapter])

  return (
    <div>
      {/* Flush to the scrollport top and one row tall, so nothing shows above it
          while scrolling and it steals as little height as possible. */}
      <header className="border-line-strong bg-canvas sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-8">
        <button type="button" onClick={onBack} className={GHOST_BTN_MD}>
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </button>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h2 className="text-ink truncate text-base font-semibold tracking-tight">
            {guide.title || 'Untitled Guide'}
          </h2>
          {guide.category && (
            <span className="border-brand-line bg-brand-soft text-brand-strong shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold">
              {guide.category}
            </span>
          )}
          <span className="text-ink-faint shrink-0 text-xs">
            updated {formatCardDate(guide.updatedAt)}
          </span>
        </div>
        {chapterIds.length > 0 && (
          <button type="button" onClick={toggleAll} className={GHOST_BTN_MD}>
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        )}
        <button type="button" onClick={onEdit} className={GHOST_BTN_MD}>
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete "${guide.title || 'this guide'}"?`)) onDelete()
          }}
          className={DANGER_BTN}
        >
          Delete
        </button>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_300px] items-start gap-6 px-8 pt-6 pb-8">
        <div className="min-w-0 space-y-4">
          {lead.map((part) => (
            <GuidePartView key={part.id} part={part} />
          ))}

          {items.length > 0 ? (
            <GuideMasonry items={items} />
          ) : lead.length === 0 ? (
            <p className={EMPTY}>
              This guide has no steps yet — just reference links.
            </p>
          ) : null}
        </div>

        <GuideRail toc={toc} links={guide.links} />
      </div>
    </div>
  )
}
