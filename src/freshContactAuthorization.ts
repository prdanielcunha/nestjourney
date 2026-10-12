import {doc,getDoc} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext} from './journeyRepository'

/** Recheck at the moment a human requests the Connect handoff.
 * This is only a UI fail-safe. Connect itself MUST independently check permission at send/retry. */
export function canOpenAuthorizedContact(person:{
  consent?:unknown;phone?:unknown;preferredContactChannel?:unknown;
  consentRevokedAt?:unknown;contactStatus?:unknown
}):person is typeof person & {phone:string;preferredContactChannel:'whatsapp'|'phone'}{
  return person.consent===true
    && typeof person.phone==='string' && person.phone.trim().length>=8
    && ['phone','whatsapp'].includes(String(person.preferredContactChannel||''))
    && (person.consentRevokedAt===null || person.consentRevokedAt===undefined)
    && person.contactStatus!=='closed'
}
export async function assertFreshJourneyContactAuthorized(input:{
  access:JourneyAccessContext
  congregationId:string
  personId:string
}):Promise<'phone'|'whatsapp'>{
  const {access,congregationId,personId}=input
  if(!access.canManageCare)throw new Error('contact_access_denied')
  if(!access.broadJourneyAccess && !access.congregationIds.includes(congregationId))throw new Error('contact_unit_denied')
  if(!db)throw new Error('firebase_not_configured')
  const record=await getDoc(doc(db,journeyCollectionPath(access.organizationId,'people')+'/'+personId))
  if(!record.exists() || record.data().congregationId!==congregationId ||
      record.data().organizationId!==access.organizationId ||
      !canOpenAuthorizedContact(record.data()))throw new Error('contact_not_authorized')
  return record.data().preferredContactChannel as 'phone'|'whatsapp'
}
