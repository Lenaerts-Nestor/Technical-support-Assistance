import type { HistoryEntry } from './types'

type TeamsInput = Pick<HistoryEntry, 'shift1' | 'shift2' | 'chat' | 'out' | 'notes'>

const names = (list: string[]) => (list.length ? list.join(', ') : '-')

/**
 * The plain-text schedule pasted into Teams. NOTES appears only when there is a
 * language warning to report.
 */
export function teamsText({ shift1, shift2, chat, out, notes }: TeamsInput): string {
  const lines = [
    "TODAY'S SCHEDULE",
    'LUNCH SHIFT:',
    `1st: ${names(shift1)}`,
    `2nd: ${names(shift2)}`,
    'CHAT',
    names(chat),
    'PTO/OOO',
    names(out),
  ]
  if (notes.length) lines.push('NOTES', ...notes)
  return lines.join('\n')
}
