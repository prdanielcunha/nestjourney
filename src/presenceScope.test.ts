import {beforeEach, describe, expect, it, vi} from 'vitest'
import {loadAttendanceScope} from './presenceScope'
import {listAbsenceCareRoutePersonIds, listJourneyPeople, listPresenceChecks, listPresenceSessions} from './journeyRepository'

vi.mock('./journeyRepository',()=>({
  listJourneyPeople:vi.fn(),listPresenceSessions:vi.fn(),listPresenceChecks:vi.fn(),
  listAbsenceCareRoutePersonIds:vi.fn(),
}))
beforeEach(()=>{
  vi.clearAllMocks()
  vi.mocked(listJourneyPeople).mockResolvedValue([])
  vi.mocked(listPresenceSessions).mockResolvedValue([
    {id:'open-service',status:'open'}, {id:'old-service',status:'closed'},
  ] as Awaited<ReturnType<typeof listPresenceSessions>>)
  vi.mocked(listPresenceChecks).mockResolvedValue([])
})
describe('Attendance loading is independent of Care authorization',()=>{
  it('opens the current service even when the Care read would never finish',async()=>{
    vi.mocked(listAbsenceCareRoutePersonIds).mockImplementation(()=>new Promise(()=>{}))
    const result=await loadAttendanceScope('org-a','unit-a','')
    expect(result.session?.id).toBe('open-service')
    expect(listPresenceChecks).toHaveBeenCalledWith('org-a','unit-a','open-service')
    expect(listAbsenceCareRoutePersonIds).not.toHaveBeenCalled()
  })
  it('loads a selected historical service without requesting protected Care data',async()=>{
    const result=await loadAttendanceScope('org-a','unit-a','old-service')
    expect(result.session?.id).toBe('old-service')
    expect(listPresenceChecks).toHaveBeenCalledWith('org-a','unit-a','old-service')
    expect(listAbsenceCareRoutePersonIds).not.toHaveBeenCalled()
  })
  it('does not conceal denied attendance permissions',async()=>{
    vi.mocked(listPresenceChecks).mockRejectedValue(new Error('permission-denied'))
    await expect(loadAttendanceScope('org-a','unit-a','')).rejects.toThrow('permission-denied')
  })
  it('shows the registered people before any service exists',async()=>{
    vi.mocked(listPresenceSessions).mockResolvedValue([])
    const result=await loadAttendanceScope('org-a','unit-a','')
    expect(result.session).toBeUndefined()
    expect(listJourneyPeople).toHaveBeenCalledWith('org-a','unit-a')
    expect(listPresenceChecks).not.toHaveBeenCalled()
  })
})
