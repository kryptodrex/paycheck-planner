// Electron Main Process - This runs in Node.js, not the browser
// It creates the app window and handles file system operations
// Think of this as the "backend" of your desktop app
import { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we need to create it
// This converts the module URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the app name - this is displayed in menus and dialogs
app.name = 'Paycheck Planner';

// Track all open plan windows
const openWindows = new Set<BrowserWindow>();
// Welcome window reference (shown when no plan windows are open)
let welcomeWindow: BrowserWindow | null = null;
// Variable to hold reference to the main/first application window (for backwards compatibility)
let mainWindow: BrowserWindow | null = null;

/**
 * Create a new plan window (can be called multiple times for multiple windows)
 * @param windowState - Optional saved window state with dimensions and file path
 */
function createPlanWindow(windowState?: any) {
  // Default window state
  let state = {
    width: 1400,
    height: 900,
    x: undefined as number | undefined,
    y: undefined as number | undefined,
    lastFilePath: undefined as string | undefined,
    lastTab: undefined as string | undefined,
  };

  // Use provided state or merge with defaults
  if (windowState) {
    state = { ...state, ...windowState };
  }

  const window = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1000,
    minHeight: 600,
    title: 'Paycheck Planner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Track this window
  openWindows.add(window);
  if (!mainWindow) mainWindow = window; // Set as main if it's the first

  // Handle window close and save state
  window.on('close', () => {
    try {
      const bounds = window.getBounds();
      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      let sessionData: any = {};
      try {
        sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      // Store all open window states
      const windowStates = (sessionData.windows || []).filter((w: any) => {
        // Keep window states from other windows
        const existingWindow = Array.from(openWindows).find(
          (win) => win.id === w.id && win !== window
        );
        return !!existingWindow;
      });

      // Add this window's state
      windowStates.push({
        id: window.id,
        windowWidth: bounds.width,
        windowHeight: bounds.height,
        windowX: bounds.x,
        windowY: bounds.y,
        lastFilePath: state.lastFilePath, // Preserve file path if it exists
        lastTab: state.lastTab,
      });

      sessionData.windows = windowStates;
      writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving window state:', error);
    }
  });

  // Clean up when window is closed
  window.on('closed', () => {
    openWindows.delete(window);
    if (mainWindow === window) mainWindow = null;

    // If no more plan windows, show welcome window
    if (openWindows.size === 0 && !welcomeWindow) {
      createWelcomeWindow();
    }
  });

  return window;
}

/**
 * Create a welcome window for opening/creating plans
 */
function createWelcomeWindow() {
  if (welcomeWindow) return;

  welcomeWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Paycheck Planner - Welcome',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    welcomeWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    welcomeWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  welcomeWindow.on('closed', () => {
    welcomeWindow = null;
  });
}

/**
 * Create the main application window - called on app start
 * This is like opening a browser, but it's your app instead of a website
 */
function createWindow() {
  // Try to load saved window states
  let savedWindows = [];

  try {
    const sessionPath = path.join(app.getPath('userData'), 'session.json');
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    if (sessionData.windows && Array.isArray(sessionData.windows)) {
      savedWindows = sessionData.windows;
    }
  } catch (error) {
    // No saved state, use defaults
  }

  // Restore all saved windows
  if (savedWindows.length > 0) {
    savedWindows.forEach((windowState: any) => {
      createPlanWindow(windowState);
    });
  } else {
    // No saved windows, create welcome window
    createWelcomeWindow();
  }

  // Create application menu with File and Edit options
  createApplicationMenu();
  
  // Register global keyboard shortcut for saving
  globalShortcut.register('CmdOrCtrl+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('menu:save-plan');
    }
  });
}

/**
 * Create the application menu bar
 * This adds File, Edit, View, etc. menus to the top of the window on Mac or to the app on Windows/Linux
 */
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  
  const template: (Electron.MenuItemConstructorOptions | Electron.MenuItem)[] = [];

  // On macOS, add the app menu (with the app name) as the first menu
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        {
          label: `About ${app.name}`,
          role: 'about',
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:preferences');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Hide ' + app.name,
          accelerator: 'Cmd+H',
          click: () => {
            // Hide the app window
            if (mainWindow) {
              mainWindow.hide();
            }
          },
        },
        {
          label: 'Hide Others',
          accelerator: 'Cmd+Shift+H',
          click: () => {
            // Hide other windows (we'll just hide ours)
            if (mainWindow) {
              mainWindow.minimize();
            }
          },
        },
        {
          label: 'Show All',
          click: () => {
            // Show the app window
            if (mainWindow) {
              mainWindow.show();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit ' + app.name,
          accelerator: 'Cmd+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    });
  }

  // File menu
  template.push({
    label: 'File',
    submenu: [
      {
        label: 'New Window',
        accelerator: isMac ? 'Cmd+Shift+N' : 'Ctrl+Shift+N',
        click: () => {
          createPlanWindow();
        },
      },
      {
        label: 'New Budget',
        accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:new-budget');
          }
        },
      },
      {
        label: 'Open Budget',
        accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:open-budget');
          }
        },
      },
      {
        label: 'Save',
        accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:save-plan');
          }
        },
      },
      ...(isMac ? [] : [{ type: 'separator' as const }]),
      ...(isMac
        ? []
        : [
            {
              label: 'Exit',
              accelerator: 'Ctrl+Q',
              click: () => {
                app.quit();
              },
            },
          ]),
    ],
  });

  // Edit menu
  template.push({
    label: 'Edit',
    submenu: [
      {
        label: 'Change Encryption Settings',
        accelerator: isMac ? 'Cmd+Shift+E' : 'Ctrl+Shift+E',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:change-encryption');
          }
        },
      },
    ],
  });

  // View menu
  template.push({
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: isMac ? 'Cmd+R' : 'Ctrl+R',
        click: () => {
          if (mainWindow) {
            mainWindow.reload();
          }
        },
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        },
      },
    ],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Save all window states before quitting
