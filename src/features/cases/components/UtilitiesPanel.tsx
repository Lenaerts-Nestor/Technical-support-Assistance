import { TEMPLATE_GROUPS } from '../casesData'
import type { CaseLanguage } from '../types'
import { LanguageToggle } from './LanguageToggle'
import { TemplateGroup } from './TemplateGroup'

type UtilitiesPanelProps = {
  language: CaseLanguage
  onLanguageChange: (language: CaseLanguage) => void
  onInsert: (id: string) => void
}

/** Right-hand column: language switch plus the grouped template buttons. */
export function UtilitiesPanel({
  language,
  onLanguageChange,
  onInsert,
}: UtilitiesPanelProps) {
  return (
    <aside className="sticky top-0 flex h-fit flex-col gap-5 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Utilities</h3>

      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Language
        </h4>
        <LanguageToggle language={language} onChange={onLanguageChange} />
      </div>

      {TEMPLATE_GROUPS.map((group) => (
        <TemplateGroup key={group.id} group={group} onInsert={onInsert} />
      ))}
    </aside>
  )
}
