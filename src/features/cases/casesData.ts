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
      { id: 'rma.direct', label: 'Direct RMA' },
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
    ],
  },
]

// TEMPLATE_BODIES (the actual EN/NL/ES copy per button) lives in casesTemplates.ts
// and is re-exported at the top of this file.
