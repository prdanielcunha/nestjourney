import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarClock, Check, CheckCircle2, CirclePause, RefreshCcw, ShieldCheck, UserCheck, UsersRound } from 'lucide-react'
import { auth } from './firebase'
import {
  assignImplementationPhaseOwner,
  confirmImplementationAttendance,
  getActiveJourneyOrganizationId,
  listImplementationCycles,
  listImplementationEvents,
  listJourneyCongregations,
  listJourneyOrganizationMembers,
  loadActiveJourneyPlaybook,
  loadJourneyAccess,
  recordImplementationDecision,
  resolveActiveJourneyCongregationId,
  scheduleImplementationPhase,
  setActiveJourneyCongregationId,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyImplementationCycle,
  type JourneyImplementationDecision,
  type JourneyImplementationEvent,
  type JourneyOrganizationMember,
} from './journeyRepository'
import { IMPLEMENTATION_PREPARATION_KEYS, implementationWeekKeys } from './implementationPlaybook'
import { JOURNEY_PLAYBOOK_DEFAULT_ID, implementationKeysForPhases, type JourneyImplementationPhaseDefinition, type JourneyPlaybookDefinition } from './playbookEngine'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { AccessDeniedState } from './AccessDeniedState'
import { GuidedEmptyState } from './GuidedEmptyState'
import './JourneyRuntimePages.css'

const copy={
  'pt-BR':{
    title:'Controle da implantação',subtitle:'Agenda, responsáveis, presença do treinamento, prontidão e decisão humana para cada fase.',
    back:'Voltar à implantação',loading:'Carregando controle…',unit:'Unidade',phase:'Fase',owner:'Responsável',schedule:'Agenda',
    attendance:'Presença no treinamento',readiness:'Prontidão',checklist:'Checklist',decision:'Decisão da liderança',
    chooseOwner:'Escolha o responsável',assign:'Definir responsável',chooseMember:'Escolha participante',confirmAttendance:'Confirmar presença',
    saveSchedule:'Salvar agenda',advance:'Avançar',repeat:'Repetir fase',pause:'Frear / pausar',pending:'Ainda sem decisão',
    ready:'Pronto para decisão',notReady:'Ainda há itens de prontidão',scheduled:'Agendado',notScheduled:'Sem agenda',
    noCycle:'Inicie primeiro um ciclo de implantação.',noPhase:'O playbook ativo não possui fases de implantação.',
    principle:'A decisão continua humana. O NestJourney mostra fatos de execução; não decide se a igreja está espiritualmente “pronta”.',
    error:'Não foi possível concluir a operação.',done:'concluídos',people:'participantes confirmados',
  },
  en:{
    title:'Implementation control',subtitle:'Schedule, ownership, training attendance, readiness, and a human decision for each phase.',
    back:'Back to implementation',loading:'Loading control…',unit:'Campus',phase:'Phase',owner:'Owner',schedule:'Schedule',
    attendance:'Training attendance',readiness:'Readiness',checklist:'Checklist',decision:'Leadership decision',
    chooseOwner:'Choose owner',assign:'Assign owner',chooseMember:'Choose participant',confirmAttendance:'Confirm attendance',
    saveSchedule:'Save schedule',advance:'Advance',repeat:'Repeat phase',pause:'Pause',pending:'No decision yet',
    ready:'Ready for a decision',notReady:'Readiness items remain',scheduled:'Scheduled',notScheduled:'Not scheduled',
    noCycle:'Start an implementation cycle first.',noPhase:'The active playbook has no implementation phases.',
    principle:'The decision remains human. NestJourney shows execution facts; it does not decide whether a church is spiritually “ready”.',
    error:'The operation could not be completed.',done:'completed',people:'confirmed participants',
  },
  es:{
    title:'Control de implementación',subtitle:'Agenda, responsables, asistencia al entrenamiento, preparación y decisión humana por fase.',
    back:'Volver a implementación',loading:'Cargando control…',unit:'Sede',phase:'Fase',owner:'Responsable',schedule:'Agenda',
    attendance:'Asistencia al entrenamiento',readiness:'Preparación',checklist:'Checklist',decision:'Decisión del liderazgo',
    chooseOwner:'Elige responsable',assign:'Definir responsable',chooseMember:'Elige participante',confirmAttendance:'Confirmar asistencia',
    saveSchedule:'Guardar agenda',advance:'Avanzar',repeat:'Repetir fase',pause:'Frenar / pausar',pending:'Aún sin decisión',
    ready:'Listo para decidir',notReady:'Aún faltan elementos de preparación',scheduled:'Agendado',notScheduled:'Sin agenda',
    noCycle:'Primero inicia un ciclo de implementación.',noPhase:'El playbook activo no tiene fases de implementación.',
    principle:'La decisión sigue siendo humana. NestJourney muestra hechos de ejecución; no decide si la iglesia está espiritualmente “lista”.',
    error:'No se pudo completar la operación.',done:'concluidos',people:'participantes confirmados',
  },
} as const

