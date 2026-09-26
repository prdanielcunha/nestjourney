import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadActiveJourneyPlaybook, loadJourneyAccess, loadJourneyModuleLabels, type JourneyModuleLabels } from './journeyRepository'

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
      const access = await loadJourneyAccess(user.uid, organizationId)
      const [custom, playbook] = await Promise.all([
        loadJourneyModuleLabels(organizationId),
        loadActiveJourneyPlaybook(access),
      ])
      setLabels({
        presence: custom.presence || playbook.areaLabels.presence,
        table: custom.table || playbook.areaLabels.table,
        care: custom.care || playbook.areaLabels.care,
        groups: custom.groups || playbook.areaLabels.groups,
        discipleship: custom.discipleship || playbook.areaLabels.discipleship,
      })
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
