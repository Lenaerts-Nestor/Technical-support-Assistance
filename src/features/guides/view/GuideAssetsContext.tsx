import { createContext, useContext } from 'react'

/**
 * Lets deep guide components reach the linked folder without prop-drilling:
 * views resolve a step's image to a blob URL, and the editor browses / picks
 * from the images that folder actually holds. Defaults are inert, so both
 * render fine with no folder linked.
 */
export type GuideAssets = {
  /** Blob URL for `name`, or `undefined` while it loads / if it isn't in the folder. */
  resolveImage: (name: string) => string | undefined
  /** Image paths available in the linked folder, relative to it. */
  imageNames: readonly string[]
  /** Open a file picker in the linked folder; resolves to the chosen path, or null. */
  pickImage: () => Promise<string | null>
}

const GuideAssetsContext = createContext<GuideAssets>({
  resolveImage: () => undefined,
  imageNames: [],
  pickImage: async () => null,
})

export const GuideAssetsProvider = GuideAssetsContext.Provider

/** Resolve one image filename to a URL, or `undefined` if unavailable. */
export function useGuideImage(name?: string): string | undefined {
  const { resolveImage } = useContext(GuideAssetsContext)
  return name ? resolveImage(name) : undefined
}

/** The folder's image list plus its picker, for the step editor. */
export function useGuideImagePicker(): Pick<GuideAssets, 'imageNames' | 'pickImage'> {
  const { imageNames, pickImage } = useContext(GuideAssetsContext)
  return { imageNames, pickImage }
}
