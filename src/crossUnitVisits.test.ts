import {describe,expect,it} from 'vitest'
import {projectCrossUnitVisits,type CrossUnitVisitFact} from './crossUnitVisits'
const fact=(unit:string,session:string,state:CrossUnitVisitFact['state'],n:number):CrossUnitVisitFact=>({
  congregationId:unit,sessionId:session,state,recordedAt:`2026-10-12T12:${String(n).padStart(2,'0')}:00.000Z`,
})
describe('One canonical person can visit multiple campuses without inferred attendance',()=>{
  it('groups by source session but excludes home services',()=>{
    const result=projectCrossUnitVisits({homeCongregationId:'unit-a',checks:[
      fact('unit-a','home','present_confirmed',0),
      fact('unit-b','guest','present_confirmed',1),
      fact('unit-c','guest','present_confirmed',2),
    ]})
    expect(result).toHaveLength(2)
    expect(result.map(r=>r.congregationId)).toEqual(['unit-c','unit-b'])
  })
  it('revoked/unverified attendance is not shown as a confirmed visit',()=>{
    expect(projectCrossUnitVisits({homeCongregationId:'unit-a',checks:[
      fact('unit-b','one','present_confirmed',1),
      fact('unit-b','one','unverified',2),
    ]})).toEqual([])
  })
})
