// Electron Preload Script - The secure bridge between Node.js and the browser
// This runs before your React app loads and exposes specific functions to the browser
// It's like a controlled doorway - only certain things can pass through

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

console.log('[PRELOAD] Preload script starting...');

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

  // Rename an existing budget file
  // Takes: current path and new path
  // Returns: { success: boolean, filePath?: string, error?: string }
  renameBudgetFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('rename-budget-file', oldPath, newPath),
  
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
  // Takes: optional budgetName to use as default filename
  saveFileDialog: (budgetName?: string) => ipcRenderer.invoke('save-file-dialog', budgetName),

  // Open PDF save file picker
  // Takes: optional budgetName to use as default filename
  savePdfDialog: (budgetName?: string) => ipcRenderer.invoke('save-pdf-dialog', budgetName),

  // Export PDF data to a file
  // Takes: filePath and PDF data as Uint8Array
  // Returns: { success: boolean, error?: string }
  exportPdf: (filePath: string, pdfData: Uint8Array) => ipcRenderer.invoke('export-pdf', filePath, pdfData),

  // Submit tester feedback via Google Form flow
  submitFeedback: (payload: {
    email?: string;
    category: 'bug' | 'feature' | 'ui' | 'performance' | 'other';
    subject: string;
    messageHtml: string;
    messageText: string;
    includeDiagnostics: boolean;
    diagnostics?: Record<string, unknown>;
    screenshot?: {
      fileName: string;
      mimeType: string;
      dataUrl: string;
    };
  }) => ipcRenderer.invoke('submit-feedback', payload),

  // Reveal a file in the system file browser (Finder/Explorer)
  revealInFolder: (filePath: string) => ipcRenderer.invoke('reveal-in-folder', filePath),
  
  // Get the current window bounds (width, height, x, y)
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  
  // Set the window size (will be validated against screen bounds)
  setWindowSize: (width: number, height: number) => ipcRenderer.invoke('set-window-size', width, height),
  
  // Listen for menu events from the application menu bar
  // Takes: event name and callback function
  // Returns: () => unsubscribe function to remove listener
  onMenuEvent: (
    event: 'new-budget' | 'open-budget' | 'open-budget-file' | 'change-encryption' | 'save-plan' | 'open-settings' | 'open-about' | 'open-glossary' | 'open-keyboard-shortcuts' | 'open-pay-options' | 'open-accounts' | 'set-tab-position' | 'toggle-tab-display-mode' | 'history-back' | 'history-forward' | 'history-home',
    callback: (arg?: unknown) => void
  ) => {
    const channel = `menu:${event}`;
    const listener = (_event: IpcRendererEvent, arg?: unknown) => callback(arg);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Listen for view window open requests
  onOpenViewWindow: (callback: (viewType: string) => void) => {
    ipcRenderer.on('menu:open-view-window', (_event, viewType) => callback(viewType));
    return () => ipcRenderer.removeAllListeners('menu:open-view-window');
  },

  // Open a view in a new window
  // Takes: viewType and filePath
  // Returns: { success: boolean, error?: string }
  openViewWindow: (viewType: string, filePath: string) =>
    ipcRenderer.invoke('open-view-window', viewType, filePath),

  // Get window initialization parameters (for view windows)
  getWindowParams: () => {
    const params = new URLSearchParams(window.location.search);
    const additionalArgs = process.argv.filter(arg => arg.startsWith('--'));
    const viewTypeArg = additionalArgs.find(arg => arg.startsWith('--view-type='));
    const viewType = viewTypeArg ? viewTypeArg.split('=')[1] : params.get('view') || null;
    const skipSessionRestore = additionalArgs.includes('--skip-session-restore') || params.get('skipSession') === 'true';
    return { viewType, skipSessionRestore };
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

  // Quit the application
  quitApp: () =>
    ipcRenderer.invoke('quit-app'),

  // Close current window and open a fresh welcome window
  reopenWelcomeWindow: () =>
    ipcRenderer.invoke('reopen-welcome-window'),
  
  // Notify main process that a budget has been loaded (transitions welcome window to plan window)
  budgetLoaded: (windowSize?: { width: number; height: number }) =>
    ipcRenderer.invoke('budget-loaded', windowSize),

  // Save an encryption key to the system keychain
  saveKeychainKey: (service: string, account: string, password: string) =>
    ipcRenderer.invoke('save-keychain-key', service, account, password),

  // Retrieve an encryption key from the system keychain
  getKeychainKey: (service: string, account: string) =>
    ipcRenderer.invoke('get-keychain-key', service, account),

  // Delete an encryption key from the system keychain
  deleteKeychainKey: (service: string, account: string) =>
    ipcRenderer.invoke('delete-keychain-key', service, account),
});

console.log('[PRELOAD] ElectronAPI exposed to renderer');
console.log('[PRELOAD] Preload script completed successfully');

// This export is needed to make TypeScript happy
// It tells TypeScript this file is a module
export {};
