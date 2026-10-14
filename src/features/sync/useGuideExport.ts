import { useCallback } from 'react'
import { useFolder } from '../../app/appDataContext'
import { downloadBlob } from '../guides/storage/folderZip'
import type { Guide } from '../guides/types'
import { exportGuideZip } from './guidePackage'
import type { GuideExport } from './guidePackage'

/** Build a guide's package and hand it to the browser. Resolves to what went in it (and what could not). */
export function useGuideExport() {
  const folder = useFolder()
  const { dir, runExclusive } = folder
  return useCallback(
    async (guide: Guide): Promise<GuideExport> => {
      const result = await runExclusive(() => exportGuideZip(dir, guide), true)
      downloadBlob(result.blob, result.filename)
      return result
    },
    [dir, runExclusive],
  )
}
