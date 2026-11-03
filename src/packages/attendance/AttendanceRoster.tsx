import {useMemo, useState, type ReactNode} from 'react'
import {Check, Search, Undo2, UsersRound, X} from 'lucide-react'
import {buildAttendanceRoster, filterAttendanceRoster, type AttendanceCheck, type AttendanceFilter, type AttendancePerson, type AttendanceScope, type AttendanceState} from './roster'
import './AttendanceRoster.css'

import {attendanceCopy} from './copy'

export function AttendanceAvatar({person}: {person: AttendancePerson}) {
  const [failed, setFailed] = useState(false)
  return <span className="attendance-avatar">{person.photoUrl && !failed ? <img src={person.photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : person.name.split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span>
}

/** Host supplies authorized data and mutations. This component never reads or stores church data. */
export function AttendanceRoster<T extends AttendancePerson>({people, session, checks, locale, editable, busy, online, onMark, renderDetails, profileHref}: {
  people:T[]; session?:AttendanceScope; checks:AttendanceCheck[]; locale:keyof typeof attendanceCopy
  editable:boolean; busy:boolean; online:boolean; onMark:(person:T, state:AttendanceState)=>void
  renderDetails?:(person:T)=>ReactNode; profileHref?:(person:T)=>string
}) {
  const t = attendanceCopy[locale]
  const [query,setQuery] = useState('')
  const [filter,setFilter] = useState<AttendanceFilter>('all')
  const [limit,setLimit] = useState(60)
  const roster = useMemo(()=>buildAttendanceRoster(people,session,checks),[people,session,checks])
  const visible = useMemo(()=>filterAttendanceRoster(roster.rows,filter,query),[roster,filter,query])
  return <section className="attendance-roster" aria-labelledby="attendance-title" id="presence-people">
    <header className="attendance-heading"><div><span><UsersRound size={17}/>{t.title}</span><h2 id="attendance-title">{roster.counts.present_confirmed} {(roster.counts.present_confirmed===1?t.present:t.present_confirmed).toLocaleLowerCase(locale)}</h2></div><p>{t.hint}</p></header>
    <div className="attendance-controls">
      <div className="attendance-filters" role="group" aria-label={t.title}>{(['all','unverified','present_confirmed','absent_confirmed'] as const).map(key=><button key={key} type="button" className={'attendance-filter '+key} aria-pressed={filter===key} onClick={()=>{setFilter(key);setLimit(60)}}><span>{t[key]}</span><strong>{roster.counts[key]}</strong></button>)}</div>
      <label className="attendance-search"><Search size={19}/><span className="attendance-sr-only">{t.search}</span><input type="search" value={query} placeholder={t.search} onChange={e=>{setQuery(e.target.value);setLimit(60)}}/>{query?<button type="button" aria-label={t.clear} onClick={()=>setQuery('')}><X size={18}/></button>:null}</label>
    </div>
    {!editable?<p className="attendance-notice">{session?t.closed:t.start}</p>:null}
    <p className="attendance-result" role="status">{visible.length} {t.shown}{busy?' · '+t.saved:''}</p>
    <div className="attendance-list" aria-busy={busy}>
      {visible.slice(0,limit).map(({person,state,eligible})=><article className={'attendance-person '+state} key={person.id}>
        <div className="attendance-identity"><AttendanceAvatar key={person.id+':'+person.photoUrl} person={person}/><div><h3>{person.preferredName||person.name}</h3>{person.preferredName&&person.preferredName!==person.name?<small>{person.name}</small>:null}<span className={'attendance-state '+state}>{state==='present_confirmed'?<Check size={14}/>:state==='absent_confirmed'?<X size={14}/>:null}{state==='present_confirmed'?t.present:state==='absent_confirmed'?t.absent:eligible?t.pending:t.outside}</span></div></div>
        <div className="attendance-mark-actions" role="group" aria-label={person.name}>
          <button type="button" className={'attendance-mark present '+(state==='present_confirmed'?'selected':'')} aria-label={t.present+': '+person.name} aria-pressed={state==='present_confirmed'} disabled={busy||!online||!editable||state==='present_confirmed'} onClick={()=>onMark(person,'present_confirmed')}><Check size={18}/>{t.present}</button>
          <button type="button" className={'attendance-mark absent '+(state==='absent_confirmed'?'selected':'')} aria-label={t.absent+': '+person.name} aria-pressed={state==='absent_confirmed'} disabled={busy||!online||!editable||!eligible||state==='absent_confirmed'} onClick={()=>onMark(person,'absent_confirmed')}><X size={18}/>{t.absent}</button>
          {state!=='unverified'&&editable?<button type="button" className="attendance-undo" aria-label={t.undo+': '+person.name} disabled={busy||!online} onClick={()=>onMark(person,'unverified')}><Undo2 size={16}/>{t.undo}</button>:null}
        </div>
        {(renderDetails||profileHref)?<details className="attendance-details"><summary>{t.details}</summary>{profileHref?<a href={profileHref(person)}>{t.profile}</a>:null}{renderDetails?.(person)}</details>:null}
      </article>)}
    </div>
    {!visible.length?<div className="attendance-empty"><UsersRound size={28}/><p>{people.length?t.empty:t.noPeople}</p>{people.length?<button type="button" onClick={()=>{setQuery('');setFilter('all')}}>{t.clear}</button>:null}</div>:null}
    {visible.length>limit?<button type="button" className="attendance-more" onClick={()=>setLimit(n=>n+60)}>{t.more} · {Math.min(limit,visible.length)}/{visible.length}</button>:null}
  </section>
}
