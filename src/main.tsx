import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { EcosystemSessionGate } from './EcosystemSessionGate.tsx'
import { JourneyShell } from './JourneyShell.tsx'
import { JourneyErrorBoundary } from './JourneyErrorBoundary.tsx'
import { JourneyLabelsProvider } from './journeyLabels.tsx'
import { resolveJourneyRoute } from './routeResolver'

// Load all route modules with the app entry: reopening any workspace must not
// depend on a historical chunk that Firebase Hosting no longer serves.
import AreasPage from './AreasPage.tsx'
import MesaRuntimePage from './MesaRuntimePage.tsx'
import JourneyVisionPage from './JourneyVisionPage.tsx'
import MorePage from './MorePage.tsx'
import JourneyReportsPage from './JourneyReportsPage.tsx'
import FieldGuidePage from './FieldGuidePage.tsx'
import HelpPage from './HelpPage.tsx'
import WhatsNewPage from './WhatsNewPage.tsx'
import PresenceAssistPage from './PresenceAssistPage.tsx'
import CareIntegrityPage from './CareIntegrityPage.tsx'
import FollowupRuntimePage from './FollowupRuntimePage.tsx'
import JourneyProfilePage from './JourneyProfilePage.tsx'
import BirthdayCalendarPage from './BirthdayCalendarPage.tsx'
import MyTodayPage from './MyTodayPage.tsx'
import GroupsRuntimePage from './GroupsRuntimePage.tsx'
import DiscipleshipRuntimePage from './DiscipleshipRuntimePage.tsx'
import JourneyMilestonesPage from './JourneyMilestonesPage.tsx'
import ImplementationRuntimePage from './ImplementationRuntimePage.tsx'
import PlaybookStudioPage from './PlaybookStudioPage.tsx'
import TeamSetupPage from './TeamSetupPage.tsx'
import SupportPage from './SupportPage.tsx'
import TeamBulkImportPage from './TeamBulkImportPage.tsx'
import JourneyJoinPage from './JourneyJoinPage.tsx'
import JourneySettingsPage from './JourneySettingsPage.tsx'
import GovernanceRuntimePage from './GovernanceRuntimePage.tsx'
import PastoralHandoffPage from './PastoralHandoffPage.tsx'

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
    case 'join':
      return <JourneyJoinPage />
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
    case 'field-guide':
      return <FieldGuidePage />
    case 'help':
      return <HelpPage />
    case 'whats-new':
      return <WhatsNewPage />
    case 'presence':
      return <PresenceAssistPage />
    case 'care':
      return <CareIntegrityPage />
    case 'followup':
      return <FollowupRuntimePage />
    case 'profile':
      return <JourneyProfilePage />
    case 'birthdays':
      return <BirthdayCalendarPage />
    case 'today':
      return <MyTodayPage />
    case 'groups':
      return <GroupsRuntimePage />
    case 'discipleship':
      return <DiscipleshipRuntimePage />
    case 'milestones':
      return <JourneyMilestonesPage />
    case 'implementation':
      return <ImplementationRuntimePage />
    case 'playbook-studio':
      return <PlaybookStudioPage />
    case 'team':
      return <TeamSetupPage />
    case 'support':
      return <SupportPage />
    case 'team-import':
      return <TeamBulkImportPage />
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcosystemSessionGate>
      <JourneyLabelsProvider>
        <JourneyErrorBoundary>
          <JourneyShell>
            <JourneyRoute />
          </JourneyShell>
        </JourneyErrorBoundary>
      </JourneyLabelsProvider>
    </EcosystemSessionGate>
  </StrictMode>,
)
