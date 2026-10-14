import { downloadBlob, zipFolder } from '../guides/storage/folderZip'
import type { FolderController } from './useFolderLifecycle'
import { datestamp, manifestSource } from './packages'

/**
 * Write everything to the folder, zip it and hand the zip to the browser.
 * Resolves to the number of files in it (0 means the folder was empty and nothing was downloaded).
 */
export async function exportFullBackup(folder: FolderController, saveAll: () => Promise<void>): Promise<number> {
  const dir = folder.dir
  if (!dir) return 0
  await saveAll()
  const { blob, count } = await folder.runExclusive(() => zipFolder(dir, [manifestSource('backup')]))
  if (count <= 1) return 0
  downloadBlob(blob, `${folder.folderName || 'support-hub'}-backup-${datestamp()}.zip`)
  return count - 1
}
