// Electron Main Process - This runs in Node.js, not the browser
// It creates the app window and handles file system operations
// Think of this as the "backend" of your desktop app
import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';

// ES modules don't have __dirname, so we need to create it
// This converts the module URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set the app name - this is displayed in menus and dialogs
app.name = 'Paycheck Planner';

// Configure the About panel (macOS only)
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'Paycheck Planner',
    applicationVersion: '1.0.0',
    version: '1.0.0',
    copyright: '© 2026',
    credits: 'Plan where every paycheck goes.\n\n' +
      '• Paycheck Breakdown - Track gross to net pay\n' +
      '• Smart Allocations - Assign net pay to accounts\n' +
      '• Secure & Local - Your data stays private\n' +
      '• Multi-Currency Support - Set currency per plan\n' +
      '• Account Management - Multiple financial accounts\n' +
      '• Year-Based Planning - Separate plans per year',
  });
}

// Debug mode for development
const DEBUG = process.env.NODE_ENV !== 'production';
function debug(...args: any[]) {
  if (DEBUG) console.log('[MAIN]', ...args);
}

debug('Starting Paycheck Planner...');

// Track all open plan windows
const openWindows = new Set<BrowserWindow>();
// Map to track view windows and their parent plan windows
const viewWindows = new Map<BrowserWindow, { parent: BrowserWindow; viewType: string }>();
// Welcome window reference (shown when no plan windows are open)
let welcomeWindow: BrowserWindow | null = null;
// Variable to hold reference to the main/first application window (for backwards compatibility)
let mainWindow: BrowserWindow | null = null;

/**
 * Create a new plan window (can be called multiple times for multiple windows)
 * @param windowState - Optional saved window state with dimensions and file path
 */
function createPlanWindow(windowState?: any) {
  debug('createPlanWindow called with state:', windowState);
  
  // Default window state
  let state = {
    width: 1400,
    height: 900,
    x: undefined as number | undefined,
    y: undefined as number | undefined,
    lastFilePath: undefined as string | undefined,
    lastTab: undefined as string | undefined,
    viewType: undefined as string | undefined, // 'full', 'metrics', 'breakdown', 'bills', etc.
  };

  // Use provided state or merge with defaults
  if (windowState) {
    state = { ...state, ...windowState };
  }

  // Adjust window size for view windows
  const isViewWindow = state.viewType && state.viewType !== 'full';
  const windowConfig = {
    width: isViewWindow ? 800 : state.width,
    height: isViewWindow ? 600 : state.height,
    x: state.x,
    y: state.y,
    minWidth: isViewWindow ? 600 : 1000,
    minHeight: isViewWindow ? 400 : 600,
    title: isViewWindow ? `Paycheck Planner - ${state.viewType}` : 'Paycheck Planner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: state.viewType ? [`--view-type=${state.viewType}`] : [],
    },
  };

  const window = new BrowserWindow(windowConfig);
  debug('BrowserWindow created, loading URL...');

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    if (state.viewType) {
      url.searchParams.set('view', state.viewType);
    }
    debug('Loading dev server URL:', url.toString());
    window.loadURL(url.toString());
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    debug('Loading production file:', indexPath);
    window.loadFile(indexPath);
  }
  
  // Open DevTools in development
  if (DEBUG) {
    window.webContents.openDevTools();
  }

  // Track this window
  if (!isViewWindow) {
    openWindows.add(window);
    if (!mainWindow) mainWindow = window; // Set as main if it's the first
  }

  // Handle window close and save state
  window.on('close', async () => {
    // Only save state for main plan windows, not view windows
    if (isViewWindow) return;
    
    try {
      const bounds = window.getBounds();
      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      let sessionData: any = {};
      
      try {
        const content = await fs.readFile(sessionPath, 'utf-8');
        sessionData = JSON.parse(content);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      // Store all open window states (excluding view windows)
      const windowStates = (sessionData.windows || []).filter((w: any) => {
        // Keep window states from other windows that are still open
        const existingWindow = Array.from(openWindows).find(
          (win) => win.id === w.id && win !== window
        );
        return !!existingWindow;
      });

      // Add this window's state (only if it's a main window)
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
      await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
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
 * @param skipSessionRestore - If true, don't restore previous session (for new windows via Cmd+N)
 */
function createWelcomeWindow(skipSessionRestore = false) {
  debug('createWelcomeWindow called, skipSessionRestore:', skipSessionRestore);
  if (welcomeWindow) {
    debug('Welcome window already exists, skipping');
    return;
  }

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
      additionalArguments: skipSessionRestore ? ['--skip-session-restore'] : [],
    },
  });
  debug('Welcome window created');

  // Welcome window is NOT added to openWindows initially
  // It will be added when a budget is loaded (see 'budget-loaded' IPC handler)

  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL);
    if (skipSessionRestore) {
      url.searchParams.set('skipSession', 'true');
    }
    debug('Loading welcome window from dev server:', url.toString());
    welcomeWindow.loadURL(url.toString());
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    debug('Loading welcome window from file:', indexPath);
    welcomeWindow.loadFile(indexPath);
  }
  
  // Open DevTools in development
  if (DEBUG) {
    welcomeWindow.webContents.openDevTools();
  }

  welcomeWindow.on('closed', () => {
    welcomeWindow = null;
    // Don't auto-create another welcome window
    // Only plan windows trigger welcome window creation
  });
}

