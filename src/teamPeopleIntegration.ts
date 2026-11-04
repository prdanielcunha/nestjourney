import {normalizePersonName} from './memberBulkImport'
import type {DirectoryPerson} from './peopleDirectoryClient'

/** Candidates are suggestions only; identity is always reviewed before registration. */
export function teamPersonCandidates(name:string,people:DirectoryPerson[]):DirectoryPerson[]{
  const key=normalizePersonName(name)
  return people.filter(person=>{
    if(person.archived||person.mergedInto)return false
    const other=normalizePersonName(person.name)
    return key===other||other.startsWith(key+' ')||key.startsWith(other+' ')
  })
}
export type TeamPersonChoice={id:string;name:string;personId:string;distinctReason:string;approved:boolean}
export function approvedTeamPeople(rows:TeamPersonChoice[]){
  const selected=rows.filter(row=>row.approved)
  if(!selected.length||selected.length>75)throw new Error('invalid_team_people_batch')
  if(new Set(selected.map(row=>normalizePersonName(row.name))).size!==selected.length)throw new Error('duplicate_team_names')
  if(new Set(selected.filter(row=>row.personId).map(row=>row.personId)).size!==selected.filter(row=>row.personId).length)throw new Error('duplicate_team_identity')
  return selected.map(row=>({name:row.name,preferredName:'',...(row.personId?{personId:row.personId}:row.distinctReason.trim()?{distinctReason:row.distinctReason.trim()}:{})}))
}
