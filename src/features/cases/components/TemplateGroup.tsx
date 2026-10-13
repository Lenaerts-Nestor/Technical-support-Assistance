import { GROUP_TONES, isTemplateMenu } from '../casesData'
import { SECTION_LABEL } from '../../../shared/ui/styles'
import type { TemplateGroup as TemplateGroupModel } from '../types'
import { TemplateMenuButton } from './TemplateMenuButton'

type TemplateGroupProps = {
  group: TemplateGroupModel
  onInsert: (id: string) => void
}

/**
 * A labelled block of template buttons; clicking one inserts its copy. An item
 * with options is a menu button instead, listing its templates on click.
 */
export function TemplateGroup({ group, onInsert }: TemplateGroupProps) {
  const tone = GROUP_TONES[group.id] ?? GROUP_TONES.default

  return (
    <div>
      <h4 className={`mb-2 flex items-center gap-1.5 ${SECTION_LABEL}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
        {group.label}
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        {group.items.map((item) =>
          isTemplateMenu(item) ? (
            <TemplateMenuButton key={item.id} menu={item} toneId={group.id} onInsert={onInsert} />
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => onInsert(item.id)}
              className={`border-line bg-canvas text-ink-muted rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${tone.hover}`}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
