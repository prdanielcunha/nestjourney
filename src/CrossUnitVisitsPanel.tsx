import {useState} from 'react'
import {MapPin,ShieldCheck} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyCongregation,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {loadCrossUnitVisits,type CrossUnitVisitFact} from './crossUnitVisits'
import './CrossUnitVisitsPanel.css'
export function CrossUnitVisitsPanel({access,person,units,locale}:{
  access:JourneyAccessContext
  person:JourneyPersonRecord
  units:JourneyCongregation[]
  locale:AppLocale
}){
  const [opened,setOpened]=useState(false)
  const [busy,setBusy]=useState(false)
  const [partial,setPartial]=useState(false)
  const [visits,setVisits]=useState<CrossUnitVisitFact[]>([])
  const [error,setError]=useState('')
  if(!canImportJourneyMembers(access)||!access.canManagePresence)return null
  const copy=locale==='en'?{
    title:'Visits to other campuses',intro:'Verified attendance stays linked to this person’s original ID and home campus.',
    open:'Review recorded visits',loading:'Checking evidence…',
    empty:'No visit found in the recent verified evidence.',limit:'A limited recent sample: older records may not appear.',
    error:'Could not read other-campus visit records.',confirmed:'Presence verified',
    footer:'No visit is inferred from absence, group membership or unverified sessions.',
  }:locale==='es'?{
    title:'Visitas a otras sedes',intro:'Las visitas confirmadas utilizan el mismo ID y conservan la sede principal.',
    open:'Consultar visitas',loading:'Consultando evidencias…',
    empty:'No hay visitas en los registros recientes.',limit:'Muestra reciente limitada: pueden faltar datos antiguos.',
    error:'No se pudieron leer visitas de otras sedes.',confirmed:'Presencia verificada',
    footer:'No se infieren visitas por faltas ni por asistencia no verificada.',
  }:{
    title:'Visitas em outras unidades',intro:'Presenças confirmadas permanecem vinculadas ao mesmo ID e à unidade principal da pessoa.',
    open:'Consultar visitas registradas',loading:'Conferindo evidências…',
    empty:'Nenhuma visita localizada nos registros recentes.',limit:'Recorte recente limitado: registros mais antigos podem não aparecer.',
    error:'Não foi possível consultar as visitas em outras unidades.',confirmed:'Presença confirmada',
    footer:'Nenhuma visita é deduzida de faltas, grupos ou sessões não verificadas.',
  }
  const load=async()=>{
    setBusy(true);setError('');setOpened(true)
    try{
      const data=await loadCrossUnitVisits({access,homeCongregationId:person.congregationId,personId:person.id})
      setVisits(data.visits);setPartial(data.partial)
    }catch(cause){console.error('Cross-campus visit history unavailable',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  return <section className="cross-visits-panel">
    <header><MapPin size={19}/><div><h2>{copy.title}</h2><p>{copy.intro}</p></div></header>
    <button type="button" disabled={busy} onClick={()=>void load()}>{busy?copy.loading:copy.open}</button>
    {error?<p role="alert" className="cross-visits-error">{error}</p>:null}
    {opened&&!busy&&!error?<div className="cross-visits-results">
      {visits.length?visits.map(item=><article key={item.congregationId+':'+item.sessionId}>
        <strong>{units.find(unit=>unit.id===item.congregationId)?.name||item.congregationId}</strong>
        <span>{copy.confirmed} · {item.recordedAt?new Date(item.recordedAt).toLocaleString(locale):'—'}</span>
      </article>):<p>{copy.empty}</p>}
      {partial?<p>{copy.limit}</p>:null}
    </div>:null}
    <p className="cross-visits-note"><ShieldCheck size={14}/>{copy.footer}</p>
  </section>
}
