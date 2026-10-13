/** One clickable link. */
export type LinkEntry = {
  id: string
  kind: 'link'
  label: string
  url: string
}

/**
 * A dropdown folder inside a section ("Recovery Process"). It shows as a single
 * row with a count; clicking it opens a filterable list of its links. Folders
 * hold links only — they don't nest.
 */
export type LinkFolder = {
  id: string
  kind: 'folder'
  label: string
  links: LinkEntry[]
}

/** What a section can hold: a plain link, or a folder of links. */
export type SectionItem = LinkEntry | LinkFolder

/** A titled card of links (Crestron.com, Support Tools, ...). */
export type LinkSection = {
  id: string
  title: string
  items: SectionItem[]
}
