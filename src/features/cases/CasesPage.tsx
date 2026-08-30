import { useCases } from './useCases'
import { ComposerHeader } from './components/ComposerHeader'
import { Editor } from './components/Editor'
import { UtilitiesPanel } from './components/UtilitiesPanel'

export function CasesPage() {
  const cases = useCases()

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <ComposerHeader />

      <div className="grid grid-cols-[1fr_320px] items-start gap-6">
        <Editor
          value={cases.draft}
          editorRef={cases.editorRef}
          justCopied={cases.justCopied}
          onChange={cases.setDraft}
          onClear={cases.clear}
          onCopy={cases.copy}
        />
        <UtilitiesPanel
          language={cases.language}
          onLanguageChange={cases.setLanguage}
          onInsert={cases.insertTemplate}
        />
      </div>
    </div>
  )
}
