export const MENU_EVENTS = {
  newBudget: 'new-budget',
  openBudget: 'open-budget',
  openBudgetFile: 'open-budget-file',
  changeEncryption: 'change-encryption',
  savePlan: 'save-plan',
  openSettings: 'open-settings',
  openAbout: 'open-about',
  openGlossary: 'open-glossary',
  openKeyboardShortcuts: 'open-keyboard-shortcuts',
  openPayOptions: 'open-pay-options',
  openAccounts: 'open-accounts',
  undo: 'undo',
  redo: 'redo',
  setTabPosition: 'set-tab-position',
  toggleTabDisplayMode: 'toggle-tab-display-mode',
  historyBack: 'history-back',
  historyForward: 'history-forward',
  historyHome: 'history-home',
  zoomStatus: 'zoom-status',
  openSearch: 'open-search',
} as const;

export type MenuEventName = (typeof MENU_EVENTS)[keyof typeof MENU_EVENTS];

export const APP_CUSTOM_EVENTS = {
  openGlossary: 'app:open-glossary',
  themeModeChanged: 'theme-mode-changed',
  appearanceSettingsChanged: 'appearance-settings-changed',
  glossaryTermsChanged: 'glossary-terms-changed',
  viewModeFavoritesChanged: 'view-mode-favorites-changed',
  viewModeAutoSwitched: 'view-mode-auto-switched',
  undoRedoStatus: 'app:undo-redo-status',
} as const;

export const menuChannel = (event: MenuEventName) => `menu:${event}`;