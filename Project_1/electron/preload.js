const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  hello: () => 'Hello from Electron!'
});
