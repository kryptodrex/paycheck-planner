// Electron Main Process - This runs in Node.js, not the browser
// It creates the app window and handles file system operations
// Think of this as the "backend" of your desktop app
import { app, BrowserWindow, ipcMain, dialog, Menu, screen, shell, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { SUPPORT_EMAIL } from './constants';

// Create require function for ES modules
const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);

const MAX_LOG_BUFFER_ENTRIES = 2000;
const appLogBuffer: string[] = [];

const SENSITIVE_KEY_PATTERN = /(password|secret|token|key|filepath|filePath|encryption|budgetData|accounts|bills|loans|retirement|benefits|taxSettings|paySettings|deductions|ssn|socialSecurity)/i;

const redactSensitiveText = (input: string): string => {
  let output = input;

  // Redact absolute filesystem paths (macOS/Linux + Windows).
  output = output
    .replace(/\/(Users|home)\/[^\s"']+/g, '<REDACTED_PATH>')
    .replace(/[A-Za-z]:\\[^\s"']+/g, '<REDACTED_PATH>');

  // Redact common key/value style secrets in text logs.
  output = output.replace(
    /(password|secret|token|apikey|api[_-]?key|encryptionKey|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^,\s]+/gi,
    '$1=<REDACTED>'
  );

  return output;
};

const sanitizeLogValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (typeof value === 'string') {
    return redactSensitiveText(value);
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]';
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry, seen));
  }

  const original = value as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(original)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '<REDACTED>';
      continue;
    }
    sanitized[key] = sanitizeLogValue(raw, seen);
  }

  return sanitized;
};

const formatLogValue = (value: unknown): string => {
  if (value instanceof Error) {
    return redactSensitiveText(value.stack || value.message);
  }
  if (typeof value === 'string') {
    return redactSensitiveText(value);
  }
  try {
    return redactSensitiveText(JSON.stringify(sanitizeLogValue(value)));
  } catch {
    return redactSensitiveText(String(value));
  }
};

const pushAppLog = (level: 'INFO' | 'DEBUG', args: unknown[]) => {
  const line = `${new Date().toISOString()} [${level}] ${args.map(formatLogValue).join(' ')}`;
  appLogBuffer.push(line);
  if (appLogBuffer.length > MAX_LOG_BUFFER_ENTRIES) {
    appLogBuffer.splice(0, appLogBuffer.length - MAX_LOG_BUFFER_ENTRIES);
  }
};

const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);

console.log = (...args: unknown[]) => {
  pushAppLog('INFO', args);
  originalConsoleLog(...args);
};

console.info = (...args: unknown[]) => {
  pushAppLog('INFO', args);
  originalConsoleInfo(...args);
};

// Load keytar dynamically to avoid bundling issues with native modules
let keytar: any = null;
let keytarLoadError: string | null = null;

