// Main App component - decides whether to show setup, welcome screen, or dashboard
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { APP_CUSTOM_EVENTS, MENU_EVENTS } from './constants/events'
import { useBudget } from './contexts/BudgetContext'
import { useGlobalKeyboardShortcuts } from './hooks'
import { initializeSearchModules } from './utils/searchModules'
import EncryptionSetup from './components/views/EncryptionSetup'
import WelcomeScreen from './components/views/WelcomeScreen'
import PlanDashboard from './components/PlanDashboard'
import SettingsModal from './components/modals/SettingsModal'
import { TransientStatusIndicator } from './components/_shared'
import './App.css'

const AboutModal = lazy(() => import('./components/modals/AboutModal'))
const AppFaqModal = lazy(() => import('./components/modals/AppFaqModal'))
const GlossaryModal = lazy(() => import('./components/modals/GlossaryModal'))
const KeyboardShortcutsModal = lazy(() => import('./components/modals/KeyboardShortcutsModal'))

function App() {
  if (import.meta.env.DEV) console.debug('[APP] App component rendering...');

  // Initialize search modules once on app startup
  useEffect(() => {
    initializeSearchModules();
  }, []);
  
  // Get the current budget data and actions from our context
  const { budgetData, saveBudget, saveWindowState, loadBudget } = useBudget()
  if (import.meta.env.DEV) console.debug('[APP] Budget data available:', !!budgetData);

  // Track if user wants to force encryption setup again (for testing/changing)
  const [forceSetupAgain, setForceSetupAgain] = useState(false)
  // Track view mode (if this is a view window)
  const [viewMode] = useState<string | null>(() => {
    if (window.electronAPI && window.electronAPI.getWindowParams) {
      return window.electronAPI.getWindowParams().viewType
    }
    return null
  })
  // Track if settings modal is open
  const [showSettings, setShowSettings] = useState(false)
  // Track if about modal is open
  const [showAbout, setShowAbout] = useState(false)
  // Track if glossary modal is open
  const [showAppFaq, setShowAppFaq] = useState(false)
  const [showGlossary, setShowGlossary] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [zoomIndicatorMessage, setZoomIndicatorMessage] = useState<string | null>(null)
  const [zoomIndicatorAtLimit, setZoomIndicatorAtLimit] = useState(false)
  const [currentZoomFactor, setCurrentZoomFactor] = useState(1)
  const zoomIndicatorTimeoutRef = useRef<number | null>(null)
  const [undoRedoMessage, setUndoRedoMessage] = useState<string | null>(null)
  const undoRedoTimeoutRef = useRef<number | null>(null)
  // Track requested glossary term when opened from inline tooltips
  const [initialGlossaryTermId, setInitialGlossaryTermId] = useState<string | null>(null)
  // Track requested FAQ item when opened from in-app links
  const [initialFaqItemId, setInitialFaqItemId] = useState<string | null>(null)

  // Register global keyboard shortcuts for the welcome screen only.
  // When a plan is open, PlanDashboard owns settings shortcut handling.
  useGlobalKeyboardShortcuts(
    budgetData
      ? []
      : [
          {
            key: ',',
            mac: true,        // Cmd+, on Mac
            windows: true,    // Ctrl+, on Windows/Linux
            callback: () => setShowSettings(true),
          },
        ],
  )

  // Listen for settings menu event from Electron menu
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.openSettings, () => {
      setShowSettings(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.zoomStatus, (arg) => {
      if (!arg || typeof arg !== 'object') {
        return
      }

      const payload = arg as {
        action?: 'in' | 'out' | 'reset'
        zoomPercent?: number
        atLimit?: boolean
        limit?: 'min' | 'max'
      }

      if (typeof payload.zoomPercent !== 'number') {
        return
      }

      const zoomFactor = payload.zoomPercent / 100
      setCurrentZoomFactor(zoomFactor)
      const atLimit = payload.atLimit === true
      const message = atLimit
        ? payload.limit === 'max'
          ? `Zoom ${payload.zoomPercent}% (Maximum reached)`
          : `Zoom ${payload.zoomPercent}% (Minimum reached)`
        : payload.action === 'reset'
          ? `Zoom ${payload.zoomPercent}% (Reset)`
          : `Zoom ${payload.zoomPercent}%`

      setZoomIndicatorMessage(message)
      setZoomIndicatorAtLimit(atLimit)

      if (zoomIndicatorTimeoutRef.current !== null) {
        window.clearTimeout(zoomIndicatorTimeoutRef.current)
      }

      zoomIndicatorTimeoutRef.current = window.setTimeout(() => {
        setZoomIndicatorMessage(null)
        setZoomIndicatorAtLimit(false)
      }, 1500)
    })

    return () => {
      unsubscribe()
      if (zoomIndicatorTimeoutRef.current !== null) {
        window.clearTimeout(zoomIndicatorTimeoutRef.current)
      }
    }
  }, [])

  const handleUndoRedoSuccess = useCallback((action: 'undo' | 'redo') => {
    const message = action === 'undo' ? 'Undo successful' : 'Redo successful'
    setUndoRedoMessage(message)

    if (undoRedoTimeoutRef.current !== null) {
      window.clearTimeout(undoRedoTimeoutRef.current)
    }

    undoRedoTimeoutRef.current = window.setTimeout(() => {
      setUndoRedoMessage(null)
    }, 1500)
  }, [])

  useEffect(() => {
    return () => {
      if (undoRedoTimeoutRef.current !== null) {
        window.clearTimeout(undoRedoTimeoutRef.current)
      }
    }
  }, [])

  // Listen for about menu event from Electron menu (Windows/Linux)
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.openAbout, () => {
      setShowAbout(true)
    })

    return unsubscribe
  }, [])

  // Listen for glossary menu event from Electron Help menu
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.openAppFaq, () => {
      setShowAppFaq(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.openGlossary, () => {
      setInitialGlossaryTermId(null)
      setShowGlossary(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.openKeyboardShortcuts, () => {
      setShowKeyboardShortcuts(true)
    })

    return unsubscribe
  }, [])

  // Listen for file-open requests from OS integration (double click / Open With)
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent(MENU_EVENTS.openBudgetFile, (arg) => {
      if (typeof arg === 'string' && arg.trim()) {
        loadBudget(arg)
      }
    })

    return unsubscribe
  }, [loadBudget])

  // Open FAQ from in-app links
  useEffect(() => {
    type OpenAppFaqEvent = CustomEvent<{ itemId?: string }>;

    const handleOpenAppFaq = (event: Event) => {
      const detail = (event as OpenAppFaqEvent).detail;
      setInitialFaqItemId(detail?.itemId || null)
      setShowAppFaq(true)
    }

    window.addEventListener(APP_CUSTOM_EVENTS.openAppFaq, handleOpenAppFaq as EventListener)
    return () => window.removeEventListener(APP_CUSTOM_EVENTS.openAppFaq, handleOpenAppFaq as EventListener)
  }, [])

  // Open glossary from in-app term tooltips
  useEffect(() => {
    type OpenGlossaryEvent = CustomEvent<{ termId?: string }>;

    const handleOpenGlossary = (event: Event) => {
      const detail = (event as OpenGlossaryEvent).detail;
      setInitialGlossaryTermId(detail?.termId || null)
      setShowGlossary(true)
    }

    window.addEventListener(APP_CUSTOM_EVENTS.openGlossary, handleOpenGlossary as EventListener)
    return () => window.removeEventListener(APP_CUSTOM_EVENTS.openGlossary, handleOpenGlossary as EventListener)
  }, [])

  // Expose a save hook for Electron close confirmation flow
  useEffect(() => {
    window.__requestSaveBeforeClose = async () => {
      // saveBudget already returns false if there is no budget or save was canceled/failed
      return await saveBudget();
    };

    return () => {
      delete window.__requestSaveBeforeClose;
    };
  }, [saveBudget])

  // Expose a window state save hook for Electron to call when closing
  useEffect(() => {
    window.__saveWindowState = async (width: number, height: number, x: number, y: number) => {
      // Get current active tab if available (set by PlanDashboard)
      const activeTab = window.__currentActiveTab;
      await saveWindowState(width, height, x, y, activeTab);
    };

    return () => {
      delete window.__saveWindowState;
    };
  }, [saveWindowState])

  // Handle going back to setup (for resetting encryption)
  const handleResetSetup = () => {
    if (import.meta.env.DEV) console.debug('Resetting encryption setup...')
    setForceSetupAgain(true)
  }

  // Handle canceling encryption setup when editing
  const handleCancelEncryptionSetup = () => {
    if (import.meta.env.DEV) console.debug('Canceling encryption setup...')
    setForceSetupAgain(false)
  }

  // Called when encryption setup is complete
  const handleSetupComplete = () => {
    if (import.meta.env.DEV) console.debug('Encryption setup completed')
    setForceSetupAgain(false)
  }

  // Show encryption setup only when explicitly requested from an active plan.
  if (budgetData && forceSetupAgain) {
    if (import.meta.env.DEV) console.debug('[APP] Showing encryption setup (manual reset flow)');
    return (
      <>
        <div className="drag-bar" />
        <EncryptionSetup 
          onComplete={handleSetupComplete}
          onCancel={handleCancelEncryptionSetup}
        />
      </>
    )
  }

  // If no budget is loaded, show the welcome screen
  // Otherwise, show the main dashboard with a way to go back
  if (import.meta.env.DEV) console.debug('[APP] Rendering final view - budgetData:', !!budgetData);
  return (
    <>
      <div className="drag-bar" />
      {budgetData ? (
        <PlanDashboard
          onResetSetup={handleResetSetup}
          onUndoRedoSuccess={handleUndoRedoSuccess}
          viewMode={viewMode}
        />
      ) : (
        <>
          <WelcomeScreen />
          <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </>
      )}
      <Suspense fallback={null}>
        <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <AppFaqModal
          isOpen={showAppFaq}
          initialItemId={initialFaqItemId ?? undefined}
          onClose={() => {
            setShowAppFaq(false)
            setInitialFaqItemId(null)
          }}
        />
      </Suspense>
      <Suspense fallback={null}>
        <GlossaryModal
          isOpen={showGlossary}
          initialTermId={initialGlossaryTermId}
          onClose={() => {
            setShowGlossary(false)
            setInitialGlossaryTermId(null)
          }}
        />
      </Suspense>
      <Suspense fallback={null}>
        <KeyboardShortcutsModal
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      </Suspense>
      <TransientStatusIndicator
        message={zoomIndicatorMessage}
        variant={zoomIndicatorAtLimit ? 'warning' : 'default'}
        zoomFactor={currentZoomFactor}
      />
      <TransientStatusIndicator
        message={undoRedoMessage}
        zoomFactor={currentZoomFactor}
      />
    </>
  )
}

export default App
