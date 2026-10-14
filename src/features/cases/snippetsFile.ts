import { readTextFile, writeFileExact } from '../guides/storage/fsOps'
import { LANGUAGES } from './casesData'
import type { CaseLanguage, Snippet } from './types'

/** Lives next to `guides.json` in the linked folder. */
export const SNIPPETS_FILENAME = 'cases-snippets.json'

/** Validate parsed JSON into snippets, dropping anything malformed. */
export function reviveSnippets(raw: unknown): Snippet[] | null {
  const list = Array.isArray(raw) ? raw : (raw as { snippets?: unknown } | null)?.snippets
  if (!Array.isArray(list)) return null
  return list.flatMap((item): Snippet[] => {
    const s = item as Partial<Snippet> | null
    if (!s || typeof s.id !== 'string' || typeof s.label !== 'string' || typeof s.text !== 'string') {
      return []
    }
    // Texts saved before languages existed read as English.
    const language = LANGUAGES.some((l) => l.id === s.language) ? (s.language as CaseLanguage) : 'en'
    return [{ id: s.id, label: s.label, text: s.text, language }]
  })
}

/** Snippets on disk: `null` when the read failed, `undefined` when there is no file yet. */
export async function readSnippetsFile(
  dir: FileSystemDirectoryHandle,
): Promise<Snippet[] | null | undefined> {
  try {
    const text = await readTextFile(dir, SNIPPETS_FILENAME)
    if (text === null) return undefined
    return reviveSnippets(JSON.parse(text)) ?? undefined
  } catch {
    return null
  }
}

/** Returns whether the file was written. */
export async function writeSnippetsFile(
  dir: FileSystemDirectoryHandle,
  snippets: Snippet[],
): Promise<boolean> {
  try {
    await writeFileExact(dir, SNIPPETS_FILENAME, JSON.stringify({ snippets }, null, 2))
    return true
  } catch {
    return false
  }
}
