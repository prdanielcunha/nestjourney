import {describe,it,expect} from 'vitest'
import {birthdayDateInYear,birthdayIcs,googleBirthdayUrl,nextBirthday,upcomingBirthdays,validBirthdayDate} from './birthdayCalendar'
describe('birthdays',()=>{
  it('validates real dates without requiring a year',()=>{
    expect(validBirthdayDate(2,29)).toBe(true)
    expect(validBirthdayDate(4,31)).toBe(false)
    expect(validBirthdayDate(13,1)).toBe(false)
    expect(validBirthdayDate(2,30)).toBe(false)
  })
  it('uses local calendar days and supports Feb 29 predictably',()=>{
    expect(birthdayDateInYear(2,29,2027).toISOString().slice(0,10)).toBe('2027-02-28')
    expect(birthdayDateInYear(2,29,2028).toISOString().slice(0,10)).toBe('2028-02-29')
    expect(nextBirthday(10,18,new Date(2026,9,18)).daysUntil).toBe(0)
    expect(nextBirthday(10,17,new Date(2026,9,18)).date.getUTCFullYear()).toBe(2027)
  })
  it('sorts upcoming, excludes corrupt dates',()=>{
    const result=upcomingBirthdays([
      {personId:'2',name:'Lia',month:10,day:19},
      {personId:'1',name:'Ana',month:10,day:18},
      {personId:'3',name:'Invalid',month:13,day:35}
    ],new Date(2026,9,18))
    expect(result.map(x=>x.personId)).toEqual(['1','2'])
  })
  it('exports private recurring event with escaping and no unrelated sensitive info',()=>{
    const ics=birthdayIcs({personId:'person1',name:'Ana, Oliveira; A',day:18,month:10},new Date(2026,9,18))
    expect(ics).toContain('RRULE:FREQ=YEARLY')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261018')
    expect(ics).toContain('SUMMARY:Aniversário de Ana\\, Oliveira\\; A')
    expect(ics).not.toContain('church')
    expect(ics).toContain('CLASS:PRIVATE')
    expect(googleBirthdayUrl({name:'Ana',day:18,month:10})).toMatch(/^https:\/\/calendar\.google\.com/)
  })
  it('includes non-leap years for Feb 29 exports',()=>{
    const ics=birthdayIcs({personId:'leap',name:'Lia',day:29,month:2},new Date(2028,1,1))
    expect(ics).toContain('DTSTART;VALUE=DATE:20290228')
    expect(ics).toContain('DTSTART;VALUE=DATE:20280229')
  })
})
