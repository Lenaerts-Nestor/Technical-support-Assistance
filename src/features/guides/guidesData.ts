import { DEFAULT_DEVICE_ID } from './panel/devices'
import type {
  Guide,
  GuideLink,
  GuidePart,
  GuidePartKind,
  GuideSection,
  GuideStep,
  GuidesFile,
  SectionBlock,
  SectionBlockKind,
  StepSubItem,
  SubItemKind,
} from './types'

/**
 * `order` value for guides that have never been manually sorted. Matches the
 * sentinel used in the export file so imported + new guides sort together.
 */
export const DEFAULT_GUIDE_ORDER = 9007199254740992

const uid = () => crypto.randomUUID()

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]

/** "28 jul" — day + lowercase short month, as shown on a guide card. */
export function formatCardDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/**
 * Section tally shown on a card: a chapter contributes its sections, every other
 * part type counts as one.
 */
export function countSections(guide: Guide): number {
  return guide.parts.reduce(
    (n, part) => n + (part.type === 'chapter' ? part.sections.length : 1),
    0,
  )
}

/* --------------------------------------------------------------------------- *
 * Add-part menu + chapter accent palette
 * --------------------------------------------------------------------------- */

export const PART_KINDS: { kind: GuidePartKind; label: string }[] = [
  { kind: 'chapter', label: 'Add Chapter (H2)' },
  { kind: 'section', label: 'Add Section (H3)' },
  { kind: 'table', label: 'Add Table' },
  { kind: 'callout', label: 'Add Callout' },
  { kind: 'term', label: 'Add Term Definition' },
  { kind: 'panel', label: 'Add Interactive Panel' },
]

/** The subset of PART_KINDS that can be added inside a chapter or a section. */
export const BLOCK_KINDS: { kind: SectionBlockKind; label: string }[] = [
  { kind: 'table', label: 'Table' },
  { kind: 'callout', label: 'Callout' },
  { kind: 'term', label: 'Term' },
  { kind: 'panel', label: 'Interactive Panel' },
]

/**
 * One accent per part type, used by the editor's block chips and left rules so
 * an H2 chapter, an H3 section and a table are told apart before reading them.
 */
export const PART_TONES: Record<
  GuidePartKind,
  { chip: string; rule: string; dot: string }
> = {
  chapter: {
    chip: 'bg-blue-400/15 text-blue-200 ring-1 ring-blue-400/30',
    rule: 'border-l-blue-400',
    dot: 'bg-blue-400',
  },
  section: {
    chip: 'bg-violet-400/15 text-violet-200 ring-1 ring-violet-400/30',
    rule: 'border-l-violet-400',
    dot: 'bg-violet-400',
  },
  table: {
    chip: 'bg-teal-400/15 text-teal-200 ring-1 ring-teal-400/30',
    rule: 'border-l-teal-400',
    dot: 'bg-teal-400',
  },
  callout: {
    chip: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30',
    rule: 'border-l-amber-400',
    dot: 'bg-amber-400',
  },
  term: {
    chip: 'bg-indigo-400/15 text-indigo-200 ring-1 ring-indigo-400/30',
    rule: 'border-l-indigo-400',
    dot: 'bg-indigo-400',
  },
  panel: {
    chip: 'bg-fuchsia-400/15 text-fuchsia-200 ring-1 ring-fuchsia-400/30',
    rule: 'border-l-fuchsia-400',
    dot: 'bg-fuchsia-400',
  },
}

/** Cycled per chapter so the eye can lock onto "the blue chapter" while scrolling. */
export const CHAPTER_ACCENTS = [
  { band: 'border-sky-400/35 bg-sky-400/12 text-sky-100', dot: 'bg-sky-400' },
  { band: 'border-violet-400/35 bg-violet-400/12 text-violet-100', dot: 'bg-violet-400' },
  {
    band: 'border-emerald-400/35 bg-emerald-400/12 text-emerald-100',
    dot: 'bg-emerald-400',
  },
  { band: 'border-amber-400/35 bg-amber-400/12 text-amber-100', dot: 'bg-amber-400' },
  { band: 'border-rose-400/35 bg-rose-400/12 text-rose-100', dot: 'bg-rose-400' },
  { band: 'border-line bg-subtle text-ink', dot: 'bg-ink-faint' },
] as const

