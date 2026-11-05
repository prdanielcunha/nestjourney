import {describe, expect, it, vi} from 'vitest'
import {closePresenceSession, type PresenceSessionRecord} from './journeyRepository'
const batch=vi.hoisted(()=>({update:vi.fn(),commit:vi.fn().mockResolvedValue(undefined)}))
vi.mock('./firebase',()=>({db:{}}))
vi.mock('firebase/firestore',async importOriginal=>({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  doc:vi.fn(()=>({id:'service-a'})),writeBatch:vi.fn(()=>batch),serverTimestamp:vi.fn(()=> 'server-time'),
}))
describe('Canonical Hub attendance lifecycle contract',()=>{
  it('closes with exactly the lifecycle fields authorized by the shared policy',async()=>{
    await closePresenceSession('org-a',{id:'service-a'} as PresenceSessionRecord,[],'operator-a')
    expect(batch.update).toHaveBeenCalledWith(expect.anything(),{
      status:'closed',closedAt:'server-time',closedBy:'operator-a',
    })
    expect(batch.commit).toHaveBeenCalledOnce()
  })
})
