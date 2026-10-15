import {collection,doc,getDocs,query,runTransaction,serverTimestamp,where,writeBatch} from 'firebase/firestore'
import {db} from './firebase'
import {journeyCollectionPath} from './productIdentity'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'

export type JourneyProjectStatus='draft'|'active'|'archived'
export interface JourneyOptionalProject {
  id:string; organizationId:string; name:string; description:string; projectType:string;
  status:JourneyProjectStatus; unitIds:string[]; version:number
}
export interface JourneyProjectEnrollment{
  id:string;projectId:string;personId:string;congregationId:string;
  status:'active'|'paused'|'completed';projectVersion:number;revision?:number
}
function assertAdmin(access:JourneyAccessContext){
  if(!canImportJourneyMembers(access))throw new Error('projects_admin_forbidden')
  if(!db)throw new Error('firebase_not_configured')
  return db
}
export async function listJourneyOptionalProjects(access:JourneyAccessContext):Promise<JourneyOptionalProject[]>{
  const firestore=assertAdmin(access)
  const result=await getDocs(collection(firestore,journeyCollectionPath(access.organizationId,'projects')))
  return result.docs.map(record=>{
    const data=record.data()
    return {
      id:record.id,organizationId:access.organizationId,name:String(data.name||''),
      description:String(data.description||''),projectType:String(data.projectType||'custom'),
      status:data.status==='active'?'active':data.status==='archived'?'archived':'draft',
      unitIds:Array.isArray(data.unitIds)?data.unitIds.filter((v:unknown):v is string=>typeof v==='string'):[],
      version:Number(data.version||1),
    }
  })
}
export async function createJourneyOptionalProject(input:{
  access:JourneyAccessContext;name:string;description:string;unitIds:string[]
}):Promise<string>{
  const firestore=assertAdmin(input.access)
  const name=input.name.trim().replace(/\s+/g,' ')
  const description=input.description.trim()
  const units=[...new Set(input.unitIds)]
  if(name.length<2||name.length>80||description.length>280||units.length<1||units.length>30)
    throw new Error('projects_fields_invalid')
  if(units.some(unit=>!unit||unit.includes('/')))throw new Error('projects_unit_invalid')
  if(!input.access.broadJourneyAccess && units.some(unit=>!input.access.congregationIds.includes(unit)))
    throw new Error('projects_unit_forbidden')
  const root=journeyCollectionPath(input.access.organizationId,'projects')
  const ref=doc(collection(firestore,root))
  const versionRef=doc(firestore,journeyCollectionPath(input.access.organizationId,'projectVersions')+'/'+ref.id+'_v1')
  const batch=writeBatch(firestore)
  batch.set(ref,{
    organizationId:input.access.organizationId,name,description,projectType:'custom',
    unitIds:units,status:'draft',version:1,versionRecordId:versionRef.id,createdAt:serverTimestamp(),
    createdBy:input.access.userId,updatedAt:serverTimestamp(),updatedBy:input.access.userId,
    activatedAt:null,archivedAt:null,
  })
  batch.set(versionRef,{
    organizationId:input.access.organizationId,projectId:ref.id,
    version:1,status:'draft',reason:'project_created',
    recordedAt:serverTimestamp(),recordedBy:input.access.userId,
  })
  await batch.commit()
  return ref.id
}
export async function changeJourneyProjectStatus(input:{
  access:JourneyAccessContext; project:JourneyOptionalProject; status:JourneyProjectStatus
}):Promise<void>{
  const firestore=assertAdmin(input.access)
  const {project,status,access}=input
  if(project.organizationId!==access.organizationId)throw new Error('projects_tenant_mismatch')
  if(status===project.status)return
  if(project.status==='archived'||(project.status!=='draft'&&project.status!=='active'))
    throw new Error('projects_archived_immutable')
  if(status==='draft')throw new Error('projects_status_backwards')
  await runTransaction(firestore,async tx=>{
    const ref=doc(firestore,journeyCollectionPath(access.organizationId,'projects')+'/'+project.id)
    const snap=await tx.get(ref)
    if(!snap.exists()||snap.data().organizationId!==access.organizationId||
       snap.data().version!==project.version||snap.data().status!==project.status)
      throw new Error('projects_stale_refresh')
    const version=project.version+1
    const versionRef=doc(firestore,journeyCollectionPath(access.organizationId,'projectVersions')+'/'+project.id+'_v'+version)
    tx.update(ref,{
      status,version,versionRecordId:versionRef.id,updatedAt:serverTimestamp(),updatedBy:access.userId,
      ...(status==='active'?{activatedAt:serverTimestamp()}:{archivedAt:serverTimestamp()}),
    })
    tx.set(versionRef,{
      organizationId:access.organizationId,projectId:project.id,version,
      status,reason:status==='active'?'project_activated':'project_archived',
      recordedAt:serverTimestamp(),recordedBy:access.userId,
    })
  })
}
export async function listJourneyProjectEnrollments(access:JourneyAccessContext,projectId:string):Promise<JourneyProjectEnrollment[]>{
  const firestore=assertAdmin(access)
  const result=await getDocs(query(collection(firestore,journeyCollectionPath(access.organizationId,'projectEnrollments')),where('projectId','==',projectId)))
  return result.docs.map(d=>{
    const v=d.data()
    return {id:d.id,projectId,personId:String(v.personId||''),congregationId:String(v.congregationId||''),
      status:v.status==='paused'?'paused':v.status==='completed'?'completed':'active',projectVersion:Number(v.projectVersion||1),revision:Number(v.revision||0)}
  })
}
export async function enrollJourneyPersonInProject(input:{
  access:JourneyAccessContext; project:JourneyOptionalProject; person:JourneyPersonRecord
}):Promise<void>{
  const firestore=assertAdmin(input.access)
  const {project,person,access}=input
  if(project.organizationId!==access.organizationId||person.organizationId!==access.organizationId||
     !project.unitIds.includes(person.congregationId)||project.status!=='active')
     throw new Error('project_enrollment_scope')
  const projectRef=doc(firestore,journeyCollectionPath(access.organizationId,'projects')+'/'+project.id)
  const enrollRef=doc(firestore,journeyCollectionPath(access.organizationId,'projectEnrollments')+'/'+project.id+'__'+person.id)
  const personRef=doc(firestore,journeyCollectionPath(access.organizationId,'people')+'/'+person.id)
  await runTransaction(firestore,async tx=>{
    const [currentProject,currentPerson,existing]=await Promise.all([tx.get(projectRef),tx.get(personRef),tx.get(enrollRef)])
    if(!currentProject.exists()||currentProject.data().status!=='active'||currentProject.data().version!==project.version||
       !currentProject.data().unitIds.includes(person.congregationId)||
       !currentPerson.exists()||currentPerson.data().congregationId!==person.congregationId)
       throw new Error('project_enrollment_scope_changed')
    if(existing.exists())throw new Error('project_enrollment_exists')
    tx.set(enrollRef,{
      organizationId:access.organizationId,projectId:project.id,
      personId:person.id,congregationId:person.congregationId,
      projectVersion:project.version,status:'active',enrolledAt:serverTimestamp(),enrolledBy:access.userId,
    })
  })
}

