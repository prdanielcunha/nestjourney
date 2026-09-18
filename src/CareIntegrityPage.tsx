import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, Clock3, HeartHandshake, Plus, ShieldCheck, X } from 'lucide-react'
import { auth } from './firebase'
import { evaluateCarePromise } from './intelligence'
import {
  careRequestToPromise,
  claimCareRequest,
  createCareRequest,
  getActiveJourneyOrganizationId,
  listCareRequests,
  listJourneyCongregations,
  listPresencePeople,
  loadJourneyAccess,
  resolveCareRequest,
  type CareRequestRecord,
  type CareResolutionCode,
  type CareType,
  type JourneyAccessContext,
  type JourneyCongregation,
  type PresencePerson,
} from './journeyRepository'
import { careIntegrityCopy, getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import './CareIntegrityPage.css'

type CareTab = 'attention' | 'open' | 'resolved'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function formatDistance(ms: number) {
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)))
  return `${hours}h`
}

export default function CareIntegrityPage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = careIntegrityCopy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<PresencePerson[]>([])
  const [requests, setRequests] = useState<CareRequestRecord[]>([])
  const [tab, setTab] = useState<CareTab>('attention')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [resolving, setResolving] = useState<CareRequestRecord | null>(null)

  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const evaluated = useMemo(() => requests.map((request) => ({
    request,
    evaluation: evaluateCarePromise(careRequestToPromise(request)),
  })), [requests])

  const debtCount = evaluated.filter((item) => item.evaluation.state === 'debt').length
  const dueSoonCount = evaluated.filter((item) => item.evaluation.state === 'due_soon').length
  const unassignedCount = requests.filter((item) => item.status === 'open' && !item.ownerRef).length
  const myOpenCount = requests.filter((item) => item.status === 'open' && item.ownerRef === access?.userId).length

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale)
    return evaluated.filter(({ request, evaluation }) => {
      const person = personById.get(request.personId)
      const matchesTab = tab === 'resolved'
        ? request.status === 'resolved'
        : tab === 'attention'
          ? request.status === 'open' && (evaluation.state === 'debt' || evaluation.state === 'due_soon' || !request.ownerRef)
          : request.status === 'open'
      const matchesQuery = !needle || person?.name.toLocaleLowerCase(locale).includes(needle)
      return matchesTab && matchesQuery
    }).sort((a, b) => {
      const weight = (state: string) => state === 'debt' ? 0 : state === 'due_soon' ? 1 : state === 'open' ? 2 : 3
      return weight(a.evaluation.state) - weight(b.evaluation.state) || Date.parse(a.request.dueAt) - Date.parse(b.request.dueAt)
    })
  }, [evaluated, locale, personById, query, tab])

  const refreshScope = useCallback(async (orgId: string, unitId: string) => {
    const [nextPeople, nextRequests] = await Promise.all([
      listPresencePeople(orgId, unitId),
      listCareRequests(orgId, unitId),
    ])
    setPeople(nextPeople)
    setRequests(nextRequests)
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
      if (!nextAccess.canManageCare) return
      const nextCongregations = await listJourneyCongregations(nextAccess)
      setCongregations(nextCongregations)
      const unitId = nextCongregations[0]?.id ?? ''
      setCongregationId(unitId)
      if (unitId) await refreshScope(organizationId, unitId)
    } catch (cause) {
      console.error('Care Integrity bootstrap failed', cause)
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

  async function claim(request: CareRequestRecord) {
    if (!access || request.ownerRef) return
    setBusy(true)
    setError('')
    try {
      await claimCareRequest({ organizationId: access.organizationId, request, actorId: access.userId })
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  if (loading) return <main className="care-integrity"><div className="care-loading">{t.loading}</div></main>

  if (!access?.canManageCare) {
    return <main className="care-integrity"><section className="care-panel care-no-access"><ShieldCheck size={34} /><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="care-button" onClick={() => void bootstrap()}>{t.retry}</button></section></main>
  }

  return <main className="care-integrity"><div className="care-shell">
    <header className="care-topbar">
      <div className="care-brand"><img src="/icon.svg" alt="" /><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="care-actions">
        <a href="/"><ChevronLeft size={16} /> {t.back}</a>
        <select value={locale} aria-label="Language" onChange={(event) => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>{(Object.keys(localeLabels) as AppLocale[]).map((id) => <option value={id} key={id}>{localeLabels[id]}</option>)}</select>
      </div>
    </header>

    <section className="care-hero">
      <div><span className="care-kicker">Journey / Care Integrity</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <button className="care-button primary" onClick={() => setShowNew(true)} disabled={busy || !people.length}><Plus size={17} /> {t.newRequest}</button>
    </section>

    {error ? <div className="care-error" role="alert">{error}</div> : null}

    <section className="care-metrics">
      <button className="care-panel care-metric debt" onClick={() => setTab('attention')}><AlertTriangle size={18} /><span>{t.debt}</span><strong>{debtCount}</strong><small>{t.debtHint}</small></button>
      <button className="care-panel care-metric" onClick={() => setTab('attention')}><Clock3 size={18} /><span>{t.dueSoon}</span><strong>{dueSoonCount}</strong><small>{t.dueSoonHint}</small></button>
      <button className="care-panel care-metric" onClick={() => setTab('attention')}><HeartHandshake size={18} /><span>{t.unassigned}</span><strong>{unassignedCount}</strong><small>{t.unassignedHint}</small></button>
      <button className="care-panel care-metric" onClick={() => setTab('open')}><CheckCircle2 size={18} /><span>{t.myLoad}</span><strong>{myOpenCount}/10</strong><small>{myOpenCount >= 10 ? t.loadLimit : t.loadHealthy}</small></button>
    </section>

    <section className="care-panel care-toolbar">
      <label className="care-field"><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>
      <label className="care-field"><span>{t.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
    </section>

    <div className="care-tabs">
      <button className={tab === 'attention' ? 'active' : ''} onClick={() => setTab('attention')}>{t.attention} <b>{debtCount + dueSoonCount + unassignedCount}</b></button>
      <button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>{t.open}</button>
      <button className={tab === 'resolved' ? 'active' : ''} onClick={() => setTab('resolved')}>{t.resolved}</button>
    </div>

    <section className="care-list">
      {visible.map(({ request, evaluation }) => {
        const person = personById.get(request.personId)
        const canResolve = Boolean(request.ownerRef === access.userId || access.broadJourneyAccess)
        const stateLabel = evaluation.state === 'debt' ? t.debt : evaluation.state === 'due_soon' ? t.dueSoon : evaluation.state === 'resolved' ? t.resolved : t.open
        return <article className="care-panel care-card" key={request.id}>
          <div className="care-person"><span className="care-avatar">{initials(person?.name ?? '?')}</span><div><strong>{person?.name ?? t.unknownPerson}</strong><small>{t.careTypes[request.careType]}</small></div><span className={`care-state ${evaluation.state}`}>{stateLabel}</span></div>
          <div className="care-card-grid">
            <div><span>{t.promise}</span><strong>{new Date(request.dueAt).toLocaleString(locale)}</strong><small>{evaluation.state === 'debt' ? `${t.overdueBy} ${formatDistance(evaluation.overdueMs)}` : evaluation.state === 'due_soon' ? `${t.remaining} ${formatDistance(evaluation.remainingMs)}` : request.status === 'resolved' ? t.promiseResolved : `${request.promiseHours}h`}</small></div>
            <div><span>{t.owner}</span><strong>{request.ownerRef ? (request.ownerRef === access.userId ? t.you : t.assigned) : t.unassigned}</strong><small>{request.source === 'visitor_registration' ? t.fromVisitor : t.manual}</small></div>
          </div>
          {request.summary ? <p className="care-summary">{request.summary}</p> : null}
          <div className="care-card-actions">
            {!request.ownerRef && request.status === 'open' ? <button className="care-button" disabled={busy} onClick={() => void claim(request)}>{t.claim}</button> : null}
            {request.status === 'open' && request.ownerRef ? <button className="care-button primary" disabled={busy || !canResolve} onClick={() => setResolving(request)}><CheckCircle2 size={16} /> {t.recordOutcome}</button> : null}
            {request.status === 'resolved' ? <span className="care-resolution"><CheckCircle2 size={16} /> {request.resolutionCode ? t.resolutions[request.resolutionCode] : t.resolved}</span> : null}
          </div>
        </article>
      })}
    </section>

    {!visible.length ? <div className="care-panel care-empty">{t.empty}</div> : null}
    <p className="care-rule"><ShieldCheck size={15} /> {t.privacyRule}</p>
  </div>

  {showNew ? <NewCareModal locale={locale} people={people} close={() => setShowNew(false)} save={async (personId, careType, promiseHours, summary) => {
    setBusy(true); setError('')
    try {
      await createCareRequest({ organizationId: access.organizationId, congregationId, personId, actorId: access.userId, careType, promiseHours, summary })
      setShowNew(false)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} /> : null}

  {resolving ? <ResolveCareModal locale={locale} close={() => setResolving(null)} save={async (resolutionCode, resolutionNote) => {
    setBusy(true); setError('')
    try {
      await resolveCareRequest({ organizationId: access.organizationId, request: resolving, actorId: access.userId, resolutionCode, resolutionNote })
      setResolving(null)
      await refreshScope(access.organizationId, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} /> : null}
  </main>
}

function NewCareModal({ locale, people, close, save }: { locale: AppLocale; people: PresencePerson[]; close: () => void; save: (personId: string, careType: CareType, promiseHours: number, summary: string) => Promise<void> }) {
  const t = careIntegrityCopy[locale]
  const [personId, setPersonId] = useState(people[0]?.id ?? '')
  const [careType, setCareType] = useState<CareType>('first_contact')
  const [promiseHours, setPromiseHours] = useState(48)
  const [summary, setSummary] = useState('')
  const person = people.find((item) => item.id === personId)
  const needsConsent = careType === 'first_contact' || careType === 'absence_check'
  const blockedByConsent = Boolean(needsConsent && (!person?.consent || !person.phone))

  return <div className="care-modal-backdrop" onMouseDown={close}><section className="care-panel care-modal" role="dialog" aria-modal="true" aria-labelledby="care-new-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="care-modal-head"><div><span className="care-kicker">Care Request</span><h2 id="care-new-title">{t.newRequest}</h2></div><button className="care-button" onClick={close} aria-label={t.cancel}><X size={17} /></button></div>
    <div className="care-modal-grid">
      <label className="care-field"><span>{t.person}</span><select value={personId} onChange={(event) => setPersonId(event.target.value)}>{people.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label className="care-field"><span>{t.type}</span><select value={careType} onChange={(event) => setCareType(event.target.value as CareType)}>{(Object.keys(t.careTypes) as CareType[]).map((id) => <option value={id} key={id}>{t.careTypes[id]}</option>)}</select></label>
      <label className="care-field"><span>{t.promiseWindow}</span><select value={promiseHours} onChange={(event) => setPromiseHours(Number(event.target.value))}><option value={24}>24h</option><option value={48}>48h</option><option value={72}>72h</option></select></label>
      <label className="care-field"><span>{t.operationalNote}</span><textarea maxLength={160} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={t.notePlaceholder} /></label>
      {blockedByConsent ? <p className="care-warning"><AlertTriangle size={16} /> {t.contactNeedsConsent}</p> : null}
    </div>
    <div className="care-modal-actions"><button className="care-button" onClick={close}>{t.cancel}</button><button className="care-button primary" disabled={!personId || blockedByConsent} onClick={() => void save(personId, careType, promiseHours, summary)}>{t.create}</button></div>
  </section></div>
}

function ResolveCareModal({ locale, close, save }: { locale: AppLocale; close: () => void; save: (code: CareResolutionCode, note: string) => Promise<void> }) {
  const t = careIntegrityCopy[locale]
  const [code, setCode] = useState<CareResolutionCode>('contact_completed')
  const [note, setNote] = useState('')
  return <div className="care-modal-backdrop" onMouseDown={close}><section className="care-panel care-modal" role="dialog" aria-modal="true" aria-labelledby="care-resolve-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="care-modal-head"><div><span className="care-kicker">Outcome</span><h2 id="care-resolve-title">{t.recordOutcome}</h2></div><button className="care-button" onClick={close} aria-label={t.cancel}><X size={17} /></button></div>
    <div className="care-modal-grid">
      <label className="care-field"><span>{t.outcome}</span><select value={code} onChange={(event) => setCode(event.target.value as CareResolutionCode)}>{(Object.keys(t.resolutions) as CareResolutionCode[]).map((id) => <option value={id} key={id}>{t.resolutions[id]}</option>)}</select></label>
      <label className="care-field"><span>{t.operationalNote}</span><textarea maxLength={160} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t.resolutionPlaceholder} /></label>
    </div>
    <p className="care-rule"><ShieldCheck size={15} /> {t.outcomeRule}</p>
    <div className="care-modal-actions"><button className="care-button" onClick={close}>{t.cancel}</button><button className="care-button primary" onClick={() => void save(code, note)}>{t.resolve}</button></div>
  </section></div>
}
