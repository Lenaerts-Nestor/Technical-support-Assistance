import { useCallback, useMemo, useState } from 'react'
import { useFocusMode } from '../../../app/focusMode'
import { storageKey, usePersistentState } from '../../../shared/storage/usePersistentState'
import { formatCardDate } from '../guidesData'
import { ChevronLeftIcon, ColumnsIcon, RowsIcon } from '../components/icons'
import { DANGER_BTN, EMPTY, GHOST_BTN_MD } from '../../../shared/ui/styles'
import { GuideMasonry } from './GuideMasonry'
import { GuidePartView } from './GuidePartView'
import { QuickLinksMenu } from './QuickLinks'
import { PanelWorkspace } from './PanelWorkspace'
import { PanelWorkspaceProvider } from './panelWorkspaceContext'
import type { Guide, GuidePart, PanelPart } from '../types'

type GuideLayout = 'columns' | 'single'
const LAYOUT_KEY = storageKey('guides', 'layout')

type GuideViewProps = {
  guide: Guide
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Term / callout parts render above the body, which starts at the first chapter, section or table. */
const isStructural = (p: GuidePart) =>
  p.type === 'chapter' || p.type === 'section' || p.type === 'table'

/** Every panel block in the guide, wherever it is nested, in reading order. */
function collectPanels(parts: GuidePart[]): PanelPart[] {
  const out: PanelPart[] = []
  for (const p of parts) {
    if (p.type === 'panel') out.push(p)
    else if (p.type === 'section') out.push(...(p.blocks ?? []).filter((b) => b.type === 'panel'))
    else if (p.type === 'chapter') {
      for (const s of p.sections) out.push(...(s.blocks ?? []).filter((b) => b.type === 'panel'))
      out.push(...(p.blocks ?? []).filter((b) => b.type === 'panel'))
    }
  }
  return out
}

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

  const panels = useMemo(() => collectPanels(guide.parts), [guide.parts])
  const [tab, setTab] = useState<'guide' | string>('guide')
  const activePanel = panels.find((p) => p.id === tab)
  useFocusMode(!!activePanel)

  const [layout, setLayout] = usePersistentState<GuideLayout>(
    LAYOUT_KEY,
    () => 'columns',
    (raw) => (raw === 'single' || raw === 'columns' ? raw : null),
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
        <QuickLinksMenu links={guide.links} />
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setLayout(layout === 'columns' ? 'single' : 'columns')}
            title={layout === 'columns' ? 'Show one column' : 'Show two columns'}
            aria-label={layout === 'columns' ? 'Show one column' : 'Show two columns'}
            className={GHOST_BTN_MD}
          >
            {layout === 'columns' ? <RowsIcon className="h-4 w-4" /> : <ColumnsIcon className="h-4 w-4" />}
          </button>
        )}
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

      {panels.length > 0 && (
        <div
          role="tablist"
          className="border-line bg-canvas sticky top-14 z-10 flex h-10 items-end gap-1 border-b px-8"
        >
          {[{ id: 'guide', label: 'Guide' }, ...panels.map((p) => ({ id: p.id, label: p.title || 'Panel diagram' }))].map(
            (t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={(activePanel?.id ?? 'guide') === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px max-w-60 truncate rounded-t-md border border-b-0 px-3 py-1.5 text-sm font-medium transition-colors ${
                  (activePanel?.id ?? 'guide') === t.id
                    ? 'border-line-strong bg-surface text-ink'
                    : 'text-ink-muted hover:text-ink border-transparent'
                }`}
              >
                {t.label}
              </button>
            ),
          )}
        </div>
      )}

      {activePanel ? (
        <div className="h-[calc(100vh-6rem)]">
          <PanelWorkspace key={activePanel.id} part={activePanel} />
        </div>
      ) : (
        <PanelWorkspaceProvider value={panels.length > 0 ? setTab : null}>
        <div
          className={`mx-auto px-8 pt-6 pb-10 ${
            layout === 'single' ? 'max-w-3xl' : 'max-w-[1600px]'
          }`}
        >
          <div className="min-w-0 space-y-4">
            {lead.map((part) => (
              <GuidePartView key={part.id} part={part} />
            ))}

            {items.length > 0 ? (
              layout === 'single' ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id}>{item.node}</div>
                  ))}
                </div>
              ) : (
                <GuideMasonry items={items} />
              )
            ) : lead.length === 0 ? (
              <p className={EMPTY}>
                This guide has no steps yet — just reference links.
              </p>
            ) : null}
          </div>
        </div>
        </PanelWorkspaceProvider>
      )}
    </div>
  )
}
