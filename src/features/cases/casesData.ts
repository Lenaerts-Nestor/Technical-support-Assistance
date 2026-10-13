import type { CaseLanguage, TemplateGroup } from './types'

export { TEMPLATE_BODIES } from './casesTemplates'

/** Language switch options for the template library, in display order. */
export const LANGUAGES: { id: CaseLanguage; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'nl', label: 'NL' },
  { id: 'es', label: 'ES' },
]

/**
 * One accent per template group so the Utilities panel can be scanned by colour
 * rather than by reading every label. Keyed by `TemplateGroup.id`.
 */
export const GROUP_TONES: Record<string, { dot: string; hover: string }> = {
  opening: {
    dot: 'bg-blue-400',
    hover: 'hover:border-blue-400/60 hover:bg-blue-400/12 hover:text-blue-100',
  },
  diagnostics: {
    dot: 'bg-violet-400',
    hover: 'hover:border-violet-400/60 hover:bg-violet-400/12 hover:text-violet-100',
  },
  rma: {
    dot: 'bg-amber-400',
    hover: 'hover:border-amber-400/60 hover:bg-amber-400/12 hover:text-amber-100',
  },
  followUp: {
    dot: 'bg-emerald-400',
    hover: 'hover:border-emerald-400/60 hover:bg-emerald-400/12 hover:text-emerald-100',
  },
  default: {
    dot: 'bg-ink-faint',
    hover: 'hover:border-line-strong hover:bg-subtle hover:text-ink',
  },
}

/**
 * Give-away phrases from a pasted AI answer. The editor flags these so they
 * never reach a customer. Matched case-insensitively on whole words only, and
 * any run of whitespace stands in for the spaces here — so a phrase broken
 * across a line still gets caught.
 *
 * Safe to edit: add or remove lines, nothing else depends on the list. Longer
 * entries win over shorter ones, so keeping "copilot said" alongside "copilot"
 * is what makes Remove cut the whole phrase instead of leaving "said:".
 */
export const FLAGGED_PHRASES: string[] = [
  // Attribution — the whole phrase goes, not just the name.
  'copilot said',
  'chatgpt said',
  'claude said',
  'gemini said',

  // Assistant / vendor names, on their own.
  'copilot',
  'chatgpt',
  'claude',
  'gemini',
  'bard',
  'grok',
  'perplexity',
  'openai',
  'anthropic',
  'deepseek',
  'llama',
  'chatbot',

  // Phrasing that reads as a pasted answer.
  'as an AI language model',
  'as an AI',
  'AI assistant',
  'AI model',
  'language model',
  "I'm sorry, but",
  'I cannot assist',

  // Stylistic tells, not names, but writing habits a pasted AI answer gives
  // away with. The em dash is the big one: real agents almost never type one,
  // AI answers are full of them.
  '—',
  'as of my last update',
  'as of my knowledge cutoff',
  "i'm unable to browse the internet",
]

/** Template buttons shown in the Utilities panel, grouped and in display order. */
export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: 'opening',
    label: 'Opening',
    buttons: [
      { id: 'opening.mail', label: 'Opening mail' },
      { id: 'opening.mailCall', label: 'Opening mail call' },
      { id: 'opening.issueSummary', label: 'Issue Summary' },
      { id: 'opening.associateAccount', label: 'Associate Account' },
    ],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    buttons: [
      { id: 'diagnostics.askInfo', label: 'Asking More Info' },
      { id: 'diagnostics.confirmSummary', label: 'Confirm Summary' },
      { id: 'diagnostics.remoteSession', label: 'Remote Session' },
      { id: 'diagnostics.uploaderLink', label: 'Uploader Link' },
      { id: 'diagnostics.infoGathering', label: 'Info Gathering' },
      { id: 'diagnostics.thirdPartyModules', label: 'Third Party / Custom Modules' },
    ],
  },
  {
    id: 'rma',
    label: 'RMA',
    buttons: [
      { id: 'rma.option1Asking', label: 'Asking RMA Info' },
      { id: 'rma.approving', label: 'Approving RMA' },
      { id: 'rma.outOfWarrantyPreCost', label: 'Out of Warranty – Cost' },
      { id: 'rma.npf', label: 'NPF' },
      { id: 'rma.avoidNpf', label: 'Avoid NPF' },
    ],
  },
  {
    id: 'followUp',
    label: 'Follow Up',
    buttons: [
      { id: 'followUp.first', label: '1st Follow Up' },
      { id: 'followUp.second', label: '2nd Follow Up' },
      { id: 'followUp.thirdClose', label: '3rd / Close' },
      { id: 'followUp.closeUpdate', label: 'Close (Update)' },
      { id: 'followUp.closeAnswered', label: 'Close (Answered)' },
      { id: 'followUp.closeOoo', label: 'Close (OOO)' },
      { id: 'followUp.clientWorking', label: 'Client Working' },
      { id: 'followUp.escalationUpdate', label: 'Escalation Client Update' },
      { id: 'followUp.timeSensitive', label: 'Time-Sensitive Reassurance' },
    ],
  },
]

// TEMPLATE_BODIES (the actual EN/NL/ES copy per button) lives in casesTemplates.ts
// and is re-exported at the top of this file.
