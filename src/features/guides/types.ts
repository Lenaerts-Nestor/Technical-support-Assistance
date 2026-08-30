export type CalloutVariant = 'info' | 'warning'

/** One item hanging under a step: a plain bullet, or a coloured Info / Warning note. */
export type SubItemKind = 'bullet' | 'info' | 'warning'

export type StepSubItem = {
  id: string
  kind: SubItemKind
  text: string
}

export type GuideStep = {
  id: string
  text: string
  /** Image filename, resolved against the synced folder — never a URL. */
  image?: string
  subItems: StepSubItem[]
}

/** A heading + body + ordered steps. Used standalone (`section` part) and inside a chapter. */
export type GuideSection = {
  id: string
  heading: string
  body: string
  steps: GuideStep[]
}

export type ChapterPart = {
  type: 'chapter'
  id: string
  subtitle: string
  sections: GuideSection[]
}

export type SectionPart = {
  type: 'section'
  id: string
  heading: string
  body: string
  steps: GuideStep[]
}

export type TablePart = {
  type: 'table'
  id: string
  title: string
  table: {
    headers: string[]
    rows: string[][]
  }
}

export type CalloutPart = {
  type: 'callout'
  id: string
  variant: CalloutVariant
  text: string
}

export type TermPart = {
  type: 'term'
  id: string
  title: string
  explanation: string
  bullets: string[]
}

export type GuidePart =
  | ChapterPart
  | SectionPart
  | TablePart
  | CalloutPart
  | TermPart

export type GuidePartKind = GuidePart['type']

export type GuideLink = {
  id: string
  title: string
  description: string
  url: string
}

export type Guide = {
  id: string
  title: string
  description?: string
  category?: string
  author?: string
  pinned?: boolean
  /** Manual sort position within its group (pinned vs. all). Lower = higher up. */
  order?: number
  parts: GuidePart[]
  links: GuideLink[]
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/** Shape of the `guides-backup.json` file that lives in the synced folder. */
export type GuidesFile = {
  exportedAt: string
  guides: Record<string, Guide>
}
