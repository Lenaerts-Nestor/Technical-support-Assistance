export type CaseLanguage = 'en' | 'nl' | 'es'

/** One insertable template button in the Utilities panel. */
export type TemplateButton = {
  id: string
  label: string
}

/** A labelled group of template buttons (Opening, Diagnostics, RMA, Follow Up). */
export type TemplateGroup = {
  id: string
  label: string
  buttons: TemplateButton[]
}

/**
 * Resolved template copy, keyed by button id then language. Populated later —
 * `useCases` falls back to a bracketed placeholder while an entry is missing.
 */
export type TemplateBodies = Record<string, Partial<Record<CaseLanguage, string>>>
