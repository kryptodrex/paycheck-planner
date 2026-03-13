// Main App component - decides whether to show setup, welcome screen, or dashboard
import { useState, useEffect } from 'react'
import { useBudget } from './contexts/BudgetContext'
import { useGlobalKeyboardShortcuts } from './hooks'
import EncryptionSetup from './components/EncryptionSetup'
import WelcomeScreen from './components/WelcomeScreen'
import PlanDashboard from './components/PlanDashboard'
import Settings from './components/Settings'
import About from './components/About'
import Glossary from './components/Glossary'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import './App.css'

function App() {
  if (import.meta.env.DEV) console.debug('[APP] App component rendering...');
  
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
  const [showGlossary, setShowGlossary] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  // Track requested glossary term when opened from inline tooltips
  const [initialGlossaryTermId, setInitialGlossaryTermId] = useState<string | null>(null)

  // Register global keyboard shortcuts
  useGlobalKeyboardShortcuts([
    {
      key: ',',
      mac: true,        // Cmd+, on Mac
      windows: true,    // Ctrl+, on Windows/Linux
      callback: () => setShowSettings(true),
    },
  ])

  // Listen for settings menu event from Electron menu
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent('open-settings', () => {
      setShowSettings(true)
    })

    return unsubscribe
  }, [])

  // Listen for about menu event from Electron menu (Windows/Linux)
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent('open-about', () => {
      setShowAbout(true)
    })

    return unsubscribe
  }, [])

  // Listen for glossary menu event from Electron Help menu
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent('open-glossary', () => {
      setInitialGlossaryTermId(null)
      setShowGlossary(true)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent('open-keyboard-shortcuts', () => {
      setShowKeyboardShortcuts(true)
    })

    return unsubscribe
  }, [])

  // Listen for file-open requests from OS integration (double click / Open With)
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return

    const unsubscribe = window.electronAPI.onMenuEvent('open-budget-file', (arg) => {
      if (typeof arg === 'string' && arg.trim()) {
        loadBudget(arg)
      }
    })

    return unsubscribe
  }, [loadBudget])

  // Open glossary from in-app term tooltips
  useEffect(() => {
    type OpenGlossaryEvent = CustomEvent<{ termId?: string }>;

    const handleOpenGlossary = (event: Event) => {
      const detail = (event as OpenGlossaryEvent).detail;
      setInitialGlossaryTermId(detail?.termId || null)
      setShowGlossary(true)
    }

    window.addEventListener('app:open-glossary', handleOpenGlossary as EventListener)
    return () => window.removeEventListener('app:open-glossary', handleOpenGlossary as EventListener)
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
        <PlanDashboard onResetSetup={handleResetSetup} viewMode={viewMode} />
      ) : (
        <>
          <WelcomeScreen />
          <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </>
      )}
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <Glossary
        isOpen={showGlossary}
        initialTermId={initialGlossaryTermId}
        onClose={() => {
          setShowGlossary(false)
          setInitialGlossaryTermId(null)
        }}
      />
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </>
  )
}

export default App
