import { Fragment, useState } from 'react'
import {
  CalloutIcon,
  ChevronLeftIcon,
  PanelIcon,
  PlusIcon,
  TableIcon,
  TermIcon,
} from '../components/icons'
import { PART_KINDS, PART_TONES } from '../guidesData'
import { useGuideDraft } from '../useGuideDraft'
import {
  CARD,
  CARD_HEADER,
  EMPTY,
  GHOST_BTN,
  GHOST_BTN_MD,
  PRIMARY_BTN,
  SECTION_LABEL,
} from '../../../shared/ui/styles'
import { INPUT_HEADING } from './fields'
import { EditorUiContext, useEditorUiState } from './editorUi'
import { GuidePartEdit } from './GuidePartEdit'
import { InsertBar } from './InsertBar'
import { LinkEdit } from './LinkEdit'
import type { Guide, GuidePart, GuidePartKind } from '../types'

type GuideEditorProps = {
  guide: Guide
  onSave: (guide: Guide) => void
  onCancel: () => void
}

const KIND_ICON: Record<GuidePartKind, (p: { className?: string }) => React.ReactElement> = {
  chapter: PlusIcon,
  section: PlusIcon,
  table: TableIcon,
  callout: CalloutIcon,
  term: TermIcon,
  panel: PanelIcon,
}

/** Everything that can be folded up in the editor: parts, chapter sections and nested blocks. */
function foldableIds(parts: GuidePart[]): string[] {
  const ids: string[] = []
  for (const part of parts) {
    ids.push(part.id)
    if (part.type === 'chapter') {
      for (const s of part.sections) {
        ids.push(s.id, ...(s.blocks ?? []).map((b) => b.id))
      }
      ids.push(...(part.blocks ?? []).map((b) => b.id))
    } else if (part.type === 'section') {
      ids.push(...(part.blocks ?? []).map((b) => b.id))
    }
  }
  return ids
}

/** A short name for a part, for "inserting after …". */
function partName(part: GuidePart): string {
  switch (part.type) {
    case 'chapter':
      return part.subtitle || 'Untitled chapter'
    case 'section':
      return part.heading || 'Untitled section'
    case 'table':
      return part.title || 'Untitled table'
    case 'term':
      return part.title || 'Untitled term'
    case 'panel':
      return part.title || 'Interactive panel'
    case 'callout':
      return part.text.split('\n')[0] || 'Callout'
  }
}

