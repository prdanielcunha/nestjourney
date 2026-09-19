import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, Plus, ShieldCheck, UserCheck, X } from 'lucide-react'
import { auth } from './firebase'
import { calculatePresenceCoverage, type PresenceCheck } from './intelligence'
import {
  closePresenceSession,
  createMinimalVisitor,
  createPresenceSession,
  getActiveJourneyOrganizationId,
  latestChecksByPerson,
  listJourneyCongregations,
  listPresenceChecks,
  listPresencePeople,
  listPresenceSessions,
  listMesaParticipationRecords,
  loadJourneyAccess,
  recordPresenceCheck,
  setMesaParticipation,
  type JourneyAccessContext,
  type JourneyCongregation,
  type PresencePerson,
  type PresenceSessionRecord,
  type MesaParticipationRecord,
} from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, presenceAssistCopy, type AppLocale } from './i18n'
import './PresenceAssistPage.css'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

export default function PresenceAssistPage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = presenceAssistCopy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<PresencePerson[]>([])
  const [sessions, setSessions] = useState<PresenceSessionRecord[]>([])
  const [checks, setChecks] = useState<PresenceCheck[]>([])
  const [mesa, setMesa] = useState<MesaParticipationRecord[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showSession, setShowSession] = useState(false)
  const [showVisitor, setShowVisitor] = useState(false)

  const displaySession = sessions.find((item) => item.status === 'open') ?? sessions[0]
  const latest = useMemo(() => latestChecksByPerson(checks), [checks])
  const coverage = useMemo(
    () => displaySession ? calculatePresenceCoverage(displaySession, checks) : null,
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
      const [nextChecks, nextMesa] = await Promise.all([
        listPresenceChecks(orgId, unitId, session.id),
        listMesaParticipationRecords(orgId, unitId, session.id),
      ])
      setChecks(nextChecks)
      setMesa(nextMesa)
    } else {
      setChecks([])
      setMesa([])
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
      const unitId = nextCongregations[0]?.id ?? ''
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

  async function selectCongregation(unitId: string) {
    if (!access) return
    setCongregationId(unitId)
    setBusy(true)
    setError('')
    try { await refreshScope(access.organizationId, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function markPresent(person: PresencePerson) {
    if (!access || !displaySession || displaySession.status !== 'open') return
    const previous = latest.get(person.id)
    if (previous?.state === 'present_confirmed') return
    setBusy(true)
    setError('')
    try {
      await recordPresenceCheck({
        organizationId: access.organizationId,
        congregationId,
        sessionId: displaySession.id,
        personId: person.id,
        actorId: access.userId,
        state: 'present_confirmed',
        correctedFromCheckId: previous?.id,
      })
      setChecks(await listPresenceChecks(access.organizationId, congregationId, displaySession.id))
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function markMesa(person: PresencePerson, status: 'invited' | 'joined') {
    if (!access || !displaySession || displaySession.status !== 'open') return
    const presence = latest.get(person.id)
    if (presence?.state !== 'present_confirmed') return
    setBusy(true)
    setError('')
    try {
      await setMesaParticipation({
        organizationId: access.organizationId,
        congregationId,
        sessionId: displaySession.id,
        personId: person.id,
        actorId: access.userId,
        status,
      })
      setMesa(await listMesaParticipationRecords(access.organizationId, congregationId, displaySession.id))
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function closeSession() {
    if (!access || !displaySession || displaySession.status !== 'open') return
    if (!window.confirm(t.confirmClose)) return
    setBusy(true)
    setError('')
    try {
      await closePresenceSession(access.organizationId, displaySession.id, access.userId)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  if (loading) return <main className="presence-assist"><div className="presence-loading">{t.loading}</div></main>

  if (!access?.canManagePresence) {
    return <main className="presence-assist"><section className="presence-panel presence-no-access"><ShieldCheck size={34} /><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="presence-button" onClick={() => void bootstrap()}>{t.retry}</button></section></main>
  }

  return <main className="presence-assist"><div className="presence-shell">
    <header className="presence-topbar">
      <div className="presence-brand"><img src="/icon.svg" alt="" /><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="presence-actions">
        <a href="/"><ChevronLeft size={16} /> {t.back}</a>
        <select value={locale} aria-label="Language" onChange={(event) => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>{(Object.keys(localeLabels) as AppLocale[]).map((id) => <option value={id} key={id}>{localeLabels[id]}</option>)}</select>
      </div>
    </header>

    <section className="presence-hero">
      <div><span className="presence-kicker">Journey / Presence</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      {displaySession?.status === 'open' ? <button className="presence-button" onClick={() => void closeSession()} disabled={busy}>{t.close}</button> : <button className="presence-button primary" onClick={() => setShowSession(true)} disabled={!congregationId || busy}><Plus size={17} /> {t.newSession}</button>}
    </section>

    {error ? <div className="presence-error" role="alert">{error}</div> : null}

    <section className="presence-panel presence-toolbar">
      <label className="presence-field"><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>
      <label className="presence-field"><span>{t.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
      {access.canManagePeople && displaySession?.status === 'open' ? <button className="presence-button" onClick={() => setShowVisitor(true)}><Plus size={17} /> {t.newVisitor}</button> : <span />}
    </section>

    {displaySession ? <section className="presence-panel presence-session-card">
      <div className="presence-session-head"><div><span className="presence-kicker">{t.session}</span><h2>{displaySession.eventName ?? new Date(displaySession.openedAt).toLocaleString(locale)}</h2><p>{new Date(displaySession.openedAt).toLocaleString(locale)} · {displaySession.status === 'closed' ? t.closed : displaySession.eventRef}</p></div><span className="presence-badge"><UserCheck size={15} /> {displaySession.status === 'open' ? t.session : t.closed}</span></div>
      <div className="presence-mesa-summary"><div><span className="presence-kicker">{t.mesa}</span><strong>{mesa.filter(item => item.status === 'joined').length}</strong><small>{t.mesaJoined}</small></div><p>{t.mesaHint}</p></div>
      {coverage ? <><div className="coverage-wrap"><span className="coverage-number">{coverage.percent}%</span><div className="coverage-track" aria-label={`${t.coverage}: ${coverage.percent}%`}><span style={{ width: `${coverage.percent}%` }} /></div><div className="coverage-meta">{coverage.verified} {t.verified}<br />{coverage.unverified} {t.unverified}</div></div><p className="coverage-note">{coverage.meetsMinimum ? t.qualityReady : t.qualityNotReady}</p></> : null}
    </section> : <div className="presence-panel presence-empty">{t.noSession}</div>}

    <div className="presence-list-head"><h2>{t.people} · {visiblePeople.length}</h2><span className="presence-badge"><ShieldCheck size={14} /> {t.sourceRule}</span></div>
    <section className="presence-grid">
      {visiblePeople.map((person) => {
        const current = latest.get(person.id)
        const confirmed = current?.state === 'present_confirmed'
        return <article className="presence-panel presence-person" key={person.id}>
          <div className="presence-person-top"><span className="presence-avatar">{person.photoUrl ? <img src={person.photoUrl} alt="" /> : initials(person.name)}</span><div className="presence-person-name"><strong>{person.name}</strong><small>{person.visits ? `${person.visits}x` : t.notVerified}</small></div></div>
          <span className={`presence-state ${confirmed ? 'confirmed' : ''}`}>{confirmed ? t.present : t.notVerified}{current?.correctedFromCheckId ? ` · ${t.correcting}` : ''}</span>
          <button className={`presence-button ${confirmed ? 'success' : 'primary'}`} disabled={busy || confirmed || displaySession?.status !== 'open'} onClick={() => void markPresent(person)}>{confirmed ? <><Check size={17} /> {t.present}</> : t.markPresent}</button>
          {(() => {
            const mesaRecord = mesa.find(item => item.personId === person.id)
            const joined = mesaRecord?.status === 'joined'
            const invited = mesaRecord?.status === 'invited'
            return <div className="presence-mesa-actions">
              <span><b>{t.mesa}</b><small>{joined ? t.mesaJoined : invited ? t.mesaInvited : confirmed ? t.mesaHint : t.mesaNeedsPresence}</small></span>
              {!joined ? <button className="presence-button" disabled={busy || !confirmed || displaySession?.status !== 'open' || invited} onClick={() => void markMesa(person, 'invited')}>{invited ? <><Check size={15}/>{t.mesaInvited}</> : t.inviteMesa}</button> : null}
              <button className={`presence-button ${joined ? 'success' : ''}`} disabled={busy || !confirmed || joined || displaySession?.status !== 'open'} onClick={() => void markMesa(person, 'joined')}>{joined ? <><Check size={15}/>{t.mesaJoined}</> : t.markMesaJoined}</button>
            </div>
          })()}
        </article>
      })}
    </section>
    {!visiblePeople.length ? <div className="presence-panel presence-empty">{t.empty}</div> : null}
    <p className="presence-rule">{t.sourceRule}</p>
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

  {showVisitor ? <VisitorModal close={() => setShowVisitor(false)} save={async (name, phone, consent) => {
    if (!access || !displaySession) return
    setBusy(true); setError('')
    try {
      const person = await createMinimalVisitor({ organizationId: access.organizationId, congregationId, actorId: access.userId, name, phone, consent })
      await recordPresenceCheck({ organizationId: access.organizationId, congregationId, sessionId: displaySession.id, personId: person.id, actorId: access.userId, state: 'present_confirmed' })
      setShowVisitor(false)
      await refreshScope(access.organizationId, congregationId)
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

function VisitorModal({ close, save, locale }: { close: () => void; save: (name: string, phone: string, consent: boolean) => Promise<void>; locale: AppLocale }) {
  const t = presenceAssistCopy[locale]
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  return <div className="presence-modal-backdrop" onMouseDown={close}><section className="presence-panel presence-modal visitor-form" role="dialog" aria-modal="true" aria-labelledby="presence-visitor-title" onMouseDown={(event) => event.stopPropagation()}><div className="presence-session-head"><h2 id="presence-visitor-title">{t.newVisitor}</h2><button className="presence-button" onClick={close} aria-label={t.cancel}><X size={17} /></button></div><div className="presence-modal-grid"><label className="presence-field"><span>{t.visitorName}</span><input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label><label className="presence-field"><span>{t.phone}</span><input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!consent} /></label><label className="presence-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t.consent}</span></label></div><div className="presence-modal-actions"><button className="presence-button" onClick={close}>{t.cancel}</button><button className="presence-button primary" disabled={!name.trim()} onClick={() => void save(name, phone, consent)}>{t.saveVisitor}</button></div></section></div>
}
