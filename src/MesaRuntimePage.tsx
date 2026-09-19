import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, ShieldCheck, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import {
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listMesaParticipationRecords,
  listPresencePeople,
  listPresenceSessions,
  loadJourneyAccess,
  setMesaParticipation,
  type JourneyAccessContext,
  type JourneyCongregation,
  type MesaParticipationRecord,
  type PresencePerson,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import './JourneySectionPages.css'

const copy={
  'pt-BR':{
    title:'Mesa Aberta',subtitle:'A Mesa é vínculo, não funil. Organize convidados e registre apenas o que realmente aconteceu.',
    loading:'Preparando a Mesa…',noAccess:'Seu perfil não possui acesso à operação da Mesa.',
    unit:'Unidade',service:'Culto / sessão',noSession:'Ainda não existe uma sessão de culto para esta unidade. A equipe de Presença precisa abrir a sessão antes do registro da Mesa.',
    guests:'Convidados',joined:'Participaram',people:'Pessoas',search:'Buscar pessoa…',invite:'Registrar convite',invited:'Convidado',markJoined:'Registrar participação',participated:'Participou',
    relationship:'Anfitrião de vínculo',relationshipHint:'O primeiro responsável fica associado ao registro para dar continuidade ao vínculo.',
    empty:'Nenhuma pessoa encontrada.',rule:'Registre somente convite ou participação real. O status não mede interesse espiritual, maturidade ou valor da pessoa.',error:'Não foi possível carregar a Mesa.',
  },
  en:{
    title:'Open Table',subtitle:'The Table is relationship, not a funnel. Organize guests and record only what actually happened.',
    loading:'Preparing the Table…',noAccess:'Your profile does not have access to Table operations.',
    unit:'Campus',service:'Service / session',noSession:'There is no service session for this campus yet. The Presence team must open one before Table participation can be recorded.',
    guests:'Invited',joined:'Joined',people:'People',search:'Search person…',invite:'Record invitation',invited:'Invited',markJoined:'Record participation',participated:'Joined',
    relationship:'Relationship host',relationshipHint:'The first responsible person stays associated with the record to support continuity.',
    empty:'No people found.',rule:'Record only a real invitation or participation. Status does not measure spiritual interest, maturity, or personal value.',error:'The Table could not be loaded.',
  },
  es:{
    title:'Mesa Abierta',subtitle:'La Mesa es vínculo, no embudo. Organiza invitados y registra solamente lo que realmente ocurrió.',
    loading:'Preparando la Mesa…',noAccess:'Tu perfil no tiene acceso a la operación de la Mesa.',
    unit:'Sede',service:'Culto / sesión',noSession:'Todavía no existe una sesión de culto para esta sede. El equipo de Presencia debe abrirla antes del registro de la Mesa.',
    guests:'Invitados',joined:'Participaron',people:'Personas',search:'Buscar persona…',invite:'Registrar invitación',invited:'Invitado',markJoined:'Registrar participación',participated:'Participó',
    relationship:'Anfitrión de vínculo',relationshipHint:'La primera persona responsable queda asociada al registro para dar continuidad al vínculo.',
    empty:'No se encontraron personas.',rule:'Registra solamente invitación o participación real. El estado no mide interés espiritual, madurez ni valor de la persona.',error:'No se pudo cargar la Mesa.',
  }
} as const

export default function MesaRuntimePage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const base=copy[locale]
  const {labels}=useJourneyLabels()
  const t={...base,title:labels.table||base.title}
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [sessionId,setSessionId]=useState('')
  const [people,setPeople]=useState<PresencePerson[]>([])
  const [records,setRecords]=useState<MesaParticipationRecord[]>([])
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const loadScope=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextSessions]=await Promise.all([
      listPresencePeople(nextAccess.organizationId,unitId),
      listPresenceSessions(nextAccess.organizationId,unitId),
    ])
    setPeople(nextPeople);setSessions(nextSessions)
    const selected=nextSessions.find(x=>x.status==='open')??nextSessions[0]
    const nextSessionId=selected?.id??''
    setSessionId(nextSessionId)
    setRecords(nextSessionId?await listMesaParticipationRecords(nextAccess.organizationId,unitId,nextSessionId):[])
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      if(!nextAccess.canManageMesa)return
      const units=await listJourneyCongregations(nextAccess);setCongregations(units)
      const unitId=units[0]?.id??'';setCongregationId(unitId)
      if(unitId)await loadScope(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[loadScope,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function changeUnit(unitId:string){
    if(!access)return
    setBusy(true);setCongregationId(unitId);setError('')
    try{await loadScope(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function changeSession(nextSessionId:string){
    if(!access)return
    setBusy(true);setSessionId(nextSessionId);setError('')
    try{setRecords(nextSessionId?await listMesaParticipationRecords(access.organizationId,congregationId,nextSessionId):[])}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function mark(person:PresencePerson,status:'invited'|'joined'){
    if(!access||!sessionId)return
    setBusy(true);setError('')
    try{
      await setMesaParticipation({organizationId:access.organizationId,congregationId,sessionId,personId:person.id,actorId:access.userId,status})
      setRecords(await listMesaParticipationRecords(access.organizationId,congregationId,sessionId))
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  const byPerson=useMemo(()=>new Map(records.map(x=>[x.personId,x])),[records])
  const visible=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(locale)
    return needle?people.filter(p=>p.name.toLocaleLowerCase(locale).includes(needle)):people
  },[people,query,locale])
  const invited=records.filter(x=>x.status==='invited').length
  const joined=records.filter(x=>x.status==='joined').length

  if(loading)return <main className="journey-section-page"><div className="journey-loading">{t.loading}</div></main>
  if(!access?.canManageMesa)return <main className="journey-section-page"><div className="journey-no-access"><ShieldCheck size={32}/><h1>{t.title}</h1><p>{t.noAccess}</p></div></main>

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Mesa</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="journey-error">{error}</div>:null}
    <section className="journey-card-grid">
      <label className="journey-card"><span className="journey-card-icon"><UsersRound size={20}/></span><span className="journey-card-copy"><small>{t.unit}</small><strong>{congregations.find(x=>x.id===congregationId)?.name||'—'}</strong><p>{t.relationshipHint}</p></span><select className="journey-section-select" value={congregationId} disabled={busy} onChange={e=>void changeUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="journey-card"><span className="journey-card-icon"><Clock3 size={20}/></span><span className="journey-card-copy"><small>{t.service}</small><strong>{sessions.find(x=>x.id===sessionId)?.eventName||sessions.find(x=>x.id===sessionId)?.eventRef||'—'}</strong><p>{sessions.find(x=>x.id===sessionId)?.status==='open'?'Open':'History'}</p></span><select className="journey-section-select" value={sessionId} disabled={busy||!sessions.length} onChange={e=>void changeSession(e.target.value)}><option value="">—</option>{sessions.map(x=><option key={x.id} value={x.id}>{x.eventName||x.eventRef}</option>)}</select></label>
    </section>

    <section className="journey-section-block"><div className="journey-stat-grid"><div className="journey-stat"><span>{t.guests}</span><strong>{invited}</strong><small>{t.relationship}</small></div><div className="journey-stat"><span>{t.joined}</span><strong>{joined}</strong><small>{t.participated}</small></div></div></section>

    {!sessionId?<div className="journey-section-note"><ShieldCheck size={18}/><p>{t.noSession}</p></div>:<section className="journey-section-block">
      <header><div><span className="journey-section-kicker">{t.people}</span><h2>{t.people}</h2></div><input className="journey-section-select" value={query} placeholder={t.search} onChange={e=>setQuery(e.target.value)}/></header>
      <div className="journey-list">
        {visible.map(person=>{
          const record=byPerson.get(person.id)
          return <div className="journey-list-row" key={person.id}><div><strong>{person.name}</strong><span>{record?.bondHostRef?t.relationship:' '}</span></div><div className="journey-inline-actions">
            <button className="journey-pill-button" disabled={busy||Boolean(record)} onClick={()=>void mark(person,'invited')}>{record?<><Check size={14}/>{record.status==='joined'?t.participated:t.invited}</>:t.invite}</button>
            <button className="journey-primary-button" disabled={busy||record?.status==='joined'} onClick={()=>void mark(person,'joined')}>{record?.status==='joined'?<><Check size={14}/>{t.participated}</>:t.markJoined}</button>
          </div></div>
        })}
        {!visible.length?<div className="journey-empty">{t.empty}</div>:null}
      </div>
    </section>}
    <div className="journey-section-note"><ShieldCheck size={18}/><p>{t.rule}</p></div>
  </div></main>
}