const loadKeytar = () => {
  if (!keytar && !keytarLoadError) {
    try {
      keytar = require('keytar');
      console.log('Keytar module loaded successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      keytarLoadError = `Failed to load keytar: ${errorMsg}`;
      console.error(keytarLoadError);
      console.error('Keychain storage will not be available. Encryption keys must be entered manually each time.');
    }
  }
  return keytar;
};

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
const DEBUG = !app.isPackaged;
const OPEN_DEVTOOLS = process.env.OPEN_DEVTOOLS === 'true';
function debug(...args: any[]) {
  if (DEBUG) console.log('[MAIN]', ...args);
}

debug('Starting Paycheck Planner...');

// Track all open plan windows
const openWindows = new Set<BrowserWindow>();
// Track windows that have been approved to close (to avoid close-handler recursion)
const approvedToClose = new WeakSet<BrowserWindow>();
// Map to track view windows and their parent plan windows
const viewWindows = new Map<BrowserWindow, { parent: BrowserWindow; viewType: string }>();
// Welcome window reference (shown when no plan windows are open)
let welcomeWindow: BrowserWindow | null = null;
// Variable to hold reference to the main/first application window (for backwards compatibility)
let mainWindow: BrowserWindow | null = null;
// Track if the app is quitting to avoid reopening welcome window
let isQuitting = false;

function hasLiveWelcomeWindow(): boolean {
  return !!welcomeWindow && !welcomeWindow.isDestroyed();
}

type WindowBoundsState = {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
};

function normalizeWindowBounds(
  requested: WindowBoundsState,
  defaults: { width: number; height: number; minWidth: number; minHeight: number }
): Required<WindowBoundsState> {
  const targetDisplay =
    typeof requested.x === 'number' && typeof requested.y === 'number'
      ? screen.getDisplayNearestPoint({ x: requested.x, y: requested.y })
      : screen.getPrimaryDisplay();

  const workArea = targetDisplay.workArea;
  const maxWidth = Math.max(defaults.minWidth, workArea.width);
  const maxHeight = Math.max(defaults.minHeight, workArea.height);

  const width = Math.min(
    Math.max(requested.width ?? defaults.width, defaults.minWidth),
    maxWidth
  );
  const height = Math.min(
    Math.max(requested.height ?? defaults.height, defaults.minHeight),
    maxHeight
  );

  const minX = workArea.x;
  const maxX = workArea.x + workArea.width - width;
  const minY = workArea.y;
  const maxY = workArea.y + workArea.height - height;

  const x = Math.min(
    Math.max(requested.x ?? workArea.x + Math.floor((workArea.width - width) / 2), minX),
    Math.max(minX, maxX)
  );
  const y = Math.min(
    Math.max(requested.y ?? workArea.y + Math.floor((workArea.height - height) / 2), minY),
    Math.max(minY, maxY)
  );

  return { width, height, x, y };
}

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
    viewType: undefined as string | undefined, // 'full', 'metrics', 'breakdown', 'bills', etc.
  };

  // Use provided state or merge with defaults
  if (windowState) {
    state = { ...state, ...windowState };
  }

  // Adjust window size for view windows
  const isViewWindow = state.viewType && state.viewType !== 'full';
  const minWidth = isViewWindow ? 600 : 1000;
  const minHeight = isViewWindow ? 400 : 600;
  const normalizedBounds = normalizeWindowBounds(
    {
      width: isViewWindow ? 800 : state.width,
      height: isViewWindow ? 600 : state.height,
      x: state.x,
      y: state.y,
    },
    {
      width: isViewWindow ? 800 : 1400,
      height: isViewWindow ? 600 : 900,
      minWidth,
      minHeight,
    }
  );

  const windowConfig = {
    width: normalizedBounds.width,
    height: normalizedBounds.height,
    x: normalizedBounds.x,
    y: normalizedBounds.y,
    minWidth,
    minHeight,
    title: isViewWindow ? `Paycheck Planner - ${state.viewType}` : 'Paycheck Planner',
    titleBarStyle: (process.platform === 'darwin' ? 'hiddenInset' : 'default') as 'hiddenInset' | 'default',
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
  
  // Open DevTools in development (if enabled)
  if (DEBUG && OPEN_DEVTOOLS) {
    window.webContents.openDevTools();
  }

  // Track this window
  if (!isViewWindow) {
    openWindows.add(window);
    if (!mainWindow) mainWindow = window; // Set as main if it's the first
  }

  // Handle window close and save state
  window.on('close', async (event) => {
    // View windows can close directly
    if (isViewWindow) return;

    // Intercept normal window close (titlebar close / Cmd+W / Ctrl+W / app quit)
    // and run unsaved-changes flow first.
    if (!approvedToClose.has(window)) {
      event.preventDefault();
      await handleCloseWindow(window);
      return;
    }

    // This close was explicitly approved by handleCloseWindow; allow and clear flag.
    approvedToClose.delete(window);
    
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

    // If no more plan windows, show welcome window (unless app is quitting)
    if (!isQuitting && openWindows.size === 0 && !hasLiveWelcomeWindow()) {
      createWelcomeWindow();
    }
  });

  return window;
}

