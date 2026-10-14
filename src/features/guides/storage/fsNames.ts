/**
 * Names the app never treats as content: a browser's in-flight write file and
 * the junk files file managers and archivers leave behind.
 */

/** Chrome writes through `<name>.crswap` and renames it on close; a crash leaves it behind. */
export const isTransientName = (name: string) => name.toLowerCase().endsWith('.crswap')

const JUNK_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini'])

export const isJunkFileName = (name: string) => JUNK_FILES.has(name.toLowerCase())

/** Skipped when scanning, copying, zipping or restoring. */
export const isIgnoredName = (name: string) => isTransientName(name) || isJunkFileName(name)

/** True when `text` holds a control character (below U+0020), which no file name may. */
export function hasControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) < 0x20) return true
  return false
}

/** True for a path segment that is a single, safe file or folder name. */
export function isSafeSegment(segment: string): boolean {
  return (
    segment !== '' &&
    segment !== '.' &&
    segment !== '..' &&
    !/[\\/]/.test(segment) &&
    !hasControlChars(segment)
  )
}
