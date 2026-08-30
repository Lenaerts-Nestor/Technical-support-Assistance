export type PageId = 'voiceCall' | 'rma' | 'cases' | 'guides'

export const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'voiceCall', label: 'Voice Call' },
  { id: 'rma', label: 'RMA' },
  { id: 'cases', label: 'Cases' },
  { id: 'guides', label: 'Step-by-Step Guides' },
]
