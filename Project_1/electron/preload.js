const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hello: () => 'Hello from Electron!',
  openExternal: (url) => ipcRenderer.invoke('auth:openExternal', url),
});
