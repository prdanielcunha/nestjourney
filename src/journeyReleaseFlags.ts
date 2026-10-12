import {doc,getDoc,serverTimestamp,setDoc} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

/** Rollout flags are UX deployment gates, NOT a replacement for Firestore authorization. */
export const ROLLOUT_KEYS=['memberBulkImport','personProfileEdit','familyLinks','verifiedFrequency','optionalProjects','crossUnitPresence','eventSeries'] as const
export type JourneyRolloutKey=typeof ROLLOUT_KEYS[number]
export type JourneyRolloutFlags=Record<JourneyRolloutKey,boolean>
export const DEFAULT_JOURNEY_ROLLOUT_FLAGS:JourneyRolloutFlags={
  memberBulkImport:false,personProfileEdit:false,familyLinks:false,
  verifiedFrequency:false,optionalProjects:false,crossUnitPresence:false,eventSeries:false,
}
export function normalizeJourneyRolloutFlags(value:unknown):JourneyRolloutFlags{
  const obj=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
  return Object.fromEntries(ROLLOUT_KEYS.map(key=>[key,obj[key]===true])) as JourneyRolloutFlags
}
export async function loadJourneyRolloutFlags(access:JourneyAccessContext):Promise<JourneyRolloutFlags>{
  if(!db)return {...DEFAULT_JOURNEY_ROLLOUT_FLAGS}
  const snapshot=await getDoc(doc(db,journeyCollectionPath(access.organizationId,'settings')+'/releaseFlags'))
  return snapshot.exists()?normalizeJourneyRolloutFlags(snapshot.data().flags):{...DEFAULT_JOURNEY_ROLLOUT_FLAGS}
}
export async function saveJourneyRolloutFlags(access:JourneyAccessContext,flags:JourneyRolloutFlags){
  if(!canImportJourneyMembers(access))throw new Error('rollout_admin_required')
  if(!db)throw new Error('firebase_not_configured')
  const sanitized=normalizeJourneyRolloutFlags(flags)
  const ref=doc(db,journeyCollectionPath(access.organizationId,'settings')+'/releaseFlags')
  await setDoc(ref,{
    organizationId:access.organizationId,flags:sanitized,
    updatedAt:serverTimestamp(),updatedBy:access.userId,
  })
  return sanitized
}
