import { useState } from 'react'
import { useFocusMode } from '../../app/focusMode'
import { useVoiceCall } from './useVoiceCall'
import { NOTE_SECTIONS } from './voiceCallData'
import { CallHeader } from './components/CallHeader'
import { ProductsCard } from './components/ProductsCard'
import { NoteCard } from './components/NoteCard'
import { QuestionsCard } from './components/QuestionsCard'

export function VoiceCallPage() {
  const vc = useVoiceCall()
  const [questionsOpen, setQuestionsOpen] = useState(false)
  // The card takes the right-hand side, so the sidebar shrinks to icons meanwhile.
  useFocusMode('voiceCall', questionsOpen)

  return (
    <div className="mx-auto flex max-w-[1600px] items-start gap-6 px-8 py-7">
      <div className="min-w-0 flex-1 space-y-6">
      <CallHeader
        justCopied={vc.justCopied}
        hasContent={vc.hasContent}
        questionsOpen={questionsOpen}
        onToggleQuestions={() => setQuestionsOpen((o) => !o)}
        onCopy={vc.copyNotes}
        onClear={vc.clearCall}
      />

      <ProductsCard
        products={vc.products}
        onAdd={vc.addProduct}
        onChange={vc.updateProduct}
        onRemove={vc.removeProduct}
      />

      <div className="grid grid-cols-2 gap-6">
        {NOTE_SECTIONS.map((section, i) => (
          <NoteCard
            key={section.id}
            className={i === NOTE_SECTIONS.length - 1 ? 'col-span-2' : undefined}
            label={section.label}
            placeholder={section.placeholder}
            accent={section.accent}
            value={vc.notes[section.id].value}
            mode={vc.notes[section.id].mode}
            onValueChange={(value) => vc.setNoteValue(section.id, value)}
            onModeChange={(mode) => vc.setNoteMode(section.id, mode)}
          />
        ))}
      </div>
      </div>
      {questionsOpen && <QuestionsCard onClose={() => setQuestionsOpen(false)} />}
    </div>
  )
}
