import {collection,doc,getDocs,query,serverTimestamp,setDoc,where} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

export type PersonAvailabilityKind='travel'|'requested_pause'|'other'
export type PersonAvailabilityAction='reported'|'withdrawn'
export interface PersonAvailabilityEvent{
  id:string;organizationId:string;congregationId:string;personId:string;
  action:PersonAvailabilityAction;kind:PersonAvailabilityKind
  startsOn:string;endsOn:string;sourceEventId:string
  recordedAt:string;recordedBy:string
}
export function isValidIsoDay(day:string):boolean{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return false
  const date=new Date(day+'T12:00:00Z')
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===day
}
export function validatePersonAvailabilityRange(startsOn:string,endsOn:string):boolean{
  return isValidIsoDay(startsOn)&&isValidIsoDay(endsOn)
    && startsOn<=endsOn
    && (Date.parse(endsOn+'T00:00:00Z')-Date.parse(startsOn+'T00:00:00Z'))<=366*86400000
}
export function activePersonAvailability(events:PersonAvailabilityEvent[],today:string):PersonAvailabilityEvent[]{
  const reportEvents=events.filter(e=>e.action==='reported')
  const withdrawn=new Set(events.filter(e=>e.action==='withdrawn').map(e=>e.sourceEventId))
  return reportEvents.filter(e=>!withdrawn.has(e.id)&&e.startsOn<=today&&e.endsOn>=today)
    .sort((a,b)=>a.startsOn.localeCompare(b.startsOn))
}
function checkAdmin(access:JourneyAccessContext,person:JourneyPersonRecord):void{
  if(!canImportJourneyMembers(access)||person.organizationId!==access.organizationId)
    throw new Error('availability_admin_forbidden')
  if(!access.broadJourneyAccess&&!access.congregationIds.includes(person.congregationId))
    throw new Error('availability_unit_forbidden')
}
export async function listPersonAvailabilityEvents(access:JourneyAccessContext,person:JourneyPersonRecord):Promise<PersonAvailabilityEvent[]>{
  checkAdmin(access,person)
  if(!db)throw new Error('firebase_not_configured')
  const snap=await getDocs(query(collection(db,journeyCollectionPath(access.organizationId,'personAvailabilityEvents')),
    where('personId','==',person.id)))
  return snap.docs.map((d):PersonAvailabilityEvent=>{
    const v=d.data()
    return{id:d.id,organizationId:access.organizationId,congregationId:String(v.congregationId||''),
      personId:person.id,action:v.action==='withdrawn'?'withdrawn':'reported',
      kind:v.kind==='travel'?'travel':v.kind==='requested_pause'?'requested_pause':'other',
      startsOn:String(v.startsOn||''),endsOn:String(v.endsOn||''),
      sourceEventId:String(v.sourceEventId||''),
      recordedAt:v.recordedAt?.toDate?.().toISOString?.()||'',
      recordedBy:String(v.recordedBy||'')}
  }).filter(e=>e.congregationId===person.congregationId)
}
export async function reportPersonAvailability(input:{
  access:JourneyAccessContext;person:JourneyPersonRecord
  kind:PersonAvailabilityKind;startsOn:string;endsOn:string
}):Promise<string>{
  const {access,person,kind,startsOn,endsOn}=input
  checkAdmin(access,person)
  if(!['travel','requested_pause','other'].includes(kind)||!validatePersonAvailabilityRange(startsOn,endsOn))
    throw new Error('availability_range_invalid')
  if(!db)throw new Error('firebase_not_configured')
  const ref=doc(collection(db,journeyCollectionPath(access.organizationId,'personAvailabilityEvents')))
  await setDoc(ref,{
    organizationId:access.organizationId,congregationId:person.congregationId,personId:person.id,
    action:'reported',kind,startsOn,endsOn,sourceEventId:'',
    recordedAt:serverTimestamp(),recordedBy:access.userId,
  })
  return ref.id
}
export async function withdrawPersonAvailability(input:{
  access:JourneyAccessContext;person:JourneyPersonRecord;source:PersonAvailabilityEvent
}):Promise<void>{
  const {access,person,source}=input
  checkAdmin(access,person)
  if(source.action!=='reported'||source.personId!==person.id||
    source.organizationId!==access.organizationId||source.congregationId!==person.congregationId)
    throw new Error('availability_source_invalid')
  if(!db)throw new Error('firebase_not_configured')
  const ref=doc(collection(db,journeyCollectionPath(access.organizationId,'personAvailabilityEvents')))
  await setDoc(ref,{
    organizationId:access.organizationId,congregationId:person.congregationId,personId:person.id,
    action:'withdrawn',kind:source.kind,startsOn:source.startsOn,endsOn:source.endsOn,
    sourceEventId:source.id,recordedAt:serverTimestamp(),recordedBy:access.userId,
  })
}
