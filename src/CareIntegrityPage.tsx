import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, Copy, HeartHandshake, MessageSquareText, ShieldCheck, X } from 'lucide-react'
import { auth } from './firebase'
import { evaluateCarePromise } from './intelligence'
import {
  careRequestToPromise,
  claimCareRequest,
  completeJourneyFollowup,
  createCareRequest,
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyFollowups,
  listPresencePeople,
  loadJourneyAccess,
  resolveCareRequest,
  subscribeJourneyLiveChanges,
  type CareRequestRecord,
  type CareResolutionCode,
  type CareType,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyFollowupRecord,
  type PresencePerson,
} from './journeyRepository'
import { careIntegrityCopy, getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './CareIntegrityPage.css'

type CareTab = 'attention' | 'open' | 'resolved'

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

function formatDistance(ms: number) {
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)))
  return `${hours}h`
}

function suggestedFirstContact(locale: AppLocale, name: string) {
  const firstName = name.trim().split(' ')[0] || name
  if (locale === 'en') return `Hi, ${firstName}. It was good to have you with us. Thank you for coming. If you would like to talk or ask for prayer, we are here for you.`
  if (locale === 'es') return `Hola, ${firstName}. Fue una alegría tenerte con nosotros. Gracias por venir. Si quieres conversar o pedir oración, estamos aquí para ti.`
  return `Oi, ${firstName}. Foi uma alegria ter você com a gente. Obrigado por estar conosco. Se quiser conversar ou pedir oração, estamos por aqui.`
}

function suggestedMessageLabel(locale: AppLocale) {
  if (locale === 'en') return { title: 'Suggested message', copy: 'Copy message', hint: 'Use as a starting point and keep the conversation human.' }
  if (locale === 'es') return { title: 'Mensaje sugerido', copy: 'Copiar mensaje', hint: 'Úsalo como punto de partida y mantén la conversación humana.' }
  return { title: 'Mensagem sugerida', copy: 'Copiar mensagem', hint: 'Use como ponto de partida e mantenha a conversa humana.' }
}

