import { createContext, useContext } from 'react'

/**
 * Lets a panel block inside a guide ask the guide view to open its full-size
 * workspace tab. `null` outside a guide view (e.g. the editor), where the
 * button simply isn't shown.
 */
const PanelWorkspaceContext = createContext<((panelId: string) => void) | null>(null)

export const PanelWorkspaceProvider = PanelWorkspaceContext.Provider

export const useOpenPanelWorkspace = () => useContext(PanelWorkspaceContext)
