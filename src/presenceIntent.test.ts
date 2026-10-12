import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {presenceIntentCheckId,presenceIntentTuple,type PresenceIntent} from './presenceIntent'
const original:PresenceIntent={
  organizationId:'org-a',congregationId:'unit-a',sessionId:'s1',personId:'p1',
  actorId:'usher',state:'present_confirmed',
}
// JSDOM does not expose SubtleCrypto in every runner. This deterministic
// test double verifies intent identity; SHA-256 is provided by the browser.
const digest=async(_algorithm:string,bytes:Uint8Array)=>{
  let state=2166136261>>>0
  for(const b of bytes){state^=b;state=Math.imul(state,16777619)}
  const output=new Uint8Array(32)
  for(let i=0;i<32;i++)output[i]=(state>>((i%4)*8))&255
  return output.buffer
}
beforeEach(()=>vi.stubGlobal('crypto',{subtle:{digest}}))
afterEach(()=>vi.unstubAllGlobals())
describe('Idempotent human attendance intention',()=>{
  it('reuses exactly the same non-identifying ID for a repeated attempt',async()=>{
    const first=await presenceIntentCheckId(original)
    expect(first).toMatch(/^intent_[a-f0-9]{64}$/)
    expect(await presenceIntentCheckId({...original})).toBe(first)
    expect(first).not.toContain('org-a')
    expect(first).not.toContain('p1')
  })
  it('uses different facts for legitimate state changes and corrections',async()=>{
    const first=await presenceIntentCheckId(original)
    expect(await presenceIntentCheckId({...original,state:'absent_confirmed'})).not.toBe(first)
    expect(await presenceIntentCheckId({...original,correctedFromCheckId:'previous-fact',correctionReason:'Correction confirmed by attendee'})).not.toBe(first)
    expect(await presenceIntentCheckId({...original,personId:'different-person'})).not.toBe(first)
    expect(await presenceIntentCheckId({...original,sessionId:'other-session'})).not.toBe(first)
  })
  it('makes correction reason part of the exact reviewed command',()=>{
    const first=presenceIntentTuple({...original,correctionReason:'  verified with person  '})
    const second=presenceIntentTuple({...original,correctionReason:'verified with person'})
    expect(first).toEqual(second)
  })
  it('does not allow an insecure fallback digest',async()=>{
    vi.stubGlobal('crypto',{})
    await expect(presenceIntentCheckId(original)).rejects.toThrow('secure_digest_unavailable')
  })
})