/**
 * Create a welcome window for opening/creating plans
 * @param skipSessionRestore - If true, skip any renderer-level session restore behavior
 * @param windowState - Optional saved window bounds from previous app run
 */
function createWelcomeWindow(skipSessionRestore = false, windowState?: { width?: number; height?: number; x?: number; y?: number }) {
  debug('createWelcomeWindow called, skipSessionRestore:', skipSessionRestore);
  if (hasLiveWelcomeWindow()) {
    debug('Welcome window already exists, skipping');
    return;
  }

  const normalizedBounds = normalizeWindowBounds(
    {
      width: windowState?.width,
      height: windowState?.height,
      x: windowState?.x,
      y: windowState?.y,
    },
    {
      width: 900,
      height: 700,
      minWidth: 800,
      minHeight: 600,
    }
  );

  welcomeWindow = new BrowserWindow({
    width: normalizedBounds.width,
    height: normalizedBounds.height,
    x: normalizedBounds.x,
    y: normalizedBounds.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Paycheck Planner - Welcome',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
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
  
  // Open DevTools in development (if enabled)
  if (DEBUG && OPEN_DEVTOOLS) {
    welcomeWindow.webContents.openDevTools();
  }

  welcomeWindow.on('close', async () => {
    try {
      const bounds = welcomeWindow?.getBounds();
      if (!bounds) return;

      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      let sessionData: any = {};

      try {
        const content = await fs.readFile(sessionPath, 'utf-8');
        sessionData = JSON.parse(content);
      } catch {
        // File doesn't exist or is invalid, start fresh
      }

      sessionData.windows = [
        {
          id: welcomeWindow?.id,
          windowWidth: bounds.width,
          windowHeight: bounds.height,
          windowX: bounds.x,
          windowY: bounds.y,
        },
      ];

      await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving welcome window state:', error);
    }
  });

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
  
  // Try to load saved window bounds (not plans/files)
  let savedWindows: any[] = [];

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

  // Always open Welcome on app relaunch with default size
  debug('Creating welcome window with default size');
  createWelcomeWindow();

  // Create application menu with File and Edit options
  createApplicationMenu();
  
  // Register global keyboard shortcuts (fallback for menu accelerators)
  registerGlobalShortcuts();
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
          click: () => {
            const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
            if (targetWindow) {
              targetWindow.webContents.send('menu:open-about');
            }
          },
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
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
      { type: 'separator' },
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
        label: 'Tab Position',
        submenu: [
          {
            label: 'Top',
            accelerator: isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.send('menu:set-tab-position', 'top');
              }
            },
          },
          {
            label: 'Bottom',
            accelerator: isMac ? 'Cmd+Shift+B' : 'Ctrl+Shift+B',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.send('menu:set-tab-position', 'bottom');
              }
            },
          },
          {
            label: 'Left',
            accelerator: isMac ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.send('menu:set-tab-position', 'left');
              }
            },
          },
          {
            label: 'Right',
            accelerator: isMac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
            click: () => {
              const focusedWindow = BrowserWindow.getFocusedWindow();
              if (focusedWindow) {
                focusedWindow.webContents.send('menu:set-tab-position', 'right');
              }
            },
          },
        ],
      },
      {
        label: 'Toggle Tab Display Mode',
        accelerator: isMac ? 'Cmd+Shift+D' : 'Ctrl+Shift+D',
        click: () => {
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('menu:toggle-tab-display-mode');
          }
        },
      },
      { type: 'separator' },
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

  // Help menu (all platforms)
  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'Glossary of Terms',
        accelerator: isMac ? 'Cmd+Shift+/' : 'Ctrl+Shift+/',
        click: () => {
          const targetWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
          if (targetWindow) {
            targetWindow.webContents.send('menu:open-glossary');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Keyboard Shortcuts',
        click: async () => {
          await dialog.showMessageBox({
            type: 'info',
            title: 'Keyboard Shortcuts',
            message: 'Common shortcuts',
            detail:
              `${isMac ? 'Cmd' : 'Ctrl'}+, : Open Settings\n` +
              `${isMac ? 'Cmd' : 'Ctrl'}+S : Save Plan\n` +
              `${isMac ? 'Cmd' : 'Ctrl'}+O : Open Plan\n` +
              `${isMac ? 'Cmd' : 'Ctrl'}+Shift+/ : Open Glossary\n` +
              'Esc : Close open modal/dialog',
          });
        },
      },
    ],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Register global keyboard shortcuts that work even when web content has focus
 * These provide a fallback for menu accelerators which don't always work with focused form elements
 */
