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
  /** `.zip` paths available in the linked folder, relative to it. */
  zipNames: readonly string[]
  /** True when `path` is a zip that exists in the linked folder. */
  hasZip: (path: string) => boolean
  /** Pick a zip; one from outside the folder is copied into it. Resolves to its path, or null. */
  pickZip: () => Promise<string | null>
  /** Save the zip at `path` through the browser. Resolves to false if it can't be read. */
  downloadZip: (path: string) => Promise<boolean>
}

const GuideAssetsContext = createContext<GuideAssets>({
  resolveImage: () => undefined,
  imageNames: [],
  pickImage: async () => null,
  zipNames: [],
  hasZip: () => false,
  pickZip: async () => null,
  downloadZip: async () => false,
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

/** What a heading's download button needs: is the zip there, and a way to save it. */
export function useGuideZip(path?: string): { available: boolean; download: () => Promise<boolean> } {
  const { hasZip, downloadZip } = useContext(GuideAssetsContext)
  return {
    available: !!path && hasZip(path),
    download: () => (path ? downloadZip(path) : Promise.resolve(false)),
  }
}

/** The folder's zip list plus its picker, for the zip field in the editor. */
export function useGuideZipPicker(): Pick<GuideAssets, 'zipNames' | 'pickZip'> {
  const { zipNames, pickZip } = useContext(GuideAssetsContext)
  return { zipNames, pickZip }
}