export const accentFor = (i: number) =>
  CHAPTER_ACCENTS[((i % CHAPTER_ACCENTS.length) + CHAPTER_ACCENTS.length) % CHAPTER_ACCENTS.length]

/* --------------------------------------------------------------------------- *
 * Blank factories (New Guide + editor add buttons)
 * --------------------------------------------------------------------------- */

export function blankGuide(id: string, now: string): Guide {
  return {
    id,
    title: '',
    pinned: false,
    order: DEFAULT_GUIDE_ORDER,
    parts: [],
    links: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function blankStep(): GuideStep {
  return { id: uid(), text: '', subItems: [] }
}

export function blankSection(): GuideSection {
  return { id: uid(), heading: '', body: '', steps: [blankStep()], blocks: [] }
}

/** A table / callout / term / panel to nest inside a chapter or section. */
export function blankBlock(kind: SectionBlockKind): SectionBlock {
  return blankPart(kind) as SectionBlock
}

export function blankSubItem(kind: SubItemKind): StepSubItem {
  return { id: uid(), kind, text: '' }
}

export function blankLink(): GuideLink {
  return { id: uid(), title: '', description: '', url: '' }
}

export function blankPart(kind: GuidePartKind): GuidePart {
  switch (kind) {
    case 'chapter':
      return {
        type: 'chapter',
        id: uid(),
        subtitle: '',
        sections: [blankSection()],
        blocks: [],
      }
    case 'section':
      return {
        type: 'section',
        id: uid(),
        heading: '',
        body: '',
        steps: [blankStep()],
        blocks: [],
      }
    case 'table':
      return {
        type: 'table',
        id: uid(),
        title: '',
        table: {
          headers: ['Column 1', 'Column 2'],
          rows: [['', ''], ['', ''], ['', '']],
        },
      }
    case 'callout':
      return { type: 'callout', id: uid(), variant: 'info', text: '' }
    case 'term':
      return { type: 'term', id: uid(), title: '', explanation: '', bullets: [] }
    case 'panel':
      return {
        type: 'panel',
        id: uid(),
        title: '',
        deviceId: DEFAULT_DEVICE_ID,
        cards: {},
        endpoints: [],
        cables: [],
        annotations: [],
        scenarios: [],
      }
  }
}

/* --------------------------------------------------------------------------- *
 * Downloadable skeleton so the folder's guides-backup.json shape is discoverable
 * --------------------------------------------------------------------------- */

export const TEMPLATE_FILE: GuidesFile = {
  exportedAt: '',
  guides: {
    'example-guide-id': {
      id: 'example-guide-id',
      title: 'Example guide',
      description: 'Short summary of what this guide covers.',
      category: 'Example',
      author: 'Your name',
      pinned: false,
      order: 0,
      parts: [
        {
          type: 'term',
          id: 'example-term',
          title: 'A term worth defining',
          explanation: 'What it means in one or two sentences.',
          bullets: ['Key point one.', 'Key point two.'],
        },
        {
          type: 'chapter',
          id: 'example-chapter',
          subtitle: 'A group of related sections',
          sections: [
            {
              id: 'example-section',
              heading: 'First section',
              body: 'Optional intro text for the section.',
              steps: [
                { id: 'example-step-1', text: 'First thing to do.', subItems: [] },
                {
                  id: 'example-step-2',
                  text: 'Second thing to do.',
                  subItems: [
                    { id: 'example-sub-1', kind: 'bullet', text: 'A supporting detail.' },
                    { id: 'example-sub-2', kind: 'warning', text: 'Something to watch out for.' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'callout',
          id: 'example-callout',
          variant: 'info',
          text: 'A standalone note that is not tied to any step.',
        },
      ],
      links: [
        {
          id: 'example-link',
          title: 'Reference link',
          description: '',
          url: 'https://example.com',
        },
      ],
      tags: ['example'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
}
