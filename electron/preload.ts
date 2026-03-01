// Electron Preload Script - The secure bridge between Node.js and the browser
// This runs before your React app loads and exposes specific functions to the browser
// It's like a controlled doorway - only certain things can pass through

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process (React app)
// contextBridge is the secure way to expose functions to the browser
// The first argument is the name it will have in the browser (window.electronAPI)
// The second argument is the object with functions to expose
contextBridge.exposeInMainWorld('electronAPI', {
  // Each function here becomes available in React as window.electronAPI.functionName()
  // These functions send messages to the main process (main.ts) to do the actual work
  
  // Open folder picker
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Save budget to file
  // Takes: file path and data string
  // Returns: { success: boolean, error?: string }
  saveBudget: (filePath: string, data: string) => 
    ipcRenderer.invoke('save-budget', filePath, data),
  
  // Load budget from file
  // Takes: file path
  // Returns: { success: boolean, data?: string, error?: string }
  loadBudget: (filePath: string) => 
    ipcRenderer.invoke('load-budget', filePath),
  
  // Check if file exists
  // Takes: file path
  // Returns: boolean
  fileExists: (filePath: string) => 
    ipcRenderer.invoke('file-exists', filePath),
  
  // Open file picker (for opening)
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // Open file picker (for saving)
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog'),
  
  // Listen for menu events from the application menu bar
  // Takes: event name ('new-budget', 'open-budget', 'change-encryption', 'save-plan')
  // Returns: () => unsubscribe function to remove listener
  onMenuEvent: (event: 'new-budget' | 'open-budget' | 'change-encryption' | 'save-plan', callback: () => void) => {
    const channel = `menu:${event}`;
    ipcRenderer.on(channel, callback);
    return () => ipcRenderer.removeListener(channel, callback);
  },
  
  // Save session state (last opened file and active tab)
  // Takes: filePath and activeTab
  // Returns: { success: boolean, error?: string }
  saveSessionState: (filePath: string, activeTab: string) =>
    ipcRenderer.invoke('save-session-state', filePath, activeTab),
  
  // Load session state (last opened file and active tab)
  // Returns: { filePath?: string, activeTab?: string }
  loadSessionState: () =>
    ipcRenderer.invoke('load-session-state'),
  
  // Clear session state (used when opening a new file)
  // Returns: { success: boolean }
  clearSessionState: () =>
    ipcRenderer.invoke('clear-session-state'),
});

// This export is needed to make TypeScript happy
// It tells TypeScript this file is a module
export {};
