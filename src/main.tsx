// Main entry point for the React application
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BudgetProvider } from './contexts/BudgetContext'
import { ThemeProvider } from './contexts/ThemeContext'

console.log('[REACT] main.tsx starting...');
console.log('[REACT] window.electronAPI available:', !!window.electronAPI);

// Create the root React element and render our app
// BudgetProvider wraps the entire app to give all components access to budget state
const rootElement = document.getElementById('root');
console.log('[REACT] Root element found:', !!rootElement);

if (!rootElement) {
  console.error('[REACT] ERROR: Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">ERROR: Root element not found. Check index.html</div>';
} else {
  console.log('[REACT] Rendering App...');
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <BudgetProvider>
          <App />
        </BudgetProvider>
      </ThemeProvider>
    </StrictMode>,
  );
  console.log('[REACT] App render called');
}
