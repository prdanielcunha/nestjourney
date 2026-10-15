import {collection,getDocs,limit,orderBy,query,where} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

export interface CrossUnitVisitFact {
  sessionId:string
  congregationId:string
  recordedAt:string
  state:'present_confirmed'|'unverified'
}
function iso(value:unknown):string{
  if(value && typeof value==='object' && 'toDate' in value && typeof value.toDate==='function'){
    return (value.toDate as ()=>Date)().toISOString()
  }
  return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():''
}
export function projectCrossUnitVisits(input:{
  homeCongregationId:string
  checks:ReadonlyArray<CrossUnitVisitFact>
}):CrossUnitVisitFact[]{
  const last=new Map<string,CrossUnitVisitFact>()
  for(const check of [...input.checks].sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt))){
    if(check.congregationId===input.homeCongregationId)continue
    last.set(check.congregationId+':'+check.sessionId,check)
  }
  return [...last.values()].filter(check=>check.state==='present_confirmed')
    .sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))
}
export async function loadCrossUnitVisits(input:{
  access:JourneyAccessContext
  homeCongregationId:string
  personId:string
}):Promise<{visits:CrossUnitVisitFact[],partial:boolean}>{
  if(!canImportJourneyMembers(input.access)||!input.access.canManagePresence)
    throw new Error('visits_admin_forbidden')
  if(!db)throw new Error('firebase_not_configured')
  const result=await getDocs(query(
    collection(db,journeyCollectionPath(input.access.organizationId,'presenceChecks')),
    where('personId','==',input.personId),orderBy('recordedAt','desc'),limit(101),
  ))
  const checks:CrossUnitVisitFact[]=result.docs.slice(0,100).map(doc=>{
    const v=doc.data()
    return {sessionId:String(v.sessionId||''),congregationId:String(v.congregationId||''),
      recordedAt:iso(v.recordedAt),
      state:v.state==='present_confirmed'?'present_confirmed':'unverified' as const}
  })
  return {visits:projectCrossUnitVisits({homeCongregationId:input.homeCongregationId,checks}),partial:result.docs.length>100}
}
