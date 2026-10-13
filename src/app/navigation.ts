export type PageId = 'voiceCall' | 'rma' | 'cases' | 'guides' | 'links' | 'kevinGuide'

/** `hidden` pages stay mounted and reachable in code but get no sidebar entry. */
export const NAV_ITEMS: { id: PageId; label: string; hidden?: boolean }[] = [
  { id: 'voiceCall', label: 'Voice Call' },
  { id: 'rma', label: 'RMA' },
  { id: 'cases', label: 'Cases' },
  { id: 'guides', label: 'Step-by-Step Guides' },
  { id: 'links', label: 'Links' },
  { id: 'kevinGuide', label: 'Guide for Kevin', hidden: true },
]
