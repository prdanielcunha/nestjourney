import {useCallback,useEffect,useMemo,useState} from 'react'
import {CalendarRange,RotateCcw,ShieldCheck} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {
  listPersonAvailabilityEvents,reportPersonAvailability,withdrawPersonAvailability,
  validatePersonAvailabilityRange,type PersonAvailabilityKind,type PersonAvailabilityEvent,
} from './personAvailability'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import './PersonAvailabilityPanel.css'
const kinds:Record<AppLocale,Record<PersonAvailabilityKind,string>>={
  'pt-BR':{travel:'Viagem informada pela pessoa',requested_pause:'Pausa solicitada pela pessoa',other:'Indisponibilidade informada'},
  en:{travel:'Travel reported by person',requested_pause:'Person-requested pause',other:'Reported unavailability'},
  es:{travel:'Viaje informado por la persona',requested_pause:'Pausa solicitada por la persona',other:'Indisponibilidad informada'},
}
export function PersonAvailabilityPanel({access,person,locale}:{
  access:JourneyAccessContext;person:JourneyPersonRecord;locale:AppLocale
}){
  const [events,setEvents]=useState<PersonAvailabilityEvent[]>([])
  const [kind,setKind]=useState<PersonAvailabilityKind>('travel')
  const [startsOn,setStartsOn]=useState('')
  const [endsOn,setEndsOn]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const allowed=canImportJourneyMembers(access)
  const copy=locale==='en'?{
    title:'Reported travel and pauses',intro:'Voluntary administrative information. Does not change service attendance, absence or the meaning of a missed check.',
    kind:'Type reported',from:'Start date',until:'End date',save:'Record information',withdraw:'Withdraw incorrect or cancelled report',
    confirm:'Confirm this report is no longer applicable? The history will remain.',
    empty:'No current or future reports on this record.',error:'Unable to record this report. Check dates and permissions.',
    done:'Information saved with immutable history.',note:'Do not write pastoral notes here; no attendance or contact action is created.',
  }:locale==='es'?{
    title:'Viajes y pausas informadas',intro:'Información administrativa voluntaria. No cambia presencias, faltas ni verificaciones.',
    kind:'Situación informada',from:'Inicio',until:'Fin',save:'Registrar',withdraw:'Anular información incorrecta o cancelada',
    confirm:'¿Confirma anular esta información? Se conserva el historial.',
    empty:'No hay informes activos o próximos.',error:'No se pudo guardar. Revise fechas y permisos.',
    done:'Información registrada con historial inmutable.',note:'No incluya notas pastorales; esto no crea presencias ni contactos.',
  }:{
    title:'Viagens e pausas informadas',intro:'Informação administrativa declarada pela pessoa. Não muda presença, ausência ou a situação de cultos não verificados.',
    kind:'Situação informada',from:'Data inicial',until:'Data final',save:'Registrar informação',withdraw:'Desfazer informação incorreta ou cancelada',
    confirm:'Confirma que esta informação deixou de valer? O histórico será preservado.',
    empty:'Nenhuma informação vigente ou futura registrada.',error:'Não foi possível registrar. Confira datas e permissões.',
    done:'Informação registrada com histórico imutável.',note:'Não inclua anotações pastorais aqui. O registro não cria presença, falta ou contato automático.',
  }
  const refresh=useCallback(async()=>setEvents(await listPersonAvailabilityEvents(access,person)),[access,person])
  useEffect(()=>{
    if(!allowed)return
    let active=true
    void listPersonAvailabilityEvents(access,person)
      .then(rows=>{if(active)setEvents(rows)})
      .catch(cause=>{console.error('Person availability lookup rejected',cause);if(active)setError(copy.error)})
    return()=>{active=false}
  },[access,person.id,allowed])
  const reports=useMemo(()=>{
    const withdrawn=new Set(events.filter(e=>e.action==='withdrawn').map(e=>e.sourceEventId))
    return events.filter(e=>e.action==='reported'&&!withdrawn.has(e.id)).sort((a,b)=>b.startsOn.localeCompare(a.startsOn))
  },[events])
  if(!allowed)return null
  const save=async()=>{
    if(!validatePersonAvailabilityRange(startsOn,endsOn)||busy)return
    setBusy(true);setError('');setFeedback('')
    try{
      await reportPersonAvailability({access,person,kind,startsOn,endsOn})
      await refresh();setStartsOn('');setEndsOn('');setFeedback(copy.done)
    }catch(cause){console.error('Person availability report failed',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  const withdraw=async(event:PersonAvailabilityEvent)=>{
    if(!window.confirm(copy.confirm))return
    setBusy(true);setError('');setFeedback('')
    try{await withdrawPersonAvailability({access,person,source:event});await refresh();setFeedback(copy.done)}
    catch(cause){console.error('Person availability correction failed',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  return <section className="person-availability-panel">
    <header><CalendarRange size={20}/><div><h2>{copy.title}</h2><p>{copy.intro}</p></div></header>
    {error?<p role="alert" className="person-availability-error">{error}</p>:null}
    {feedback?<p role="status" className="person-availability-success">{feedback}</p>:null}
    <div className="person-availability-fields">
      <label>{copy.kind}<select value={kind} disabled={busy} onChange={e=>setKind(e.target.value as PersonAvailabilityKind)}>{Object.entries(kinds[locale]).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
      <label>{copy.from}<input type="date" value={startsOn} disabled={busy} onChange={e=>setStartsOn(e.target.value)}/></label>
      <label>{copy.until}<input type="date" value={endsOn} disabled={busy} min={startsOn} onChange={e=>setEndsOn(e.target.value)}/></label>
      <button type="button" disabled={busy||!validatePersonAvailabilityRange(startsOn,endsOn)} onClick={()=>void save()}>{copy.save}</button>
    </div>
    <div className="person-availability-rows">{reports.length?reports.map(event=><article key={event.id}><div><strong>{kinds[locale][event.kind]}</strong><span>{event.startsOn} — {event.endsOn}</span></div>
      <button type="button" disabled={busy} onClick={()=>void withdraw(event)}><RotateCcw size={15}/>{copy.withdraw}</button>
    </article>):<p>{copy.empty}</p>}</div>
    <p className="person-availability-note"><ShieldCheck size={15}/>{copy.note}</p>
  </section>
}
