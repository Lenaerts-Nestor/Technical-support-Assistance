// Runs before the page. It exposes a flag, so features can tell the desktop app from the
// website, and the bridges to devices (the only way the page reaches one).
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  nvx: {
    request: (request) => ipcRenderer.invoke('nvx:request', request),
    logout: (ip) => ipcRenderer.invoke('nvx:logout', ip),
  },
  updater: {
    getState: () => ipcRenderer.invoke('updater:state'),
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    setToken: (token) => ipcRenderer.invoke('updater:setToken', token),
    clearToken: () => ipcRenderer.invoke('updater:clearToken'),
    /** The state of the update, whenever it changes. Returns a function that stops listening. */
    onState: (listener) => {
      const handler = (_event, state) => listener(state)
      ipcRenderer.on('updater:state', handler)
      return () => ipcRenderer.removeListener('updater:state', handler)
    },
  },
  terminal: {
    open: (request) => ipcRenderer.invoke('terminal:open', request),
    write: (id, data) => ipcRenderer.send('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
    close: (id) => ipcRenderer.invoke('terminal:close', id),
    forgetHost: (ip) => ipcRenderer.invoke('terminal:forgetHost', ip),
    /** Output, details and "closed" notices of every terminal this page opened. Returns a function that stops listening. */
    onEvent: (listener) => {
      const handler = (_event, message) => listener(message)
      ipcRenderer.on('terminal:event', handler)
      return () => ipcRenderer.removeListener('terminal:event', handler)
    },
  },
})
