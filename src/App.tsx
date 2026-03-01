// Main App component - decides whether to show setup, welcome screen, or dashboard
import { useState, useEffect } from 'react'
import { useBudget } from './contexts/BudgetContext'
import EncryptionSetup from './components/EncryptionSetup'
import WelcomeScreen from './components/WelcomeScreen'
import BudgetDashboard from './components/BudgetDashboard'
import { FileStorageService } from './services/fileStorage'
import './App.css'

function App() {
  // Get the current budget data and actions from our context
  const { budgetData } = useBudget()
  
  // Track whether user has completed initial setup
  const [setupComplete, setSetupComplete] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  // Track if user wants to force encryption setup again (for testing/changing)
  const [forceSetupAgain, setForceSetupAgain] = useState(false)

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

  // If no budget is loaded, show the welcome screen
  // Otherwise, show the main dashboard with a way to go back
  return budgetData ? (
    <BudgetDashboard onResetSetup={handleResetSetup} />
  ) : (
    <WelcomeScreen />
  )
}

export default App
