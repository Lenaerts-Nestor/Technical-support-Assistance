import { useCallback, useMemo, useState } from 'react'
import { formatCardDate } from '../guidesData'
import { ChevronLeftIcon } from '../components/icons'
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
    <div className="mx-auto max-w-[1600px]">
      <header className="sticky top-0 z-10 -mx-8 mb-6 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-8 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-slate-900">
            {guide.title || 'Untitled Guide'}
          </h2>
          <p className="text-xs text-slate-400">
            {guide.category && (
              <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
                {guide.category}
              </span>
            )}
            updated {formatCardDate(guide.updatedAt)}
          </p>
        </div>
        {chapterIds.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete "${guide.title || 'this guide'}"?`)) onDelete()
          }}
          className="rounded-md border border-rose-200 px-2.5 py-1 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
        >
          Delete
        </button>
      </header>

      <div className="grid grid-cols-[1fr_300px] items-start gap-6">
        <div className="min-w-0 space-y-4">
          {lead.map((part) => (
            <GuidePartView key={part.id} part={part} />
          ))}

          {items.length > 0 ? (
            <GuideMasonry items={items} />
          ) : lead.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400">
              This guide has no steps yet — just reference links.
            </p>
          ) : null}
        </div>

        <GuideRail toc={toc} links={guide.links} />
      </div>
    </div>
  )
}