export function GuideEditor({ guide, onSave, onCancel }: GuideEditorProps) {
  const d = useGuideDraft(guide, { onSave, onCancel })
  const ui = useEditorUiState()
  const { draft } = d
  // Quick links are optional: shown from the start only when the guide already has some.
  const [showLinks, setShowLinks] = useState(draft.links.length > 0)
  const [where, setWhere] = useState<'after' | 'end'>('after')

  const activeIndex = draft.parts.findIndex((p) => p.id === ui.activeId)
  const active = activeIndex >= 0 ? draft.parts[activeIndex] : undefined
  const canFollow = where === 'after' && !!active
  const folded = draft.parts.length > 0 && draft.parts.every((p) => ui.collapsed.has(p.id))

  const add = (kind: GuidePartKind, at?: number) => {
    const id = d.addPart(kind, at)
    ui.flashAdded(id)
    ui.setActiveId(id)
  }

  return (
    <EditorUiContext.Provider value={ui}>
      <div>
        {/* Solid and flush to the scrollport top — the title and Cancel / Save
            must stay legible, with nothing showing above them while scrolling. */}
        <header className="border-line-strong bg-canvas sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-8">
          <button type="button" onClick={d.cancel} className={GHOST_BTN_MD}>
            <ChevronLeftIcon className="h-4 w-4" />
            Cancel
          </button>
          <input
            value={draft.title}
            onChange={(e) => d.setTitle(e.target.value)}
            placeholder="Guide title…"
            aria-label="Guide title"
            className={`${INPUT_HEADING} min-w-0 flex-1 placeholder:font-normal`}
          />
          <button
            type="button"
            onClick={() => setShowLinks((s) => !s)}
            aria-pressed={showLinks}
            className={GHOST_BTN_MD}
            title="Show or hide the quick links panel"
          >
            Quick links{draft.links.length > 0 ? ` (${draft.links.length})` : ''}
          </button>
          <button type="button" onClick={d.save} className={PRIMARY_BTN}>
            Save Guide
          </button>
        </header>

        <div
          className={`mx-auto grid max-w-[1600px] items-start gap-6 px-8 pt-4 pb-10 ${showLinks ? 'grid-cols-[1fr_340px]' : 'grid-cols-1'}`}
        >
          <div className="min-w-0">
            {/* Rides along under the top bar so a block can be added from anywhere
                in a long guide without scrolling back up. New blocks go after the
                one being worked in, so there is nothing to drag up from the bottom. */}
            <div className="bg-canvas sticky top-14 z-10 pb-2">
              <div className="border-line-strong bg-surface space-y-2 rounded-xl border px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`mr-1 ${SECTION_LABEL}`}>Add</span>
                  {PART_KINDS.map(({ kind, label }) => {
                    const Icon = KIND_ICON[kind]
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => add(kind, canFollow ? activeIndex + 1 : undefined)}
                        className={GHOST_BTN}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${PART_TONES[kind].dot}`}
                          aria-hidden
                        />
                        <Icon className="h-3.5 w-3.5" />
                        {label.replace(/^Add /, '')}
                      </button>
                    )
                  })}
                </div>
                <div
                  className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                  title="You can also hover the line between two blocks to insert exactly there, and drag the ⠿ handle to reorder."
                >
                  <span className="border-line-strong inline-flex overflow-hidden rounded-md border text-xs font-medium">
                    {(['after', 'end'] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        aria-pressed={where === w}
                        onClick={() => setWhere(w)}
                        className={`px-2.5 py-1 transition-colors ${
                          where === w
                            ? 'bg-brand-soft text-brand-strong'
                            : 'text-ink-muted hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        {w === 'after' ? 'Insert after current block' : 'Insert at the end'}
                      </button>
                    ))}
                  </span>
                  <span className="min-w-0 truncate">
                    {where === 'end' || draft.parts.length === 0 ? (
                      'New blocks go at the bottom of the guide.'
                    ) : active ? (
                      <>
                        New blocks go after{' '}
                        <strong className="text-ink font-semibold">“{partName(active)}”</strong>.
                      </>
                    ) : (
                      'Click a block to choose where new ones go.'
                    )}
                  </span>
                  <span className="flex-1" />
                  {draft.parts.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        folded ? ui.expandAll() : ui.collapseAll(foldableIds(draft.parts))
                      }
                      title="Fold every block to one line — handy for reordering a long guide"
                      className={GHOST_BTN}
                    >
                      {folded ? 'Expand all' : 'Collapse all'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {draft.parts.length === 0 ? (
              <p className={`${EMPTY} mt-2`}>
                Add chapters (H2), sections (H3), or tables above to build your guide.
              </p>
            ) : (
              <div className="pt-1">
                <InsertBar kinds={PART_KINDS} onInsert={(k) => add(k, 0)} />
                {draft.parts.map((part, i) => (
                  <Fragment key={part.id}>
                    <GuidePartEdit part={part} index={i} count={draft.parts.length} d={d} />
                    <InsertBar kinds={PART_KINDS} onInsert={(k) => add(k, i + 1)} />
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          {showLinks && (
            <aside className={`${CARD} sticky top-[72px] flex max-h-[calc(100vh-6rem)] flex-col`}>
              <div className={CARD_HEADER}>
                <h3 className="text-ink text-sm font-semibold">Quick Links</h3>
                <button
                  type="button"
                  onClick={() => ui.flashAdded(d.addLink())}
                  className={GHOST_BTN}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Link
                </button>
              </div>
              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
                <p className="text-ink-faint text-xs">
                  Links appear in a “Quick links” menu at the top of the guide.
                </p>
                {draft.links.map((link, i) => (
                  <LinkEdit key={link.id} link={link} index={i} count={draft.links.length} d={d} />
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </EditorUiContext.Provider>
  )
}