function phaseKeys(playbookId:string,phase:JourneyImplementationPhaseDefinition){
  if(playbookId===JOURNEY_PLAYBOOK_DEFAULT_ID){
    if(phase.id==='preparation')return IMPLEMENTATION_PREPARATION_KEYS
    const match=phase.id.match(/^week-(\d+)$/)
    if(match)return implementationWeekKeys(Number(match[1]))
  }
  return implementationKeysForPhases([phase])
}

function latest(events:JourneyImplementationEvent[],type:JourneyImplementationEvent['eventType']){
  return [...events].reverse().find(event=>event.eventType===type)
}

export default function ImplementationControlPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [unitId,setUnitId]=useState('')
  const [cycles,setCycles]=useState<JourneyImplementationCycle[]>([])
  const [playbook,setPlaybook]=useState<JourneyPlaybookDefinition|null>(null)
  const [members,setMembers]=useState<JourneyOrganizationMember[]>([])
  const [events,setEvents]=useState<JourneyImplementationEvent[]>([])
  const [phaseId,setPhaseId]=useState('')
  const [ownerId,setOwnerId]=useState('')
  const [attendeeId,setAttendeeId]=useState('')
  const [scheduledFor,setScheduledFor]=useState('')
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')

  const cycle=useMemo(()=>cycles.find(item=>item.status==='active')??cycles[0],[cycles])
  const phases=playbook?.implementationPhases??[]
  const phase=phases.find(item=>item.id===phaseId)??phases[0]
  const phaseEvents=useMemo(()=>events.filter(event=>event.phaseId===phase?.id),[events,phase])
  const ownerEvent=latest(phaseEvents,'owner_assigned')
  const scheduleEvent=latest(phaseEvents,'scheduled')
  const decisionEvent=latest(phaseEvents,'decision')
  const attendance=useMemo(()=>new Map(phaseEvents.filter(event=>event.eventType==='attendance_confirmed'&&event.memberId).map(event=>[event.memberId!,event])),[phaseEvents])
  const requiredKeys=phase&&cycle?phaseKeys(cycle.playbookId,phase):[]
  const completedCount=cycle?requiredKeys.filter(key=>cycle.completedKeys.includes(key)).length:0
  const checklistReady=requiredKeys.length>0&&completedCount===requiredKeys.length
  const readinessChecks=[Boolean(ownerEvent),Boolean(scheduleEvent),attendance.size>0,checklistReady]
  const readinessScore=readinessChecks.filter(Boolean).length
  const ready=readinessScore===readinessChecks.length

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,nextUnit:string)=>{
    const [nextCycles,nextPlaybook,nextMembers]=await Promise.all([
      listImplementationCycles(nextAccess.organizationId,nextUnit),
      loadActiveJourneyPlaybook(nextAccess),
      listJourneyOrganizationMembers(nextAccess),
    ])
    setCycles(nextCycles);setPlaybook(nextPlaybook);setMembers(nextMembers)
    const nextCycle=nextCycles.find(item=>item.status==='active')??nextCycles[0]
    if(nextCycle)setEvents(await listImplementationEvents(nextAccess.organizationId,nextUnit,nextCycle.id))
    else setEvents([])
    setPhaseId(current=>nextPlaybook.implementationPhases.some(item=>item.id===current)?current:nextPlaybook.implementationPhases[0]?.id??'')
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const next=await loadJourneyAccess(user.uid,organizationId);setAccess(next)
      if(!next.canManageImplementation)return
      const nextUnits=await listJourneyCongregations(next);setUnits(nextUnits)
      const nextUnit=resolveActiveJourneyCongregationId(next.organizationId,nextUnits);setUnitId(nextUnit)
      if(nextUnit)await refresh(next,nextUnit)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])
  useEffect(()=>{
    if(!access||!unitId||!access.canManageImplementation)return
    return subscribeJourneyLiveChanges({
      organizationId:access.organizationId,congregationId:unitId,
      collections:['implementationCycles','implementationEvents'],
      onChange:()=>void refresh(access,unitId),
      onError:cause=>console.error('Implementation control live sync failed',cause),
    })
  },[access,unitId,refresh])

  async function run(action:()=>Promise<unknown>){
    if(!access)return
    setBusy(true);setError('')
    try{await action();await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }
  async function selectUnit(nextUnit:string){
    if(!access)return
    setUnitId(nextUnit);setActiveJourneyCongregationId(access.organizationId,nextUnit)
    await run(()=>refresh(access,nextUnit))
  }

  if(loading)return <main className="journey-runtime"><div className="runtime-loading">{t.loading}</div></main>
  if(!access?.canManageImplementation)return <main className="journey-runtime"><AccessDeniedState locale={locale} title={t.title} body={t.principle} retryLabel={t.back} onRetry={()=>window.location.assign('/implementation-runtime')}/></main>

  return <main className="journey-runtime"><div className="runtime-shell">
    <header className="runtime-topbar"><div className="runtime-brand"><img src="/brand/nestjourney-symbol-light.png" alt=""/><span><strong>NestJourney</strong><small>Journey & Care Engine</small></span></div><div className="runtime-actions"><a href="/implementation-runtime"><ArrowLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="runtime-hero"><div><span className="runtime-kicker">Journey / Implementation Control</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></section>
    {error?<div className="runtime-error" role="alert">{error}</div>:null}
    <section className="runtime-panel runtime-rule"><ShieldCheck size={16}/><p>{t.principle}</p></section>

    {units.length>1?<section className="journey-area-toolbar"><label><span>{t.unit}</span><select value={unitId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{units.map(unit=><option value={unit.id} key={unit.id}>{unit.name}{unit.city?' · '+unit.city:''}</option>)}</select></label></section>:null}

    {!cycle?<section className="runtime-panel"><GuidedEmptyState icon={CalendarClock} title={t.noCycle} body={t.subtitle} primary={{label:t.back,href:'/implementation-runtime'}}/></section>:!phase?<section className="runtime-panel"><GuidedEmptyState icon={CalendarClock} title={t.noPhase} body={playbook?.description??t.noPhase} primary={{label:t.back,href:'/implementation-runtime'}}/></section>:<>
      <section className="journey-area-toolbar"><label><span>{t.phase}</span><select value={phase.id} onChange={e=>setPhaseId(e.target.value)}>{phases.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label></section>

      <section className="runtime-grid">
        <article className="runtime-panel runtime-card">
          <div className="runtime-card-head"><span className="runtime-icon"><UserCheck size={18}/></span><div><h2>{t.owner}</h2><p>{ownerEvent?.memberName||ownerEvent?.memberId||t.chooseOwner}</p></div></div>
          <div className="runtime-form"><label><span>{t.owner}</span><select value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">{t.chooseOwner}</option>{members.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
          <div className="runtime-card-actions"><button className="runtime-button primary" disabled={busy||!ownerId} onClick={()=>{const member=members.find(item=>item.id===ownerId);if(member)void run(()=>assignImplementationPhaseOwner({cycle,actorId:access.userId,phaseId:phase.id,memberId:member.id,memberName:member.name}))}}><Check size={16}/>{t.assign}</button></div>
        </article>

        <article className="runtime-panel runtime-card">
          <div className="runtime-card-head"><span className="runtime-icon"><CalendarClock size={18}/></span><div><h2>{t.schedule}</h2><p>{scheduleEvent?.scheduledFor?new Date(scheduleEvent.scheduledFor).toLocaleString(locale):t.notScheduled}</p></div></div>
          <div className="runtime-form"><label><span>{t.schedule}</span><input type="datetime-local" value={scheduledFor} onChange={e=>setScheduledFor(e.target.value)}/></label></div>
          <div className="runtime-card-actions"><button className="runtime-button primary" disabled={busy||!scheduledFor} onClick={()=>void run(()=>scheduleImplementationPhase({cycle,actorId:access.userId,phaseId:phase.id,scheduledFor:new Date(scheduledFor)}))}><CalendarClock size={16}/>{t.saveSchedule}</button></div>
        </article>

        <article className="runtime-panel runtime-card">
          <div className="runtime-card-head"><span className="runtime-icon"><UsersRound size={18}/></span><div><h2>{t.attendance}</h2><p>{attendance.size} {t.people}</p></div></div>
          <div className="runtime-form"><label><span>{t.attendance}</span><select value={attendeeId} onChange={e=>setAttendeeId(e.target.value)}><option value="">{t.chooseMember}</option>{members.filter(member=>!attendance.has(member.id)).map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
          <div className="runtime-card-actions"><button className="runtime-button primary" disabled={busy||!attendeeId} onClick={()=>{const member=members.find(item=>item.id===attendeeId);if(member)void run(()=>confirmImplementationAttendance({cycle,actorId:access.userId,phaseId:phase.id,memberId:member.id,memberName:member.name}))}}><UserCheck size={16}/>{t.confirmAttendance}</button></div>
        </article>

        <article className="runtime-panel runtime-card">
          <div className="runtime-card-head"><span className="runtime-icon"><CheckCircle2 size={18}/></span><div><h2>{t.readiness}</h2><p>{ready?t.ready:t.notReady}</p></div><span className={'runtime-badge '+(ready?'':'attention')}>{readinessScore}/4</span></div>
          <div className="runtime-meta-grid">
            <div><small>{t.owner}</small><strong>{ownerEvent?'✓':'—'}</strong></div>
            <div><small>{t.schedule}</small><strong>{scheduleEvent?'✓':'—'}</strong></div>
            <div><small>{t.attendance}</small><strong>{attendance.size?'✓':'—'}</strong></div>
            <div><small>{t.checklist}</small><strong>{completedCount}/{requiredKeys.length}</strong></div>
          </div>
        </article>

        <article className="runtime-panel runtime-card wide">
          <div className="runtime-card-head"><span className="runtime-icon">{decisionEvent?.decision==='pause'?<CirclePause size={18}/>:decisionEvent?.decision==='repeat'?<RefreshCcw size={18}/>:<CheckCircle2 size={18}/>}</span><div><h2>{t.decision}</h2><p>{decisionEvent?.decision==='advance'?t.advance:decisionEvent?.decision==='repeat'?t.repeat:decisionEvent?.decision==='pause'?t.pause:t.pending}</p></div></div>
          <div className="runtime-card-actions">
            {([['advance',t.advance,CheckCircle2],['repeat',t.repeat,RefreshCcw],['pause',t.pause,CirclePause]] as const).map(([decision,label,Icon])=><button key={decision} className={'runtime-button '+(decision==='advance'?'primary':'')} disabled={busy} onClick={()=>void run(()=>recordImplementationDecision({cycle,actorId:access.userId,phaseId:phase.id,decision:decision as JourneyImplementationDecision}))}><Icon size={16}/>{label}</button>)}
          </div>
        </article>
      </section>
    </>}
  </div></main>
}
