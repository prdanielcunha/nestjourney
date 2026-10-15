import {useCallback,useEffect,useState} from 'react'
import {CalendarClock,Check,PlusCircle} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {createJourneyEventSeries,listJourneyEventSeries,archiveJourneyEventSeries,
  JOURNEY_EVENT_TYPES,type JourneyEventSeries,type JourneyEventType
} from './journeyEventSeries'
import './EventSeriesPanel.css'

const week:Record<AppLocale,string[][]>={
  'pt-BR':[['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']],
  en:[['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']],
  es:[['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']],
}
const kinds:Record<AppLocale,Record<JourneyEventType,string>>={
  'pt-BR':{general:'Encontro habitual',sunday:'Culto de domingo',midweek:'Culto da semana',youth:'Jovens',special:'Evento especial'},
  en:{general:'Regular gathering',sunday:'Sunday service',midweek:'Midweek service',youth:'Youth',special:'Special event'},
  es:{general:'Encuentro habitual',sunday:'Culto dominical',midweek:'Culto semanal',youth:'Jóvenes',special:'Evento especial'},
}
export function EventSeriesPanel({access,congregationId,locale,canLaunch,onLaunch}:{
  access:JourneyAccessContext;congregationId:string;locale:AppLocale
  canLaunch:boolean;onLaunch:(series:JourneyEventSeries)=>void
}){
  const [items,setItems]=useState<JourneyEventSeries[]>([])
  const [expanded,setExpanded]=useState(false)
  const [title,setTitle]=useState('')
  const [eventTypeId,setEventTypeId]=useState<JourneyEventType>('general')
  const [weekday,setWeekday]=useState(0)
  const [localTime,setLocalTime]=useState('19:00')
  const [timeZone,setTimeZone]=useState('America/Sao_Paulo')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const canManage=canImportJourneyMembers(access)&&access.canManagePresence
  const copy=locale==='en'?{
    title:'Weekly gatherings',intro:'Define regular schedules. A service session opens only when a real operator starts it.',
    create:'Add weekly gathering',name:'Gathering name',type:'Type',weekday:'Day of week',time:'Local start time',zone:'IANA time zone',
    save:'Save schedule',launch:'Open a service session',archive:'Archive schedule',
    confirm:'Archive this schedule? Historic sessions will remain unchanged.',
    empty:'No weekly gathering configured for this campus.',fail:'Could not save or read schedules.',
    success:'Schedule updated.',noAuto:'Schedules do not mark anyone present or absent automatically.',
  }:locale==='es'?{
    title:'Encuentros semanales',intro:'Defina horarios habituales. Solo un operador abre una sesión real.',
    create:'Agregar encuentro semanal',name:'Nombre del encuentro',type:'Tipo',weekday:'Día',time:'Hora local',zone:'Zona horaria IANA',
    save:'Guardar horario',launch:'Abrir sesión del culto',archive:'Archivar horario',
    confirm:'¿Archivar? Las sesiones antiguas permanecen intactas.',
    empty:'No hay encuentros semanales en esta sede.',fail:'No se pudo consultar o guardar.',
    success:'Horario actualizado.',noAuto:'El calendario no registra asistencias ni ausencias automáticamente.',
  }:{
    title:'Cultos e encontros semanais',intro:'Configure a programação recorrente. Uma sessão só é aberta quando alguém iniciar o culto de verdade.',
    create:'Adicionar encontro semanal',name:'Nome do culto ou encontro',type:'Tipo',weekday:'Dia da semana',time:'Horário local',zone:'Fuso horário IANA',
    save:'Salvar programação',launch:'Abrir sessão do culto',archive:'Arquivar programação',
    confirm:'Arquivar esta programação? Sessões antigas continuarão intactas.',
    empty:'Nenhuma programação semanal cadastrada nesta unidade.',fail:'Não foi possível salvar ou consultar a programação.',
    success:'Programação atualizada.',noAuto:'O calendário não registra presença nem ausência automaticamente.',
  }
  const refresh=useCallback(async()=>{
    setItems(await listJourneyEventSeries(access,congregationId))
  },[access,congregationId])
  useEffect(()=>{
    if(!access.canManagePresence||!congregationId){setItems([]);return}
    let alive=true
    void listJourneyEventSeries(access,congregationId).then(rows=>{if(alive)setItems(rows)}).catch(()=>{
      if(alive)setError(copy.fail)
    })
    return()=>{alive=false}
  },[access,congregationId])
  const save=async()=>{
    setBusy(true);setError('');setMessage('')
    try{
      await createJourneyEventSeries({access,congregationId,title,eventTypeId,weekday,localTime,timeZone})
      await refresh();setTitle('');setExpanded(false);setMessage(copy.success)
    }catch(cause){console.error('Weekly series save failed',cause);setError(copy.fail)}
    finally{setBusy(false)}
  }
  const archive=async(item:JourneyEventSeries)=>{
    if(!window.confirm(copy.confirm))return
    setBusy(true);setError('');setMessage('')
    try{await archiveJourneyEventSeries({access,series:item});await refresh();setMessage(copy.success)}
    catch(cause){console.error('Weekly series archive failed',cause);setError(copy.fail)}
    finally{setBusy(false)}
  }
  const active=items.filter(item=>item.status==='active')
  return <section className="event-series-panel">
    <header><CalendarClock size={20}/><div><h2>{copy.title}</h2><p>{copy.intro}</p></div></header>
    {error?<p role="alert" className="event-series-error">{error}</p>:null}
    {message?<p role="status" className="event-series-success"><Check size={14}/>{message}</p>:null}
    {canManage?<button type="button" onClick={()=>setExpanded(v=>!v)} disabled={busy} aria-expanded={expanded}><PlusCircle size={15}/>{copy.create}</button>:null}
    {expanded&&canManage?<form onSubmit={e=>{e.preventDefault();void save()}} className="event-series-form">
      <label>{copy.name}<input required minLength={2} maxLength={90} value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label>{copy.type}<select value={eventTypeId} onChange={e=>setEventTypeId(e.target.value as JourneyEventType)}>{JOURNEY_EVENT_TYPES.map(v=><option key={v} value={v}>{kinds[locale][v]}</option>)}</select></label>
      <label>{copy.weekday}<select value={weekday} onChange={e=>setWeekday(Number(e.target.value))}>{week[locale][0].map((v,i)=><option key={i} value={i}>{v}</option>)}</select></label>
      <label>{copy.time}<input type="time" value={localTime} onChange={e=>setLocalTime(e.target.value)} /></label>
      <label>{copy.zone}<input value={timeZone} maxLength={64} onChange={e=>setTimeZone(e.target.value)}/></label>
      <button type="submit" disabled={busy||title.trim().length<2}>{copy.save}</button>
    </form>:null}
    {active.length?<div className="event-series-list">{active.map(item=><article key={item.id}>
      <div><strong>{item.title}</strong><span>{week[locale][0][item.weekday]} · {item.localTime} · {item.timeZone} · {kinds[locale][item.eventTypeId]}</span></div>
      <div>{canLaunch?<button type="button" disabled={busy} onClick={()=>onLaunch(item)}>{copy.launch}</button>:null}
        {canManage?<button type="button" disabled={busy} onClick={()=>void archive(item)}>{copy.archive}</button>:null}</div>
    </article>)}</div>:<p className="event-series-muted">{copy.empty}</p>}
    <p className="event-series-muted">{copy.noAuto}</p>
  </section>
}
