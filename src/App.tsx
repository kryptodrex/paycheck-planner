// Main App component - decides whether to show setup, welcome screen, or dashboard
import { useState, useEffect } from 'react'
import { useBudget } from './contexts/BudgetContext'
import EncryptionSetup from './components/EncryptionSetup'
import WelcomeScreen from './components/WelcomeScreen'
import PlanDashboard from './components/PlanDashboard'
import Settings from './components/Settings'
import About from './components/About'
import { FileStorageService } from './services/fileStorage'
import './App.css'

function App() {
  console.log('[APP] App component rendering...');
  
  // Get the current budget data and actions from our context
  const { budgetData, saveBudget } = useBudget()
  console.log('[APP] Budget data available:', !!budgetData);
  
  // Track whether user has completed initial setup
  const [setupComplete, setSetupComplete] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  // Track if user wants to force encryption setup again (for testing/changing)
  const [forceSetupAgain, setForceSetupAgain] = useState(false)
  // Track view mode (if this is a view window)
  const [viewMode, setViewMode] = useState<string | null>(null)
  // Track if settings modal is open
  const [showSettings, setShowSettings] = useState(false)
  // Track if about modal is open
  const [showAbout, setShowAbout] = useState(false)

  // Check view mode and session restore flag on mount
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getWindowParams) {
      const params = window.electronAPI.getWindowParams()
      setViewMode(params.viewType)
    }
  }, [])

  // Handle keyboard shortcuts for settings (Cmd+, or Ctrl+,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey
      
      if (ctrlKey && e.key === ',') {
        e.preventDefault()
        setShowSettings(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  // Check if user has already configured encryption on app load
  useEffect(() => {
    // If user is forcing setup again, show setup screen regardless of saved settings
    if (forceSetupAgain) {
      setSetupComplete(false)
      setCheckingSetup(false)
      return
    }

    const settings = FileStorageService.getAppSettings()
    // User has completed setup if they've made a choice about encryption
    // (either enabled or explicitly disabled)
    const hasCompletedSetup = settings.encryptionEnabled !== undefined
    setSetupComplete(hasCompletedSetup)
    setCheckingSetup(false)
  }, [forceSetupAgain])

  // Handle going back to setup (for resetting encryption)
  const handleResetSetup = () => {
    console.log('Resetting encryption setup...')
    setForceSetupAgain(true)
  }

  // Handle canceling encryption setup when editing
  const handleCancelEncryptionSetup = () => {
    console.log('Canceling encryption setup...')
    setForceSetupAgain(false)
    setSetupComplete(true)
  }

  // Called when encryption setup is complete
  const handleSetupComplete = () => {
    console.log('Encryption setup completed')
    setSetupComplete(true)
    setForceSetupAgain(false)
  }

  // Show loading state while checking
  if (checkingSetup) {
    console.log('[APP] Showing loading state (checkingSetup=true)');
    return <div className="loading">Loading...</div>
  }

  // If setup hasn't been completed, show encryption setup screen
  if (!setupComplete) {
    console.log('[APP] Showing encryption setup (setupComplete=false)');
    // If we're forcing setup again (editing settings), provide a cancel option
    const isEditing = forceSetupAgain;
    return (
      <>
        <div className="drag-bar" />
        <EncryptionSetup 
          onComplete={handleSetupComplete}
          onCancel={isEditing ? handleCancelEncryptionSetup : undefined}
        />
      </>
    )
  }

  // If no budget is loaded, show the welcome screen
  // Otherwise, show the main dashboard with a way to go back
  console.log('[APP] Rendering final view - budgetData:', !!budgetData);
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
    </>
  )
}

export default App
