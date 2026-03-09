// TypeScript type definitions for Electron API
// The .d.ts extension means "declaration file" - it only contains types, no actual code

/**
 * ElectronAPI - Interface for communicating with Electron's main process
 * These functions are exposed from the preload script to the renderer (React)
 */
export interface ElectronAPI {
  // Open a folder picker dialog
  selectDirectory: () => Promise<string | null>;
  
  // Save budget data to a file
  // Returns whether it succeeded and any error message
  saveBudget: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
  
  // Load budget data from a file
  // Returns the file contents or an error
  loadBudget: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  
  // Check if a file exists at the given path
  fileExists: (filePath: string) => Promise<boolean>;
  
  // Open a file picker dialog (for loading files)
  openFileDialog: () => Promise<string | null>;
  
  // Open a save file dialog (for saving files)
  // Takes optional budgetName to use as default filename
  saveFileDialog: (budgetName?: string) => Promise<string | null>;

  // Open a save PDF dialog (for exporting PDFs)
  // Takes optional budgetName to use as default filename
  savePdfDialog: (budgetName?: string) => Promise<string | null>;

  // Export PDF data to a file
  // Returns whether it succeeded and any error message
  exportPdf: (filePath: string, pdfData: Uint8Array) => Promise<{ success: boolean; error?: string }>;

  // Submit feedback from tester sessions
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
  }) => Promise<{ success: boolean; error?: string }>;

  // Reveal a file in the system file browser (Finder/Explorer)
  revealInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  
  // Get the current window bounds (width, height, x, y)
  getWindowBounds: () => Promise<{ width: number; height: number; x: number; y: number }>;
  
  // Set the window size (will be validated against screen bounds)
  setWindowSize: (width: number, height: number) => Promise<{ success: boolean }>;
  
  // Listen for menu events from the application menu bar
  // Takes an event name and a callback function
  // Returns an unsubscribe function to remove the listener
  onMenuEvent: (
    event: 'new-budget' | 'open-budget' | 'change-encryption' | 'open-settings' | 'open-about' | 'open-glossary' | 'open-pay-options' | 'open-accounts' | 'save-plan' | 'set-tab-position' | 'toggle-tab-display-mode',
    callback: (arg?: unknown) => void
  ) => () => void;

  // Listen for view window open requests from the menu
  onOpenViewWindow: (callback: (viewType: string) => void) => () => void;

  // Open a view in a new window
  openViewWindow: (viewType: string, filePath: string) => Promise<{ success: boolean; error?: string }>;

  // Get window initialization parameters (for view windows)
  getWindowParams: () => { viewType: string | null; skipSessionRestore: boolean };
  
  // Save session state (last opened file and active tab)
  saveSessionState: (filePath: string, activeTab: string) => Promise<{ success: boolean; error?: string }>;
  
  // Load session state (last opened file and active tab)
  loadSessionState: () => Promise<{ filePath?: string; activeTab?: string }>;
  
  // Clear session state (used when opening a new file or closing app)
  clearSessionState: () => Promise<{ success: boolean }>;
  
  // Notify main process that a budget has been loaded (transitions welcome window to plan window)
  budgetLoaded: (windowSize?: { width: number; height: number; x: number; y: number }) => Promise<void>;
  
  // Save an encryption key to the system keychain
  // Returns whether it succeeded and any error message
  saveKeychainKey: (service: string, account: string, password: string) => Promise<{ success: boolean; error?: string }>;
  
  // Retrieve an encryption key from the system keychain
  // Returns the password or an error
  getKeychainKey: (service: string, account: string) => Promise<{ success: boolean; key?: string; error?: string }>;
  
  // Delete an encryption key from the system keychain
  // Returns whether it succeeded and any error message
  deleteKeychainKey: (service: string, account: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Global declaration to add electronAPI to the window object
 * This makes TypeScript aware that window.electronAPI exists
 * Without this, TypeScript would complain about window.electronAPI being undefined
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    __hasUnsavedChanges?: boolean;
    __requestSaveBeforeClose?: () => Promise<boolean>;
    __saveWindowState?: (width: number, height: number, x: number, y: number) => Promise<void>;
    __currentActiveTab?: string;
  }
}
