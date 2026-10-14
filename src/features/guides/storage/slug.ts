/**
 * Folder names for guides: short, ASCII, safe on Windows, macOS and Linux.
 */

/** Windows path length is the tightest limit (260 incl. the library's own path), so keep names short. */
export const MAX_SLUG = 30

/** Device names Windows will not let a folder have (with or without an extension). */
const RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
])

/** `"DM-NVX-DIR80: Clearing the routing list"` → `"dm-nvx-dir80-clearing-the-routin"`. */
export function slugify(title: string, max = MAX_SLUG): string {
  let slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
  if (!slug) slug = 'guide'
  if (RESERVED.has(slug)) slug = `${slug}-guide`
  return slug
}

/**
 * A name from `title` that is not in `taken` (lowercased names — Windows and
 * macOS treat `Foo` and `foo` as the same folder). `taken` is updated so the next
 * call in the same batch avoids this one too.
 */
export function uniqueSlug(title: string, taken: Set<string>): string {
  const base = slugify(title)
  let name = base
  for (let n = 2; taken.has(name.toLowerCase()); n++) {
    const suffix = `-${n}`
    name = `${base.slice(0, MAX_SLUG - suffix.length).replace(/-+$/g, '')}${suffix}`
  }
  taken.add(name.toLowerCase())
  return name
}
