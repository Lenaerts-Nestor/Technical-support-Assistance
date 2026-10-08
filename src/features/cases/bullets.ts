/**
 * Bullet lists in the Cases draft.
 *
 * The draft is plain text, so a bullet is just a line that starts with a marker.
 * What makes lists survive a trip into Salesforce or Notes is that there is one
 * canonical shape for them — marker, one space, text; two spaces of indent and
 * a different marker per nesting level — and that everything else people paste
 * in or type (`-`, `*`, `–`, `·`, Word's private-use bullet, a tab after the
 * bullet…) is folded into it. On the way out the same lines become a real
 * `<ul>` for rich targets and stay as tidy "• " lines for plain ones.
 */

/** Marker per nesting level; deeper levels cycle through them. */
export const MARKERS = ['•', '◦', '▪'] as const

/** Spaces of indent per nesting level. */
const INDENT = 2

/**
 * A bullet line: optional indent, one marker, whitespace, the text. `-`, `*` and
 * `–` only count as markers when followed by whitespace, so "-5 °C", "--" signature
 * rules and "**bold**" are left alone.
 */
const BULLET_RE = /^([ \t]*)([•◦▪‣·●○■\-–*])[ \t]+(.*)$/

export type Bullet = {
  level: number
  text: string
  /** Characters before the text: indent, marker and the space after it. */
  prefixLength: number
}

/** How many nesting levels a run of leading whitespace stands for (a tab counts as one level). */
const levelOf = (indent: string) => {
  const width = [...indent].reduce((w, ch) => w + (ch === '\t' ? INDENT : 1), 0)
  return Math.floor(width / INDENT)
}

/** The bullet a line is, or null when it is ordinary text. */
export function parseBullet(line: string): Bullet | null {
  const m = BULLET_RE.exec(line)
  if (!m) return null
  return { level: levelOf(m[1]), text: m[3], prefixLength: line.length - m[3].length }
}

/** A bullet line in canonical form. */
export const formatBullet = (level: number, text: string): string =>
  `${' '.repeat(INDENT * level)}${MARKERS[level % MARKERS.length]} ${text}`

/** Every bullet line rewritten canonically; all other lines untouched. */
export function normalizeBullets(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const b = parseBullet(line)
      return b ? formatBullet(b.level, b.text) : line
    })
    .join('\n')
}

/**
 * Bullet toggle for a block of whole lines: if every non-blank line is already
 * a bullet they all lose it, otherwise every non-blank line becomes one (lines
 * that were bullets keep their nesting and just get the canonical marker). A
 * block of nothing but blank lines starts a fresh bullet.
 */
export function toggleBulletLines(block: string): string {
  const lines = block.split('\n')
  const content = lines.filter((line) => line.trim())
  const skipBlanks = content.length > 0
  const allBulleted = skipBlanks && content.every((line) => parseBullet(line))
  return lines
    .map((line) => {
      if (skipBlanks && !line.trim()) return line
      const b = parseBullet(line)
      if (allBulleted) return b ? b.text : line
      return b ? formatBullet(b.level, b.text) : formatBullet(0, line.trim())
    })
    .join('\n')
}

/**
 * Move every bullet line of a block one level in or out. Returns null when
 * the block has no bullet to move (so Tab can keep its normal job), otherwise
 * the new block and how many characters each line grew or shrank.
 */
export function shiftBulletLines(
  block: string,
  dir: 1 | -1,
): { block: string; deltas: number[] } | null {
  const lines = block.split('\n')
  const parsed = lines.map(parseBullet)
  if (!parsed.some(Boolean)) return null
  const deltas: number[] = []
  const out = lines.map((line, i) => {
    const b = parsed[i]
    if (!b) {
      deltas.push(0)
      return line
    }
    const level = Math.max(0, b.level + dir)
    const next = formatBullet(level, b.text)
    deltas.push(next.length - line.length)
    return next
  })
  return { block: out.join('\n'), deltas }
}

/**
 * Normalise bullets in text that is about to be pasted. `startsLine` says
 * whether the first pasted line lands at the start of a line — a bullet-looking
 * start in the middle of a sentence is just text.
 */
