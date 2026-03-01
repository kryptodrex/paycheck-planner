// Main entry point for the React application
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BudgetProvider } from './contexts/BudgetContext'

// Create the root React element and render our app
// BudgetProvider wraps the entire app to give all components access to budget state
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BudgetProvider>
      <App />
    </BudgetProvider>
  </StrictMode>,
)
