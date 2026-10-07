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

/** One way out of a troubleshooting step: go to another step, or finish with a conclusion. */
export type PanelAnswer = {
  id: string
  label: string
  /** Id of the next step, or '' to finish with `result`. */
  next: string
  result: string
}

/**
 * Something done to the setup during a troubleshooting step. Cards swap places
 * with their cables; swapping units exchanges two devices while the cables stay
 * where they are; a cable can be pulled out or plugged in.
 */
export type PanelAction =
  | { id: string; type: 'swap-cards'; from: string; to: string }
  | { id: string; type: 'swap-units'; a: string; b: string }
  | { id: string; type: 'unplug'; cableId: string }
  | { id: string; type: 'plug'; cableId: string; from: string; to: string; label: string }

/**
 * One step of a troubleshooting check: what to do or ask, what changes in the
 * setup, ports to light up, lines to draw, and the answers that lead on. No
 * answers means the step is the end.
 */
export type PanelStep = {
  id: string
  text: string
  actions: PanelAction[]
  portIds: string[]
  links: { id: string; from: string; to: string }[]
  answers: PanelAnswer[]
}

/** A troubleshooting check: a question and the flow of steps that answers it. */
export type PanelScenario = {
  id: string
  title: string
  steps: PanelStep[]
}

/** One line of extra detail on a piece of equipment, e.g. "Resolution" / "1080p60". */
export type PanelEndpointInfo = { id: string; key: string; value: string }

/** A source (laptop, camera…), display, or a hop between them, drawn beside the unit. */
export type PanelEndpoint = {
  id: string
  side: 'source' | 'display'
  name: string
  /** Free text under the name, e.g. the room. Stays in the guide file, never in code. */
  detail: string
  info: PanelEndpointInfo[]
  /** Unit type from the catalog in `panel/units.ts` (NVX receiver, display…). */
  kind: string
  /** Model within that type; decides which ports the box shows. Unset = the type's first model. */
  model?: string
  /** Where the box was dragged to. Without it the box is placed automatically. */
  pos?: { x: number; y: number }
}

/** One cable. `from` / `to` are chassis port ids, or `ep:<endpoint id>` for equipment. */
export type PanelCable = {
  id: string
  from: string
  to: string
  label: string
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
  /** Card installed per slot id, for chassis units. Missing slots use the template default. */
  cards?: Record<string, string>
  endpoints: PanelEndpoint[]
  cables: PanelCable[]
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
