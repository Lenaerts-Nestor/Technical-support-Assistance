import { CalloutIcon, ChevronLeftIcon, PanelIcon, PlusIcon, TableIcon, TermIcon } from '../components/icons'
import { PART_KINDS, PART_TONES } from '../guidesData'
import { useGuideDraft } from '../useGuideDraft'
import {
  CARD,
  CARD_HEADER,
  EMPTY,
  GHOST_BTN,
  GHOST_BTN_MD,
  INPUT_HEADING,
  PRIMARY_BTN,
  SECTION_LABEL,
} from '../../../shared/ui/styles'
import { GuidePartEdit } from './GuidePartEdit'
import { LinkEdit } from './LinkEdit'
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
  panel: PanelIcon,
}

export function GuideEditor({ guide, onSave, onCancel }: GuideEditorProps) {
  const d = useGuideDraft(guide, { onSave, onCancel })
  const { draft } = d

  return (
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
          className={`${INPUT_HEADING} min-w-0 flex-1 placeholder:font-normal`}
        />
        <button type="button" onClick={d.save} className={PRIMARY_BTN}>
          Save Guide
        </button>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_320px] items-start gap-6 px-8 pt-4 pb-8">
        <div className="space-y-4">
          {/* Rides along under the top bar so a block can be added from anywhere
              in a long guide without scrolling back up. */}
          <div className="bg-canvas sticky top-14 z-10 py-2">
            <div className="border-line bg-surface flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5">
              <span className={`mr-1 ${SECTION_LABEL}`}>Add block</span>
              {PART_KINDS.map(({ kind, label }) => {
                const Icon = KIND_ICON[kind]
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => d.addPart(kind)}
                    className={GHOST_BTN}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${PART_TONES[kind].dot}`}
                      aria-hidden
                    />
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {draft.parts.length === 0 ? (
            <p className={EMPTY}>
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

        <aside className={`${CARD} sticky top-[72px] flex h-fit flex-col`}>
          <div className={CARD_HEADER}>
            <h3 className="text-ink text-sm font-semibold">Quick Links</h3>
            <button type="button" onClick={d.addLink} className={GHOST_BTN}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add Link
            </button>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-ink-faint text-xs">
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
          </div>
        </aside>
      </div>
    </div>
  )
}
