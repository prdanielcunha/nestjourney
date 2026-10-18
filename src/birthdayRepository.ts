import {
  collection,doc,getDocs,query,runTransaction,serverTimestamp,where,
} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {validBirthdayDate} from './birthdayCalendar'

export interface PersonBirthdayRecord {
  personId:string
  organizationId:string
  congregationId:string
  month:number
  day:number
  shareWithTeam:boolean
}
export function canManageBirthdays(access:JourneyAccessContext):boolean{
  return canImportJourneyMembers(access)
}
export function canSeeSharedBirthdays(access:JourneyAccessContext):boolean{
  return canManageBirthdays(access)||access.canManagePeople
}
export async function listPersonBirthdays(access:JourneyAccessContext,congregationId:string):Promise<PersonBirthdayRecord[]>{
  if(!db)throw new Error('firebase_not_configured')
  if(!canSeeSharedBirthdays(access))throw new Error('birthday_read_forbidden')
  if(!congregationId||(!access.broadJourneyAccess&&!access.congregationIds.includes(congregationId)))throw new Error('birthday_scope_forbidden')
  const filters=[where('congregationId','==',congregationId)]
  // Firestore security rules are not filters. This predicate is essential for restricted readers.
  if(!canManageBirthdays(access))filters.push(where('shareWithTeam','==',true))
  const snapshot=await getDocs(query(collection(db,journeyCollectionPath(access.organizationId,'personBirthdays')),...filters))
  return snapshot.docs.map(row=>{
    const data=row.data()
    return {
      personId:row.id,organizationId:access.organizationId,congregationId,
      month:Number(data.month),day:Number(data.day),shareWithTeam:data.shareWithTeam===true,
    }
  }).filter(row=>validBirthdayDate(row.month,row.day))
}
/** Admin attests permission to store the birthday and (separately) optionally display it to the team. */
export async function savePersonBirthday(input:{
  access:JourneyAccessContext
  person:JourneyPersonRecord
  month:number
  day:number
  shareWithTeam:boolean
  permissionConfirmed:boolean
}):Promise<void>{
  const {access,person,month,day,shareWithTeam,permissionConfirmed}=input
  if(!canManageBirthdays(access))throw new Error('birthday_admin_forbidden')
  if(access.organizationId!==person.organizationId||(!access.broadJourneyAccess&&!access.congregationIds.includes(person.congregationId)))throw new Error('birthday_scope_forbidden')
  if(!validBirthdayDate(month,day))throw new Error('birthday_date_invalid')
  if(!permissionConfirmed)throw new Error('birthday_permission_required')
  if(!db)throw new Error('firebase_not_configured')
  const personRef=doc(db,journeyCollectionPath(access.organizationId,'people')+'/'+person.id)
  const recordRef=doc(db,journeyCollectionPath(access.organizationId,'personBirthdays')+'/'+person.id)
  const auditRef=doc(collection(db,journeyCollectionPath(access.organizationId,'audit')))
  await runTransaction(db,async transaction=>{
    const [source,prior]=await Promise.all([transaction.get(personRef),transaction.get(recordRef)])
    if(!source.exists()||source.data().organizationId!==access.organizationId||source.data().congregationId!==person.congregationId||source.data().deletedAt)throw new Error('birthday_person_unavailable')
    const before=prior.exists()?prior.data():null
    const unchanged=before?.month===month&&before?.day===day&&before?.shareWithTeam===shareWithTeam
    if(unchanged)return
    const newRecord={
      organizationId:access.organizationId,congregationId:person.congregationId,personId:person.id,
      month,day,shareWithTeam,
      permissionRecordedBy:access.userId,permissionRecordedAt:serverTimestamp(),
      updatedAt:serverTimestamp(),updatedBy:access.userId,lastAuditId:auditRef.id,
      createdAt:before?.createdAt??serverTimestamp(),createdBy:before?.createdBy??access.userId,
    }
    transaction.set(recordRef,newRecord)
    // Privacy: no birth date, age, phone or religious affiliation is written to the audit trail.
    transaction.set(auditRef,{
      organizationId:access.organizationId,congregationId:person.congregationId,
      actorId:access.userId,action:'person.birthday_saved',targetRef:'person:'+person.id,
      shareWithTeamChanged:before?.shareWithTeam!==shareWithTeam,created:!before,
      createdAt:serverTimestamp(),
    })
  })
}
export async function removePersonBirthday(input:{access:JourneyAccessContext;person:JourneyPersonRecord}):Promise<void>{
  const {access,person}=input
  if(!canManageBirthdays(access)||access.organizationId!==person.organizationId||
    (!access.broadJourneyAccess&&!access.congregationIds.includes(person.congregationId)))throw new Error('birthday_remove_forbidden')
  if(!db)throw new Error('firebase_not_configured')
  const ref=doc(db,journeyCollectionPath(access.organizationId,'personBirthdays')+'/'+person.id)
  const auditRef=doc(collection(db,journeyCollectionPath(access.organizationId,'audit')))
  await runTransaction(db,async tx=>{
    const before=await tx.get(ref)
    if(!before.exists())return
    if(before.data().organizationId!==access.organizationId||before.data().congregationId!==person.congregationId)throw new Error('birthday_scope_changed')
    tx.delete(ref)
    tx.set(auditRef,{
      organizationId:access.organizationId,congregationId:person.congregationId,
      actorId:access.userId,action:'person.birthday_removed',targetRef:'person:'+person.id,
      createdAt:serverTimestamp(),
    })
  })
}
