import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EcosystemSessionGate } from './EcosystemSessionGate.tsx'
import PresenceAssistPage from './PresenceAssistPage.tsx'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

const journeyExperience = window.location.pathname === '/presence-assist'
  ? <PresenceAssistPage />
  : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcosystemSessionGate>
      {journeyExperience}
    </EcosystemSessionGate>
  </StrictMode>,
)
