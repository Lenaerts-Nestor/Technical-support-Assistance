import type { NoteSection } from './types'

/** Fixed note templates shown on the Voice Call page, in display order. */
export const NOTE_SECTIONS: NoteSection[] = [
  {
    id: 'currentFault',
    label: 'Current Fault',
    placeholder: 'What is the client experiencing right now?',
    accent: 'rose',
  },
  {
    id: 'clientTroubleshooting',
    label: 'Client Troubleshooting',
    placeholder: 'What has the client already tried?',
    accent: 'amber',
  },
  {
    id: 'selfTroubleshooting',
    label: 'Troubleshooting Done By Me',
    placeholder: 'What have you checked or changed during the call?',
    accent: 'sky',
  },
]

export const PRODUCT_PLACEHOLDERS = {
  model: 'e.g. TSW-1070',
  firmware: 'e.g. 3.002.0086',
  serial: 'optional',
} as const
