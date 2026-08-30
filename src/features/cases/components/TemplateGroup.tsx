import type { TemplateGroup as TemplateGroupModel } from '../types'

type TemplateGroupProps = {
  group: TemplateGroupModel
  onInsert: (id: string) => void
}

/** A labelled block of template buttons; clicking one inserts its copy. */
export function TemplateGroup({ group, onInsert }: TemplateGroupProps) {
  return (
    <div>
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {group.label}
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        {group.buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={() => onInsert(button.id)}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  )
}
