import {useEffect,useMemo,useState} from 'react'
import {CalendarDays,Gift,ArrowRight,Copy} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canSeeSharedBirthdays,listPersonBirthdays,type PersonBirthdayRecord} from './birthdayRepository'
import {upcomingBirthdays} from './birthdayCalendar'
import './BirthdayTodayStrip.css'

const strings={
  'pt-BR':{title:'Pessoas para celebrar',today:'Hoje',soon:'Próximos 7 dias',all:'Abrir calendário',copy:'Copiar felicitação',copied:'Mensagem copiada',message:(name:string)=>`Feliz aniversário, ${name}! Que Deus abençoe sua vida e que este novo ciclo seja cheio de paz, esperança e boas histórias. Receba nosso carinho!`},
  en:{title:'People to celebrate',today:'Today',soon:'Next 7 days',all:'Open calendar',copy:'Copy greeting',copied:'Greeting copied',message:(name:string)=>`Happy birthday, ${name}! Wishing you peace, joy and a wonderful new year of life.`},
  es:{title:'Personas para celebrar',today:'Hoy',soon:'Próximos 7 días',all:'Abrir calendario',copy:'Copiar saludo',copied:'Saludo copiado',message:(name:string)=>`¡Feliz cumpleaños, ${name}! Que este nuevo año esté lleno de paz, esperanza y momentos hermosos.`},
}
export function BirthdayTodayStrip({access,congregationId,people,locale}:{
  access:JourneyAccessContext|null
  congregationId:string
  people:JourneyPersonRecord[]
  locale:AppLocale
}){
  const [dates,setDates]=useState<PersonBirthdayRecord[]>([])
  const [copied,setCopied]=useState('')
  const allowed=Boolean(access&&canSeeSharedBirthdays(access))
  useEffect(()=>{
    if(!access||!congregationId||!canSeeSharedBirthdays(access)){return}
    let current=true
    void listPersonBirthdays(access,congregationId)
      .then(result=>{if(current)setDates(result)})
      .catch(()=>{if(current)setDates([])})
    return()=>{current=false}
  },[access,congregationId])
  const upcoming=useMemo(()=>upcomingBirthdays(dates.map(record=>{
    const person=people.find(p=>p.id===record.personId)
    return {...record,name:person?.preferredName||person?.name||''}
  }).filter(record=>record.name)).filter(item=>item.daysUntil<=7),[dates,people])
  if(!allowed||!upcoming.length)return null
  const copy=strings[locale]
  const today=upcoming.filter(p=>p.daysUntil===0)
  return <section className="birthday-today-strip" aria-label={copy.title}>
    <div className="birthday-today-intro">
      <span className="birthday-today-kicker"><Gift size={15}/>{copy.today}: {today.length}</span>
      <h2>{copy.title}</h2>
      <p>{copy.soon}: {upcoming.length}</p>
      <a href="/birthdays">{copy.all}<ArrowRight size={15}/></a>
    </div>
    <div className="birthday-today-list">
      {upcoming.slice(0,4).map(person=><article key={person.personId}>
        <span className="birthday-today-icon"><CalendarDays size={16}/></span>
        <div><strong>{person.name}</strong><small>{person.daysUntil===0?copy.today:new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',timeZone:'UTC'}).format(person.nextDate)}</small></div>
        {person.daysUntil===0?<button title={copied===person.personId?copy.copied:copy.copy} aria-label={copy.copy+' — '+person.name} onClick={()=>{
          void navigator.clipboard?.writeText(copy.message(person.name)).then(()=>setCopied(person.personId))
        }}><Copy size={16}/></button>:null}
      </article>)}
    </div>
  </section>
}
