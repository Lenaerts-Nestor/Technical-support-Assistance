import { useCases } from './useCases'
import { useSnippets } from './useSnippets'
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
  const snippets = useSnippets()

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
      <ComposerHeader />

      <div className="grid grid-cols-[minmax(0,1fr)_780px] items-start gap-6">
        <Editor
          className={COLUMN_HEIGHT}
          value={cases.draft}
          editorRef={cases.editorRef}
          justCopied={cases.justCopied}
          flagged={cases.flagged}
          onChange={cases.updateDraft}
          onKeyDown={cases.handleEditorKeyDown}
          onClear={cases.clear}
          onCopy={cases.copy}
          onJumpToFlagged={cases.jumpToFlagged}
          onRemoveFlagged={cases.removeFlagged}
          onBold={cases.applyBold}
          onBullets={cases.applyBullets}
        />
        <UtilitiesPanel
          className={COLUMN_HEIGHT}
          language={cases.language}
          onLanguageChange={cases.setLanguage}
          onInsert={cases.insertTemplate}
          snippets={snippets}
          onInsertText={cases.insertText}
        />
      </div>
    </div>
  )
}
