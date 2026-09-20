import { StrictMode, Suspense, lazy, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EcosystemSessionGate } from './EcosystemSessionGate.tsx'
import { JourneyShell } from './JourneyShell.tsx'
import { JourneyLabelsProvider } from './journeyLabels.tsx'
import { resolveJourneyRoute } from './routeResolver'

const AreasPage = lazy(() => import('./AreasPage.tsx'))
const MesaRuntimePage = lazy(() => import('./MesaRuntimePage.tsx'))
const JourneyVisionPage = lazy(() => import('./JourneyVisionPage.tsx'))
const MorePage = lazy(() => import('./MorePage.tsx'))
const JourneyReportsPage = lazy(() => import('./JourneyReportsPage.tsx'))
const HelpPage = lazy(() => import('./HelpPage.tsx'))
const PresenceAssistPage = lazy(() => import('./PresenceAssistPage.tsx'))
const CareIntegrityPage = lazy(() => import('./CareIntegrityPage.tsx'))
const FollowupRuntimePage = lazy(() => import('./FollowupRuntimePage.tsx'))
const JourneyProfilePage = lazy(() => import('./JourneyProfilePage.tsx'))
const MyTodayPage = lazy(() => import('./MyTodayPage.tsx'))
const GroupsRuntimePage = lazy(() => import('./GroupsRuntimePage.tsx'))
const DiscipleshipRuntimePage = lazy(() => import('./DiscipleshipRuntimePage.tsx'))
const ImplementationRuntimePage = lazy(() => import('./ImplementationRuntimePage.tsx'))
const TeamSetupPage = lazy(() => import('./TeamSetupPage.tsx'))
const JourneySettingsPage = lazy(() => import('./JourneySettingsPage.tsx'))
const GovernanceRuntimePage = lazy(() => import('./GovernanceRuntimePage.tsx'))
const PastoralHandoffPage = lazy(() => import('./PastoralHandoffPage.tsx'))

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

function JourneyRoute() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname)
    const handleInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const element = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!element || element.hasAttribute('download')) return

      const target = element.getAttribute('target')
      if (target && target !== '_self') return

      const href = element.getAttribute('href')
      if (!href || href.startsWith('#')) return

      const url = new URL(href, window.location.href)
      if (url.origin !== window.location.origin) return

      event.preventDefault()
      const nextUrl = `${url.pathname}${url.search}${url.hash}`
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (nextUrl !== currentUrl) {
        window.history.pushState({}, '', nextUrl)
        window.dispatchEvent(new PopStateEvent('popstate'))
      } else {
        syncPath()
      }
    }

    window.addEventListener('popstate', syncPath)
    document.addEventListener('click', handleInternalNavigation)

    return () => {
      window.removeEventListener('popstate', syncPath)
      document.removeEventListener('click', handleInternalNavigation)
    }
  }, [])

  switch (resolveJourneyRoute(pathname)) {
    case 'areas':
      return <AreasPage />
    case 'mesa':
      return <MesaRuntimePage />
    case 'vision':
      return <JourneyVisionPage />
    case 'more':
      return <MorePage />
    case 'reports':
      return <JourneyReportsPage />
    case 'help':
      return <HelpPage />
    case 'presence':
      return <PresenceAssistPage />
    case 'care':
      return <CareIntegrityPage />
    case 'followup':
      return <FollowupRuntimePage />
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
    case 'team':
      return <TeamSetupPage />
    case 'settings':
      return <JourneySettingsPage />
    case 'governance':
      return <GovernanceRuntimePage />
    case 'pastoral':
      return <PastoralHandoffPage />
    default:
      return <MyTodayPage />
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
      <JourneyLabelsProvider>
        <JourneyShell>
          <Suspense fallback={<RouteFallback />}>
            <JourneyRoute />
          </Suspense>
        </JourneyShell>
      </JourneyLabelsProvider>
    </EcosystemSessionGate>
  </StrictMode>,
)
