import {describe,expect,it} from 'vitest'
import {allowedProjectEnrollmentTransition} from './journeyOptionalProjects'
describe('Optional project participation is reversible without inferred status',()=>{
  it('permits documented voluntary departures and requested pauses',()=>{
    expect(allowedProjectEnrollmentTransition('active','completed','left_voluntarily')).toBe(true)
    expect(allowedProjectEnrollmentTransition('active','paused','paused_by_request')).toBe(true)
    expect(allowedProjectEnrollmentTransition('paused','completed','completed')).toBe(true)
  })
  it('does not allow silent or falsely-coded moves',()=>{
    expect(allowedProjectEnrollmentTransition('active','completed','paused_by_request')).toBe(false)
    expect(allowedProjectEnrollmentTransition('completed','paused','corrected_record')).toBe(false)
    expect(allowedProjectEnrollmentTransition('active','active','rejoined')).toBe(false)
  })
  it('permits explicit return while retaining original enrollment',()=>{
    expect(allowedProjectEnrollmentTransition('completed','active','rejoined')).toBe(true)
    expect(allowedProjectEnrollmentTransition('paused','active','rejoined')).toBe(true)
  })
})
