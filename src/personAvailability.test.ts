import {describe,expect,it} from 'vitest'
import {isValidIsoDay,validatePersonAvailabilityRange,activePersonAvailability,type PersonAvailabilityEvent} from './personAvailability'
const make=(id:string,action:PersonAvailabilityEvent['action'],sourceEventId=''):PersonAvailabilityEvent=>({
  id,organizationId:'org-a',congregationId:'unit-a',personId:'p1',
  action,kind:'travel',startsOn:'2026-10-12',endsOn:'2026-10-18',
  sourceEventId,recordedAt:'2026-10-12T15:00:00.000Z',recordedBy:'admin',
})
describe('Person-reported travel is not a presence or an inferred absence',()=>{
  it('validates real calendar days and date range',()=>{
    expect(isValidIsoDay('2026-02-29')).toBe(false)
    expect(isValidIsoDay('2024-02-29')).toBe(true)
    expect(validatePersonAvailabilityRange('2026-10-12','2026-10-18')).toBe(true)
    expect(validatePersonAvailabilityRange('2026-10-18','2026-10-12')).toBe(false)
    expect(validatePersonAvailabilityRange('2026-01-01','2028-01-01')).toBe(false)
  })
  it('withdrawals end the context without rewriting original human evidence',()=>{
    expect(activePersonAvailability([make('report','reported')],'2026-10-13')).toHaveLength(1)
    const records=[make('report','reported'),make('correction','withdrawn','report')]
    expect(activePersonAvailability(records,'2026-10-13')).toEqual([])
    expect(records[0].action).toBe('reported')
  })
  it('does not consider future or expired ranges currently active',()=>{
    expect(activePersonAvailability([make('report','reported')],'2026-10-11')).toEqual([])
    expect(activePersonAvailability([make('report','reported')],'2026-10-19')).toEqual([])
  })
})
