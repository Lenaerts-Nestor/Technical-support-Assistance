import { useMemo } from 'react'
import { useFolder, useGuidesData } from '../../app/appDataContext'
import { countGuidesToOrganize } from '../guides/storage/organize'

/** How many guides still use the shared pool of files — 0 when no folder is linked. */
export function useGuidesToOrganize(): number {
  const { dir } = useFolder()
  const { guides } = useGuidesData()
  return useMemo(() => (dir ? countGuidesToOrganize(guides) : 0), [dir, guides])
}
