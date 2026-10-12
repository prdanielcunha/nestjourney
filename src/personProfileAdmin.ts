import {collection,doc,runTransaction,serverTimestamp} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

export const COMMUNITY_STATUSES=['not_informed','visitor','regular','member','former_member'] as const
export type CommunityStatus=typeof COMMUNITY_STATUSES[number]
export function normalizeCommunityStatus(value:string):CommunityStatus {
  return (COMMUNITY_STATUSES as readonly string[]).includes(value)?value as CommunityStatus:'not_informed'
}
/** Every sensitive community-status change is an explicit administrative statement.
 * Names, contacts, parental links and consent are purposefully NOT editable here. */
export async function saveAdministrativePersonProfile(input:{
  access:JourneyAccessContext
  person:JourneyPersonRecord
  preferredName:string
  communityStatus:CommunityStatus
}):Promise<void>{
  const {access,person}=input
  if(!canImportJourneyMembers(access))throw new Error('profile_admin_forbidden')
  if(!access.broadJourneyAccess && !access.congregationIds.includes(person.congregationId))
    throw new Error('profile_scope_forbidden')
  if(access.organizationId!==person.organizationId)throw new Error('profile_tenant_mismatch')
  const preferredName=input.preferredName.trim().replace(/\s+/g,' ')
  if(preferredName.length>120 || /[\x00-\x1f<>]/.test(preferredName))throw new Error('profile_invalid_name')
  if(!(COMMUNITY_STATUSES as readonly string[]).includes(input.communityStatus))throw new Error('profile_invalid_status')
  if(!db)throw new Error('firebase_not_configured')
  const profileRef=doc(db,journeyCollectionPath(access.organizationId,'people')+'/'+person.id)
  const auditRef=doc(collection(db,journeyCollectionPath(access.organizationId,'audit')))
  await runTransaction(db,async tx=>{
    const snapshot=await tx.get(profileRef)
    if(!snapshot.exists())throw new Error('profile_missing')
    const current=snapshot.data()
    if(current.organizationId!==access.organizationId||current.congregationId!==person.congregationId)throw new Error('profile_scope_changed')
    const revision=typeof current.profileRevision==='number'?current.profileRevision:0
    if(revision!==(person.profileRevision??0))throw new Error('profile_stale_refresh')
    const oldStatus=normalizeCommunityStatus(String(current.communityStatus||'not_informed'))
    const oldPreferred=String(current.preferredName||'')
    if(oldStatus===input.communityStatus && oldPreferred===preferredName)return
    tx.update(profileRef,{
      preferredName,communityStatus:input.communityStatus,profileRevision:revision+1,
      profileUpdatedAt:serverTimestamp(),profileUpdatedBy:access.userId,profileAuditId:auditRef.id,
    })
    tx.set(auditRef,{
      organizationId:access.organizationId,congregationId:person.congregationId,
      actorId:access.userId,action:'person.profile_updated',targetRef:'person:'+person.id,
      createdAt:serverTimestamp(),oldStatus,newStatus:input.communityStatus,
      preferredNameChanged:oldPreferred!==preferredName,
    })
  })
}
