import {describe,expect,it} from 'vitest'
import {isValidJourneyEventTime,isValidJourneyTimeZone,validateJourneyEventSeries} from './journeyEventSeries'
describe('Explicit weekly gathering schedules without fabricated presence',()=>{
  it('validates local hours and timezones',()=>{
    expect(isValidJourneyEventTime('20:00')).toBe(true)
    expect(isValidJourneyEventTime('24:00')).toBe(false)
    expect(isValidJourneyEventTime('08:61')).toBe(false)
    expect(isValidJourneyTimeZone('America/Sao_Paulo')).toBe(true)
    expect(isValidJourneyTimeZone('invalid/city')).toBe(false)
  })
  it('rejects invalid weekdays and types before a Firestore write',()=>{
    const series={congregationId:'unit-a',title:'Culto de domingo',eventTypeId:'sunday' as const,
      weekday:0,localTime:'19:00',timeZone:'America/Sao_Paulo'}
    expect(()=>validateJourneyEventSeries(series)).not.toThrow()
    expect(()=>validateJourneyEventSeries({...series,weekday:7})).toThrow()
    expect(()=>validateJourneyEventSeries({...series,localTime:'36:00'})).toThrow()
  })
})
