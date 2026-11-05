import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ChevronLeft, HeartHandshake, UserCheck, UsersRound, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useModalDialog } from './useModalDialog'
import { auth } from './firebase'
import {DirectoryPersonPicker} from './PeopleDirectoryPanel'
import {PeopleDirectoryError,type DirectorySelection} from './peopleDirectoryClient'
import { withTimeout } from './asyncGuard'
import { calculatePresenceCoverage, confirmedAbsencePersonIds, type PresenceCheck, type PresenceVerificationState } from './intelligence'
import {
  claimJourneyPersonBond,
  closePresenceSession,
  createAbsenceCareRequest,
  createMinimalVisitor,
  createPresenceSession,
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  latestChecksByPerson,
  listAbsenceCareRoutePersonIds,
  listJourneyCongregations,
  listPresenceChecks,
  loadJourneyAccess,
  recordPresenceCheck,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type PresencePerson,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, presenceAssistCopy, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyLoadState } from './JourneyLoadState'
import { loadAttendanceScope } from './presenceScope'
import { createScopedAsyncGuard } from './scopedAsyncGuard'
import { CrossUnitPresencePanel } from './CrossUnitPresencePanel'
import { EventSeriesPanel } from './EventSeriesPanel'
import type { JourneyEventSeries } from './journeyEventSeries'
import { loadJourneyRolloutFlags, DEFAULT_JOURNEY_ROLLOUT_FLAGS, type JourneyRolloutFlags } from './journeyReleaseFlags'
import {AttendanceRoster} from './packages/attendance/AttendanceRoster'
import {attendanceCopy} from './packages/attendance/copy'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import './PresenceAssistPage.css'

function bondCopy(locale: AppLocale) {
  if (locale === 'en') return {
    mine: 'Relationship with you',
    assigned: 'Relationship registered',
    none: 'No relationship host yet',
    claim: 'I will keep in touch',
    visitorClaim: 'I will be this visitor’s relationship contact',
    alreadyAssigned: 'This person already has a relationship contact.',
    claimError: 'The visitor was registered, but relationship ownership could not be saved. You can try again from the person card.',
  }
  if (locale === 'es') return {
    mine: 'Vínculo contigo',
    assigned: 'Vínculo registrado',
    none: 'Aún sin anfitrión de vínculo',
    claim: 'Yo mantendré el vínculo',
    visitorClaim: 'Yo seré el contacto de vínculo de este visitante',
    alreadyAssigned: 'Esta persona ya tiene un contacto de vínculo.',
    claimError: 'El visitante fue registrado, pero no se pudo guardar el responsable del vínculo. Puedes intentarlo de nuevo desde la tarjeta de la persona.',
  }
  return {
    mine: 'Vínculo com você',
    assigned: 'Vínculo registrado',
    none: 'Ainda sem anfitrião de vínculo',
    claim: 'Eu vou manter o vínculo',
    visitorClaim: 'Eu serei o contato de vínculo deste visitante',
    alreadyAssigned: 'Esta pessoa já possui um contato de vínculo.',
    claimError: 'O visitante foi registrado, mas não foi possível salvar o responsável pelo vínculo. Você pode tentar novamente no cartão da pessoa.',
  }
}


function absenceCareCopy(locale: AppLocale) {
  if (locale === 'en') return {
    route: 'Route to care',
    routed: 'Routed to care',
    noContact: 'No contact authorization',
    noContactHint: 'This confirmed absence stays factual, but no contact task is created without authorization and a phone number.',
    routeHint: 'Creates one unassigned Care Promise from this confirmed absence. A care worker still needs to claim it.',
  }
  if (locale === 'es') return {
    route: 'Enviar a cuidado',
    routed: 'Enviado a cuidado',
    noContact: 'Sin autorización de contacto',
    noContactHint: 'Esta ausencia confirmada sigue siendo un hecho, pero no se crea una tarea de contacto sin autorización y teléfono.',
    routeHint: 'Crea una Care Promise sin responsable a partir de esta ausencia confirmada. El equipo de cuidado todavía debe asumirla.',
  }
  return {
    route: 'Encaminhar para cuidado',
    routed: 'Encaminhado ao cuidado',
    noContact: 'Sem autorização de contato',
    noContactHint: 'A ausência confirmada continua sendo um fato, mas nenhuma tarefa de contato é criada sem autorização e telefone.',
    routeHint: 'Cria uma Care Promise sem responsável a partir desta ausência confirmada. Alguém do cuidado ainda precisa assumi-la.',
  }
}

