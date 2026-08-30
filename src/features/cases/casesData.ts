import type { CaseLanguage, TemplateGroup } from './types'

export { TEMPLATE_BODIES } from './casesTemplates'

/** Language switch options for the template library, in display order. */
export const LANGUAGES: { id: CaseLanguage; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'nl', label: 'NL' },
  { id: 'es', label: 'ES' },
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
