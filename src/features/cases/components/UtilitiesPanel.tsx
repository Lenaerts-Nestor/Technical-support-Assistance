import { TEMPLATE_GROUPS } from '../casesData'
import { CARD, CARD_HEADER, SECTION_LABEL } from '../../../shared/ui/styles'
import type { CaseLanguage } from '../types'
import { LanguageToggle } from './LanguageToggle'
import { TemplateGroup } from './TemplateGroup'
import { SnippetsGroup } from './SnippetsGroup'
import type { SnippetsController } from '../useSnippets'

type UtilitiesPanelProps = {
  language: CaseLanguage
  onLanguageChange: (language: CaseLanguage) => void
  onInsert: (id: string) => void
  snippets: SnippetsController
  onInsertText: (text: string) => void
  className?: string
}

/**
 * Right-hand column: language switch plus the grouped template buttons. Fixed
 * to the editor's height and scrolled internally, so adding more utilities
 * later never pushes the page taller than the editor.
 */
export function UtilitiesPanel({
  language,
  onLanguageChange,
  onInsert,
  snippets,
  onInsertText,
  className,
}: UtilitiesPanelProps) {
  return (
    <aside className={`${CARD} flex flex-col overflow-hidden ${className ?? ''}`}>
      <div className={CARD_HEADER}>
        <h3 className="text-ink text-sm font-semibold">Utilities</h3>
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        <div>
          <h4 className={`mb-2 ${SECTION_LABEL}`}>Language</h4>
          <LanguageToggle language={language} onChange={onLanguageChange} />
        </div>

        {TEMPLATE_GROUPS.map((group) => (
          <TemplateGroup key={group.id} group={group} onInsert={onInsert} />
        ))}

        <SnippetsGroup snippets={snippets} onInsert={onInsertText} />
      </div>
    </aside>
  )
}
