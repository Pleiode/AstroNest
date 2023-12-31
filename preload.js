const { contextBridge, ipcRenderer } = require('electron');

// Expose les méthodes d'ipcRenderer dans le monde du rendu (renderer process) pour une utilisation sécurisée
contextBridge.exposeInMainWorld('electron', {
  // Expose la méthode send du module ipcRenderer pour envoyer des messages vers le processus principal (main process)
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),

    // Expose la méthode on du module ipcRenderer pour écouter les messages du processus principal
    on: (channel, func) => ipcRenderer.on(channel, func),
    
    once: (channel, func) => ipcRenderer.once(channel, func), // Ajouter la méthode once
    
    off: (channel, func) => ipcRenderer.off(channel, func),

    // Expose directement l'objet ipcRenderer pour d'autres utilisations si nécessaire
    ipcRenderer: ipcRenderer,
  }
});
