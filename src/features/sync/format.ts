/** `plural(3, 'link')` → "3 links", `plural(1, 'folder')` → "1 folder". */
export const plural = (n: number, noun: string, many = `${noun}s`) => `${n} ${n === 1 ? noun : many}`

/** `formatBytes(1536)` → "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit++
  } while (value >= 1024 && unit < units.length - 1)
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}
