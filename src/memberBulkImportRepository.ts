import {collection,doc,getDocs,serverTimestamp,writeBatch} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext} from './journeyRepository'
import {normalizePersonName} from './memberBulkImport'

export function canImportJourneyMembers(access:JourneyAccessContext|null):boolean {
  // CEO view-as must never turn a global SaaS privilege into church-data access.
  return Boolean(access && (access.isOwner || ['owner','admin','pastor','data_admin'].includes(access.organizationRole)))
}
export async function importApprovedJourneyMembers(input:{
  access:JourneyAccessContext
  congregationId:string
  approved:Array<{name:string;preferredName:string}>
}):Promise<{created:number;batchId:string}> {
  const {access,congregationId,approved}=input
  if(!canImportJourneyMembers(access))throw new Error('member_import_permission_denied')
  if(!congregationId || (!access.broadJourneyAccess && !access.congregationIds.includes(congregationId)))
    throw new Error('member_import_scope_denied')
  if(!approved.length || approved.length>75)throw new Error('member_import_size_invalid')
  if(!db)throw new Error('firebase_not_configured')
  const normalized=approved.map(row=>{
    const name=row.name.trim().replace(/\s+/g,' ')
    const preferredName=row.preferredName.trim().replace(/\s+/g,' ')
    if(name.length<2 || name.length>160 || preferredName.length>120 || /[\x00-\x1f<>]/.test(name+preferredName))
      throw new Error('member_import_invalid_person')
    return {name,preferredName,key:normalizePersonName(name)}
  })
  if(new Set(normalized.map(item=>item.key)).size!==normalized.length)throw new Error('member_import_duplicate_rows')
  const peopleRef=collection(db,journeyCollectionPath(access.organizationId,'people'))
  const before=await getDocs(peopleRef)
  const existing=new Set(before.docs.map(item=>normalizePersonName(String(item.data().name||''))))
  if(normalized.some(item=>existing.has(item.key)))throw new Error('member_import_duplicate_existing')
  const batchRef=doc(collection(db,journeyCollectionPath(access.organizationId,'audit')))
  const batch=writeBatch(db)
  for(const row of normalized){
    const ref=doc(peopleRef)
    batch.set(ref,{
      organizationId:access.organizationId,congregationId,name:row.name,preferredName:row.preferredName,
      communityStatus:'member',consent:false,phone:'',preferredContactChannel:'',
      visits:0,stage:'new',createdAt:serverTimestamp(),createdBy:access.userId,
      dataSource:'manual_member_import',importBatchId:batchRef.id,
    })
  }
  batch.set(batchRef,{
    organizationId:access.organizationId,congregationId,actorId:access.userId,
    action:'people.bulk_import',targetRef:'peopleImport:'+batchRef.id,
    createdAt:serverTimestamp(),count:normalized.length,
    // Do not copy names, contacts or sensitive fields into administrative audit.
  })
  await batch.commit()
  return {created:normalized.length,batchId:batchRef.id}
}
