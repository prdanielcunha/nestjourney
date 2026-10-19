import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, HeartHandshake, ShieldCheck, UserCheck, X } from 'lucide-react'
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
  listPresencePeople,
  listPresenceSessions,
  loadJourneyAccess,
  recordPresenceCheck,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type PresencePerson,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, presenceAssistCopy, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import { CrossUnitPresencePanel } from './CrossUnitPresencePanel'
import { EventSeriesPanel } from './EventSeriesPanel'
import type { JourneyEventSeries } from './journeyEventSeries'
import { loadJourneyRolloutFlags, DEFAULT_JOURNEY_ROLLOUT_FLAGS, type JourneyRolloutFlags } from './journeyReleaseFlags'
import './PresenceAssistPage.css'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

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
  const [people, setPeople] = useState<PresencePerson[]>([])
  const [sessions, setSessions] = useState<PresenceSessionRecord[]>([])
  const [checks, setChecks] = useState<PresenceCheck[]>([])
  const [query, setQuery] = useState('')
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
  const [routedAbsenceIds, setRoutedAbsenceIds] = useState<Set<string>>(new Set())

  const displaySession = sessions.find((item) => item.status === 'open') ?? sessions[0]
  const latest = useMemo(() => latestChecksByPerson(checks), [checks])
  const coverage = useMemo(
    () => displaySession ? calculatePresenceCoverage(displaySession, checks) : null,
    [displaySession, checks],
  )
  const confirmedAbsences = useMemo(
    () => displaySession ? confirmedAbsencePersonIds(displaySession, checks) : [],
    [displaySession, checks],
  )
  const visiblePeople = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale)
    return needle ? people.filter((person) => person.name.toLocaleLowerCase(locale).includes(needle)) : people
  }, [people, query, locale])

  const refreshScope = useCallback(async (orgId: string, unitId: string) => {
    const [nextPeople, nextSessions] = await Promise.all([
      listPresencePeople(orgId, unitId),
      listPresenceSessions(orgId, unitId),
    ])
    setPeople(nextPeople)
    setSessions(nextSessions)
    const session = nextSessions.find((item) => item.status === 'open') ?? nextSessions[0]
    if (session) {
      const [nextChecks, routedPeople] = await Promise.all([
        listPresenceChecks(orgId, unitId, session.id),
        listAbsenceCareRoutePersonIds(orgId, unitId, session.id),
      ])
      setChecks(nextChecks)
      setRoutedAbsenceIds(new Set(routedPeople))
    } else {
      setChecks([])
      setRoutedAbsenceIds(new Set())
    }
  }, [])

  const bootstrap = useCallback(async () => {
    const runId = ++bootstrapRunRef.current
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
    return subscribeJourneyLiveChanges({
      organizationId: access.organizationId,
      congregationId,
      collections: ['people', 'presenceSessions', 'presenceChecks', 'careRequests'],
      onChange: () => { void refreshScope(access.organizationId, congregationId).catch((cause) => console.error('Presence live refresh failed', cause)) },
      onError: (cause) => console.error('Presence live subscription failed', cause),
    })
  }, [access, congregationId, refreshScope])

  async function selectCongregation(unitId: string) {
    if (!access) return
    setCongregationId(unitId)
    setActiveJourneyCongregationId(access.organizationId,unitId)
    setBusy(true)
    setError('')
    try { await refreshScope(access.organizationId, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function markPresenceState(person: PresencePerson, state: PresenceVerificationState) {
    if (!access || !displaySession || displaySession.status !== 'open' || !online) return
    const previous = latest.get(person.id)
    if (previous?.state === state) return
    if (state === 'absent_confirmed' && !window.confirm(t.confirmAbsent.replace('{name}', person.name))) return
    const correctionReason = previous ? window.prompt(locale === 'en' ? 'Reason for correcting this check:' : locale === 'es' ? 'Motivo de la corrección:' : 'Motivo da correção desta presença:')?.trim() : undefined
    if (previous && (!correctionReason || correctionReason.length > 240)) return
    setBusy(true)
    setError('')
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
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function claimBond(person: PresencePerson) {
    if (!access || person.bondHostRef || !online) return
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
    if (!access || !displaySession || displaySession.status !== 'open') return
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
    if (!access || !displaySession || displaySession.status !== 'closed' || !online) return
    if (!confirmedAbsences.includes(person.id) || routedAbsenceIds.has(person.id)) return
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

  const noSessionGuide=emptyGuidance(locale,'presence_no_session')
  const noPeopleGuide=emptyGuidance(locale,'presence_no_people')
  const canAddVisitor=Boolean(access?.canManagePeople&&displaySession?.status==='open'&&online)
  const activeUnit=congregations.find(item=>item.id===congregationId)
  const unverifiedCount=coverage?.unverified??people.length
  const focusTitle=displaySession?.status==='open'
    ?(unverifiedCount>0
      ?locale==='en'?unverifiedCount+' people still need confirmation':locale==='es'?unverifiedCount+' personas aún necesitan confirmación':unverifiedCount+' pessoas ainda precisam de confirmação'
      :locale==='en'?'Everyone in this session is confirmed':locale==='es'?'Todas las personas de esta sesión están confirmadas':'Todas as pessoas desta sessão estão confirmadas')
    :locale==='en'?'Open the service session when the team is ready':locale==='es'?'Abre la sesión del culto cuando el equipo esté listo':'Abra a sessão do culto quando a equipe estiver pronta'
  const focusBody=displaySession?.status==='open'
    ?locale==='en'?'Work from the people list. Confirm what actually happened, register visitors, and create a relationship without extra forms.'
      :locale==='es'?'Trabaja desde la lista de personas. Confirma lo que realmente ocurrió, registra visitantes y crea vínculo sin formularios extras.'
      :'Trabalhe pela lista de pessoas. Confirme o que realmente aconteceu, registre visitantes e crie vínculo sem formulários extras.'
    :displaySession?.status==='closed'
      ?locale==='en'?'The last session is closed. Confirmed absences can follow to Care only when the factual quality rule is met.'
        :locale==='es'?'La última sesión está cerrada. Las ausencias confirmadas pueden seguir a Cuidado solo cuando se cumple la regla de calidad factual.'
        :'A última sessão está encerrada. Ausências confirmadas podem seguir para Cuidado somente quando a regra de qualidade factual foi atendida.'
      :locale==='en'?'One action opens the service workflow. From there the team can confirm attendance and register visitors.'
        :locale==='es'?'Una acción abre el flujo del culto. Desde allí el equipo confirma presencia y registra visitantes.'
        :'Uma ação abre o fluxo do culto. A partir daí a equipe confirma presença e registra visitantes.'

  if (loading) {
    const slowMessage = locale === 'en'
      ? 'This is taking longer than usual. We will stop the attempt automatically instead of leaving you stuck here.'
      : locale === 'es'
        ? 'Esto está tardando más de lo normal. Detendremos el intento automáticamente para que no te quedes atrapado aquí.'
        : 'Está demorando mais que o normal. Vamos encerrar a tentativa automaticamente para você não ficar preso nesta tela.'
    return <main className="presence-assist"><div className="presence-loading presence-loading-card"><span className="presence-loading-spinner" aria-hidden="true" /><strong>{t.loading}</strong>{loadingSlow ? <p>{slowMessage}</p> : null}</div></main>
  }

  if (bootstrapFailed && !access) {
    const title = locale === 'en' ? 'We could not load this church' : locale === 'es' ? 'No pudimos cargar esta iglesia' : 'Não conseguimos carregar esta igreja'
    const body = locale === 'en' ? 'Your session is safe. Try again to reload your organization, permissions, and people.' : locale === 'es' ? 'Tu sesión está segura. Inténtalo de nuevo para recargar tu organización, permisos y personas.' : 'Sua sessão continua segura. Tente novamente para recarregar a organização, as permissões e as pessoas.'
    return <main className="presence-assist"><AccessDeniedState locale={locale} title={title} body={body} retryLabel={t.retry} onRetry={() => void bootstrap()} /></main>
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
      <div><span className="presence-kicker">Journey / Presence</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
    </section>

    {error ? <div className="presence-error" role="alert">{error}</div> : null}
    {!online?<div className="presence-error" role="status">{offlineNote}</div>:null}

    <JourneyAreaFocus
      locale={locale}
      title={focusTitle}
      body={focusBody}
      context={displaySession?.eventName||activeUnit?.name}
      metrics={[
        {label:t.congregation,value:activeUnit?.name||'—'},
        {label:t.session,value:displaySession?.status==='open'?(locale==='en'?'Open':locale==='es'?'Abierta':'Aberta'):(displaySession? t.closed:(locale==='en'?'Not opened':locale==='es'?'No abierta':'Não aberta')),tone:displaySession?.status==='open'?'good':'muted'},
        {label:t.coverage,value:coverage?coverage.percent+'%':'—',tone:coverage?.meetsMinimum?'good':coverage?'attention':'muted'},
      ]}
      actions={displaySession?.status==='open'
        ?[
          {label:locale==='en'?'Go to people':locale==='es'?'Ir a personas':'Ir para pessoas',href:'#presence-people',primary:true},
          ...(canAddVisitor?[{label:t.newVisitor,onClick:()=>setShowVisitor(true)}]:[]),
          {label:t.close,onClick:()=>void closeSession(),disabled:busy||!online},
        ]
        :[{label:t.newSession,onClick:()=>setShowSession(true),disabled:!congregationId||busy||!online,primary:true}]
      }
    />

    <section className="journey-area-toolbar">
      {congregations.length>1?<label><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>:null}
      <label className="grow"><span>{t.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
    </section>

    {displaySession ? <section className="presence-panel presence-session-card">
      <div className="presence-session-head"><div><span className="presence-kicker">{t.session}</span><h2>{displaySession.eventName ?? new Date(displaySession.openedAt).toLocaleString(locale)}</h2><p>{new Date(displaySession.openedAt).toLocaleString(locale)} · {displaySession.status === 'closed' ? t.closed : displaySession.eventRef}</p></div><span className="presence-badge"><UserCheck size={15} /> {displaySession.status === 'open' ? t.session : t.closed}</span></div>
      {coverage ? <><div className="coverage-wrap"><span className="coverage-number">{coverage.percent}%</span><div className="coverage-track" aria-label={`${t.coverage}: ${coverage.percent}%`}><span style={{ width: `${coverage.percent}%` }} /></div><div className="coverage-meta">{coverage.verified} {t.verified}<br />{coverage.unverified} {t.unverified}</div></div><p className="coverage-note">{coverage.meetsMinimum ? t.qualityReady : t.qualityNotReady}</p>{displaySession.status === 'closed' ? <p className="coverage-note">{coverage.meetsMinimum ? `${t.absenceEvidence}: ${confirmedAbsences.length}` : t.absenceBlocked}</p> : null}</> : null}
    </section> : <div className="presence-panel"><GuidedEmptyState icon={UserCheck} title={noSessionGuide.title} body={noSessionGuide.body} primary={{label:noSessionGuide.primary,onClick:()=>setShowSession(true)}} secondary={{label:noSessionGuide.secondary||t.back,href:'/my-today'}}/></div>}

    {rollout.eventSeries && access && congregationId ? <EventSeriesPanel key={access.organizationId+':'+congregationId} access={access} congregationId={congregationId} locale={locale} canLaunch={displaySession?.status!=='open'} onLaunch={series=>{setSeriesPreset(series);setShowSession(true)}}/> : null}
    {rollout.crossUnitPresence && displaySession?.status==='open' && access ? <CrossUnitPresencePanel access={access} congregationId={congregationId} units={congregations} session={displaySession} checks={checks} locale={locale} onChanged={()=>refreshScope(access.organizationId,congregationId)}/> : null}

    <div className="presence-list-head" id="presence-people"><h2>{t.people} · {visiblePeople.length}</h2><span className="presence-badge"><ShieldCheck size={14} /> {t.sourceRule}</span></div>
    <section className="presence-grid">
      {visiblePeople.map((person) => {
        const current = latest.get(person.id)
        const present = current?.state === 'present_confirmed'
        const absent = current?.state === 'absent_confirmed'
        const eligible = !displaySession?.eligiblePersonIds || displaySession.eligiblePersonIds.includes(person.id)
        const absenceUsable = Boolean(displaySession?.status === 'closed' && confirmedAbsences.includes(person.id))
        const contactAllowed = Boolean(person.consent && person.phone)
        const routedToCare = routedAbsenceIds.has(person.id)
        return <article className="presence-panel presence-person" key={person.id}>
          <div className="presence-person-top"><span className="presence-avatar">{person.photoUrl ? <img src={person.photoUrl} alt="" /> : initials(person.name)}</span><div className="presence-person-name"><strong>{person.name}</strong><small>{person.visits ? `${person.visits}x` : t.notVerified}</small></div></div>
          <span className={`presence-state ${present ? 'confirmed' : absent ? 'absent' : ''}`}>{present ? t.present : absent ? t.absent : t.notVerified}{current?.correctedFromCheckId ? ` · ${t.correcting}` : ''}</span>
          <div className="presence-bond-row">
            <span className={`presence-bond-state ${person.bondHostRef ? 'assigned' : ''}`}><HeartHandshake size={14}/>{person.bondHostRef ? (person.bondHostRef === access.userId ? bond.mine : bond.assigned) : bond.none}</span>
            {!person.bondHostRef && displaySession?.status === 'open' ? <button className="presence-bond-button" disabled={busy||!online} onClick={() => void claimBond(person)}>{bond.claim}</button> : null}
          </div>
          {absenceUsable ? <div className={`presence-absence-care ${contactAllowed ? '' : 'blocked'}`}>
            <HeartHandshake size={15}/>
            <div><strong>{routedToCare ? absenceCare.routed : contactAllowed ? absenceCare.route : absenceCare.noContact}</strong><p>{contactAllowed ? absenceCare.routeHint : absenceCare.noContactHint}</p></div>
            {contactAllowed && !routedToCare ? <button className="presence-bond-button" disabled={busy||!online} onClick={() => void routeAbsenceToCare(person)}>{absenceCare.route}</button> : null}
          </div> : null}
          {!eligible?<p className="presence-eligibility-note">{locale==='en'?'Outside this event’s eligible roster: only a verified presence may be recorded.':locale==='es'?'Fuera de la lista elegible: solo se puede confirmar presencia.':'Fora do público elegível deste evento: somente presença real pode ser confirmada.'}</p>:null}
          <div className="presence-person-actions">
            <button className={`presence-button ${present ? 'success' : 'primary'}`} disabled={busy || !online || present || displaySession?.status !== 'open'} onClick={() => void markPresenceState(person, 'present_confirmed')}>{present ? <><Check size={17} /> {t.present}</> : t.markPresent}</button>
            <button className={`presence-button ${absent ? 'absence' : ''}`} disabled={busy || !online || absent || !eligible || displaySession?.status !== 'open'} onClick={() => void markPresenceState(person, 'absent_confirmed')}>{absent ? <><X size={17} /> {t.absent}</> : t.markAbsent}</button>
            <button className="presence-button" disabled={busy || !online || !current || current.state === 'unverified' || displaySession?.status !== 'open'} onClick={() => void markPresenceState(person, 'unverified')} aria-label={locale === 'en' ? `Undo check for ${person.name}` : locale === 'es' ? `Deshacer verificación de ${person.name}` : `Desfazer conferência de ${person.name}`}>{t.notVerified}</button>
          </div>
        </article>
      })}
    </section>
    {!visiblePeople.length ? query.trim()?<div className="presence-panel presence-empty">{t.empty}</div>:<div className="presence-panel"><GuidedEmptyState icon={UserCheck} title={noPeopleGuide.title} body={noPeopleGuide.body} primary={canAddVisitor?{label:noPeopleGuide.primary,onClick:()=>setShowVisitor(true)}:displaySession?.status==='open'?{label:locale==='en'?'Open Help':locale==='es'?'Abrir Ayuda':'Abrir Ajuda',href:'/help'}:{label:t.newSession,onClick:()=>setShowSession(true)}} secondary={{label:noPeopleGuide.secondary||t.back,href:'/help'}}/></div> : null}
    <p className="presence-rule">{t.sourceRule}<br />{t.correctionRule}</p>
  </div>

  {showSession ? <SessionModal preset={seriesPreset} close={() => {setShowSession(false);setSeriesPreset(null)}} create={async (eventName, expected, eventTypeId, eligiblePersonIds, eventSeriesId, requestId) => {
    if (!access || !online) return
    setBusy(true); setError('')
    try {
      await createPresenceSession({ organizationId: access.organizationId, congregationId, actorId: access.userId, eventName, expectedPeopleCount: expected, minimumCoveragePercent: 90, eventTypeId, eligiblePersonIds, eventSeriesId, requestId })
      setShowSession(false)
      setSeriesPreset(null)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} eligiblePeople={people} locale={locale} online={online} /> : null}

  {showVisitor&&access ? <VisitorModal error={error} org={access.organizationId} canPick={access.isOwner||['owner','admin','pastor','data_admin'].includes(access.organizationRole)} close={() => setShowVisitor(false)} save={async (name, phone, consent, preferredContactChannel, claimBond,requestId,selection) => {
    if (!access || !displaySession || !online) return
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

function SessionModal({ close, create, eligiblePeople, locale, preset, online }: { close: () => void; create: (name: string, expected: number, eventTypeId: string, eligiblePersonIds: string[], eventSeriesId?: string,requestId?:string) => Promise<void>; eligiblePeople: PresencePerson[]; locale: AppLocale; preset:JourneyEventSeries|null; online:boolean }) {
  const t = presenceAssistCopy[locale]
  const [requestId] = useState(()=>crypto.randomUUID())
  const savingGuard=useRef(false)
  const [saving,setSaving]=useState(false)
  const [name, setName] = useState(`${preset?.title||t.todayEvent} · ${new Date().toLocaleDateString(locale)}`)
  const [eventTypeId, setEventTypeId] = useState<string>(preset?.eventTypeId||'general')
  const [eligibleSearch, setEligibleSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(preset?.eventTypeId==='youth'||preset?.eventTypeId==='special'?[]:eligiblePeople.map(person=>person.id)))
  const requiresSelection = eventTypeId === 'youth' || eventTypeId === 'special'
  const expected = selectedIds.size
  const visibleEligiblePeople = eligiblePeople.filter(person=>person.name.toLocaleLowerCase(locale).includes(eligibleSearch.trim().toLocaleLowerCase(locale)))
  const chooseEventType=(next:string)=>{
    setEventTypeId(next)
    setSelectedIds(new Set(next==='youth'||next==='special'?[]:eligiblePeople.map(person=>person.id)))
  }
  const submit=async()=>{
    if(savingGuard.current||!online)return
    savingGuard.current=true;setSaving(true)
    try {await create(name,expected,eventTypeId,[...selectedIds],preset?.id,requestId)}
    finally {savingGuard.current=false;setSaving(false)}
  }
  const copy = locale === 'en'
    ? {
        title: 'Record attendance',
        subtitle: 'Confirm the service and start marking who is present.',
        event: 'Service or gathering',
        people: 'People to check',
        peopleHint: 'Eligible people are frozen when the session opens. Visitors added later cannot inflate its coverage.',
        eventType: 'Gathering type',
        start: 'Start recording attendance',
      }
    : locale === 'es'
      ? {
          title: 'Registrar asistencia',
          subtitle: 'Confirma el culto y comienza a marcar quién está presente.',
          event: 'Culto o encuentro',
          people: 'Personas para revisar',
          peopleHint: 'Las personas elegibles se fijan al abrir la sesión. Los visitantes nuevos no inflan su cobertura.',
          eventType: 'Tipo de encuentro',
          start: 'Comenzar a registrar asistencia',
        }
      : {
          title: 'Registrar presença',
          subtitle: 'Confirme o culto e comece a marcar quem está presente.',
          event: 'Culto ou encontro',
          people: 'Pessoas para conferir',
          peopleHint: 'A lista elegível é congelada ao abrir a sessão. Visitantes incluídos depois não aumentam a cobertura.',
          eventType: 'Tipo de culto ou encontro',
          start: 'Começar a registrar presença',
        }

  return <div className="presence-modal-backdrop" onMouseDown={()=>{if(!saving)close()}}>
    <section className="presence-panel presence-modal" role="dialog" aria-modal="true" aria-labelledby="presence-session-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="presence-modal-header">
        <div><h2 id="presence-session-title">{copy.title}</h2><p>{copy.subtitle}</p></div>
        <button className="presence-modal-close" type="button" disabled={saving} onClick={close} aria-label={t.cancel}><X size={20} /></button>
      </div>
      <div className="presence-modal-grid">
        <label className="presence-field">
          <span>{copy.event}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <label className="presence-field"><span>{copy.eventType}</span><select value={eventTypeId} disabled={Boolean(preset)} onChange={event => chooseEventType(event.target.value)}><option value="general">{locale==='en'?'Regular gathering':locale==='es'?'Encuentro habitual':'Encontro habitual'}</option><option value="sunday">{locale==='en'?'Sunday service':locale==='es'?'Culto dominical':'Culto de domingo'}</option><option value="midweek">{locale==='en'?'Midweek service':locale==='es'?'Culto semanal':'Culto da semana'}</option><option value="youth">{locale==='en'?'Youth gathering':locale==='es'?'Encuentro juvenil':'Encontro de jovens'}</option><option value="special">{locale==='en'?'Special event':locale==='es'?'Evento especial':'Evento especial'}</option></select></label>
        <div className="presence-field presence-readonly-field">
          <span>{copy.people}</span>
          <strong>{expected}</strong>
          <small>{requiresSelection?(locale==='en'?'Select only the people expected at this special event.':locale==='es'?'Seleccione únicamente las personas elegibles de este evento.':'Selecione somente as pessoas elegíveis para este evento especial.'):copy.peopleHint}</small>
        </div>
      </div>
      {requiresSelection?<div className="presence-eligible-picker">
        <label className="presence-field"><span>{locale==='en'?'Search eligible people':locale==='es'?'Buscar personas elegibles':'Buscar pessoas elegíveis'}</span><input value={eligibleSearch} onChange={event=>setEligibleSearch(event.target.value)} placeholder={locale==='en'?'Search names':locale==='es'?'Buscar nombres':'Buscar nomes'}/></label>
        <div className="presence-eligible-options" role="group" aria-label={locale==='en'?'Eligible attendees':locale==='es'?'Personas elegibles':'Pessoas elegíveis'}>{visibleEligiblePeople.map(person=><label key={person.id}><input type="checkbox" checked={selectedIds.has(person.id)} onChange={event=>setSelectedIds(current=>{const next=new Set(current);if(event.target.checked)next.add(person.id);else next.delete(person.id);return next})}/><span>{person.name}</span></label>)}</div>
        <p>{locale==='en'?'Do not mark other people as absent in a special-event roster.':locale==='es'?'No marque como ausentes a personas fuera de este público.':'Não marque como ausentes pessoas fora do público deste evento.'}</p>
      </div>:null}
      <div className="presence-modal-actions">
        <button className="presence-button" disabled={saving} onClick={close}>{t.cancel}</button>
        <button className="presence-button primary" disabled={saving || !online || !name.trim() || (requiresSelection && expected === 0)} onClick={()=>void submit()}>{copy.start}</button>
      </div>
    </section>
  </div>
}

function VisitorModal({ close, save, locale,org,canPick,error }: { close: () => void; save: (name: string, phone: string, consent: boolean, preferredContactChannel: 'whatsapp' | 'phone' | undefined, claimBond: boolean,requestId:string,selection:DirectorySelection) => Promise<void>; locale: AppLocale;org:string;canPick:boolean;error:string }) {
  const t = presenceAssistCopy[locale]
  const bond = bondCopy(locale)
  const [requestId] = useState(()=>crypto.randomUUID())
  const [saving,setSaving] = useState(false)
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
  return <div className="presence-modal-backdrop" onMouseDown={()=>{if(!saving)close()}}><section className="presence-panel presence-modal visitor-form" role="dialog" aria-modal="true" aria-labelledby="presence-visitor-title" onMouseDown={(event) => event.stopPropagation()}><div className="presence-session-head"><h2 id="presence-visitor-title">{t.newVisitor}</h2><button className="presence-button" onClick={close} disabled={saving} aria-label={t.cancel}><X size={17} /></button></div><div className="presence-modal-grid"><label className="presence-field"><span>{t.visitorName}</span><input value={name} onChange={(event) => {setName(event.target.value);setSelection({})}} autoFocus /></label>{canPick?<DirectoryPersonPicker org={org} locale={locale} name={name} value={selection} onChange={setSelection}/>:null}<label className="presence-check"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) setPhone('') }} /><span>{t.consent}</span></label><label className="presence-field"><span>{t.phone}</span><input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!consent} aria-invalid={consent&&!phoneValid} /></label>{consent?<label className="presence-field"><span>{locale==='en'?'Preferred channel':locale==='es'?'Canal preferido':'Canal preferido'}</span><select value={preferredContactChannel} onChange={(event)=>setPreferredContactChannel(event.target.value as 'whatsapp'|'phone')}><option value="whatsapp">WhatsApp</option><option value="phone">{locale==='en'?'Phone call':locale==='es'?'Llamada':'Ligação'}</option></select></label>:null}{consent?<p className="coverage-note">{contactHint}</p>:null}<label className="presence-check"><input type="checkbox" checked={claimBond} onChange={(event) => setClaimBond(event.target.checked)} /><span>{bond.visitorClaim}</span></label></div>{error?<p className="journey-error" role="alert">{error}</p>:null}<div className="presence-modal-actions"><button className="presence-button" disabled={saving} onClick={close}>{t.cancel}</button><button className="presence-button primary" disabled={saving || !name.trim() || (consent && !phoneValid)} onClick={()=>void submit()}>{t.saveVisitor}</button></div></section></div>
}
