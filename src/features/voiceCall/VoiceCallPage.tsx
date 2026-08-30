import { useVoiceCall } from './useVoiceCall'
import { NOTE_SECTIONS } from './voiceCallData'
import { CallHeader } from './components/CallHeader'
import { ProductsCard } from './components/ProductsCard'
import { NoteCard } from './components/NoteCard'

export function VoiceCallPage() {
  const vc = useVoiceCall()

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <CallHeader justCopied={vc.justCopied} onCopy={vc.copyNotes} />

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
  )
}
