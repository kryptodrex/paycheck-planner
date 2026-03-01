// Main App component - decides whether to show setup, welcome screen, or dashboard
import { useState, useEffect } from 'react'
import { useBudget } from './contexts/BudgetContext'
import EncryptionSetup from './components/EncryptionSetup'
import WelcomeScreen from './components/WelcomeScreen'
import PlanDashboard from './components/PlanDashboard'
import { FileStorageService } from './services/fileStorage'
import './App.css'

function App() {
  // Get the current budget data and actions from our context
  const { budgetData, loadBudget } = useBudget()
  
  // Track whether user has completed initial setup
  const [setupComplete, setSetupComplete] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  // Track if user wants to force encryption setup again (for testing/changing)
  const [forceSetupAgain, setForceSetupAgain] = useState(false)
  // Track session restoration state
  const [sessionError, setSessionError] = useState<string | null>(null)

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

  // Try to restore session when setup is complete and budget is not loaded
  useEffect(() => {
    if (!setupComplete || budgetData || !window.electronAPI) return

    const restoreSession = async () => {
      try {
        const session = await window.electronAPI.loadSessionState()
        
        // If there's a saved session with a file path
        if (session.filePath) {
          // Check if the file still exists
          const exists = await window.electronAPI.fileExists(session.filePath)
          if (exists) {
            // Load the file
            await loadBudget(session.filePath)
            return
          } else {
            // File no longer exists, show error
            setSessionError(`The file "${session.filePath}" could not be found. Starting fresh...`)
            // Clear the old session
            await window.electronAPI.clearSessionState()
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error)
      }
    }

    restoreSession()
  }, [setupComplete, budgetData, loadBudget])

  // Handle going back to setup (for resetting encryption)
  const handleResetSetup = () => {
    console.log('Resetting encryption setup...')
    setForceSetupAgain(true)
  }

  // Called when encryption setup is complete
  const handleSetupComplete = () => {
    console.log('Encryption setup completed')
    setSetupComplete(true)
    setForceSetupAgain(false)
  }

  // Show loading state while checking
  if (checkingSetup) {
    return <div className="loading">Loading...</div>
  }

  // If setup hasn't been completed, show encryption setup screen
  if (!setupComplete) {
    return <EncryptionSetup onComplete={handleSetupComplete} />
  }

  // Show session error if file not found, or if no budget is loaded, show welcome screen
  if (sessionError) {
    return (
      <WelcomeScreen initialError={sessionError} />
    )
  }

  // If no budget is loaded, show the welcome screen
  // Otherwise, show the main dashboard with a way to go back
  return budgetData ? (
    <PlanDashboard onResetSetup={handleResetSetup} />
  ) : (
    <WelcomeScreen />
  )
}

export default App
