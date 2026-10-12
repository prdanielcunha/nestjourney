import {afterEach,describe,expect,it,vi} from 'vitest'
import {createPresenceSession,recordPresenceCheck} from './journeyRepository'

afterEach(()=>vi.unstubAllGlobals())
describe('Sensitive attendance writes must not queue silently when device is offline',()=>{
  it('blocks opening sessions while offline before any Firestore access',async()=>{
    vi.stubGlobal('navigator',{onLine:false})
    await expect(createPresenceSession({
      organizationId:'org-a',congregationId:'unit-a',actorId:'admin',
      eventName:'Sunday',eventTypeId:'sunday',expectedPeopleCount:0,
      minimumCoveragePercent:90,
    })).rejects.toThrow('sensitive_write_offline_blocked')
  })
  it('blocks presence checks while offline instead of pretending they were saved',async()=>{
    vi.stubGlobal('navigator',{onLine:false})
    await expect(recordPresenceCheck({
      organizationId:'org-a',congregationId:'unit-a',sessionId:'s1',
      personId:'p1',actorId:'admin',state:'present_confirmed',
    })).rejects.toThrow('sensitive_write_offline_blocked')
  })
})
