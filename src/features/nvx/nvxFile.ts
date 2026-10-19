import { readTextFile, writeFileExact } from '../guides/storage/fsOps'
import { reviveGroups } from './nvxData'
import type { NvxGroup } from './types'

/** Lives next to `guides.json` in the linked folder. Holds device addresses and saved calls — never a password. */
export const NVX_FILENAME = 'nvx.json'

/** Groups on disk: `null` when the read failed, `undefined` when there is no usable file yet. */
export async function readNvxFile(dir: FileSystemDirectoryHandle): Promise<NvxGroup[] | null | undefined> {
  try {
    const text = await readTextFile(dir, NVX_FILENAME)
    if (text === null) return undefined
    return reviveGroups((JSON.parse(text) as { groups?: unknown } | null)?.groups) ?? undefined
  } catch {
    return null
  }
}

/** Returns whether the file was written. */
export async function writeNvxFile(dir: FileSystemDirectoryHandle, groups: NvxGroup[]): Promise<boolean> {
  try {
    await writeFileExact(dir, NVX_FILENAME, JSON.stringify({ groups }, null, 2))
    return true
  } catch {
    return false
  }
}
