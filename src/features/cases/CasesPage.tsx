import { useState } from 'react'
import { useCases } from './useCases'
import { useSnippetsData } from '../../app/appDataContext'
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
  const snippets = useSnippetsData()
  // "My texts" stays out of the way until the user wants it, or already has some.
  const [myTextsRequested, setMyTextsRequested] = useState(false)
  const hasSnippets = snippets.snippets.length > 0
  const myTextsOpen = hasSnippets || myTextsRequested

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
      <ComposerHeader />

      <div className={`grid items-start gap-6 ${
          myTextsOpen ? "grid-cols-[minmax(0,1fr)_700px]" : "grid-cols-[minmax(0,1fr)_440px]"
        }`}>
        <Editor
          className={COLUMN_HEIGHT}
          value={cases.draft}
          editorRef={cases.editorRef}
          justCopied={cases.justCopied}
          justCopiedPlain={cases.justCopiedPlain}
          flagged={cases.flagged}
          placeholders={cases.placeholders}
          onChange={cases.updateDraft}
          onKeyDown={cases.handleEditorKeyDown}
          onPaste={cases.handlePaste}
          onClear={cases.clear}
          onCopy={cases.copy}
          onCopyPlain={cases.copyPlain}
          onJumpToFlagged={cases.jumpToFlagged}
          onRemoveFlagged={cases.removeFlagged}
          onJumpToPlaceholder={cases.jumpToPlaceholder}
          onBold={cases.applyBold}
          onBullets={cases.applyBullets}
          onIndent={() => cases.indentBullets(1)}
          onOutdent={() => cases.indentBullets(-1)}
        />
        <UtilitiesPanel
          className={COLUMN_HEIGHT}
          language={cases.language}
          onLanguageChange={cases.setLanguage}
          onInsert={cases.insertTemplate}
          snippets={snippets}
          onInsertText={cases.insertText}
          myTextsOpen={myTextsOpen}
          onToggleMyTexts={hasSnippets ? null : () => setMyTextsRequested((v) => !v)}
        />
      </div>
    </div>
  )
}
