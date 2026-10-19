// Runs before the page. It exposes a flag, so features can tell the desktop app from the
// website, and the device bridge (the only way the page reaches a device or starts a player).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  nvx: {
    get: (request) => ipcRenderer.invoke('nvx:get', request),
    change: (request) => ipcRenderer.invoke('nvx:change', request),
    logout: (ip) => ipcRenderer.invoke('nvx:logout', ip),
  },
  openStream: (url) => ipcRenderer.invoke('stream:open', url),
})
