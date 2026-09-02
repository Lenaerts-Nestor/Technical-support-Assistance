import { useCases } from './useCases'
import { ComposerHeader } from './components/ComposerHeader'
import { Editor } from './components/Editor'
import { UtilitiesPanel } from './components/UtilitiesPanel'

/**
 * Editor and Utilities share one fixed height so the two columns always line up
 * — the Utilities panel is going to grow, and it scrolls internally rather than
 * stretching the page past the editor.
 */
const COLUMN_HEIGHT = 'h-[calc(100vh-11rem)] min-h-[560px]'

export function CasesPage() {
  const cases = useCases()

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
      <ComposerHeader />

      <div className="grid grid-cols-[1fr_460px] items-start gap-6">
        <Editor
          className={COLUMN_HEIGHT}
          value={cases.draft}
          editorRef={cases.editorRef}
          justCopied={cases.justCopied}
          flagged={cases.flagged}
          onChange={cases.setDraft}
          onClear={cases.clear}
          onCopy={cases.copy}
          onJumpToFlagged={cases.jumpToFlagged}
          onRemoveFlagged={cases.removeFlagged}
        />
        <UtilitiesPanel
          className={COLUMN_HEIGHT}
          language={cases.language}
          onLanguageChange={cases.setLanguage}
          onInsert={cases.insertTemplate}
        />
      </div>
    </div>
  )
}
