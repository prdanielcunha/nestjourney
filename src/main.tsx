import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EcosystemProvider } from './EcosystemContext.tsx'
import { AuthGate } from './AuthGate.tsx'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcosystemProvider>
      <AuthGate><App /></AuthGate>
    </EcosystemProvider>
  </StrictMode>,
)
