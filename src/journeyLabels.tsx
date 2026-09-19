import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyModuleLabels, type JourneyModuleLabels } from './journeyRepository'

type JourneyLabelsContextValue = {
  labels: JourneyModuleLabels
  refresh: () => Promise<void>
}

const JourneyLabelsContext = createContext<JourneyLabelsContextValue>({
  labels: {},
  refresh: async () => {},
})

export function JourneyLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<JourneyModuleLabels>({})

  const refresh = useCallback(async () => {
    const user = auth?.currentUser
    const organizationId = getActiveJourneyOrganizationId()
    if (!user || !organizationId) {
      setLabels({})
      return
    }
    try {
      setLabels(await loadJourneyModuleLabels(organizationId))
    } catch (cause) {
      console.error(cause)
      setLabels({})
    }
  }, [])

  useEffect(() => {
    void refresh()
    const handle = () => { void refresh() }
    window.addEventListener('nestjourney:labels', handle)
    return () => window.removeEventListener('nestjourney:labels', handle)
  }, [refresh])

  const value = useMemo(() => ({ labels, refresh }), [labels, refresh])
  return <JourneyLabelsContext.Provider value={value}>{children}</JourneyLabelsContext.Provider>
}

export function useJourneyLabels() {
  return useContext(JourneyLabelsContext)
}

export function notifyJourneyLabelsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('nestjourney:labels'))
}
