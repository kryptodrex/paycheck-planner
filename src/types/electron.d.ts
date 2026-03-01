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
  saveFileDialog: () => Promise<string | null>;
  
  // Listen for menu events from the application menu bar
  // Takes an event name and a callback function
  // Returns an unsubscribe function to remove the listener
  onMenuEvent: (
    event: 'new-budget' | 'open-budget' | 'change-encryption' | 'preferences',
    callback: () => void
  ) => () => void;
}

/**
 * Global declaration to add electronAPI to the window object
 * This makes TypeScript aware that window.electronAPI exists
 * Without this, TypeScript would complain about window.electronAPI being undefined
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
