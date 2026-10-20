import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_IMAGES, nextImageId } from './caseImages'
import type { CaseImage } from './caseImages'
import { deleteImage, loadImages, saveImage } from './imageStore'
import { pngBlob, shrinkImage } from './resizeImage'

/**
 * The pictures of the draft: loaded from IndexedDB at start, shrunk and saved as they are pasted.
 * `isUsed` says whether the draft still has a line for a picture; those that do not are deleted once
 * after loading (while the session runs they stay, so Undo can bring a picture back).
 */
export function useCaseImages(isUsed: (id: number) => boolean) {
  const [images, setImages] = useState<Record<number, CaseImage>>({})
  const [loaded, setLoaded] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  /** Every number given out this session, so two pasted pictures at once never share one. */
  const taken = useRef(new Set<number>())
  const isUsedRef = useRef(isUsed)
  useEffect(() => {
    isUsedRef.current = isUsed
  }, [isUsed])

  useEffect(() => {
    let cancelled = false
    void loadImages().then((stored) => {
      if (cancelled) return
      const kept: Record<number, CaseImage> = {}
      for (const image of stored) {
        taken.current.add(image.id)
        if (isUsedRef.current(image.id)) kept[image.id] = image
        else void deleteImage(image.id).catch(() => undefined)
      }
      setImages(kept)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  /** Shrink and keep these pictures; resolves with the numbers they were given. */
  const add = useCallback(
    async (files: Blob[], alreadyUsed: number): Promise<number[]> => {
      setProblem(null)
      const room = MAX_IMAGES - alreadyUsed
      if (room <= 0) {
        setProblem(`A draft can hold ${MAX_IMAGES} pictures. Remove one first.`)
        return []
      }
      const ids: number[] = []
      for (const file of files.slice(0, room)) {
        try {
          const shrunk = await shrinkImage(file)
          const id = nextImageId(taken.current)
          taken.current.add(id)
          const image: CaseImage = { id, ...shrunk }
          setImages((prev) => ({ ...prev, [id]: image }))
          ids.push(id)
          await saveImage(image).catch(() => setProblem('The picture is in the draft but could not be kept for the next visit.'))
        } catch {
          setProblem('That picture could not be read.')
        }
      }
      if (files.length > room) setProblem(`A draft can hold ${MAX_IMAGES} pictures: the rest were not added.`)
      return ids
    },
    [],
  )

  /** Put one picture on the clipboard as an image, to paste it straight into a field that accepts pictures. */
  const copyImage = useCallback(
    async (id: number): Promise<boolean> => {
      const image = images[id]
      if (!image) return false
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob(image.dataUrl) })])
        return true
      } catch {
        setProblem('The picture could not be copied.')
        return false
      }
    },
    [images],
  )

  return { images, loaded, problem, dismissProblem: () => setProblem(null), add, copyImage }
}