/** Explicit project departure / pause / return: append-only reason-coded event,
 * with the canonical person and previous enrollment kept intact. */
export type ProjectEnrollmentStatus='active'|'paused'|'completed'
export type ProjectEnrollmentReason='left_voluntarily'|'completed'|'paused_by_request'|'rejoined'|'corrected_record'
export function allowedProjectEnrollmentTransition(from:ProjectEnrollmentStatus,to:ProjectEnrollmentStatus,reason:ProjectEnrollmentReason):boolean{
  if(from===to)return false
  if(from==='active'&&to==='paused')return reason==='paused_by_request'||reason==='corrected_record'
  if(from==='active'&&to==='completed')return reason==='left_voluntarily'||reason==='completed'||reason==='corrected_record'
  if(from==='paused'&&to==='completed')return reason==='left_voluntarily'||reason==='completed'||reason==='corrected_record'
  if((from==='paused'||from==='completed')&&to==='active')return reason==='rejoined'||reason==='corrected_record'
  return false
}
export async function changeProjectEnrollmentStatus(input:{
  access:JourneyAccessContext
  enrollment:JourneyProjectEnrollment
  nextStatus:ProjectEnrollmentStatus
  reason:ProjectEnrollmentReason
}):Promise<void>{
  const firestore=assertAdmin(input.access)
  const {access,enrollment,nextStatus,reason}=input
  if(!allowedProjectEnrollmentTransition(enrollment.status,nextStatus,reason))throw new Error('project_enrollment_transition_invalid')
  const ref=doc(firestore,journeyCollectionPath(access.organizationId,'projectEnrollments')+'/'+enrollment.id)
  await runTransaction(firestore,async tx=>{
    const snap=await tx.get(ref)
    if(!snap.exists() || snap.data().organizationId!==access.organizationId ||
       snap.data().status!==enrollment.status ||
       (snap.data().revision??0)!==(enrollment.revision??0) ||
       snap.data().personId!==enrollment.personId || snap.data().projectId!==enrollment.projectId)
      throw new Error('project_enrollment_stale_refresh')
    const revision=(snap.data().revision??0)+1
    const eventRef=doc(firestore,journeyCollectionPath(access.organizationId,'projectEnrollmentEvents')+'/'+enrollment.id+'_v'+revision)
    tx.update(ref,{
      status:nextStatus,revision,lastEventId:eventRef.id,
      statusUpdatedAt:serverTimestamp(),statusUpdatedBy:access.userId,
    })
    tx.set(eventRef,{
      organizationId:access.organizationId,projectId:enrollment.projectId,
      enrollmentId:enrollment.id,personId:enrollment.personId,
      congregationId:enrollment.congregationId,revision,
      fromStatus:enrollment.status,toStatus:nextStatus,reason,
      recordedAt:serverTimestamp(),recordedBy:access.userId,
    })
  })
}
