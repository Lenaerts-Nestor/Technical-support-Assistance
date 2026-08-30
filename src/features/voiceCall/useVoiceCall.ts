import { useCallback, useState } from 'react'
import { NOTE_SECTIONS } from './voiceCallData'
import type { NoteFieldState, NoteMode, ProductEntry } from './types'

type ProductPatch = Partial<Omit<ProductEntry, 'id'>>

const uid = () => crypto.randomUUID()

const emptyProduct = (): ProductEntry => ({
  id: uid(),
  model: '',
  firmware: '',
  serial: '',
})

const initialNotes = (): Record<string, NoteFieldState> =>
  Object.fromEntries(
    NOTE_SECTIONS.map((s) => [s.id, { value: '', mode: 'text' as NoteMode }]),
  )

function formatNote(state: NoteFieldState): string {
  const text = state.value.trim()
  if (!text) return ''
  if (state.mode === 'text') return text
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `• ${line}`)
    .join('\n')
}

/** Assemble every filled-in field into the plain-text blob copied to the clipboard. */
function buildNotesText(
  products: ProductEntry[],
  notes: Record<string, NoteFieldState>,
): string {
  const blocks: string[] = []

  const productLines = products
    .filter((p) => p.model.trim() || p.firmware.trim() || p.serial.trim())
    .map((p) => {
      const parts = [p.model.trim() || '(model?)']
      if (p.firmware.trim()) parts.push(`FW ${p.firmware.trim()}`)
      if (p.serial.trim()) parts.push(`SN ${p.serial.trim()}`)
      return `• ${parts.join('  |  ')}`
    })
  if (productLines.length) blocks.push(`PRODUCTS\n${productLines.join('\n')}`)

  for (const section of NOTE_SECTIONS) {
    const body = formatNote(notes[section.id])
    if (body) blocks.push(`${section.label.toUpperCase()}\n${body}`)
  }

  return blocks.join('\n\n')
}

export function useVoiceCall() {
  const [products, setProducts] = useState<ProductEntry[]>(() => [emptyProduct()])
  const [notes, setNotes] = useState<Record<string, NoteFieldState>>(initialNotes)
  const [justCopied, setJustCopied] = useState(false)

  const addProduct = useCallback(
    () => setProducts((list) => [...list, emptyProduct()]),
    [],
  )
  const updateProduct = useCallback(
    (id: string, patch: ProductPatch) =>
      setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [],
  )
  const removeProduct = useCallback(
    (id: string) =>
      setProducts((list) => (list.length > 1 ? list.filter((p) => p.id !== id) : list)),
    [],
  )

  const setNoteValue = useCallback(
    (id: string, value: string) =>
      setNotes((map) => ({ ...map, [id]: { ...map[id], value } })),
    [],
  )
  const setNoteMode = useCallback(
    (id: string, mode: NoteMode) =>
      setNotes((map) => ({ ...map, [id]: { ...map[id], mode } })),
    [],
  )

  const copyNotes = useCallback(async () => {
    const text = buildNotesText(products, notes)
    try {
      await navigator.clipboard.writeText(text)
      setJustCopied(true)
      window.setTimeout(() => setJustCopied(false), 2000)
    } catch {
      setJustCopied(false)
    }
  }, [products, notes])

  return {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    notes,
    setNoteValue,
    setNoteMode,
    copyNotes,
    justCopied,
  }
}