/**
 * Create the main application window - called on app start
 * This is like opening a browser, but it's your app instead of a website
 */
async function createWindow() {
  debug('createWindow called');
  
  // Try to load saved window states
  let savedWindows = [];

  try {
    const sessionPath = path.join(app.getPath('userData'), 'session.json');
    debug('Looking for session file at:', sessionPath);
    const content = await fs.readFile(sessionPath, 'utf-8');
    const sessionData = JSON.parse(content);
    if (sessionData.windows && Array.isArray(sessionData.windows)) {
      savedWindows = sessionData.windows;
      debug('Found saved windows:', savedWindows.length);
    }
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      debug('No session file found (first run or cleared)');
    } else {
      console.error('Error reading session file:', error);
    }
  }

  // Restore all saved windows
  if (savedWindows.length > 0) {
    // Only restore main plan windows, not view windows
    const mainWindows = savedWindows.filter((w: any) => !w.viewType || w.viewType === 'full');
    debug('Main windows to restore:', mainWindows.length);
    if (mainWindows.length > 0) {
      mainWindows.forEach((windowState: any) => {
        debug('Restoring window:', windowState.id);
        createPlanWindow(windowState);
      });
    } else {
      // No main windows, create welcome window
      debug('No main windows found, creating welcome window');
      createWelcomeWindow();
    }
  } else {
    // No saved windows, create welcome window
    debug('No saved windows, creating welcome window');
    createWelcomeWindow();
  }

  // Create application menu with File and Edit options
  createApplicationMenu();
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
          label: 'Settings',
          accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:open-settings');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Hide ' + app.name,
          accelerator: 'Cmd+H',
          role: 'hide', // Built-in role that hides ALL app windows
        },
        {
          label: 'Hide Others',
          accelerator: 'Cmd+Shift+H',
          role: 'hideOthers', // Built-in role to hide other apps
        },
        {
          label: 'Show All',
          role: 'unhide', // Built-in role to show all app windows
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
        label: 'New Plan',
        accelerator: isMac ? 'Cmd+Shift+N' : 'Ctrl+Shift+N',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:new-budget');
          }
        },
      },
      {
        label: 'New Window',
        accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
        click: () => {
          createWelcomeWindow(true); // Skip session restore for new windows
        },
      },
      {
        label: 'Open Plan',
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
      { type: 'separator' },
      {
        label: 'Close Window',
        accelerator: isMac ? 'Cmd+W' : 'Ctrl+W',
        click: async () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            await handleCloseWindow(focusedWindow);
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
        label: 'Accounts',
        accelerator: isMac ? 'Cmd+Shift+A' : 'Ctrl+Shift+A',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:open-accounts');
          }
        },
      },
      {
        label: 'Pay Options',
        accelerator: isMac ? 'Cmd+Shift+P' : 'Ctrl+Shift+P',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:open-pay-options');
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
        label: 'Toggle Developer Tools',
        accelerator: isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        },
      },
      ...(!isMac ? [{
        label: 'Settings',
        accelerator: 'Ctrl+,',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:open-settings');
          }
        },
      }] : []),
    ],
  });

  // Window menu
  template.push({
    label: 'Window',
    submenu: [
      { type: 'separator' },
      {
        label: 'Minimize',
        accelerator: isMac ? 'Cmd+M' : 'Ctrl+M',
        role: 'minimize',
      },
    ],
  });

  // Help menu (for Windows/Linux - macOS has native About)
  if (!isMac) {
    template.push({
      label: 'Help',
      submenu: [
        {
          label: `About ${app.name}`,
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.send('menu:open-about');
            }
          },
        },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Handle closing a window with unsaved changes check
 */
async function handleCloseWindow(window: BrowserWindow) {
  try {
    // Ask renderer if there are unsaved changes via global variable
    const hasUnsaved = await window.webContents.executeJavaScript(
      'window.__hasUnsavedChanges || false'
    );

    if (hasUnsaved) {
      const result = await dialog.showMessageBox(window, {
        type: 'warning',
        buttons: ['Cancel', 'Close Without Saving'],
        defaultId: 0,
        cancelId: 0,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes',
        detail: 'Are you sure you want to close this window without saving?',
      });

      if (result.response === 0) {
        // User clicked Cancel
        return;
      }
    }

    // Close the window
    window.close();
  } catch (error) {
    console.error('Error checking unsaved changes:', error);
    // If there's an error, just close the window
    window.close();
  }
}

// Save all window states before quitting
app.on('before-quit', () => {
  debug('App quitting, saving window states...');
  
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
      let sessionData: any = {};
      
      // Use dynamic import of fs sync operations for quit handler
      const { readFileSync, writeFileSync } = require('fs');
      
      try {
        const content = readFileSync(sessionPath, 'utf-8');
        sessionData = JSON.parse(content);
        debug('Loaded existing session data');
      } catch {
        debug('No existing session, creating new');
      }
      
      sessionData = { ...sessionData, windows };
      writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
      debug('Window states saved successfully:', windows.length, 'windows');
    } else {
      debug('No windows to save');
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
 * Open a view window
 * Creates a new window showing a specific view (metrics, breakdown, bills, accounts)
 */
ipcMain.handle('open-view-window', async (event, viewType: string, filePath: string) => {
  try {
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    if (!parentWindow) return { success: false, error: 'Parent window not found' };

    // Create the view window
    const viewWindow = createPlanWindow({
      viewType,
      lastFilePath: filePath,
      width: 800,
      height: 600,
    });

    // Track the relationship
    if (viewWindow) {
      viewWindows.set(viewWindow, { parent: parentWindow, viewType });
      
      // Clean up when view window closes
      viewWindow.on('closed', () => {
        viewWindows.delete(viewWindow);
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error opening view window:', error);
    return { success: false, error: String(error) };
  }
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

/**
 * Notify main process that a budget has been loaded
 * This transitions a welcome window to a plan window
 */
ipcMain.handle('budget-loaded', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;

  // If this is the welcome window, transition it to a plan window
  if (welcomeWindow === window) {
    debug('Transitioning welcome window to plan window');
    openWindows.add(window);
    if (!mainWindow) mainWindow = window;
    welcomeWindow = null;
  }
});
