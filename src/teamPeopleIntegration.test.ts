import {describe,it,expect} from 'vitest'
import {approvedTeamPeople,teamPersonCandidates} from './teamPeopleIntegration'
import type {DirectoryPerson} from './peopleDirectoryClient'
const person=(id:string,name:string,extra:Partial<DirectoryPerson>={}):DirectoryPerson=>({id,name,hasAccount:false,unitIds:[],revision:1,...extra})
describe('team participants in people',()=>{
  it('suggests accent and prefix matches without selecting identities or using inactive records',()=>{
    const directory=[person('a','Ána Silva'),person('b','Ana Souza'),person('c','Anabel'),person('d','Ana',{archived:true}),person('e','Ana',{mergedInto:'a'})]
    expect(teamPersonCandidates('Ana',directory).map(p=>p.id)).toEqual(['a','b'])
    expect(teamPersonCandidates('Ana Silva',directory).map(p=>p.id)).toEqual(['a'])
  })
  it('sends only reviewed rows and explicit identity choices, without adding consent or permissions',()=>{
    expect(approvedTeamPeople([
      {id:'signup-1',name:'Person One',personId:'canonical-1',distinctReason:'',approved:true},
      {id:'signup-2',name:'Person Two',personId:'',distinctReason:'',approved:false},
    ])).toEqual([{name:'Person One',preferredName:'',personId:'canonical-1'}])
  })
  it('rejects two signups mapped to the same identity',()=>{
    expect(()=>approvedTeamPeople(['One','Two'].map((name,i)=>({id:String(i),name,personId:'same',distinctReason:'',approved:true})))).toThrow('duplicate_team_identity')
  })
  it('rejects duplicate normalized names and empty approval',()=>{
    expect(()=>approvedTeamPeople([])).toThrow()
    expect(()=>approvedTeamPeople(['Ana','Ána'].map((name,i)=>({id:String(i),name,personId:'',distinctReason:'',approved:true})))).toThrow('duplicate_team_names')
  })
})
