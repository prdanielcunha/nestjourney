import {describe,expect,it} from 'vitest'
import {canOpenAuthorizedContact} from './freshContactAuthorization'

describe('Contact consent gating at handoff',()=>{
  const ready={consent:true,phone:'44999999999',preferredContactChannel:'whatsapp',contactStatus:'pending'}
  it('accepts a current, purposeful human-authorized contact',()=>{expect(canOpenAuthorizedContact(ready)).toBe(true)})
  it('blocks revoked consent even if UI cached an authorized channel',()=>{expect(canOpenAuthorizedContact({...ready,consentRevokedAt:'2026-10-12T00:00:00Z'})).toBe(false)})
  it('blocks missing consent, cancelled task or unsafe channel',()=>{
    expect(canOpenAuthorizedContact({...ready,consent:false})).toBe(false)
    expect(canOpenAuthorizedContact({...ready,contactStatus:'closed'})).toBe(false)
    expect(canOpenAuthorizedContact({...ready,preferredContactChannel:'telegram'})).toBe(false)
    expect(canOpenAuthorizedContact({...ready,phone:''})).toBe(false)
  })
})
