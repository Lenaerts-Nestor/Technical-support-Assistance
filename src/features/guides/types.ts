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
  /** Tables / callouts / terms / panels belonging to this section, rendered under its steps. */
  blocks?: SectionBlock[]
}

export type ChapterPart = {
  type: 'chapter'
  id: string
  subtitle: string
  sections: GuideSection[]
  /** Chapter-level blocks, rendered under all of its sections. */
  blocks?: SectionBlock[]
}

export type SectionPart = {
  type: 'section'
  id: string
  heading: string
  body: string
  steps: GuideStep[]
  blocks?: SectionBlock[]
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

/** A note pinned to one port of the panel, shown when that port is clicked. */
export type PanelAnnotation = {
  id: string
  /** Port id from the device template (see `panel/devices.ts`). */
  portId: string
  label: string
  note: string
}

/**
 * One troubleshooting check on a panel: a question, what to test, the ports to
 * light up while it is selected, and optional lines between ports ("move this
 * cable from here to there").
 */
export type PanelScenario = {
  id: string
  title: string
  text: string
  portIds: string[]
  links: { id: string; from: string; to: string }[]
}

/**
 * Interactive rear-panel diagram. The hardware layout lives in code
 * (`panel/devices.ts`, keyed by `deviceId`); only the per-guide notes and
 * troubleshooting checks are stored with the guide.
 */
export type PanelPart = {
  type: 'panel'
  id: string
  title: string
  deviceId: string
  annotations: PanelAnnotation[]
  scenarios: PanelScenario[]
}

export type GuidePart =
  | ChapterPart
  | SectionPart
  | TablePart
  | CalloutPart
  | TermPart
  | PanelPart

export type GuidePartKind = GuidePart['type']

/**
 * The part types that can also nest inside a chapter or a section. Chapters and
 * sections themselves cannot nest — the hierarchy stays two levels deep.
 */
export type SectionBlock = TablePart | CalloutPart | TermPart | PanelPart

export type SectionBlockKind = SectionBlock['type']

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
