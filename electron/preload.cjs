const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppMeta: () => ipcRenderer.invoke('app:get-meta'),
  openPlatformWindow: (url) => ipcRenderer.invoke('platform:open-window', url),
  openExternal: (url) => ipcRenderer.invoke('platform:open-external', url),
  diagnoseStream: (urls) => ipcRenderer.invoke('stream:probe', urls),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  subscribeUpdater: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('updater:event', listener);
    return () => ipcRenderer.removeListener('updater:event', listener);
  },
});
