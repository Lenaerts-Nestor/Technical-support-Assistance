import type { CaseLanguage, TemplateButton, TemplateGroup, TemplateItem, TemplateMenu } from './types'

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
export const GROUP_TONES: Record<string, { dot: string; hover: string; open: string }> = {
  opening: {
    dot: 'bg-blue-400',
    hover: 'hover:border-blue-400/60 hover:bg-blue-400/12 hover:text-blue-100',
    open: 'border-blue-400/60 bg-blue-400/12 text-blue-100',
  },
  diagnostics: {
    dot: 'bg-violet-400',
    hover: 'hover:border-violet-400/60 hover:bg-violet-400/12 hover:text-violet-100',
    open: 'border-violet-400/60 bg-violet-400/12 text-violet-100',
  },
  rma: {
    dot: 'bg-amber-400',
    hover: 'hover:border-amber-400/60 hover:bg-amber-400/12 hover:text-amber-100',
    open: 'border-amber-400/60 bg-amber-400/12 text-amber-100',
  },
  followUp: {
    dot: 'bg-emerald-400',
    hover: 'hover:border-emerald-400/60 hover:bg-emerald-400/12 hover:text-emerald-100',
    open: 'border-emerald-400/60 bg-emerald-400/12 text-emerald-100',
  },
  default: {
    dot: 'bg-ink-faint',
    hover: 'hover:border-line-strong hover:bg-subtle hover:text-ink',
    open: 'border-line-strong bg-subtle text-ink',
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

/** True for an item that opens a menu rather than inserting text itself. */
export const isTemplateMenu = (item: TemplateItem): item is TemplateMenu => 'options' in item

/**
 * Template buttons shown in the Utilities panel, grouped and in display order.
 *
 * A plain `{ id, label }` inserts that template. `{ id, label, options }` shows
 * one button that opens a menu of its options. Rule of thumb: three or more
 * variants of the same intent (follow-up 1/2/3, the close reasons) go in a menu.
 */
export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: 'opening',
    label: 'Opening',
    items: [
      { id: 'opening.mail', label: 'Opening mail' },
      { id: 'opening.issueSummary', label: 'Issue Summary' },
      { id: 'opening.associateAccount', label: 'Associate Account' },
    ],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    items: [
      { id: 'diagnostics.askInfo', label: 'Asking More Info' },
      { id: 'diagnostics.confirmSummary', label: 'Confirm Summary' },
      { id: 'diagnostics.remoteSession', label: 'Remote Session' },
      {
        id: 'diagnostics.logs',
        label: 'Uploader / Info Gathering',
        options: [
          { id: 'diagnostics.uploaderLink', label: 'Uploader Link' },
          { id: 'diagnostics.infoGathering', label: 'Info Gathering' },
        ],
      },
      { id: 'diagnostics.thirdPartyModules', label: 'Third Party / Custom Modules' },
    ],
  },
  {
    id: 'rma',
    label: 'RMA',
    items: [
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
    items: [
      {
        id: 'followUp.menu',
        label: 'Follow Up',
        options: [
          { id: 'followUp.first', label: '1st Follow Up' },
          { id: 'followUp.second', label: '2nd Follow Up' },
          { id: 'followUp.thirdClose', label: '3rd / Close' },
        ],
      },
      {
        id: 'followUp.closeMenu',
        label: 'Close',
        options: [
          { id: 'followUp.closeAnswered', label: 'Close (Answered)' },
          { id: 'followUp.closeUpdate', label: 'Close (Update)' },
          { id: 'followUp.closeWaiting', label: 'Close (Waiting)' },
          { id: 'followUp.closeDuplicate', label: 'Close (Duplicate)' },
        ],
      },
      {
        id: 'followUp.clientWorkingMenu',
        label: 'Client Working',
        options: [
          { id: 'followUp.clientWorking', label: 'Standard' },
          { id: 'followUp.clientWorkingPolite', label: 'Polite (awaiting feedback)' },
        ],
      },
      {
        id: 'followUp.monitorMenu',
        label: 'Monitoring',
        options: [
          { id: 'followUp.monitorPositive', label: 'Monitor (Positive Feedback)' },
          { id: 'followUp.monitorNoFollowUp', label: 'Monitor (No Active Follow-up)' },
        ],
      },
      { id: 'followUp.escalationUpdate', label: 'Escalation Client Update' },
      { id: 'followUp.timeSensitive', label: 'Time-Sensitive Reassurance' },
    ],
  },
]

/** Every insertable template, menus flattened — for looking a button up by id. */
export const ALL_TEMPLATE_BUTTONS: TemplateButton[] = TEMPLATE_GROUPS.flatMap((g) =>
  g.items.flatMap((item) => (isTemplateMenu(item) ? item.options : [item])),
)

// TEMPLATE_BODIES (the actual EN/NL/ES copy per button) lives in casesTemplates.ts
// and is re-exported at the top of this file.
