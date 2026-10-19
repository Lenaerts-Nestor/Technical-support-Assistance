// Runs before the page. It exposes a flag, so features can tell the desktop app from the
// website, and the device bridge (the only way the page reaches a device).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  nvx: {
    request: (request) => ipcRenderer.invoke('nvx:request', request),
    logout: (ip) => ipcRenderer.invoke('nvx:logout', ip),
  },
})