export function normalizePasted(text: string, startsLine: boolean): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  return lines
    .map((line, i) => {
      if (i === 0 && !startsLine) return line
      const b = parseBullet(line)
      return b ? formatBullet(b.level, b.text) : line
    })
    .join('\n')
}

/* --------------------------------------------------------------------------- *
 * Rich text in: pasting from Salesforce, Notes, Word…
 * --------------------------------------------------------------------------- */

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'TABLE', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER',
])
const SPACED_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'HEAD', 'META', 'TITLE'])

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

function listLines(list: Element, level: number, out: string[]) {
  const ordered = list.tagName === 'OL'
  let n = 1
  for (const li of Array.from(list.children)) {
    if (li.tagName !== 'LI') continue
    const nested: Element[] = []
    let own = ''
    li.childNodes.forEach((child) => {
      if (child instanceof Element && (child.tagName === 'UL' || child.tagName === 'OL')) nested.push(child)
      else own += child.textContent ?? ''
    })
    const text = squash(own)
    out.push(ordered ? `${' '.repeat(INDENT * level)}${n}. ${text}` : formatBullet(level, text))
    n++
    for (const sub of nested) listLines(sub, level + 1, out)
  }
}

function blockLines(parent: Node, out: string[]) {
  let inline = ''
  const flush = () => {
    const t = squash(inline)
    if (t) out.push(t)
    inline = ''
  }
  parent.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      inline += node.textContent ?? ''
      return
    }
    if (!(node instanceof Element) || SKIP_TAGS.has(node.tagName)) return
    if (node.tagName === 'BR') {
      flush()
    } else if (node.tagName === 'UL' || node.tagName === 'OL') {
      flush()
      listLines(node, 0, out)
    } else if (BLOCK_TAGS.has(node.tagName)) {
      flush()
      blockLines(node, out)
      if (SPACED_TAGS.has(node.tagName)) out.push('')
    } else if (node.querySelector('ul, ol')) {
      flush()
      blockLines(node, out)
    } else {
      inline += node.textContent ?? ''
    }
  })
  flush()
}

/**
 * The pasted HTML as plain text with its lists turned into canonical bullets, or
 * null when it has no list (then the browser's own plain-text paste is fine).
 * Browsers drop list markers from the plain-text flavour of a copy, which is why
 * bullets copied out of a rich editor arrive here as bare lines unless the HTML is read.
 */
export function htmlToText(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc.querySelector('li')) return null
  const out: string[] = []
  blockLines(doc.body, out)
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    // A paragraph that introduces a list stays attached to it.
    .replace(/\n\n(?=[ ]*(?:[•◦▪]|\d+\.) )/g, '\n')
    .replace(/^\n+|\n+$/g, '')
}

/* --------------------------------------------------------------------------- *
 * Rich text out: the HTML flavour of Copy
 * --------------------------------------------------------------------------- */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The draft as HTML: bullet lines become real, nested `<ul><li>` lists,
 * blank-line separated blocks become paragraphs, single line breaks stay line
 * breaks. Pasting this into a rich editor gives a genuine list, not a column of
 * "•" characters.
 */
export function textToHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let html = ''
  let paragraph: string[] = []
  /** Nesting depth of the open list, or -1 when none is open. */
  let depth = -1

  const closeParagraph = () => {
    if (paragraph.length) html += `<p>${paragraph.map(escapeHtml).join('<br>')}</p>`
    paragraph = []
  }
  const closeList = () => {
    if (depth < 0) return
    html += `</li>${'</ul></li>'.repeat(depth)}</ul>`
    depth = -1
  }

  for (const line of lines) {
    const b = parseBullet(line)
    if (b) {
      closeParagraph()
      const level = depth < 0 ? 0 : Math.min(b.level, depth + 1)
      if (depth < 0) {
        html += '<ul>'
        depth = 0
      } else if (level > depth) {
        html += '<ul>'
        depth = level
      } else {
        html += '</li>'
        while (depth > level) {
          html += '</ul></li>'
          depth--
        }
      }
      html += `<li>${escapeHtml(b.text)}`
    } else if (!line.trim()) {
      closeList()
      closeParagraph()
    } else {
      closeList()
      paragraph.push(line)
    }
  }
  closeList()
  closeParagraph()
  return html
}