export default function CareIntegrityPage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const baseCopy = careIntegrityCopy[locale]
  const { labels } = useJourneyLabels()
  const t = { ...baseCopy, title: labels.care || baseCopy.title }
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<PresencePerson[]>([])
  const [requests, setRequests] = useState<CareRequestRecord[]>([])
  const [followups, setFollowups] = useState<JourneyFollowupRecord[]>([])
  const [tab, setTab] = useState<CareTab>('attention')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [resolving, setResolving] = useState<CareRequestRecord | null>(null)

  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const lensRequests = useMemo(() => {
    if (!access || access.broadJourneyAccess) return requests
    return requests.filter((request) =>
      request.ownerRef === access.userId || (request.status === 'open' && !request.ownerRef),
    )
  }, [access, requests])
  const evaluated = useMemo(() => lensRequests.map((request) => ({
    request,
    evaluation: evaluateCarePromise(careRequestToPromise(request)),
  })), [lensRequests])
  const followupByCare = useMemo(() => new Map(followups.map((item) => [item.careRequestId, item])), [followups])

  const debtCount = evaluated.filter((item) => item.evaluation.state === 'debt').length
  const dueSoonCount = evaluated.filter((item) => item.evaluation.state === 'due_soon').length
  const unassignedCount = lensRequests.filter((item) => item.status === 'open' && !item.ownerRef).length
  const myOpenCount = lensRequests.filter((item) => item.status === 'open' && item.ownerRef === access?.userId).length
  const attentionCount = debtCount + dueSoonCount + unassignedCount
  const activeUnit = congregations.find((item) => item.id === congregationId)
  const focusTitle = attentionCount > 0
    ? locale === 'en' ? attentionCount+' care item(s) need attention' : locale === 'es' ? attentionCount+' cuidado(s) necesitan atención' : attentionCount+' cuidado(s) precisam de atenção'
    : locale === 'en' ? 'No urgent care right now' : locale === 'es' ? 'Ningún cuidado urgente ahora' : 'Nenhum cuidado urgente agora'
  const focusBody = attentionCount > 0
    ? locale === 'en' ? 'Start with overdue promises, then what is due soon, then anything without an owner. The list is already ordered for you.'
      : locale === 'es' ? 'Empieza por las promesas vencidas, después las próximas a vencer y luego lo que todavía no tiene responsable. La lista ya está ordenada.'
      : 'Comece pelas promessas vencidas, depois pelas que vencem em breve e então pelo que ainda está sem responsável. A lista já está ordenada.'
    : locale === 'en' ? 'You are caught up. Review your open contacts only if you need to prepare the next step; there is no need to hunt for hidden work.'
      : locale === 'es' ? 'Estás al día. Revisa tus contactos abiertos solo si necesitas preparar el próximo paso; no hay trabajo oculto para buscar.'
      : 'Você está em dia. Revise seus contatos abertos apenas se precisar preparar o próximo passo; não há trabalho escondido para procurar.'

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

  const refreshScope = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    const [nextPeople, nextRequests, nextFollowups] = await Promise.all([
      listPresencePeople(nextAccess.organizationId, unitId),
      listCareRequests(nextAccess.organizationId, unitId),
      listJourneyFollowups(nextAccess, unitId),
    ])
    setPeople(nextPeople)
    setRequests(nextRequests)
    setFollowups(nextFollowups)
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
      const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, nextCongregations)
      setCongregationId(unitId)
      if (unitId) await refreshScope(nextAccess, unitId)
    } catch (cause) {
      console.error('Care Integrity bootstrap failed', cause)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [refreshScope, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  useEffect(() => {
    if (!access?.canManageCare || !congregationId) return
    return subscribeJourneyLiveChanges({
      organizationId: access.organizationId,
      congregationId,
      collections: ['people', 'careRequests', 'followups'],
      onChange: () => { void refreshScope(access, congregationId).catch((cause) => console.error('Care live refresh failed', cause)) },
      onError: (cause) => console.error('Care live subscription failed', cause),
    })
  }, [access, congregationId, refreshScope])

  async function selectCongregation(unitId: string) {
    if (!access) return
    setCongregationId(unitId)
    setActiveJourneyCongregationId(access.organizationId,unitId)
    setBusy(true)
    setError('')
    try { await refreshScope(access, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function claim(request: CareRequestRecord) {
    if (!access || request.ownerRef) return
    setBusy(true)
    setError('')
    try {
      await claimCareRequest({ organizationId: access.organizationId, request, actorId: access.userId })
      await refreshScope(access, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  async function closeRevokedContact(request: CareRequestRecord) {
    if (!access || request.status !== 'open') return
    const followup = followupByCare.get(request.id)
    const canClose = !request.ownerRef || request.ownerRef === access.userId || access.broadJourneyAccess
    if (!canClose || !window.confirm(t.confirmCloseRevoked)) return
    setBusy(true)
    setError('')
    try {
      if (followup?.status === 'pending') {
        if (followup.ownerRef !== access.userId) throw new Error('followup_owner_required')
        await completeJourneyFollowup({ access, followup, request, outcomeCode: 'consent_revoked' })
      } else {
        await resolveCareRequest({
          organizationId: access.organizationId,
          request,
          actorId: access.userId,
          resolutionCode: 'consent_revoked',
          resolutionNote: '',
        })
      }
      await refreshScope(access, congregationId)
    } catch (cause) {
      console.error(cause)
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  const emptyKey = tab==='attention'?'care_attention_clear':tab==='open'?'care_open_none':'care_resolved_none'
  const empty = emptyGuidance(locale,emptyKey)

  if (loading) return <main className="care-integrity"><div className="care-loading">{t.loading}</div></main>

  if (!access?.canManageCare) {
    return <main className="care-integrity"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={() => void bootstrap()} /></main>
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
    </section>

    {error ? <div className="care-error" role="alert">{error}</div> : null}

    <JourneyAreaFocus
      locale={locale}
      title={focusTitle}
      body={focusBody}
      context={activeUnit?.name}
      metrics={[
        {label:t.debt,value:debtCount,tone:debtCount>0?'attention':'muted'},
        {label:t.dueSoon,value:dueSoonCount,tone:dueSoonCount>0?'attention':'muted'},
        {label:t.unassigned,value:unassignedCount,tone:unassignedCount>0?'attention':'muted'},
        {label:t.myLoad,value:myOpenCount+'/10',tone:myOpenCount>=10?'attention':myOpenCount>0?'good':'muted'},
      ]}
      actions={[
        {label:attentionCount>0?t.attention:t.open,onClick:()=>{setTab(attentionCount>0?'attention':'open');document.getElementById('care-worklist')?.scrollIntoView({behavior:'smooth',block:'start'})},primary:true},
        {label:t.newRequest,onClick:()=>setShowNew(true),disabled:busy||!people.length},
      ]}
    />

    <section className="journey-area-toolbar">
      {congregations.length>1?<label><span>{t.congregation}</span><select value={congregationId} onChange={(event) => void selectCongregation(event.target.value)} disabled={busy}>{congregations.map((item) => <option value={item.id} key={item.id}>{item.name}{item.city ? ` · ${item.city}` : ''}</option>)}</select></label>:null}
      <label className="grow"><span>{t.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
    </section>

    <div className="care-tabs" id="care-worklist">
      <button className={tab === 'attention' ? 'active' : ''} onClick={() => setTab('attention')}>{t.attention} <b>{debtCount + dueSoonCount + unassignedCount}</b></button>
      <button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>{t.open}</button>
      <button className={tab === 'resolved' ? 'active' : ''} onClick={() => setTab('resolved')}>{t.resolved}</button>
    </div>

    <section className="care-list">
      {visible.map(({ request, evaluation }) => {
        const person = personById.get(request.personId)
        const contactRequired = request.careType === 'first_contact' || request.careType === 'absence_check'
        const contactAllowed = Boolean(person?.consent && person?.phone)
        const contactBlocked = request.status === 'open' && contactRequired && !contactAllowed
        const canResolve = Boolean(request.ownerRef === access.userId || access.broadJourneyAccess)
        const canCloseRevoked = Boolean(!request.ownerRef || request.ownerRef === access.userId || access.broadJourneyAccess)
        const sourceLabel = request.source === 'visitor_registration' ? t.fromVisitor : request.source === 'presence_absence' ? t.fromAbsence : t.manual
        const stateLabel = evaluation.state === 'debt' ? t.debt : evaluation.state === 'due_soon' ? t.dueSoon : evaluation.state === 'resolved' ? t.resolved : t.open
        return <article className="care-panel care-card" key={request.id}>
          <div className="care-person"><span className="care-avatar">{initials(person?.name ?? '?')}</span><div><strong>{person?.name ?? t.unknownPerson}</strong><small>{t.careTypes[request.careType]}</small></div><span className={`care-state ${evaluation.state}`}>{stateLabel}</span></div>
          <div className="care-card-grid">
            <div><span>{t.promise}</span><strong>{new Date(request.dueAt).toLocaleString(locale)}</strong><small>{evaluation.state === 'debt' ? `${t.overdueBy} ${formatDistance(evaluation.overdueMs)}` : evaluation.state === 'due_soon' ? `${t.remaining} ${formatDistance(evaluation.remainingMs)}` : request.status === 'resolved' ? t.promiseResolved : `${request.promiseHours}h`}</small></div>
            <div><span>{t.owner}</span><strong>{request.ownerRef ? (request.ownerRef === access.userId ? t.you : t.assigned) : t.unassigned}</strong><small>{sourceLabel}</small></div>
          </div>
          {request.summary ? <p className="care-summary">{request.summary}</p> : null}
          {contactBlocked ? <div className="care-contact-blocked"><AlertTriangle size={16}/><div><strong>{t.contactBlocked}</strong><p>{t.contactBlockedHint}</p></div></div> : null}
          {request.status === 'open' && request.careType === 'first_contact' && contactAllowed ? <div className="care-suggested-message">
            <span><MessageSquareText size={15}/><strong>{suggestedMessageLabel(locale).title}</strong></span>
            <p>{suggestedFirstContact(locale, person?.name ?? t.unknownPerson)}</p>
            <div><small>{suggestedMessageLabel(locale).hint}</small><button className="care-copy-button" type="button" onClick={()=>void navigator.clipboard?.writeText(suggestedFirstContact(locale, person?.name ?? t.unknownPerson))}><Copy size={14}/>{suggestedMessageLabel(locale).copy}</button></div>
          </div> : null}
          <div className="care-card-actions">
            {!request.ownerRef && request.status === 'open' ? <button className="care-button" disabled={busy} onClick={() => void claim(request)}>{t.claim}</button> : null}
            {request.status === 'open' && contactBlocked
              ? <button className="care-button" disabled={busy || !canCloseRevoked} onClick={() => void closeRevokedContact(request)}><ShieldCheck size={16} /> {t.closeRevoked}</button>
              : null}
            {request.status === 'open' && request.ownerRef && request.careType === 'first_contact' && contactAllowed
              ? <a className="care-button primary" aria-disabled={!canResolve} href={canResolve ? `/followup-runtime?care=${encodeURIComponent(request.id)}` : undefined}><CheckCircle2 size={16} /> {t.openFollowup}</a>
              : null}
            {request.status === 'open' && request.ownerRef && request.careType !== 'first_contact' && !contactBlocked ? <button className="care-button primary" disabled={busy || !canResolve} onClick={() => setResolving(request)}><CheckCircle2 size={16} /> {t.recordOutcome}</button> : null}
            {request.status === 'resolved' ? <span className="care-resolution"><CheckCircle2 size={16} /> {request.resolutionCode ? t.resolutions[request.resolutionCode] : t.resolved}</span> : null}
          </div>
        </article>
      })}
    </section>

    {!visible.length ? query.trim()?<div className="care-panel care-empty">{t.empty}</div>:<div className="care-panel"><GuidedEmptyState icon={HeartHandshake} title={empty.title} body={empty.body} primary={tab==='attention'?{label:empty.primary,onClick:()=>setTab('open')}:tab==='open'?(people.length?{label:empty.primary,onClick:()=>setShowNew(true)}:{label:locale==='en'?'Open Presence':locale==='es'?'Abrir Presencia':'Abrir Presença',href:'/presence-assist'}):{label:empty.primary,onClick:()=>setTab('open')}} secondary={{label:empty.secondary||t.back,href:'/my-today'}}/></div> : null}
    <p className="care-rule"><ShieldCheck size={15} /> {t.privacyRule}</p>
  </div>

  {showNew ? <NewCareModal locale={locale} people={people} close={() => setShowNew(false)} save={async (personId, careType, promiseHours, summary) => {
    setBusy(true); setError('')
    try {
      await createCareRequest({ organizationId: access.organizationId, congregationId, personId, actorId: access.userId, careType, promiseHours, summary })
      setShowNew(false)
      await refreshScope(access, congregationId)
    } catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }} /> : null}

  {resolving ? <ResolveCareModal locale={locale} close={() => setResolving(null)} save={async (resolutionCode, resolutionNote) => {
    setBusy(true); setError('')
    try {
      await resolveCareRequest({ organizationId: access.organizationId, request: resolving, actorId: access.userId, resolutionCode, resolutionNote })
      setResolving(null)
      await refreshScope(access, congregationId)
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
      <label className="care-field"><span>{t.outcome}</span><select value={code} onChange={(event) => { const next = event.target.value as CareResolutionCode; setCode(next); if (next === 'pastoral_handoff') setNote('') }}>{(Object.keys(t.resolutions) as CareResolutionCode[]).filter((id) => id !== 'consent_revoked').map((id) => <option value={id} key={id}>{t.resolutions[id]}</option>)}</select></label>
      {code === 'pastoral_handoff'
        ? <p className="care-warning"><ShieldCheck size={16} /> {t.pastoralHandoffRule}</p>
        : <label className="care-field"><span>{t.operationalNote}</span><textarea maxLength={160} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t.resolutionPlaceholder} /></label>}
    </div>
    <p className="care-rule"><ShieldCheck size={15} /> {t.outcomeRule}</p>
    <div className="care-modal-actions"><button className="care-button" onClick={close}>{t.cancel}</button><button className="care-button primary" onClick={() => void save(code, note)}>{t.resolve}</button></div>
  </section></div>
}
