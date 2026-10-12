import {collection,doc,getDoc,getDocs,query,runTransaction,serverTimestamp,where} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

export interface JourneyPersonAlias {
  id:string
  organizationId:string
  duplicatePersonId:string
  canonicalPersonId:string
  sourceCongregationId:string
  targetCongregationId:string
  status:'active'|'reverted'
  revision:number
  createdBy:string
}
export function checkHumanPersonLink(input:{
  duplicatePersonId:string;canonicalPersonId:string;reason:string
}):void{
  if(!input.duplicatePersonId||!input.canonicalPersonId||
    input.duplicatePersonId===input.canonicalPersonId||
    [input.duplicatePersonId,input.canonicalPersonId].some(id=>id.includes('/')))
    throw new Error('alias_person_selection_invalid')
  if(input.reason.trim().length<15||input.reason.trim().length>300)
    throw new Error('alias_reason_required')
}
function assertTenantAdmin(access:JourneyAccessContext):void{
  if(!canImportJourneyMembers(access))throw new Error('alias_admin_forbidden')
}
const root=(org:string,collectionId:string)=>journeyCollectionPath(org,collectionId)

/** Logical reconciliation only; does not delete persons, rewrite facts or import consent.
 * Search hints are NEVER evidence of identity. Admin must manually verify identity.
 */
export async function linkJourneyPersonAlias(input:{
  access:JourneyAccessContext
  duplicate:JourneyPersonRecord
  canonical:JourneyPersonRecord
  reason:string
}):Promise<void>{
  assertTenantAdmin(input.access)
  const {access,duplicate,canonical}=input
  checkHumanPersonLink({duplicatePersonId:duplicate.id,canonicalPersonId:canonical.id,reason:input.reason})
  const firestore=db
  if(!firestore)throw new Error('firebase_not_configured')
  if([duplicate,canonical].some(person=>person.organizationId!==access.organizationId))
    throw new Error('alias_tenant_mismatch')
  const aliasRef=doc(firestore,root(access.organizationId,'personAliases')+'/'+duplicate.id)
  const canonicalAliasRef=doc(firestore,root(access.organizationId,'personAliases')+'/'+canonical.id)
  const sourceRef=doc(firestore,root(access.organizationId,'people')+'/'+duplicate.id)
  const targetRef=doc(firestore,root(access.organizationId,'people')+'/'+canonical.id)
  // Prevent obvious alias chains and multiple active alias targets before commit.
  const [inbound,canonicalExisting]=await Promise.all([
    getDocs(query(collection(firestore,root(access.organizationId,'personAliases')),
      where('canonicalPersonId','==',duplicate.id),where('status','==','active'))),
    getDoc(canonicalAliasRef),
  ])
  if(!inbound.empty||(canonicalExisting.exists()&&canonicalExisting.data().status==='active'))
    throw new Error('alias_chain_forbidden')
  await runTransaction(firestore,async tx=>{
    const [source,target,existing,targetAlias]=await Promise.all([
      tx.get(sourceRef),tx.get(targetRef),tx.get(aliasRef),tx.get(canonicalAliasRef),
    ])
    if(!source.exists()||!target.exists()||existing.exists()||
      targetAlias.exists()&&targetAlias.data().status==='active')
      throw new Error('alias_selection_stale')
    if(source.data().organizationId!==access.organizationId||
       target.data().organizationId!==access.organizationId||
       source.data().congregationId!==duplicate.congregationId||
       target.data().congregationId!==canonical.congregationId)
      throw new Error('alias_scopes_changed')
    const eventRef=doc(collection(firestore,root(access.organizationId,'personAliasEvents')))
    tx.set(aliasRef,{
      organizationId:access.organizationId,duplicatePersonId:duplicate.id,
      canonicalPersonId:canonical.id,sourceCongregationId:duplicate.congregationId,
      targetCongregationId:canonical.congregationId,status:'active',revision:1,
      lastEventId:eventRef.id,createdAt:serverTimestamp(),createdBy:access.userId,
      updatedAt:serverTimestamp(),updatedBy:access.userId,
    })
    tx.set(eventRef,{
      organizationId:access.organizationId,aliasId:duplicate.id,
      canonicalPersonId:canonical.id,duplicatePersonId:duplicate.id,
      action:'linked',revision:1,reason:input.reason.trim(),
      recordedAt:serverTimestamp(),recordedBy:access.userId,
    })
  })
}
export async function revertJourneyPersonAlias(input:{
  access:JourneyAccessContext
  alias:JourneyPersonAlias
  reason:string
}):Promise<void>{
  assertTenantAdmin(input.access)
  if(input.alias.organizationId!==input.access.organizationId||
    input.alias.status!=='active'||input.reason.trim().length<15||input.reason.trim().length>300)
    throw new Error('alias_reversal_invalid')
  const firestore=db
  if(!firestore)throw new Error('firebase_not_configured')
  const ref=doc(firestore,root(input.access.organizationId,'personAliases')+'/'+input.alias.id)
  await runTransaction(firestore,async tx=>{
    const old=await tx.get(ref)
    if(!old.exists()||old.data().status!=='active'||old.data().revision!==input.alias.revision||
      old.data().canonicalPersonId!==input.alias.canonicalPersonId)
      throw new Error('alias_reversal_stale')
    const eventRef=doc(collection(firestore,root(input.access.organizationId,'personAliasEvents')))
    const revision=input.alias.revision+1
    tx.update(ref,{
      status:'reverted',revision,lastEventId:eventRef.id,
      updatedAt:serverTimestamp(),updatedBy:input.access.userId,
    })
    tx.set(eventRef,{
      organizationId:input.access.organizationId,aliasId:input.alias.id,
      duplicatePersonId:input.alias.duplicatePersonId,
      canonicalPersonId:input.alias.canonicalPersonId,
      action:'reverted',revision,reason:input.reason.trim(),
      recordedAt:serverTimestamp(),recordedBy:input.access.userId,
    })
  })
}
export async function getJourneyPersonAlias(access:JourneyAccessContext,personId:string):Promise<JourneyPersonAlias|null>{
  assertTenantAdmin(access)
  const firestore=db
  if(!firestore)throw new Error('firebase_not_configured')
  const snap=await getDoc(doc(firestore,root(access.organizationId,'personAliases')+'/'+personId))
  if(!snap.exists())return null
  const v=snap.data()
  return {id:snap.id,organizationId:access.organizationId,
    duplicatePersonId:String(v.duplicatePersonId||''),
    canonicalPersonId:String(v.canonicalPersonId||''),
    sourceCongregationId:String(v.sourceCongregationId||''),
    targetCongregationId:String(v.targetCongregationId||''),
    status:v.status==='reverted'?'reverted':'active',
    revision:Number(v.revision||1),createdBy:String(v.createdBy||'')}
}
export async function listJourneyPersonInboundAliases(access:JourneyAccessContext,canonicalId:string):Promise<JourneyPersonAlias[]>{
  assertTenantAdmin(access)
  const firestore=db
  if(!firestore)throw new Error('firebase_not_configured')
  const snap=await getDocs(query(collection(firestore,root(access.organizationId,'personAliases')),
    where('canonicalPersonId','==',canonicalId),where('status','==','active')))
  return snap.docs.map(r=>({...r.data(),id:r.id}) as JourneyPersonAlias)
}
