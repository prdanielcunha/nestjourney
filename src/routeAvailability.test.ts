import { describe, expect, it } from 'vitest'
import entrySource from './main.tsx?raw'
import serviceWorkerSource from '../public/sw.js?raw'

describe('Journey route availability across Hosting deployments', () => {
  it('does not defer every workspace to a runtime-only JavaScript chunk', () => {
    expect(entrySource).not.toContain('lazy(() => import(')
    expect(entrySource).not.toContain('<Suspense fallback=')
    expect(entrySource).toContain("import MyTodayPage from './MyTodayPage.tsx'")
    expect(entrySource).toContain("import JourneyProfilePage from './JourneyProfilePage.tsx'")
    expect(entrySource).toContain("import PresenceAssistPage from './PresenceAssistPage.tsx'")
    expect(entrySource).toContain("import MesaRuntimePage from './MesaRuntimePage.tsx'")
    expect(entrySource).toContain("import FollowupRuntimePage from './FollowupRuntimePage.tsx'")
    expect(entrySource).toContain("import GroupsRuntimePage from './GroupsRuntimePage.tsx'")
    expect(entrySource).toContain("import DiscipleshipRuntimePage from './DiscipleshipRuntimePage.tsx'")
  })

  it('refuses to store SPA HTML under missing JS or CSS URLs', () => {
    expect(serviceWorkerSource).toContain("type.includes('javascript')")
    expect(serviceWorkerSource).toContain("type.includes('text/css')")
    expect(serviceWorkerSource).toContain('if(validAsset)')
  })
})