function registerGlobalShortcuts() {
  try {
    // Register Cmd+, (Mac) and Ctrl+, (Windows/Linux) for Settings
    const settingsShortcut = process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,';
    globalShortcut.register(settingsShortcut, () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.send('menu:open-settings');
        debug(`Settings shortcut triggered via globalShortcut (${settingsShortcut})`);
      }
    });

    debug('Global shortcuts registered successfully');
  } catch (error) {
    console.error('Failed to register global shortcuts:', error);
  }
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
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes',
        detail: 'Do you want to save your plan before closing this window?',
      });

      if (result.response === 2) {
        // Cancel
        return;
      }

      if (result.response === 0) {
        // Save
        const saveSuccess = await window.webContents.executeJavaScript(
          `(async () => {
            if (typeof window.__requestSaveBeforeClose === 'function') {
              try {
                return await window.__requestSaveBeforeClose();
              } catch {
                return false;
              }
            }
            return false;
          })()`
        );

        if (!saveSuccess) {
          // Save failed or user canceled save dialog
          return;
        }
      }
    }

    // Always save window state (size and active tab) even if content wasn't saved
    try {
      const bounds = window.getBounds();
      await window.webContents.executeJavaScript(
        `(async () => {
          if (typeof window.__saveWindowState === 'function') {
            try {
              await window.__saveWindowState(${bounds.width}, ${bounds.height}, ${bounds.x}, ${bounds.y});
            } catch (error) {
              console.error('Error saving window state:', error);
            }
          }
        })()`
      );
    } catch (error) {
      console.error('Error saving window state on close:', error);
    }

    // Close the window
    approvedToClose.add(window);
    window.close();
  } catch (error) {
    console.error('Error checking unsaved changes:', error);
    dialog.showErrorBox('Close Error', 'Unable to verify save state. The window was not closed to prevent data loss.');
  }
}

