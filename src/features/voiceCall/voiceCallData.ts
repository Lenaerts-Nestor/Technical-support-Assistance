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

/** Reminder prompts for the call, grouped as in the support checklist. */
export const QUESTION_GROUPS: { title: string; questions: string[] }[] = [
  {
    title: 'General problem description',
    questions: [
      'When does the behavior occur?',
      'How is the behavior noticed?',
      'Was this always the case since this system was deployed, or did the system work fine initially?',
      'Is this a new project or an existing project?',
      'What changed to the system (firmware, network/infrastructure, configuration, etc.) that led to the behavior occurring?',
      'When did the issue first occur?',
      'Is there a pattern to the behavior?',
      'How frequent does the behavior occur?',
      'What steps are required to recover from the situation and get the system fully up and running again?',
    ],
  },
  {
    title: 'Scope of the issue',
    questions: [
      'How many units are affected? (out of how many in total?)',
      'How many regions, buildings, rooms are affected?',
      'Is there currently a workaround in place so that the end-client has a working system, until the root cause has been determined and addressed?',
    ],
  },
  {
    title: 'End-user impact',
    questions: [
      'Is this an existing (live) system?',
      'Can the end user still use the system?',
      'Is there currently a workaround in place so that the end-client has a working system, until the root cause has been determined and addressed?',
      'Is there a different way to achieve the desired functionality?',
      'In what way does the issue affect the end-user workflow?',
      'General state of the end-user => urgency?',
      'When is the project due?',
    ],
  },
  {
    title: 'System architecture',
    questions: [
      'Please provide a diagram of all used components and connections between them.',
      'Please include details of any cables, adapters and extenders, including: types (make, model, firmware version), cable lengths, used ports on the devices, etc.',
    ],
  },
]

export const QUESTION_TIPS = [
  'Ask for photos, videos, screenshots of the behavior.',
  'Ask yourself: do I have sufficient info to explain the issue in detail to anyone?',
]
