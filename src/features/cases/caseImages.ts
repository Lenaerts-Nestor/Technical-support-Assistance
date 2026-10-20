/**
 * Pictures in the Cases draft.
 *
 * The draft is plain text, so a picture is a line of its own, `[image 3]`, standing for the picture of
 * that number (kept apart in `imageStore`). The line is what you move, cut or delete to place or drop the
 * picture. On Copy, the HTML flavour swaps each such line for the picture itself (for Salesforce's email
 * composer) and the plain flavour leaves the line out.
 */

/** Pictures are shrunk to this width (never enlarged) so they stay small in the email. */
export const MAX_IMAGE_WIDTH = 700

/** Most pictures in one draft. */
export const MAX_IMAGES = 8

export type CaseImage = {
  id: number
  /** The picture as a `data:` URL, so it travels inside the copied HTML. */
  dataUrl: string
  width: number
  height: number
}

/** A line that is only an image marker. */
const MARKER_LINE = /^[ \t]*\[image (\d+)\][ \t]*$/

export const imageMarker = (id: number): string => `[image ${id}]`

/** The picture a line stands for, or null when it is ordinary text. */
export function imageIdOfLine(line: string): number | null {
  const m = MARKER_LINE.exec(line)
  return m ? Number(m[1]) : null
}

export type ImageMarker = {
  id: number
  /** Where the line starts and ends in the draft (the line break is not included). */
  start: number
  end: number
}

/** Every marker line in the draft, in order. */
export function findImageMarkers(text: string): ImageMarker[] {
  const found: ImageMarker[] = []
  let at = 0
  for (const line of text.split('\n')) {
    const id = imageIdOfLine(line)
    if (id !== null) found.push({ id, start: at, end: at + line.length })
    at += line.length + 1
  }
  return found
}

/** The pictures the draft uses, each once, in the order they appear. */
export function referencedImageIds(text: string): number[] {
  return [...new Set(findImageMarkers(text).map((m) => m.id))]
}

/** A number for the next picture: higher than every one stored, so a number is never used for two pictures. */
export function nextImageId(existing: Iterable<number>): number {
  let max = 0
  for (const id of existing) max = Math.max(max, id)
  return max + 1
}

const tidy = (lines: string[]) => lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '')

/** The draft without the lines for picture `id`. */
export function removeImageMarker(text: string, id: number): string {
  if (!findImageMarkers(text).some((m) => m.id === id)) return text
  return tidy(text.split('\n').filter((line) => imageIdOfLine(line) !== id))
}

/** The draft as plain text: no marker lines, since a picture cannot be part of it. */
export function withoutImageMarkers(text: string): string {
  if (findImageMarkers(text).length === 0) return text
  return tidy(text.split('\n').filter((line) => imageIdOfLine(line) === null))
}
