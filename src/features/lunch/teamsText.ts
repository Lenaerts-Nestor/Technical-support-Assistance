import type { HistoryEntry } from './types'

type TeamsInput = Pick<HistoryEntry, 'shift1' | 'shift2' | 'chat' | 'out' | 'notes'>

type Line = { text: string; bold?: boolean }

const names = (list: string[]) => (list.length ? list.join(', ') : '-')

/** The schedule as lines. Section headings are bold; an empty text is a blank line. NOTES appears only when there is a warning. */
function lines({ shift1, shift2, chat, out, notes }: TeamsInput): Line[] {
  const result: Line[] = [
    { text: "TODAY'S SCHEDULE", bold: true },
    { text: '' },
    { text: 'LUNCH SHIFT:', bold: true },
    { text: `1st: ${names(shift1)}` },
    { text: `2nd: ${names(shift2)}` },
    { text: '' },
    { text: 'CHAT', bold: true },
    { text: names(chat) },
    { text: '' },
    { text: 'PTO/OOO', bold: true },
    { text: names(out) },
  ]
  if (notes.length) result.push({ text: '' }, { text: 'NOTES', bold: true }, ...notes.map((text) => ({ text })))
  return result
}

/** Plain text for the clipboard (and for any field that cannot hold formatting). */
export function teamsText(input: TeamsInput): string {
  return lines(input)
    .map((l) => l.text)
    .join('\n')
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The same text as HTML with the headings in bold — what Teams pastes when it is given the rich copy. */
export function teamsHtml(input: TeamsInput): string {
  return lines(input)
    .map((l) => (l.bold ? `<b>${escapeHtml(l.text)}</b>` : escapeHtml(l.text)))
    .join('<br>')
}
