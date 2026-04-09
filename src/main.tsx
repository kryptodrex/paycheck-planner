// Main entry point for the React application
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/fonts.css'
import './index.css'
import App from './App.tsx'
import { BudgetProvider } from './contexts/BudgetContext'
import { ThemeProvider } from './contexts/ThemeContext'

if (import.meta.env.DEV) console.debug('[REACT] main.tsx starting...');
if (import.meta.env.DEV) console.debug('[REACT] window.electronAPI available:', !!window.electronAPI);

// Create the root React element and render our app
// BudgetProvider wraps the entire app to give all components access to budget state
const rootElement = document.getElementById('root');
if (import.meta.env.DEV) console.debug('[REACT] Root element found:', !!rootElement);

if (!rootElement) {
  console.error('[REACT] ERROR: Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">ERROR: Root element not found. Check index.html</div>';
} else {
  if (import.meta.env.DEV) console.debug('[REACT] Rendering App...');
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <BudgetProvider>
          <App />
        </BudgetProvider>
      </ThemeProvider>
    </StrictMode>,
  );
  if (import.meta.env.DEV) console.debug('[REACT] App render called');
}