export default function PresenceAssistPage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const baseCopy = presenceAssistCopy[locale]
  const bond = bondCopy(locale)
  const absenceCare = absenceCareCopy(locale)
  const { labels } = useJourneyLabels()
  const defaultTitle = baseCopy.title.split(' & ')[0]
  const t = {
    ...baseCopy,
    title: labels.presence || defaultTitle,
  }
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [rollout, setRollout] = useState<JourneyRolloutFlags>(DEFAULT_JOURNEY_ROLLOUT_FLAGS)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<JourneyPersonRecord[]>([])
  const [sessions, setSessions] = useState<PresenceSessionRecord[]>([])
  const [checks, setChecks] = useState<PresenceCheck[]>([])
  const [feedback,setFeedback] = useState('')
  const markGuard = useRef(false)
  const [loading, setLoading] = useState(true)
  const [loadingSlow, setLoadingSlow] = useState(false)
  const [bootstrapFailed, setBootstrapFailed] = useState(false)
  const bootstrapRunRef = useRef(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine!==false)
  useEffect(()=>{
    const sync=()=>setOnline(navigator.onLine!==false)
    window.addEventListener('online',sync)
    window.addEventListener('offline',sync)
    return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync)}
  },[])
  const offlineNote=locale==='en'?'This device is offline. Attendance recording is paused to avoid unsynchronized or duplicated evidence. Reconnect before saving.'
    :locale==='es'?'Este dispositivo no tiene conexión. Las nuevas marcas están pausadas para evitar registros pendientes o duplicados.'
    :'Este dispositivo está sem conexão. Novas marcações estão suspensas para evitar registros pendentes ou duplicados. Reconecte antes de registrar.'
  const [showSession, setShowSession] = useState(false)
  const [seriesPreset, setSeriesPreset] = useState<JourneyEventSeries|null>(null)
  const [showVisitor, setShowVisitor] = useState(false)
  const desiredScopeRef=useRef('')
  const [scopeLoaded,setScopeLoaded]=useState(false)
  const scopeRequestRef=useRef(0)
  const selectedSessionRef=useRef('')
  const [selectedSessionId,setSelectedSessionId]=useState('')
  const [routedAbsenceIds, setRoutedAbsenceIds] = useState<Set<string>>(new Set())
  const [absenceRoutesScope, setAbsenceRoutesScope] = useState('')
  const [absenceRoutesError, setAbsenceRoutesError] = useState('')
  const absenceRoutesGuard = useRef(createScopedAsyncGuard())

  const displaySession = sessions.find(item=>item.id===selectedSessionId) ?? sessions.find((item) => item.status === 'open') ?? sessions[0]
  const latest = useMemo(() => latestChecksByPerson(checks), [checks])
  const coverage = useMemo(
    () => displaySession ? calculatePresenceCoverage(displaySession, checks) : null,
    [displaySession, checks],
  )
  const confirmedAbsences = useMemo(
    () => displaySession ? confirmedAbsencePersonIds(displaySession, checks) : [],
    [displaySession, checks],
  )

  const refreshScope = useCallback(async (orgId: string, unitId: string) => {
    const scope=orgId+':'+unitId
    if(desiredScopeRef.current!==scope)return
    const request=++scopeRequestRef.current
    absenceRoutesGuard.current.invalidate()
    setAbsenceRoutesScope('')
    setScopeLoaded(false)
    try {
      const {people:nextPeople,sessions:nextSessions,session,checks:nextChecks} = await loadAttendanceScope(orgId,unitId,selectedSessionRef.current)
      if(request!==scopeRequestRef.current||desiredScopeRef.current!==scope)return
      setPeople(nextPeople);setSessions(nextSessions);setChecks(nextChecks);setScopeLoaded(true);setError('')
      selectedSessionRef.current=session?.id||''
      setSelectedSessionId(session?.id||'')
    } catch(cause) {
      if(request!==scopeRequestRef.current||desiredScopeRef.current!==scope)return
      setError(t.error)
      throw cause
    }
  }, [t.error])
  useEffect(()=>()=>{scopeRequestRef.current++;absenceRoutesGuard.current.invalidate()},[])
  const absenceScope = displaySession?.status==='closed' && access
    ? access.organizationId+':'+congregationId+':'+displaySession.id : ''
  const absenceRoutesReady = Boolean(absenceScope && absenceRoutesScope===absenceScope)
  useEffect(()=>{
    const guard=absenceRoutesGuard.current
    if(!scopeLoaded||!absenceScope||!access||!displaySession)return
    const token=guard.start(absenceScope)
    setAbsenceRoutesScope('')
    setAbsenceRoutesError('')
    setRoutedAbsenceIds(new Set())
    void withTimeout(listAbsenceCareRoutePersonIds(access.organizationId,congregationId,displaySession.id),6000,'absence_routes')
      .then(ids=>{if(guard.isCurrent(token,absenceScope)){setRoutedAbsenceIds(new Set(ids));setAbsenceRoutesScope(absenceScope)}})
      .catch(()=>{if(guard.isCurrent(token,absenceScope))setAbsenceRoutesError(absenceScope)})
    return()=>{guard.invalidate()}
  },[absenceScope,access,congregationId,displaySession,scopeLoaded])

  const bootstrap = useCallback(async () => {
    const runId = ++bootstrapRunRef.current
    absenceRoutesGuard.current.invalidate()
    desiredScopeRef.current='';scopeRequestRef.current++;setScopeLoaded(false)
    setLoading(true)
    setLoadingSlow(false)
    setBootstrapFailed(false)
    setError('')
    const slowTimer = window.setTimeout(() => {
      if (bootstrapRunRef.current === runId) setLoadingSlow(true)
    }, 6000)

    try {
      await withTimeout((async () => {
        const user = auth?.currentUser
        const organizationId = getActiveJourneyOrganizationId()
        if (!user || !organizationId) throw new Error('missing_ecosystem_context')

        const nextAccess = await loadJourneyAccess(user.uid, organizationId)
        if (bootstrapRunRef.current !== runId) return
        setAccess(nextAccess)
        if (!nextAccess.canManagePresence) return

        const nextCongregations = await listJourneyCongregations(nextAccess)
        if (bootstrapRunRef.current !== runId) return
        setCongregations(nextCongregations)
        const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, nextCongregations)
        desiredScopeRef.current=nextAccess.organizationId+':'+unitId
        setCongregationId(unitId)
        if (unitId) await refreshScope(organizationId, unitId)
      })(), 10000, 'presence_bootstrap')
    } catch (cause) {
      if (bootstrapRunRef.current !== runId) return
      console.error('Presence Assist bootstrap failed', cause)
      setBootstrapFailed(true)
      setError(t.error)
    } finally {
      window.clearTimeout(slowTimer)
      if (bootstrapRunRef.current === runId) setLoading(false)
    }
  }, [refreshScope, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])
  useEffect(()=>{
    if(!access){setRollout(DEFAULT_JOURNEY_ROLLOUT_FLAGS);return}
    let alive=true
    void loadJourneyRolloutFlags(access).then(flags=>{if(alive)setRollout(flags)})
      .catch(()=>{if(alive)setRollout(DEFAULT_JOURNEY_ROLLOUT_FLAGS)})
    return()=>{alive=false}
  },[access])


  useEffect(() => {
    if (!access?.canManagePresence || !congregationId) return
    let active=true
    const stop=subscribeJourneyLiveChanges({
      organizationId: access.organizationId,
      congregationId,
      collections: ['people', 'presenceSessions', 'presenceChecks', 'careRequests'],
      onChange: () => { if(!active)return;void refreshScope(access.organizationId, congregationId).catch((cause) => console.error('Presence live refresh failed', cause)) },
      onError: (cause) => console.error('Presence live subscription failed', cause),
    })
    return()=>{active=false;stop()}
  }, [access, congregationId, refreshScope])

  async function selectCongregation(unitId: string) {
    if (!access) return
    desiredScopeRef.current=access.organizationId+':'+unitId
    setScopeLoaded(false)
    scopeRequestRef.current++
    selectedSessionRef.current='';setSelectedSessionId('')
    setPeople([]);setChecks([]);setSessions([]);setFeedback('')
    setCongregationId(unitId)
    setActiveJourneyCongregationId(access.organizationId,unitId)
    setBusy(true)
    setError('')
    try { await refreshScope(access.organizationId, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function selectSession(sessionId:string){
    if(!access||busy)return
    absenceRoutesGuard.current.invalidate()
    setScopeLoaded(false)
    selectedSessionRef.current=sessionId
    setSelectedSessionId(sessionId);setChecks([]);setFeedback('')
    setBusy(true);setError('')
    try{await refreshScope(access.organizationId,congregationId)}
    catch{setError(t.error)}finally{setBusy(false)}
  }

  async function markPresenceState(person: PresencePerson, state: PresenceVerificationState) {
    if (!access || !displaySession || displaySession.status !== 'open' || !online || busy || !scopeLoaded || markGuard.current) return
    if(person.organizationId!==access.organizationId||person.congregationId!==congregationId)return
    const previous = latest.get(person.id)
    if (previous?.state === state) return
    if (state === 'absent_confirmed' && !window.confirm(t.confirmAbsent.replace('{name}', person.name))) return
    const correctionReason = previous ? window.prompt(locale === 'en' ? 'Reason for correcting this check:' : locale === 'es' ? 'Motivo de la corrección:' : 'Motivo da correção desta presença:')?.trim() : undefined
    if (previous && (!correctionReason || correctionReason.length > 240)) return
    markGuard.current=true
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      await recordPresenceCheck({
        organizationId: access.organizationId,
        congregationId,
        sessionId: displaySession.id,
        personId: person.id,
        actorId: access.userId,
        state,
        correctedFromCheckId: previous?.id,
        correctionReason,
      })
      setChecks(await listPresenceChecks(access.organizationId, congregationId, displaySession.id))
      const copy=attendanceCopy[locale]
      setFeedback(person.name+' · '+(state==='present_confirmed'?copy.present:state==='absent_confirmed'?copy.absent:copy.pending))
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { markGuard.current=false;setBusy(false) }
  }

  async function claimBond(person: PresencePerson) {
    if (!access || person.bondHostRef || !online || busy || !scopeLoaded) return
    setBusy(true)
    setError('')
    try {
      const user = auth?.currentUser
      if (!user) throw new Error('missing_auth')
      await claimJourneyPersonBond({ access, person, idToken: await user.getIdToken() })
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) {
      console.error(cause)
      setError(cause instanceof Error && cause.message === 'bond_already_assigned' ? bond.alreadyAssigned : t.error)
    } finally {
      setBusy(false)
    }
  }

  async function closeSession() {
    if (!access || !displaySession || displaySession.status !== 'open' || !scopeLoaded || busy || !online) return
    if (!window.confirm(t.confirmClose)) return
    setBusy(true)
    setError('')
    try {
      await closePresenceSession(access.organizationId, displaySession, checks, access.userId)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function routeAbsenceToCare(person: PresencePerson) {
    if (!access || !displaySession || displaySession.status !== 'closed' || !online || busy || !scopeLoaded) return
    if (!absenceRoutesReady || !confirmedAbsences.includes(person.id) || routedAbsenceIds.has(person.id)) return
    setBusy(true)
    setError('')
    try {
      await createAbsenceCareRequest({ access, session: displaySession, person, checks })
      setRoutedAbsenceIds((current) => new Set(current).add(person.id))
    } catch (cause) {
      console.error(cause)
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  const canAddVisitor=Boolean(scopeLoaded&&access?.canManagePeople&&displaySession?.status==='open'&&online&&!busy)
  const activeUnit=congregations.find(item=>item.id===congregationId)

  if (loading) {
    const slowMessage = locale === 'en'
      ? 'This is taking longer than usual. We will stop the attempt automatically instead of leaving you stuck here.'
      : locale === 'es'
        ? 'Esto está tardando más de lo normal. Detendremos el intento automáticamente para que no te quedes atrapado aquí.'
        : 'Está demorando mais que o normal. Vamos encerrar a tentativa automaticamente para você não ficar preso nesta tela.'
    return <main className="presence-assist"><div className="presence-loading presence-loading-card"><span className="presence-loading-spinner" aria-hidden="true" /><strong>{t.loading}</strong>{loadingSlow ? <p>{slowMessage}</p> : null}</div></main>
  }

  if ((bootstrapFailed && !access)||(!scopeLoaded&&Boolean(error))) {
    return <JourneyLoadState locale={locale} title={locale==='en'?'Service attendance':locale==='es'?'Asistencia al culto':'Presença no culto'} phase="error" onRetry={() => void bootstrap()} />
  }

  if (!access?.canManagePresence) {
    return <main className="presence-assist"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={() => void bootstrap()} /></main>
  }

  return <main className="presence-assist"><div className="presence-shell">
    <header className="presence-topbar">
      <div className="presence-brand"><img src="/brand/nestjourney-symbol-light.png" alt="" /><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="presence-actions">
        <a href="/"><ChevronLeft size={16} /> {t.back}</a>
        <select value={locale} aria-label="Language" onChange={(event) => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>{(Object.keys(localeLabels) as AppLocale[]).map((id) => <option value={id} key={id}>{localeLabels[id]}</option>)}</select>
      </div>
    </header>

    <section className="presence-hero">
      <div><span className="presence-kicker">Journey / Presence</span><h1>{locale==='en'?'Service attendance':locale==='es'?'Asistencia al culto':'Presença no culto'}</h1><p>{locale==='en'?'Find a person and tap Present. Your changes are saved as you go.':locale==='es'?'Busca a la persona y toca Presente. Cada cambio se guarda al momento.':'Encontre a pessoa e toque em Presente. Cada marcação é salva na hora.'}</p></div>
    </section>

    {error ? <div className="presence-error" role="alert">{error}</div> : null}
    {feedback?<p className="presence-save-feedback" role="status">{feedback}</p>:null}
    {!online?<div className="presence-error" role="status">{offlineNote}</div>:null}

    <section className="presence-service-bar" aria-label={locale==='en'?'Current service':locale==='es'?'Culto actual':'Culto atual'}>
      <div className="presence-service-title">
        <span className="presence-kicker">{activeUnit?.name}</span>
        <h2>{displaySession?.status==='open'?displaySession.eventName:locale==='en'?'Ready to take attendance?':locale==='es'?'¿Comenzamos la asistencia?':'Vamos conferir quem veio?'}</h2>
        <p>{displaySession?.status==='open'
          ?locale==='en'?'Service open · Check the people below':locale==='es'?'Culto abierto · Revisa las personas abajo':'Culto aberto · Confira as pessoas abaixo'
          :locale==='en'?'Everyone registered in this campus is included automatically.':locale==='es'?'Todas las personas registradas en esta sede se incluyen automáticamente.':'Todos os cadastrados nesta congregação entram automaticamente.'}</p>
      </div>
      <div className="presence-service-actions">
        {displaySession?.status==='open'?<>
          {canAddVisitor?<button className="presence-button" onClick={()=>setShowVisitor(true)}>{t.newVisitor}</button>:null}
          <button className="presence-button" onClick={()=>void closeSession()} disabled={busy||!online||!scopeLoaded}>{t.close}</button>
        </>:<button className="presence-button primary" onClick={()=>{if(scopeLoaded&&!sessions.some(item=>item.status==='open'))setShowSession(true)}} disabled={!congregationId||!scopeLoaded||busy||!online||sessions.some(item=>item.status==='open')}>{locale==='en'?'Start attendance':locale==='es'?'Comenzar asistencia':'Começar chamada'} <UserCheck size={18}/></button>}
      </div>
    </section>

    <section className="journey-area-toolbar">
      {sessions.length>1?<label><span>{locale==='en'?'Service history':locale==='es'?'Historial de cultos':'Culto e histórico'}</span><select value={displaySession?.id||''} disabled={busy} onChange={event=>void selectSession(event.target.value)}>{sessions.map(session=><option key={session.id} value={session.id}>{session.eventName||new Date(session.openedAt).toLocaleString(locale)} · {session.status==='open'?(locale==='en'?'Open':locale==='es'?'Abierto':'Aberto'):t.closed}</option>)}</select></label>:null}
      {congregations.length>1?<label><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>:null}
      {canImportJourneyMembers(access)?<div className="presence-member-shortcuts"><a className="presence-button" href="/journey-profile?register=member">{locale==='en'?'Register member':locale==='es'?'Registrar miembro':'Cadastrar membro'}</a><a className="presence-button" href="/journey-profile?import=members">{locale==='en'?'Import a list':locale==='es'?'Importar lista':'Importar lista de membros'}</a></div>:null}
    </section>

    {displaySession ? <details className="presence-session-summary"><summary>{locale==='en'?'Attendance summary':locale==='es'?'Resumen de asistencia':'Resumo da conferência'} · {coverage?.percent??0}%</summary><section className="presence-panel presence-session-card">
      <div className="presence-session-head"><div><span className="presence-kicker">{t.session}</span><h2>{displaySession.eventName ?? new Date(displaySession.openedAt).toLocaleString(locale)}</h2><p>{new Date(displaySession.openedAt).toLocaleString(locale)} · {displaySession.status === 'closed' ? t.closed : displaySession.eventRef}</p></div><span className="presence-badge"><UserCheck size={15} /> {displaySession.status === 'open' ? t.session : t.closed}</span></div>
      {coverage ? <><div className="coverage-wrap"><span className="coverage-number">{coverage.percent}%</span><div className="coverage-track" aria-label={`${t.coverage}: ${coverage.percent}%`}><span style={{ width: `${coverage.percent}%` }} /></div><div className="coverage-meta">{coverage.verified} {t.verified}<br />{coverage.unverified} {t.unverified}</div></div><p className="coverage-note">{coverage.meetsMinimum ? t.qualityReady : t.qualityNotReady}</p>{displaySession.status === 'closed' ? <p className="coverage-note">{coverage.meetsMinimum ? `${t.absenceEvidence}: ${confirmedAbsences.length}` : t.absenceBlocked}</p> : null}</> : null}
    </section></details> : null}

    {rollout.eventSeries && access && congregationId ? <EventSeriesPanel key={access.organizationId+':'+congregationId} access={access} congregationId={congregationId} locale={locale} canLaunch={scopeLoaded&&!busy&&online&&!sessions.some(item=>item.status==='open')} onLaunch={series=>{setSeriesPreset(series);setShowSession(true)}}/> : null}
    {rollout.crossUnitPresence && displaySession?.status==='open' && access ? <CrossUnitPresencePanel access={access} congregationId={congregationId} units={congregations} session={displaySession} checks={checks} locale={locale} onChanged={()=>refreshScope(access.organizationId,congregationId)}/> : null}

    <AttendanceRoster key={access.organizationId+':'+congregationId+':'+(displaySession?.id||'none')} people={people.filter(person=>!person.archived||displaySession?.eligiblePersonIds?.includes(person.id)||latest.has(person.id))} session={displaySession} checks={checks} locale={locale} editable={scopeLoaded&&displaySession?.status==='open'} busy={busy} online={online} onMark={(person,state)=>void markPresenceState(person,state)} profileHref={access.canManagePeople?person=>'/journey-profile?person='+encodeURIComponent(person.id):undefined} renderDetails={person=>{
      const absenceUsable=Boolean(absenceRoutesReady&&displaySession?.status==='closed'&&confirmedAbsences.includes(person.id))
      const contactAllowed=Boolean(person.consent&&person.phone)
      const routedToCare=routedAbsenceIds.has(person.id)
      return <>
        <div className="presence-bond-row"><span className={`presence-bond-state ${person.bondHostRef?'assigned':''}`}><HeartHandshake size={14}/>{person.bondHostRef?(person.bondHostRef===access.userId?bond.mine:bond.assigned):bond.none}</span>{!person.bondHostRef&&displaySession?.status==='open'?<button className="presence-bond-button" disabled={busy||!online} onClick={()=>void claimBond(person)}>{bond.claim}</button>:null}</div>
        {absenceUsable?<div className={`presence-absence-care ${contactAllowed?'':'blocked'}`}><HeartHandshake size={15}/><div><strong>{routedToCare?absenceCare.routed:contactAllowed?absenceCare.route:absenceCare.noContact}</strong><p>{contactAllowed?absenceCare.routeHint:absenceCare.noContactHint}</p></div>{contactAllowed&&!routedToCare?<button className="presence-bond-button" disabled={busy||!online} onClick={()=>void routeAbsenceToCare(person)}>{absenceCare.route}</button>:null}</div>:null}
      </>
    }}/>
    {absenceScope&&absenceRoutesError===absenceScope?<p className="attendance-notice" role="status">{locale==='en'?'Attendance is available. Care referrals could not be loaded for this service.':locale==='es'?'La asistencia está disponible. No se pudieron cargar las derivaciones a Cuidado para este culto.':'A chamada está disponível. Os encaminhamentos para Cuidado não puderam ser carregados neste culto.'}</p>:null}
    <p className="presence-rule">{t.sourceRule}<br />{t.correctionRule}</p>
  </div>

  {showSession ? <SessionModal error={error} unitName={activeUnit?.name||''} preset={seriesPreset} close={() => {setShowSession(false);setSeriesPreset(null)}} create={async (eventName, expected, eventTypeId, eligiblePersonIds, eventSeriesId, requestId) => {
    if (!access || !online || !scopeLoaded || busy || sessions.some(item=>item.status==='open')) return
    setBusy(true); setError('')
    try {
      const createdSessionId=await createPresenceSession({ organizationId: access.organizationId, congregationId, actorId: access.userId, eventName, expectedPeopleCount: expected, minimumCoveragePercent: 90, eventTypeId, eligiblePersonIds, eventSeriesId, requestId })
      selectedSessionRef.current=createdSessionId
      setShowSession(false)
      setSeriesPreset(null)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} eligiblePeople={people.filter(person=>!person.archived)} locale={locale} online={online} /> : null}

  {showVisitor&&access ? <VisitorModal error={error} org={access.organizationId} canPick={access.isOwner||['owner','admin','pastor','data_admin'].includes(access.organizationRole)} close={() => setShowVisitor(false)} save={async (name, phone, consent, preferredContactChannel, claimBond,requestId,selection) => {
    if (!access || !displaySession || !online || busy || !scopeLoaded || displaySession.status!=='open') return
    setBusy(true); setError('')
    try {
      const person = await createMinimalVisitor({ organizationId: access.organizationId, congregationId, actorId: access.userId, name, phone, consent, preferredContactChannel, requestId,selection })
      await recordPresenceCheck({ organizationId: access.organizationId, congregationId, sessionId: displaySession.id, personId: person.id, actorId: access.userId, state: 'present_confirmed' })
      let bondFailed = false
      if (claimBond) {
        try {
          const user = auth?.currentUser
          if (!user) throw new Error('missing_auth')
          await claimJourneyPersonBond({ access, person, idToken: await user.getIdToken() })
        } catch (bondCause) {
          console.error('Relationship ownership failed after visitor registration', bondCause)
          bondFailed = true
        }
      }
      setShowVisitor(false)
      await refreshScope(access.organizationId, congregationId)
      if (bondFailed) setError(bond.claimError)
    } catch (cause) { console.error(cause); setError(cause instanceof PeopleDirectoryError&&cause.code==='POSSIBLE_DUPLICATE'?(locale==='en'?'Possible existing person. Ask an administrator to select the central record.':locale==='es'?'Posible registro existente. Pida al administrador que seleccione el registro central.':'Possível cadastro existente. Peça ao administrador para selecionar a pessoa no cadastro central.'):t.error) }
    finally { setBusy(false) }
  }} locale={locale} /> : null}
  </main>
}

function SessionModal({ close, create, eligiblePeople, locale, preset, online, unitName, error }: { error: string; unitName: string; close: () => void; create: (name: string, expected: number, eventTypeId: string, eligiblePersonIds: string[], eventSeriesId?: string,requestId?:string) => Promise<void>; eligiblePeople: PresencePerson[]; locale: AppLocale; preset:JourneyEventSeries|null; online:boolean }) {
  const t = presenceAssistCopy[locale]
  const dialogRef = useRef<HTMLElement>(null)
  const [requestId] = useState(()=>crypto.randomUUID())
  const savingGuard = useRef(false)
  const [saving,setSaving] = useState(false)
  useModalDialog(dialogRef, close, saving)
  const [name,setName] = useState(`${preset?.title||t.todayEvent} · ${new Date().toLocaleDateString(locale)}`)
  const [eventTypeId,setEventTypeId] = useState<string>(preset?.eventTypeId||'general')
  const [eligibleSearch,setEligibleSearch] = useState('')
  const [selectedIds,setSelectedIds] = useState<Set<string>>(() => new Set(preset?.eventTypeId==='youth'||preset?.eventTypeId==='special'?[]:eligiblePeople.map(person=>person.id)))
  const requiresSelection = eventTypeId==='youth'||eventTypeId==='special'
  const rosterIds = requiresSelection ? [...selectedIds] : eligiblePeople.map(person=>person.id)
  const expected = rosterIds.length
  const hasPeople = eligiblePeople.length>0
  const visibleEligiblePeople = eligiblePeople.filter(person=>person.name.toLocaleLowerCase(locale).includes(eligibleSearch.trim().toLocaleLowerCase(locale)))
  const chooseEventType=(next:string)=>{
    setEventTypeId(next)
    setSelectedIds(new Set(next==='youth'||next==='special'?[]:eligiblePeople.map(person=>person.id)))
  }
  const submit=async()=>{
    if(savingGuard.current||!online||!name.trim()||(requiresSelection&&expected===0))return
    savingGuard.current=true;setSaving(true)
    try {await create(name,expected,eventTypeId,rosterIds,preset?.id,requestId)}
    finally {savingGuard.current=false;setSaving(false)}
  }
  const copy = locale==='en'
    ? {
        kicker:'PRESENCE / NEW SERVICE',title:'Record attendance',
        subtitle:'Choose the service and confirm attendees with a few taps.',
        event:'Service or gathering',people:'People expected',eventType:'Gathering type',
        peopleHint:'Everyone registered in this campus is already included. Confirm who attended on the next screen.',
        noPeople:'No people available in this congregation',
        noPeopleHint:'Check the selected campus or add people in People. You may still open a service to register new visitors.',
        selectionHint:'Choose the people expected for this event before starting.',
        search:'Search by name',review:'Review the expected people',manage:'Open People',
        start:'Start recording',
      }
    : locale==='es'
      ? {
          kicker:'PRESENCIA / NUEVO CULTO',title:'Registrar asistencia',
          subtitle:'Elige el culto y confirma las personas con pocos toques.',
          event:'Culto o encuentro',people:'Personas previstas',eventType:'Tipo de encuentro',
          peopleHint:'Todas las personas registradas en esta sede ya están incluidas. Confirma quién asistió en la siguiente pantalla.',
          noPeople:'No hay personas disponibles en esta congregación',
          noPeopleHint:'Revisa la sede o registra personas en Personas. Puedes abrir el culto para registrar visitantes nuevos.',
          selectionHint:'Selecciona a las personas previstas para este evento antes de comenzar.',
          search:'Buscar por nombre',review:'Revisar personas previstas',manage:'Abrir Personas',
          start:'Comenzar registro',
        }
      : {
          kicker:'PRESENÇA / NOVO CULTO',title:'Registrar presença',
          subtitle:'Escolha o culto e confira as pessoas em poucos toques.',
          event:'Culto ou encontro',people:'Pessoas esperadas',eventType:'Tipo de culto',
          peopleHint:'Todos os cadastrados nesta congregação já estão incluídos. Você confere quem veio na próxima tela.',
          noPeople:'Nenhuma pessoa disponível nesta congregação',
          noPeopleHint:'Confira a congregação selecionada ou cadastre pessoas em Pessoas. Você ainda pode abrir o culto para registrar novos visitantes.',
          selectionHint:'Selecione as pessoas esperadas neste evento antes de começar.',
          search:'Buscar pelo nome',review:'Conferir pessoas esperadas',manage:'Abrir Pessoas',
          start:'Começar conferência',
        }
  return createPortal(<div className="presence-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)close()}}>
    <section ref={dialogRef} tabIndex={-1} className="presence-panel presence-modal presence-session-modal" role="dialog" aria-modal="true" aria-labelledby="presence-session-title">
      <header className="presence-modal-header">
        <div><span className="presence-modal-eyebrow">{copy.kicker}{unitName ? ` · ${unitName}` : ''}</span><h2 id="presence-session-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
        <button className="presence-modal-close" type="button" disabled={saving} onClick={close} aria-label={t.cancel}><X size={20}/></button>
      </header>
      <div className="presence-modal-scroll">
        <div className="presence-modal-grid">
          <label className="presence-field">
            <span>{copy.event}</span>
            <input value={name} onChange={event=>setName(event.target.value)} maxLength={120} />
          </label>
          <label className="presence-field"><span>{copy.eventType}</span>
            <select value={eventTypeId} disabled={Boolean(preset)} onChange={event=>chooseEventType(event.target.value)}>
              <option value="general">{locale==='en'?'Regular gathering':locale==='es'?'Encuentro habitual':'Encontro habitual'}</option>
              <option value="sunday">{locale==='en'?'Sunday service':locale==='es'?'Culto dominical':'Culto de domingo'}</option>
              <option value="midweek">{locale==='en'?'Midweek service':locale==='es'?'Culto semanal':'Culto da semana'}</option>
              <option value="youth">{locale==='en'?'Youth gathering':locale==='es'?'Encuentro juvenil':'Encontro de jovens'}</option>
              <option value="special">{locale==='en'?'Special event':locale==='es'?'Evento especial':'Evento especial'}</option>
            </select>
          </label>
        </div>
        {hasPeople?<div className="presence-roster-summary">
          <span className="presence-roster-icon"><UsersRound size={19}/></span>
          <div><strong>{expected} {copy.people.toLocaleLowerCase(locale)}</strong>
            <p>{requiresSelection&&expected===0?copy.selectionHint:copy.peopleHint}</p>
          </div>
        </div>:<div className="presence-empty-roster" role="status">
          <AlertCircle size={20}/>
          <div><strong>{copy.noPeople}</strong><p>{copy.noPeopleHint}</p><a href="/people">{copy.manage}</a></div>
        </div>}
        {hasPeople&&requiresSelection?<details className="presence-roster-review" open={requiresSelection||undefined}>
          <summary>{copy.review}<span>{expected}</span></summary>
          <div className="presence-eligible-picker">
            <label className="presence-field"><span>{copy.search}</span><input type="search" value={eligibleSearch} onChange={event=>setEligibleSearch(event.target.value)} placeholder={copy.search}/></label>
            <div className="presence-eligible-options" role="group" aria-label={copy.people}>{visibleEligiblePeople.map(person=><label key={person.id}><input type="checkbox" checked={selectedIds.has(person.id)} onChange={event=>setSelectedIds(current=>{const next=new Set(current);if(event.target.checked)next.add(person.id);else next.delete(person.id);return next})}/><span>{person.name}</span></label>)}</div>
          </div>
        </details>:null}
      </div>
      {error?<p className="presence-error presence-session-error" role="alert">{error}</p>:null}
      <footer className="presence-modal-actions">
        <button className="presence-button presence-modal-cancel" type="button" disabled={saving} onClick={close}>{t.cancel}</button>
        <button className="presence-button primary" type="button" disabled={saving||!online||!name.trim()||(requiresSelection&&expected===0)} onClick={()=>void submit()}>{saving?(locale==='en'?'Opening…':locale==='es'?'Abriendo…':'Abrindo…'):copy.start}</button>
      </footer>
    </section>
  </div>,document.body)
}

function VisitorModal({ close, save, locale,org,canPick,error }: { close: () => void; save: (name: string, phone: string, consent: boolean, preferredContactChannel: 'whatsapp' | 'phone' | undefined, claimBond: boolean,requestId:string,selection:DirectorySelection) => Promise<void>; locale: AppLocale;org:string;canPick:boolean;error:string }) {
  const t = presenceAssistCopy[locale]
  const bond = bondCopy(locale)
  const [requestId] = useState(()=>crypto.randomUUID())
  const [saving,setSaving] = useState(false)
  const dialogRef=useRef<HTMLElement>(null)
  useModalDialog(dialogRef,close,saving)
  const savingGuard=useRef(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selection,setSelection]=useState<DirectorySelection>({})
  const [consent, setConsent] = useState(false)
  const [preferredContactChannel, setPreferredContactChannel] = useState<'whatsapp' | 'phone'>('whatsapp')
  const [claimBond, setClaimBond] = useState(true)
  const phoneValid = phone.replace(/\D/g, '').length >= 8
  const submit=async()=>{
    if(savingGuard.current)return
    savingGuard.current=true;setSaving(true)
    try{await save(name,phone,consent,consent?preferredContactChannel:undefined,claimBond,requestId,selection)}
    finally{savingGuard.current=false;setSaving(false)}
  }
  const contactHint = locale === 'en'
    ? 'When contact is authorized, a valid number and preferred channel are required before creating the care task.'
    : locale === 'es'
      ? 'Cuando el contacto está autorizado, se exige un número válido y el canal preferido antes de crear la tarea de cuidado.'
      : 'Quando o contato é autorizado, informe um número válido e o canal preferido antes de criar a tarefa de cuidado.'
  return createPortal(<div className="presence-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!saving)close()}}><section ref={dialogRef} tabIndex={-1} className="presence-panel presence-modal visitor-form" role="dialog" aria-modal="true" aria-labelledby="presence-visitor-title"><div className="presence-session-head"><h2 id="presence-visitor-title">{t.newVisitor}</h2><button className="presence-button" onClick={close} disabled={saving} aria-label={t.cancel}><X size={17} /></button></div><div className="presence-modal-grid"><label className="presence-field"><span>{t.visitorName}</span><input value={name} onChange={(event) => {setName(event.target.value);setSelection({})}} /></label>{canPick?<DirectoryPersonPicker org={org} locale={locale} name={name} value={selection} onChange={setSelection}/>:null}<label className="presence-check"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) setPhone('') }} /><span>{t.consent}</span></label><label className="presence-field"><span>{t.phone}</span><input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!consent} aria-invalid={consent&&!phoneValid} /></label>{consent?<label className="presence-field"><span>{locale==='en'?'Preferred channel':locale==='es'?'Canal preferido':'Canal preferido'}</span><select value={preferredContactChannel} onChange={(event)=>setPreferredContactChannel(event.target.value as 'whatsapp'|'phone')}><option value="whatsapp">WhatsApp</option><option value="phone">{locale==='en'?'Phone call':locale==='es'?'Llamada':'Ligação'}</option></select></label>:null}{consent?<p className="coverage-note">{contactHint}</p>:null}<label className="presence-check"><input type="checkbox" checked={claimBond} onChange={(event) => setClaimBond(event.target.checked)} /><span>{bond.visitorClaim}</span></label></div>{error?<p className="journey-error" role="alert">{error}</p>:null}<div className="presence-modal-actions"><button className="presence-button" disabled={saving} onClick={close}>{t.cancel}</button><button className="presence-button primary" disabled={saving || !name.trim() || (consent && !phoneValid)} onClick={()=>void submit()}>{t.saveVisitor}</button></div></section></div>,document.body)
}

