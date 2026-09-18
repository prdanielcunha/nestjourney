import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EcosystemSessionGate } from './EcosystemSessionGate.tsx'
import { resolveJourneyRoute } from './routeResolver'

const LegacyRaizEMesa = lazy(() => import('./App.tsx'))
const PresenceAssistPage = lazy(() => import('./PresenceAssistPage.tsx'))
const CareIntegrityPage = lazy(() => import('./CareIntegrityPage.tsx'))
const JourneyProfilePage = lazy(() => import('./JourneyProfilePage.tsx'))
const MyTodayPage = lazy(() => import('./MyTodayPage.tsx'))
const GroupsRuntimePage = lazy(() => import('./GroupsRuntimePage.tsx'))
const DiscipleshipRuntimePage = lazy(() => import('./DiscipleshipRuntimePage.tsx'))
const JourneyOverviewPage = lazy(() => import('./JourneyOverviewPage.tsx'))
const ImplementationRuntimePage = lazy(() => import('./ImplementationRuntimePage.tsx'))
const GovernanceRuntimePage = lazy(() => import('./GovernanceRuntimePage.tsx'))

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

function JourneyRoute() {
  switch (resolveJourneyRoute(window.location.pathname)) {
    case 'presence':
      return <PresenceAssistPage />
    case 'care':
      return <CareIntegrityPage />
    case 'profile':
      return <JourneyProfilePage />
    case 'today':
      return <MyTodayPage />
    case 'groups':
      return <GroupsRuntimePage />
    case 'discipleship':
      return <DiscipleshipRuntimePage />
    case 'implementation':
      return <ImplementationRuntimePage />
    case 'governance':
      return <GovernanceRuntimePage />
    case 'legacy':
      return <LegacyRaizEMesa />
    case 'overview':
    default:
      return <JourneyOverviewPage />
  }
}

function RouteFallback() {
  return <main className="journey-route-loading" aria-live="polite">
    <img src="/icon.svg" alt="" />
    <strong>NestJourney</strong>
    <span>Journey & Care Engine</span>
  </main>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcosystemSessionGate>
      <Suspense fallback={<RouteFallback />}>
        <JourneyRoute />
      </Suspense>
    </EcosystemSessionGate>
  </StrictMode>,
)
