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

/** One occurrence of a flagged phrase found in the draft. */
export type FlaggedMatch = {
  /** The phrase exactly as it appears in the draft, for the warning text. */
  text: string
  start: number
  end: number
}

/** A personal text the user added to the Utilities panel. */
export type Snippet = {
  id: string
  label: string
  text: string
  /** Only shown while this language is selected. */
  language: CaseLanguage
}