// Save all window states before quitting
app.on('before-quit', () => {
  debug('App quitting, saving window states...');
  isQuitting = true;
  
  try {
    const windowsToSave = Array.from(openWindows);
    if (welcomeWindow && !welcomeWindow.isDestroyed()) {
      windowsToSave.push(welcomeWindow);
    }

    const windows = windowsToSave.map((window) => {
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
    // On macOS, if we're quitting, actually quit; otherwise keep app open
    if (isQuitting) {
      app.quit();
    }
    return;
  } else {
    // On Windows/Linux, show welcome window if no windows are open (unless app is quitting)
    if (!isQuitting && openWindows.size === 0 && !hasLiveWelcomeWindow()) {
      createWelcomeWindow();
    } else if (isQuitting) {
      app.quit();
    }
  }
});

// On macOS, re-create window or show welcome when dock icon is clicked and no windows are open
app.on('activate', () => {
  if (openWindows.size === 0 && !hasLiveWelcomeWindow()) {
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
ipcMain.handle('save-file-dialog', async (event, budgetName?: string) => {
  const fileName = budgetName ? `${budgetName}.budget` : 'my-budget.budget';
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Budget Files', extensions: ['budget'] },
      { name: 'JSON Files', extensions: ['json'] },
    ],
    defaultPath: fileName,
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

/**
 * Save PDF dialog
 * Opens a native file picker for saving PDF exports
 */
ipcMain.handle('save-pdf-dialog', async (event, budgetName?: string) => {
  const fileName = budgetName ? `${budgetName}.pdf` : 'budget-export.pdf';
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
    ],
    defaultPath: fileName,
  });

  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

/**
 * Export PDF
 * Saves PDF data to a file
 */
ipcMain.handle('export-pdf', async (event, filePath: string, pdfData: Uint8Array) => {
  try {
    await fs.writeFile(filePath, Buffer.from(pdfData));
    return { success: true };
  } catch (error: any) {
    console.error('Error saving PDF:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Submit feedback
 * Opens a prefilled support email in the user's default email client
 */
ipcMain.handle('submit-feedback', async (_event, payload: {
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
}) => {
  try {
    const timestamp = new Date();
    const id = `${timestamp.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    const feedbackTempDir = path.join(app.getPath('temp'), 'paycheck-planner-feedback', id);
    await fs.mkdir(feedbackTempDir, { recursive: true });

    const attachmentPaths: string[] = [];

    if (payload.screenshot?.dataUrl) {
      const match = payload.screenshot.dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (match) {
        const mimeType = match[1] || payload.screenshot.mimeType || 'image/png';
        const ext = mimeType.split('/')[1] || 'png';
        const screenshotPath = path.join(feedbackTempDir, `screenshot.${ext}`);
        await fs.writeFile(screenshotPath, Buffer.from(match[2], 'base64'));
        attachmentPaths.push(screenshotPath);
      }
    }

    const formattedDetailsPath = path.join(feedbackTempDir, 'feedback-details.html');
    const detailsHtmlDoc = `<!doctype html><html><head><meta charset="utf-8"><title>Feedback Details</title></head><body>${payload.messageHtml}</body></html>`;
    await fs.writeFile(formattedDetailsPath, detailsHtmlDoc, 'utf-8');
    attachmentPaths.push(formattedDetailsPath);

    if (payload.includeDiagnostics && payload.diagnostics) {
      const diagnosticsPath = path.join(feedbackTempDir, 'diagnostics.json');
      await fs.writeFile(diagnosticsPath, JSON.stringify(payload.diagnostics, null, 2), 'utf-8');
      attachmentPaths.push(diagnosticsPath);
    }

    const logPath = path.join(feedbackTempDir, 'feedback-log.txt');
    const consoleLogHeader = [
      `Feedback Timestamp: ${timestamp.toISOString()}`,
      `Category: ${payload.category}`,
      `From: ${payload.email || 'Not provided'}`,
      `Subject: ${payload.subject}`,
      '',
      '--- App Debug/Info Console Output ---',
    ];
    const consoleLogContent = appLogBuffer.length > 0 ? appLogBuffer.join('\n') : 'No captured debug/info logs available.';
    await fs.writeFile(logPath, `${consoleLogHeader.join('\n')}\n${consoleLogContent}\n`, 'utf-8');
    attachmentPaths.push(logPath);

    const lines: string[] = [
      `Category: ${payload.category}`,
      `From: ${payload.email || 'Not provided'}`,
      '',
      'Message:',
      payload.messageText,
    ];

    lines.push('', 'Attachment files have been prepared by the app.');

    if (process.platform === 'darwin' && attachmentPaths.length > 0) {
      const escapeAppleScript = (value: string): string =>
        value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      const bodyText = `${lines.join('\n')}\n`;
      const scriptLines = [
        'tell application "Mail"',
        `set newMessage to make new outgoing message with properties {subject:"${escapeAppleScript(`[Paycheck Planner Feedback] ${payload.subject}`)}", content:"${escapeAppleScript(bodyText)}", visible:true}`,
        'tell newMessage',
        `make new to recipient at end of to recipients with properties {address:"${escapeAppleScript(SUPPORT_EMAIL)}"}`,
        'end tell',
      ];

      attachmentPaths.forEach((attachmentPath) => {
        scriptLines.push(
          `tell content of newMessage to make new attachment with properties {file name:POSIX file "${escapeAppleScript(attachmentPath)}"} at after the last paragraph`
        );
      });

      scriptLines.push('activate');
      scriptLines.push('end tell');

      const scriptPath = path.join(feedbackTempDir, 'create-mail-draft.applescript');
      await fs.writeFile(scriptPath, scriptLines.join('\n'), 'utf-8');

      try {
        await execFileAsync('osascript', [scriptPath]);
        return { success: true };
      } catch (error) {
        console.error('Error creating Apple Mail draft with attachments:', error);
      }
    }

    // Fallback path for non-macOS or if Apple Mail automation fails.
    await shell.openPath(feedbackTempDir);

    const encodedSubject = encodeURIComponent(`[Paycheck Planner Feedback] ${payload.subject}`);
    const encodedBody = encodeURIComponent(lines.join('\n'));
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;

    await shell.openExternal(mailtoUrl);

    return { success: true };
  } catch (error) {
    console.error('Error opening feedback email:', error);
    return { success: false, error: (error as Error).message };
  }
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
  // Intentionally no-op: app should not persist last opened plans/tabs across relaunch.
  // Keep handler for backward compatibility with renderer calls.
  return { success: true };
});

// Load session state
ipcMain.handle('load-session-state', async () => {
  // Intentionally disabled: do not auto-restore plans on startup.
  return {};
});

// Clear session state
ipcMain.handle('clear-session-state', async () => {
  // Intentionally no-op: window bounds are stored in the same session file.
  // Keeping this for API compatibility without deleting window-size state.
  return { success: true };
});

/**
 * Reveal a file in the system file browser (Finder/Explorer)
 */
ipcMain.handle('reveal-in-folder', async (_event, filePath: string) => {
  try {
    if (!filePath) {
      return { success: false, error: 'File path is required' };
    }
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

/**
 * Get the current window's bounds (width, height, x, y)
 */
ipcMain.handle('get-window-bounds', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return { width: 1400, height: 900, x: 0, y: 0 }; // Default fallback
  }
  const bounds = window.getBounds();
  return bounds;
});

/**
 * Set the window size (validates against screen bounds)
 */
ipcMain.handle('set-window-size', async (event, width: number, height: number) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return { success: false };
  }
  
  try {
    const currentBounds = window.getBounds();
    const normalizedBounds = normalizeWindowBounds(
      { width, height, x: currentBounds.x, y: currentBounds.y },
      { width, height, minWidth: 1000, minHeight: 600 }
    );
    window.setBounds(normalizedBounds);
    return { success: true };
  } catch (error) {
    console.error('Error setting window size:', error);
    return { success: false };
  }
});

/**
 * Notify main process that a budget has been loaded
 * This transitions a welcome window to a plan window
 */
ipcMain.handle('budget-loaded', async (event, windowSize?: { width: number; height: number; x: number; y: number }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return;

  // If this is the welcome window, transition it to a plan window
  if (welcomeWindow === window) {
    debug('Transitioning welcome window to plan window');
    openWindows.add(window);
    if (!mainWindow) mainWindow = window;
    welcomeWindow = null;

    // Restore window size and position if provided
    if (windowSize) {
      const normalizedBounds = normalizeWindowBounds(
        { width: windowSize.width, height: windowSize.height, x: windowSize.x, y: windowSize.y },
        { width: windowSize.width, height: windowSize.height, minWidth: 1000, minHeight: 600 }
      );
      window.setBounds(normalizedBounds);
    }

    // Attach the same close behavior as normal plan windows so unsaved-change
    // prompts work when closing via titlebar/window controls.
    window.on('close', async (event) => {
      if (!approvedToClose.has(window)) {
        event.preventDefault();
        await handleCloseWindow(window);
        return;
      }

      approvedToClose.delete(window);

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

        const windowStates = (sessionData.windows || []).filter((w: any) => {
          const existingWindow = Array.from(openWindows).find(
            (win) => win.id === w.id && win !== window
          );
          return !!existingWindow;
        });

        windowStates.push({
          id: window.id,
          windowWidth: bounds.width,
          windowHeight: bounds.height,
          windowX: bounds.x,
          windowY: bounds.y,
        });

        sessionData.windows = windowStates;
        await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
      } catch (error) {
        console.error('Error saving window state:', error);
      }
    });

    window.on('closed', () => {
      openWindows.delete(window);
      if (mainWindow === window) mainWindow = null;

      if (!isQuitting && openWindows.size === 0 && !hasLiveWelcomeWindow()) {
        createWelcomeWindow();
      }
    });
  }
});

/**
 * Save an encryption key to the system keychain
 */
ipcMain.handle('save-keychain-key', async (event, service: string, account: string, password: string) => {
  try {
    if (!service || !account || !password) {
      throw new Error('Service, account, and password are required');
    }
    debug(`[MAIN] Saving keychain key for ${service}:${account}`);
    const kt = loadKeytar();
    if (!kt) {
      const error = keytarLoadError || 'Keytar module could not be loaded';
      debug(`[MAIN] Cannot save to keychain: ${error}`);
      return { success: false, error };
    }
    await kt.setPassword(service, account, password);
    debug(`[MAIN] Successfully saved keychain key for ${service}:${account}`);
    return { success: true };
  } catch (error) {
    // Get detailed error information
    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      errorMsg = error.message;
      // Include stack trace for debugging
      debug(`[MAIN] Full error details:`, error);
    } else {
      errorMsg = String(error);
    }
    debug(`[MAIN] Failed to save keychain key: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
});

/**
 * Retrieve an encryption key from the system keychain
 */
ipcMain.handle('get-keychain-key', async (event, service: string, account: string) => {
  try {
    if (!service || !account) {
      throw new Error('Service and account are required');
    }
    debug(`[MAIN] Retrieving keychain key for ${service}:${account}`);
    const kt = loadKeytar();
    if (!kt) {
      const error = keytarLoadError || 'Keytar module could not be loaded';
      debug(`[MAIN] Cannot retrieve from keychain: ${error}`);
      return { success: false, error };
    }
    const password = await kt.getPassword(service, account);
    if (password) {
      debug(`[MAIN] Successfully retrieved keychain key for ${service}:${account}`);
      return { success: true, key: password };
    } else {
      debug(`[MAIN] Keychain key not found for ${service}:${account}`);
      return { success: true, key: null };
    }
  } catch (error) {
    // Get detailed error information
    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      errorMsg = error.message;
      debug(`[MAIN] Full error details:`, error);
    } else {
      errorMsg = String(error);
    }
    debug(`[MAIN] Failed to retrieve keychain key: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
});

/**
 * Delete an encryption key from the system keychain
 */
ipcMain.handle('delete-keychain-key', async (event, service: string, account: string) => {
  try {
    if (!service || !account) {
      throw new Error('Service and account are required');
    }
    debug(`Deleting keychain key for ${service}:${account}`);
    const kt = loadKeytar();
    if (!kt) {
      throw new Error('Keytar module could not be loaded');
    }
    const success = await kt.deletePassword(service, account);
    if (success) {
      return { success: true };
    } else {
      debug(`Keychain key not found for deletion: ${service}:${account}`);
      return { success: true }; // Still return success - key doesn't exist
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    debug(`Failed to delete keychain key: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
});