app.on('before-quit', () => {
  try {
    const windows = Array.from(openWindows).map((window) => {
      const bounds = window.getBounds();
      return {
        id: window.id,
        windowWidth: bounds.width,
        windowHeight: bounds.height,
        windowX: bounds.x,
        windowY: bounds.y,
      };
    });

    if (windows.length > 0) {
      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      let sessionData = {};
      try {
        sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
      } catch {
        // Start fresh
      }
      sessionData = { ...sessionData, windows };
      writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error saving window states on quit:', error);
  }
});

// Wait for Electron to be ready, then create the window
app.whenReady().then(createWindow);

// On macOS, apps typically stay open even when all windows are closed
// On Windows/Linux, show welcome window when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    // On macOS, keep the app open but show nothing
    return;
  } else {
    // On Windows/Linux, show welcome window if no windows are open
    if (openWindows.size === 0 && !welcomeWindow) {
      createWelcomeWindow();
    }
  }
});

// On macOS, re-create window or show welcome when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (openWindows.size === 0 && !welcomeWindow) {
    createWelcomeWindow();
  }
});

// IPC (Inter-Process Communication) Handlers
// These let the React app (renderer) call functions in the main process
// It's like an API between the browser part and the Node.js part

/**
 * Select directory for saving budget files
 * Opens a native folder picker dialog
 */
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Budget Storage Location',
  });

  // If user clicked cancel, result.canceled will be true
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

/**
 * Save budget data to file
 * @param filePath - Where to save the file
 * @param data - The encrypted budget data (as a string)
 */
ipcMain.handle('save-budget', async (event, filePath: string, data: string) => {
  try {
    // fs.writeFile saves the data to disk
    // 'utf-8' means save as text (not binary)
    await fs.writeFile(filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving budget:', error);
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Load budget data from file
 * @param filePath - Where to load the file from
 */
ipcMain.handle('load-budget', async (event, filePath: string) => {
  try {
    // fs.readFile reads the file from disk
    const data = await fs.readFile(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    console.error('Error loading budget:', error);
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Check if file exists
 * @param filePath - Path to check
 */
ipcMain.handle('file-exists', async (event, filePath: string) => {
  try {
    // fs.access throws an error if file doesn't exist
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

/**
 * Open file dialog
 * Opens a native file picker for opening existing files
 */
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Budget Files', extensions: ['budget', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

/**
 * Save file dialog
 * Opens a native file picker for saving new files
 */
ipcMain.handle('save-file-dialog', async () => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Budget Files', extensions: ['budget'] },
      { name: 'JSON Files', extensions: ['json'] },
    ],
    defaultPath: 'my-budget.budget',
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

/**
 * Session State Management
 * Saves and loads the user's last session (file and view)
 */

// Get the path to the session state file
function getSessionFilePath(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'session.json');
}

// Save session state
ipcMain.handle('save-session-state', async (event, filePath: string, activeTab: string) => {
  try {
    const sessionPath = getSessionFilePath();
    const sessionData = {
      lastFilePath: filePath,
      lastTab: activeTab,
      timestamp: new Date().toISOString(),
    };
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error saving session state:', error);
    return { success: false, error: String(error) };
  }
});

// Load session state
ipcMain.handle('load-session-state', async () => {
  try {
    const sessionPath = getSessionFilePath();
    // Check if session file exists
    await fs.access(sessionPath);
    const data = await fs.readFile(sessionPath, 'utf-8');
    const sessionData = JSON.parse(data);
    return {
      filePath: sessionData.lastFilePath,
      activeTab: sessionData.lastTab,
    };
  } catch (error) {
    // Session file doesn't exist or is invalid, return empty
    return {};
  }
});

// Clear session state
ipcMain.handle('clear-session-state', async () => {
  try {
    const sessionPath = getSessionFilePath();
    await fs.unlink(sessionPath);
    return { success: true };
  } catch (error) {
    // File doesn't exist, which is fine
    return { success: true };
  }
});
