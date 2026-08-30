import { createContext, useContext } from 'react'

/**
 * Lets deep view components (a step's image) pull a blob URL for a filename out
 * of the linked folder without prop-drilling. Default is a no-op resolver, so
 * views render fine with no folder linked.
 */
export type GuideAssets = {
  /** Blob URL for `name`, or `undefined` while it loads / if it isn't in the folder. */
  resolveImage: (name: string) => string | undefined
}

const GuideAssetsContext = createContext<GuideAssets>({
  resolveImage: () => undefined,
})

export const GuideAssetsProvider = GuideAssetsContext.Provider

/** Resolve one image filename to a URL, or `undefined` if unavailable. */
export function useGuideImage(name?: string): string | undefined {
  const { resolveImage } = useContext(GuideAssetsContext)
  return name ? resolveImage(name) : undefined
}
