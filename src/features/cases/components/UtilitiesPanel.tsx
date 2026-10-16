import { TEMPLATE_GROUPS } from '../casesData'
import { CARD, CARD_HEADER, SECTION_LABEL } from '../../../shared/ui/styles'
import type { CaseLanguage } from '../types'
import { LanguageToggle } from './LanguageToggle'
import { TemplateGroup } from './TemplateGroup'
import { PlusIcon } from '../../../shared/ui/icons'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { SnippetsGroup } from './SnippetsGroup'
import type { SnippetsController } from '../useSnippets'

type UtilitiesPanelProps = {
  language: CaseLanguage
  onLanguageChange: (language: CaseLanguage) => void
  onInsert: (id: string) => void
  snippets: SnippetsController
  onInsertText: (text: string) => void
  /** Whether the "My texts" column is showing. */
  myTextsOpen: boolean
  /** Only offered while there are no saved texts: they keep the column open themselves. */
  onToggleMyTexts: (() => void) | null
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
  myTextsOpen,
  onToggleMyTexts,
  className,
}: UtilitiesPanelProps) {
  return (
    <aside className={`${CARD} flex flex-col overflow-hidden ${className ?? ''}`}>
      <div className={CARD_HEADER}>
        <h3 className="text-ink text-sm font-semibold">Utilities</h3>
        {onToggleMyTexts && (
          <button
            type="button"
            className={GHOST_BTN}
            onClick={onToggleMyTexts}
            aria-expanded={myTextsOpen}
            title={myTextsOpen ? 'Hide the My texts column' : 'Add your own texts that insert like the buttons below'}
          >
            {!myTextsOpen && <PlusIcon className="h-3.5 w-3.5" />}
            {myTextsOpen ? 'Hide my texts' : 'Add your own texts'}
          </button>
        )}
      </div>

      <div className={`grid min-h-0 flex-1 gap-6 overflow-y-auto p-4 ${
          myTextsOpen ? 'grid-cols-[minmax(0,1fr)_15rem]' : 'grid-cols-[minmax(0,1fr)]'
        }`}>
        <div className="flex flex-col gap-5">
        <div>
          <h4 className={`mb-2 ${SECTION_LABEL}`}>Language</h4>
          <LanguageToggle language={language} onChange={onLanguageChange} />
        </div>

        {TEMPLATE_GROUPS.map((group) => (
          <TemplateGroup key={group.id} group={group} onInsert={onInsert} />
        ))}
        </div>

        {myTextsOpen && (
          <div className="border-line-soft min-w-0 border-l pl-5">
            <SnippetsGroup snippets={snippets} language={language} onInsert={onInsertText} />
          </div>
        )}
      </div>
    </aside>
  )
}
