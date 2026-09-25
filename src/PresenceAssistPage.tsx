import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, HeartHandshake, ShieldCheck, UserCheck, X } from 'lucide-react'
import { auth } from './firebase'
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
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<PresencePerson[]>([])
  const [sessions, setSessions] = useState<PresenceSessionRecord[]>([])
  const [checks, setChecks] = useState<PresenceCheck[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showSession, setShowSession] = useState(false)
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
    setLoading(true)
    setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      if (!nextAccess.canManagePresence) return
      const nextCongregations = await listJourneyCongregations(nextAccess)
      setCongregations(nextCongregations)
      const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, nextCongregations)
      setCongregationId(unitId)
      if (unitId) await refreshScope(organizationId, unitId)
    } catch (cause) {
      console.error('Presence Assist bootstrap failed', cause)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [refreshScope, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

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

  async function markPresenceState(person: PresencePerson, state: Exclude<PresenceVerificationState, 'unverified'>) {
    if (!access || !displaySession || displaySession.status !== 'open') return
    const previous = latest.get(person.id)
    if (previous?.state === state) return
    if (state === 'absent_confirmed' && !window.confirm(t.confirmAbsent.replace('{name}', person.name))) return
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
        correctedFromCheckId: previous && previous.state !== 'unverified' ? previous.id : undefined,
      })
      setChecks(await listPresenceChecks(access.organizationId, congregationId, displaySession.id))
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function claimBond(person: PresencePerson) {
    if (!access || person.bondHostRef) return
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
    if (!access || !displaySession || displaySession.status !== 'closed') return
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
  const canAddVisitor=Boolean(access?.canManagePeople&&displaySession?.status==='open')
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

  if (loading) return <main className="presence-assist"><div className="presence-loading">{t.loading}</div></main>

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
          {label:t.close,onClick:()=>void closeSession(),disabled:busy},
        ]
        :[{label:t.newSession,onClick:()=>setShowSession(true),disabled:!congregationId||busy,primary:true}]
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

    <div className="presence-list-head" id="presence-people"><h2>{t.people} · {visiblePeople.length}</h2><span className="presence-badge"><ShieldCheck size={14} /> {t.sourceRule}</span></div>
    <section className="presence-grid">
      {visiblePeople.map((person) => {
        const current = latest.get(person.id)
        const present = current?.state === 'present_confirmed'
        const absent = current?.state === 'absent_confirmed'
        const absenceUsable = Boolean(displaySession?.status === 'closed' && confirmedAbsences.includes(person.id))
        const contactAllowed = Boolean(person.consent && person.phone)
        const routedToCare = routedAbsenceIds.has(person.id)
        return <article className="presence-panel presence-person" key={person.id}>
          <div className="presence-person-top"><span className="presence-avatar">{person.photoUrl ? <img src={person.photoUrl} alt="" /> : initials(person.name)}</span><div className="presence-person-name"><strong>{person.name}</strong><small>{person.visits ? `${person.visits}x` : t.notVerified}</small></div></div>
          <span className={`presence-state ${present ? 'confirmed' : absent ? 'absent' : ''}`}>{present ? t.present : absent ? t.absent : t.notVerified}{current?.correctedFromCheckId ? ` · ${t.correcting}` : ''}</span>
          <div className="presence-bond-row">
            <span className={`presence-bond-state ${person.bondHostRef ? 'assigned' : ''}`}><HeartHandshake size={14}/>{person.bondHostRef ? (person.bondHostRef === access.userId ? bond.mine : bond.assigned) : bond.none}</span>
            {!person.bondHostRef && displaySession?.status === 'open' ? <button className="presence-bond-button" disabled={busy} onClick={() => void claimBond(person)}>{bond.claim}</button> : null}
          </div>
          {absenceUsable ? <div className={`presence-absence-care ${contactAllowed ? '' : 'blocked'}`}>
            <HeartHandshake size={15}/>
            <div><strong>{routedToCare ? absenceCare.routed : contactAllowed ? absenceCare.route : absenceCare.noContact}</strong><p>{contactAllowed ? absenceCare.routeHint : absenceCare.noContactHint}</p></div>
            {contactAllowed && !routedToCare ? <button className="presence-bond-button" disabled={busy} onClick={() => void routeAbsenceToCare(person)}>{absenceCare.route}</button> : null}
          </div> : null}
          <div className="presence-person-actions">
            <button className={`presence-button ${present ? 'success' : 'primary'}`} disabled={busy || present || displaySession?.status !== 'open'} onClick={() => void markPresenceState(person, 'present_confirmed')}>{present ? <><Check size={17} /> {t.present}</> : t.markPresent}</button>
            <button className={`presence-button ${absent ? 'absence' : ''}`} disabled={busy || absent || displaySession?.status !== 'open'} onClick={() => void markPresenceState(person, 'absent_confirmed')}>{absent ? <><X size={17} /> {t.absent}</> : t.markAbsent}</button>
          </div>
        </article>
      })}
    </section>
    {!visiblePeople.length ? query.trim()?<div className="presence-panel presence-empty">{t.empty}</div>:<div className="presence-panel"><GuidedEmptyState icon={UserCheck} title={noPeopleGuide.title} body={noPeopleGuide.body} primary={canAddVisitor?{label:noPeopleGuide.primary,onClick:()=>setShowVisitor(true)}:displaySession?.status==='open'?{label:locale==='en'?'Open Help':locale==='es'?'Abrir Ayuda':'Abrir Ajuda',href:'/help'}:{label:t.newSession,onClick:()=>setShowSession(true)}} secondary={{label:noPeopleGuide.secondary||t.back,href:'/help'}}/></div> : null}
    <p className="presence-rule">{t.sourceRule}<br />{t.correctionRule}</p>
  </div>

  {showSession ? <SessionModal close={() => setShowSession(false)} create={async (eventName, expected, minimum) => {
    if (!access) return
    setBusy(true); setError('')
    try {
      await createPresenceSession({ organizationId: access.organizationId, congregationId, actorId: access.userId, eventName, expectedPeopleCount: expected, minimumCoveragePercent: minimum })
      setShowSession(false)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} defaultExpected={people.length} locale={locale} /> : null}

  {showVisitor ? <VisitorModal close={() => setShowVisitor(false)} save={async (name, phone, consent, claimBond) => {
    if (!access || !displaySession) return
    setBusy(true); setError('')
    try {
      const person = await createMinimalVisitor({ organizationId: access.organizationId, congregationId, actorId: access.userId, name, phone, consent })
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
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} locale={locale} /> : null}
  </main>
}

function SessionModal({ close, create, defaultExpected, locale }: { close: () => void; create: (name: string, expected: number, minimum: number) => Promise<void>; defaultExpected: number; locale: AppLocale }) {
  const t = presenceAssistCopy[locale]
  const [name, setName] = useState(`${t.todayEvent} · ${new Date().toLocaleDateString(locale)}`)
  const [expected, setExpected] = useState(Math.max(1, defaultExpected))
  const [minimum, setMinimum] = useState(90)
  return <div className="presence-modal-backdrop" onMouseDown={close}><section className="presence-panel presence-modal" role="dialog" aria-modal="true" aria-labelledby="presence-session-title" onMouseDown={(event) => event.stopPropagation()}><div className="presence-session-head"><h2 id="presence-session-title">{t.newSession}</h2><button className="presence-button" onClick={close} aria-label={t.cancel}><X size={17} /></button></div><div className="presence-modal-grid"><label className="presence-field"><span>{t.sessionName}</span><input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="presence-field"><span>{t.expected}</span><input type="number" min={1} value={expected} onChange={(event) => setExpected(Number(event.target.value))} /></label><label className="presence-field"><span>{t.minimumCoverage}</span><input type="number" min={0} max={100} value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} /></label></div><div className="presence-modal-actions"><button className="presence-button" onClick={close}>{t.cancel}</button><button className="presence-button primary" disabled={!name.trim() || expected < 1} onClick={() => void create(name, expected, minimum)}>{t.open}</button></div></section></div>
}

function VisitorModal({ close, save, locale }: { close: () => void; save: (name: string, phone: string, consent: boolean, claimBond: boolean) => Promise<void>; locale: AppLocale }) {
  const t = presenceAssistCopy[locale]
  const bond = bondCopy(locale)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [claimBond, setClaimBond] = useState(true)
  return <div className="presence-modal-backdrop" onMouseDown={close}><section className="presence-panel presence-modal visitor-form" role="dialog" aria-modal="true" aria-labelledby="presence-visitor-title" onMouseDown={(event) => event.stopPropagation()}><div className="presence-session-head"><h2 id="presence-visitor-title">{t.newVisitor}</h2><button className="presence-button" onClick={close} aria-label={t.cancel}><X size={17} /></button></div><div className="presence-modal-grid"><label className="presence-field"><span>{t.visitorName}</span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label><label className="presence-field"><span>{t.phone}</span><input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!consent} /></label><label className="presence-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t.consent}</span></label><label className="presence-check"><input type="checkbox" checked={claimBond} onChange={(event) => setClaimBond(event.target.checked)} /><span>{bond.visitorClaim}</span></label></div><div className="presence-modal-actions"><button className="presence-button" onClick={close}>{t.cancel}</button><button className="presence-button primary" disabled={!name.trim()} onClick={() => void save(name, phone, consent, claimBond)}>{t.saveVisitor}</button></div></section></div>
}
