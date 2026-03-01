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
app.name = 'Budget Manager';

// Variable to hold reference to the main application window
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 * This is like opening a browser, but it's your app instead of a website
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,   // Prevent window from getting too small
    minHeight: 600,   // Minimum height to keep UI readable
    webPreferences: {
      // preload.ts runs before the React app loads
      // It's the secure bridge between Node.js and the browser
      // Note: In development, vite-plugin-electron builds it as .mjs
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,  // Don't expose Node.js to the browser (security)
      contextIsolation: true,   // Keep contexts separate (security)
    },
  });

  // Load the app - either from dev server or built files
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode: load from Vite dev server
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools(); // Open dev tools automatically
  } else {
    // Production mode: load the built HTML file
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Clean up reference when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

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
        label: 'New Budget',
        accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('menu:new-budget');
          }
        },
      },
      {
        label: 'Open Budget',
        accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('menu:open-budget');
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
          if (mainWindow) {
            mainWindow.webContents.send('menu:change-encryption');
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

// Wait for Electron to be ready, then create the window
app.whenReady().then(createWindow);

// On macOS, apps typically stay open even when all windows are closed
// On Windows/Linux, quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
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
