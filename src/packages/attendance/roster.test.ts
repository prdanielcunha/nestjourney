import {describe,expect,it} from 'vitest'
import {buildAttendanceRoster,filterAttendanceRoster,type AttendanceCheck} from './roster'

const session={id:'service-1',organizationId:'org-a',congregationId:'unit-a',eligiblePersonIds:['p1','p2','p3']}
const people=[{id:'p1',name:'João Exemplo',preferredName:'Joca'},{id:'p2',name:'Ana Exemplo'},{id:'p3',name:'Beatriz Exemplo'},{id:'visitor',name:'Visitante Exemplo'}]
const check=(personId:string,state:AttendanceCheck['state'],overrides:Partial<AttendanceCheck>={}):AttendanceCheck=>({id:'check-'+personId,organizationId:'org-a',congregationId:'unit-a',sessionId:'service-1',personId,state,recordedAt:'2026-11-03T12:00:00.000Z',...overrides})

describe('portable attendance roster',()=>{
  it('keeps unchecked people unknown and does not add out-of-roster visitors to absence obligations',()=>{
    const roster=buildAttendanceRoster(people,session,[check('p1','present_confirmed'),check('visitor','present_confirmed')])
    expect(roster.counts).toEqual({all:4,unverified:2,present_confirmed:2,absent_confirmed:0})
    expect(filterAttendanceRoster(roster.rows,'unverified','').map(row=>row.person.id)).toEqual(['p2','p3'])
  })
  it('ignores foreign organization, unit and service evidence, even with matching person ids',()=>{
    const roster=buildAttendanceRoster(people,session,[check('p1','absent_confirmed',{organizationId:'org-b'}),check('p2','absent_confirmed',{congregationId:'unit-b'}),check('p3','absent_confirmed',{sessionId:'other-service'})])
    expect(roster.counts.absent_confirmed).toBe(0)
    expect(roster.counts.unverified).toBe(3)
  })
  it('uses the last correction and restores an unchecked state without deleting evidence',()=>{
    const checks=[check('p1','absent_confirmed'),check('p1','present_confirmed',{id:'correction',recordedAt:'2026-11-03T12:01:00.000Z'}),check('p2','unverified')]
    expect(buildAttendanceRoster(people,session,checks).counts).toEqual({all:4,unverified:2,present_confirmed:1,absent_confirmed:0})
    expect(checks).toHaveLength(3)
  })
  it('finds names without accents, preferred names and multiple terms regardless of order',()=>{
    const roster=buildAttendanceRoster(people,session,[])
    for(const query of ['joao','JÓCA','exemplo joao'])expect(filterAttendanceRoster(roster.rows,'all',query).map(row=>row.person.id)).toEqual(['p1'])
    expect(filterAttendanceRoster(roster.rows,'absent_confirmed','joao')).toEqual([])
  })
  it('does not carry checks into the no-session state or change data when filtering',()=>{
    const roster=buildAttendanceRoster(people,undefined,[check('p1','present_confirmed')])
    expect(roster.counts.present_confirmed).toBe(0)
    expect(roster.counts.unverified).toBe(4)
    filterAttendanceRoster(roster.rows,'all','ana')
    expect(people[0].id).toBe('p1')
  })
})
