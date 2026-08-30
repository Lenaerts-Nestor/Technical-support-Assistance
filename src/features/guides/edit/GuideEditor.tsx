import { CalloutIcon, ChevronLeftIcon, PlusIcon, TableIcon, TermIcon } from '../components/icons'
import { PART_KINDS } from '../guidesData'
import { useGuideDraft } from '../useGuideDraft'
import { GHOST_BTN } from './fieldStyles'
import { GuidePartEdit } from './GuidePartEdit'
import { LinkEdit } from './LinkEdit'
import { TagInput } from './TagInput'
import type { Guide, GuidePartKind } from '../types'

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
}

export function GuideEditor({ guide, onSave, onCancel }: GuideEditorProps) {
  const d = useGuideDraft(guide, { onSave, onCancel })
  const { draft } = d

  return (
    <div className="mx-auto max-w-[1600px]">
      <header className="sticky top-0 z-10 -mx-8 mb-6 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-8 py-3 backdrop-blur">
        <button
          type="button"
          onClick={d.cancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Cancel
        </button>
        <input
          value={draft.title}
          onChange={(e) => d.setTitle(e.target.value)}
          placeholder="Guide title…"
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={d.save}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Save Guide
        </button>
      </header>

      <div className="grid grid-cols-[1fr_320px] items-start gap-6">
        <div className="space-y-4">
          <TagInput tags={draft.tags ?? []} onAdd={d.addTag} onRemove={d.removeTag} />

          <div className="flex flex-wrap gap-2">
            {PART_KINDS.map(({ kind, label }) => {
              const Icon = KIND_ICON[kind]
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => d.addPart(kind)}
                  className={GHOST_BTN}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>

          {draft.parts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-400">
              Add chapters (H2), sections (H3), or tables above to build your guide.
            </p>
          ) : (
            draft.parts.map((part, i) => (
              <GuidePartEdit
                key={part.id}
                part={part}
                index={i}
                count={draft.parts.length}
                d={d}
              />
            ))
          )}
        </div>

        <aside className="sticky top-16 flex h-fit flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Quick Links</h3>
            <button type="button" onClick={d.addLink} className={GHOST_BTN}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add Link
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Links appear in view mode as clickable cards.
          </p>
          {draft.links.map((link, i) => (
            <LinkEdit
              key={link.id}
              link={link}
              index={i}
              count={draft.links.length}
              onChange={(fields) => d.updateLink(link.id, fields)}
              onMove={(dir) => d.moveLink(link.id, dir)}
              onRemove={() => d.removeLink(link.id)}
            />
          ))}
        </aside>
      </div>
    </div>
  )
}
