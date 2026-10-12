import {describe,expect,it} from 'vitest'
import {DEFAULT_JOURNEY_ROLLOUT_FLAGS,normalizeJourneyRolloutFlags,ROLLOUT_KEYS} from './journeyReleaseFlags'
describe('Tenant feature flags are opt-in rather than implicit ministry activation',()=>{
  it('disables all new modules by default',()=>{
    expect(Object.values(DEFAULT_JOURNEY_ROLLOUT_FLAGS).every(value=>value===false)).toBe(true)
    expect(ROLLOUT_KEYS).toHaveLength(5)
  })
  it('reads only strict booleans and ignores injected fields',()=>{
    expect(normalizeJourneyRolloutFlags({memberBulkImport:true,familyLinks:'true',bad:true})).toEqual({
      memberBulkImport:true,personProfileEdit:false,familyLinks:false,
      verifiedFrequency:false,optionalProjects:false,
    })
  })
})
