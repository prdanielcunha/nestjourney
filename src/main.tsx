import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { EcosystemSessionGate } from './EcosystemSessionGate.tsx'
import PresenceAssistPage from './PresenceAssistPage.tsx'
import CareIntegrityPage from './CareIntegrityPage.tsx'
import JourneyProfilePage from './JourneyProfilePage.tsx'
import MyTodayPage from './MyTodayPage.tsx'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

const journeyExperience = window.location.pathname === '/presence-assist'
  ? <PresenceAssistPage />
  : window.location.pathname === '/care-integrity'
    ? <CareIntegrityPage />
    : window.location.pathname === '/journey-profile'
      ? <JourneyProfilePage />
      : window.location.pathname === '/my-today'
        ? <MyTodayPage />
        : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcosystemSessionGate>
      {journeyExperience}
    </EcosystemSessionGate>
  </StrictMode>,
)
