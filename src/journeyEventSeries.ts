import {collection,doc,getDocs,query,serverTimestamp,setDoc,updateDoc,where} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

export const JOURNEY_EVENT_TYPES=['general','sunday','midweek','youth','special'] as const
export type JourneyEventType=typeof JOURNEY_EVENT_TYPES[number]
export interface JourneyEventSeries{
  id:string;organizationId:string;congregationId:string;title:string
  eventTypeId:JourneyEventType;weekday:number;localTime:string;timeZone:string
  status:'active'|'archived'
}
export function isValidJourneyEventTime(value:string):boolean{
  if(!/^[0-2][0-9]:[0-5][0-9]$/.test(value))return false
  return Number(value.slice(0,2))<=23
}
export function isValidJourneyTimeZone(value:string):boolean{
  if(value.length<2||value.length>64||!(/^[A-Za-z_]+(?:\/[A-Za-z_]+)*$/.test(value)))return false
  try{new Intl.DateTimeFormat('en',{timeZone:value});return true}catch{return false}
}
export function validateJourneyEventSeries(input:Omit<JourneyEventSeries,'id'|'organizationId'|'status'>):void{
  if(input.title.trim().length<2||input.title.trim().length>90)throw new Error('event_series_title_invalid')
  if(!JOURNEY_EVENT_TYPES.includes(input.eventTypeId))throw new Error('event_series_type_invalid')
  if(!Number.isInteger(input.weekday)||input.weekday<0||input.weekday>6)throw new Error('event_series_weekday_invalid')
  if(!isValidJourneyEventTime(input.localTime)||!isValidJourneyTimeZone(input.timeZone))throw new Error('event_series_time_invalid')
  if(!input.congregationId||input.congregationId.includes('/'))throw new Error('event_series_unit_invalid')
}
export async function listJourneyEventSeries(access:JourneyAccessContext,congregationId:string):Promise<JourneyEventSeries[]>{
  if(!access.canManagePresence)throw new Error('event_series_read_forbidden')
  if(!access.broadJourneyAccess&&!access.congregationIds.includes(congregationId))throw new Error('event_series_unit_forbidden')
  if(!db)throw new Error('firebase_not_configured')
  const snap=await getDocs(query(collection(db,journeyCollectionPath(access.organizationId,'eventSeries')),where('congregationId','==',congregationId)))
  return snap.docs.map(record=>{
    const d=record.data()
    return{id:record.id,organizationId:access.organizationId,congregationId,
      title:String(d.title||''),
      eventTypeId:JOURNEY_EVENT_TYPES.includes(d.eventTypeId)?d.eventTypeId:'general',
      weekday:typeof d.weekday==='number'?d.weekday:0,
      localTime:String(d.localTime||''),timeZone:String(d.timeZone||''),
      status:d.status==='archived'?'archived':'active',
    } as JourneyEventSeries
  }).sort((a,b)=>a.weekday-b.weekday||a.localTime.localeCompare(b.localTime))
}
export async function createJourneyEventSeries(input:{
  access:JourneyAccessContext;congregationId:string;title:string;eventTypeId:JourneyEventType
  weekday:number;localTime:string;timeZone:string
}):Promise<string>{
  if(!canImportJourneyMembers(input.access)||!input.access.canManagePresence)throw new Error('event_series_write_forbidden')
  if(!input.access.broadJourneyAccess&&!input.access.congregationIds.includes(input.congregationId))throw new Error('event_series_unit_forbidden')
  validateJourneyEventSeries(input)
  if(!db)throw new Error('firebase_not_configured')
  const ref=doc(collection(db,journeyCollectionPath(input.access.organizationId,'eventSeries')))
  await setDoc(ref,{
    organizationId:input.access.organizationId,congregationId:input.congregationId,title:input.title.trim(),
    eventTypeId:input.eventTypeId,weekday:input.weekday,localTime:input.localTime,timeZone:input.timeZone,
    status:'active',createdAt:serverTimestamp(),createdBy:input.access.userId,archivedAt:null,archivedBy:'',
  })
  return ref.id
}
export async function archiveJourneyEventSeries(input:{access:JourneyAccessContext;series:JourneyEventSeries}):Promise<void>{
  if(!canImportJourneyMembers(input.access)||input.series.organizationId!==input.access.organizationId||input.series.status!=='active')
    throw new Error('event_series_archive_forbidden')
  if(!db)throw new Error('firebase_not_configured')
  await updateDoc(doc(db,journeyCollectionPath(input.access.organizationId,'eventSeries')+'/'+input.series.id),{
    status:'archived',archivedAt:serverTimestamp(),archivedBy:input.access.userId,
  })
}
