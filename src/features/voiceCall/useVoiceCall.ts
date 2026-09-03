import { useCallback } from 'react'
import { NOTE_SECTIONS } from './voiceCallData'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { useCopyToClipboard } from '../../shared/hooks/useCopyToClipboard'
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

const PRODUCTS_KEY = storageKey('voiceCall', 'products')
const NOTES_KEY = storageKey('voiceCall', 'notes')

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '')
const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}

function reviveProducts(raw: unknown): ProductEntry[] {
  const list = Array.isArray(raw) ? raw : []
  const products = list.map((item) => {
    const o = asObj(item)
    return {
      id: asStr(o.id) || uid(),
      model: asStr(o.model),
      firmware: asStr(o.firmware),
      serial: asStr(o.serial),
    }
  })
  // The page always renders at least one product row.
  return products.length ? products : [emptyProduct()]
}

/**
 * Merge stored note values onto a fresh section map. Rebuilding from
 * NOTE_SECTIONS rather than trusting the stored keys is what stops a section
 * added or renamed since the save from leaving the page reading `.value` off
 * `undefined`.
 */
function reviveNotes(raw: unknown): Record<string, NoteFieldState> {
  const stored = asObj(raw)
  const notes = initialNotes()
  for (const section of NOTE_SECTIONS) {
    const o = asObj(stored[section.id])
    notes[section.id] = {
      value: asStr(o.value),
      mode: o.mode === 'bullets' ? 'bullets' : 'text',
    }
  }
  return notes
}

/** Assemble every filled-in field into the plain-text blob copied to the clipboard. */
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
  const [products, setProducts] = usePersistentState(
    PRODUCTS_KEY,
    () => [emptyProduct()],
    reviveProducts,
  )
  const [notes, setNotes] = usePersistentState(NOTES_KEY, initialNotes, reviveNotes)
  const { copied, copy } = useCopyToClipboard()

  const addProduct = useCallback(
    () => setProducts((list) => [...list, emptyProduct()]),
    [setProducts],
  )
  const updateProduct = useCallback(
    (id: string, patch: ProductPatch) =>
      setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [setProducts],
  )
  const removeProduct = useCallback(
    (id: string) =>
      setProducts((list) => (list.length > 1 ? list.filter((p) => p.id !== id) : list)),
    [setProducts],
  )

  const setNoteValue = useCallback(
    (id: string, value: string) =>
      setNotes((map) => ({ ...map, [id]: { ...map[id], value } })),
    [setNotes],
  )
  const setNoteMode = useCallback(
    (id: string, mode: NoteMode) =>
      setNotes((map) => ({ ...map, [id]: { ...map[id], mode } })),
    [setNotes],
  )

  const copyNotes = useCallback(
    () => copy(buildNotesText(products, notes)),
    [copy, notes, products],
  )

  /** Wipe the form for the next call — the notes persist, so this is the reset. */
  const clearCall = useCallback(() => {
    setProducts([emptyProduct()])
    setNotes(initialNotes())
  }, [setNotes, setProducts])

  /** True while any field holds something worth losing. */
  const hasContent =
    products.some((p) => p.model.trim() || p.firmware.trim() || p.serial.trim()) ||
    NOTE_SECTIONS.some((s) => notes[s.id].value.trim())

  return {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    notes,
    setNoteValue,
    setNoteMode,
    copyNotes,
    justCopied: copied !== null,
    clearCall,
    hasContent,
  }
}
