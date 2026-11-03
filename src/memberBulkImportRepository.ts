import type {JourneyAccessContext} from './journeyRepository'
import {registerCentralPeople} from './peopleDirectoryClient'
export function canImportJourneyMembers(access:JourneyAccessContext|null):boolean {
  return Boolean(access && (access.isOwner || ['owner','admin','pastor','data_admin'].includes(access.organizationRole) || access.permissions['organization.members.manage']===true))
}
export async function importApprovedJourneyMembers(input:{
  access:JourneyAccessContext
  congregationId:string
  approved:Array<{name:string;preferredName:string;phone?:string}>
  requestId?:string
}):Promise<{created:number;batchId:string}> {
  if(!canImportJourneyMembers(input.access))throw new Error('member_import_permission_denied')
  const result=await registerCentralPeople(input.access.organizationId,input.congregationId,input.requestId||crypto.randomUUID(),input.approved)
  return {created:result.created,batchId:result.batchId}
}
