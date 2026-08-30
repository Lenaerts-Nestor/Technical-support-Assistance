export type NoteMode = 'text' | 'bullets'

export type NoteAccent = 'rose' | 'amber' | 'sky'

export type ProductEntry = {
  id: string
  model: string
  firmware: string
  serial: string
}

export type NoteFieldState = {
  value: string
  mode: NoteMode
}

export type NoteSection = {
  id: string
  label: string
  placeholder: string
  accent: NoteAccent
}
