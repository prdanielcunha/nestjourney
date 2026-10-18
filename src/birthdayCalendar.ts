/** Pure, timezone-safe helpers. Birthday dates are month/day only; no age is inferred. */
export interface BirthdayDate {
  personId: string
  day: number
  month: number
}
export interface BirthdayOccurrence extends BirthdayDate {
  name: string
  daysUntil: number
  nextDate: Date
}
export function validBirthdayDate(month:number,day:number):boolean {
  return Number.isInteger(month) && Number.isInteger(day) && month>=1 && month<=12 &&
    day>=1 && day<=new Date(Date.UTC(2024,month,0)).getUTCDate()
}
/** Feb 29 is celebrated on Feb 28 in non-leap years (documented calendar policy). */
export function birthdayDateInYear(month:number,day:number,year:number):Date {
  if (!validBirthdayDate(month,day)) throw new Error('birthday_date_invalid')
  const feb29=month===2 && day===29 && new Date(Date.UTC(year,1,29)).getUTCMonth()!==1
  return new Date(Date.UTC(year,month-1,feb29?28:day))
}
export function nextBirthday(month:number,day:number,now=new Date()):{date:Date;daysUntil:number} {
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())
  let date=birthdayDateInYear(month,day,now.getFullYear())
  if(date.getTime()<today)date=birthdayDateInYear(month,day,now.getFullYear()+1)
  return {date,daysUntil:Math.round((date.getTime()-today)/86400000)}
}
export function upcomingBirthdays<T extends BirthdayDate&{name:string}>(rows:T[],now=new Date()):Array<T&BirthdayOccurrence> {
  return rows.filter(p=>validBirthdayDate(p.month,p.day))
    .map(p=>{const n=nextBirthday(p.month,p.day,now);return {...p,nextDate:n.date,daysUntil:n.daysUntil}})
    .sort((a,b)=>a.daysUntil-b.daysUntil||a.name.localeCompare(b.name))
}
const isoDay=(d:Date)=>d.toISOString().slice(0,10).replace(/-/g,'')
const icsEscape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')
const addDay=(d:Date)=>new Date(d.getTime()+86400000)
/** Single-person opt-in local export; never includes phone, church name, affiliation or hidden notes. */
export function birthdayIcs(person:{personId:string;name:string;month:number;day:number},now=new Date()):string {
  const start=nextBirthday(person.month,person.day,now).date
  const next=addDay(start)
  const title=icsEscape('Aniversário de '+person.name)
  const uid=encodeURIComponent(person.personId).replace(/%/g,'')+'@nestjourney.millionsnest.com'
  const rules=['RRULE:FREQ=YEARLY']
  // Native YEARLY skips non-leap years for Feb 29. Add explicit Feb 28 dates for those years.
  if(person.month===2 && person.day===29){
    const extra:string[]=[]
    for(let year=start.getUTCFullYear();year<start.getUTCFullYear()+40;year++){
      const date=birthdayDateInYear(2,29,year)
      if(date.getUTCDate()===28 && date.getTime()!==start.getTime())extra.push(isoDay(date))
    }
    if(extra.length)rules.push('RDATE;VALUE=DATE:'+extra.join(','))
  }
  const parts=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MillionsNest//NestJourney Birthdays//PT-BR',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    'UID:'+uid,'DTSTAMP:'+isoDay(new Date())+'T000000Z',
    'DTSTART;VALUE=DATE:'+isoDay(start),'DTEND;VALUE=DATE:'+isoDay(next),
    ...rules,'SUMMARY:'+title,'CLASS:PRIVATE','TRANSP:TRANSPARENT',
    'DESCRIPTION:Aniversário adicionado individualmente pelo usuário no NestJourney.',
    'BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY','DESCRIPTION:'+title,'END:VALARM',
    'END:VEVENT','END:VCALENDAR',''
  ]
  return parts.join('\r\n')
}
export function googleBirthdayUrl(person:{name:string;month:number;day:number},now=new Date()):string {
  const start=nextBirthday(person.month,person.day,now).date
  const params=new URLSearchParams({
    action:'TEMPLATE',text:'Aniversário de '+person.name,
    dates:isoDay(start)+'/'+isoDay(addDay(start)),
    recur:'RRULE:FREQ=YEARLY',
    details:'Aniversário adicionado individualmente pelo usuário a partir do NestJourney.'
  })
  return 'https://calendar.google.com/calendar/render?'+params.toString()
}
export function downloadBirthdayIcs(person:{personId:string;name:string;month:number;day:number}):void {
  const url=URL.createObjectURL(new Blob([birthdayIcs(person)],{type:'text/calendar;charset=utf-8'}))
  const anchor=document.createElement('a')
  anchor.href=url
  anchor.download='aniversario-'+person.personId.replace(/[^a-zA-Z0-9_-]/g,'')+'.ics'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
