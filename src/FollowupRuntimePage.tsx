import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, Clock3, HeartHandshake, MessageCircle, ShieldCheck, UserCheck, X } from 'lucide-react'
import { auth } from './firebase'
import {
  completeJourneyFollowup,
  getActiveJourneyOrganizationId, resolveActiveJourneyCongregationId, setActiveJourneyCongregationId,
  listCareRequests,
  listJourneyCongregations,
  listJourneyFollowups,
  listJourneyPeople,
  loadJourneyAccess,
  startJourneyFollowup,
  subscribeJourneyLiveChanges,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyFollowupRecord,
  type JourneyPersonRecord,
} from './journeyRepository'
import type { FollowupOutcomeCode, FollowupNextActionCode } from './followup'
import { buildConnectFollowupLaunchUrl, resolveRequestedFollowupId } from './connectBridge'
import { followupRuntimeCopy, getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './FollowupRuntimePage.css'

function formatDate(value: string, locale: AppLocale) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString(locale)
}

function nextActionHref(code: FollowupNextActionCode | undefined, personId: string) {
  if (code === 'care_prayer' || code === 'manual_review') return '/care-integrity'
  if (code === 'group_entry') return '/groups-runtime'
  if (code === 'data_correction') return '/governance-runtime'
  return `/journey-profile?person=${encodeURIComponent(personId)}`
}

export default function FollowupRuntimePage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = followupRuntimeCopy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [people, setPeople] = useState<JourneyPersonRecord[]>([])
  const [care, setCare] = useState<CareRequestRecord[]>([])
  const [followups, setFollowups] = useState<JourneyFollowupRecord[]>([])
  const [resolving, setResolving] = useState<JourneyFollowupRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestedCareId = useMemo(() => new URLSearchParams(window.location.search).get('care') ?? '', [])
  const requestedFollowupId = useMemo(() => resolveRequestedFollowupId(window.location.search), [])

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const followupByCare = useMemo(() => new Map(followups.map((item) => [item.careRequestId, item])), [followups])

  const refresh = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    const [nextPeople, nextCare, nextFollowups] = await Promise.all([
      listJourneyPeople(nextAccess.organizationId, unitId),
      listCareRequests(nextAccess.organizationId, unitId),
      listJourneyFollowups(nextAccess, unitId),
    ])
    setPeople(nextPeople)
    setCare(nextCare)
    setFollowups(nextFollowups)
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      if (!nextAccess.canManageCare) return
      const units = await listJourneyCongregations(nextAccess)
      setCongregations(units)
      const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, units)
      setCongregationId(unitId)
      if (unitId) await refresh(nextAccess, unitId)
    } catch (cause) {
      console.error(cause)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [refresh, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  useEffect(() => {
    if (!access?.canManageCare || !congregationId) return
    return subscribeJourneyLiveChanges({
      organizationId: access.organizationId,
      congregationId,
      collections: ['people', 'careRequests', 'followups'],
      onChange: () => { void refresh(access, congregationId).catch((cause) => console.error('Follow-up live refresh failed', cause)) },
      onError: (cause) => console.error('Follow-up live subscription failed', cause),
    })
  }, [access, congregationId, refresh])

  useEffect(() => {
    if (!requestedFollowupId || resolving || !access) return
    const requested = followups.find((item) =>
      item.id === requestedFollowupId
      && item.status === 'pending'
      && item.ownerRef === access.userId
    )
    if (requested) setResolving(requested)
  }, [access, followups, requestedFollowupId, resolving])

  async function selectUnit(unitId: string) {
    if (!access) return
    setCongregationId(unitId); setActiveJourneyCongregationId(access.organizationId,unitId); setBusy(true); setError('')
    try { await refresh(access, unitId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  const pending = useMemo(() => followups.filter((item) => item.status === 'pending'), [followups])
  const completed = useMemo(() => followups.filter((item) => item.status === 'completed').slice(0, 12), [followups])
  const ready = useMemo(() => {
    if (!access) return []
    return care
      .filter((request) =>
        request.status === 'open'
        && request.careType === 'first_contact'
        && Boolean(request.ownerRef)
        && (access.broadJourneyAccess || request.ownerRef === access.userId)
        && !followupByCare.has(request.id)
      )
      .sort((a, b) => {
        if (a.id === requestedCareId) return -1
        if (b.id === requestedCareId) return 1
        return Date.parse(a.dueAt) - Date.parse(b.dueAt)
      })
  }, [access, care, followupByCare, requestedCareId])

  async function start(request: CareRequestRecord) {
    if (!access) return
    setBusy(true); setError('')
    try {
      const followupId = await startJourneyFollowup({ access, request })
      window.location.assign(buildConnectFollowupLaunchUrl(followupId))
    } catch (cause) {
      console.error(cause)
      const code = cause instanceof Error ? cause.message : ''
      setError(code === 'followup_owner_required' ? t.onlyOwner : code === 'followup_source_invalid' ? t.invalidSource : t.error)
    } finally { setBusy(false) }
  }

  async function completeFollowup(item: JourneyFollowupRecord, outcomeCode: FollowupOutcomeCode) {
    if (!access) return
    const request = care.find((candidate) => candidate.id === item.careRequestId)
    if (!request) { setError(t.missingCare); return }
    setBusy(true); setError('')
    try {
      await completeJourneyFollowup({ access, followup: item, request, outcomeCode })
      setResolving(null)
      await refresh(access, congregationId)
    } catch (cause) {
      console.error(cause)
      setError(t.error)
    } finally { setBusy(false) }
  }

  async function complete(outcomeCode: FollowupOutcomeCode) {
    if (!resolving) return
    await completeFollowup(resolving, outcomeCode)
  }

  async function closeRevoked(item: JourneyFollowupRecord) {
    if (!window.confirm(t.revokedHint)) return
    await completeFollowup(item, 'consent_revoked')
  }

  const readyEmpty=emptyGuidance(locale,'followup_ready_none')
  const pendingEmpty=emptyGuidance(locale,'followup_pending_none')
  const completedEmpty=emptyGuidance(locale,'followup_completed_none')

  const activeUnit=congregations.find(item=>item.id===congregationId)
  const focusTitle=pending.length>0
    ?locale==='en'?pending.length+' follow-up(s) waiting for an outcome':locale==='es'?pending.length+' seguimiento(s) esperando resultado':pending.length+' acompanhamento(s) aguardando resultado'
    :ready.length>0
      ?locale==='en'?ready.length+' care promise(s) ready to start':locale==='es'?ready.length+' promesa(s) de cuidado listas para iniciar':ready.length+' promessa(s) de cuidado prontas para iniciar'
      :locale==='en'?'No follow-up needs action now':locale==='es'?'Ningún seguimiento necesita acción ahora':'Nenhum acompanhamento precisa de ação agora'
  const focusBody=pending.length>0
    ?locale==='en'?'Finish conversations already started before opening new ones. Record only the outcome and permitted next step.'
      :locale==='es'?'Termina las conversaciones ya iniciadas antes de abrir nuevas. Registra solo el resultado y el próximo paso permitido.'
      :'Conclua as conversas já iniciadas antes de abrir novas. Registre somente o resultado e o próximo passo permitido.'
    :ready.length>0
      ?locale==='en'?'Start with the care promise that belongs to you. Contact authorization remains the gate for any outreach.'
        :locale==='es'?'Empieza por la promesa de cuidado que te pertenece. La autorización de contacto sigue siendo requisito para cualquier contacto.'
        :'Comece pela promessa de cuidado que pertence a você. A autorização de contato continua sendo requisito para qualquer contato.'
      :locale==='en'?'The care flow is caught up. Return to Care when a new real promise appears.'
        :locale==='es'?'El flujo de cuidado está al día. Vuelve a Cuidado cuando aparezca una nueva promesa real.'
        :'O fluxo de cuidado está em dia. Volte para Cuidado quando surgir uma nova promessa real.'

  if (loading) return <main className="followup-page"><div className="followup-loading">{t.loading}</div></main>
  if (!access?.canManageCare) return <main className="followup-page"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={()=>void bootstrap()} /></main>

  return <main className="followup-page"><div className="followup-shell">
    <header className="followup-topbar">
      <div className="followup-brand"><img src="/brand/nestjourney-symbol-light.png" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="followup-actions"><a href="/care-integrity"><ChevronLeft size={16}/>{t.back}</a><select value={locale} onChange={(event)=>{const next=event.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map((id)=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div>
    </header>

    <section className="followup-hero"><div><span className="followup-kicker">Journey / Follow-up</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></section>
    {error ? <div className="followup-error" role="alert">{error}</div> : null}

    <JourneyAreaFocus
      locale={locale}
      context={activeUnit?.name}
      title={focusTitle}
      body={focusBody}
      metrics={[
        {label:t.ready,value:ready.length,tone:ready.length?'good':'muted'},
        {label:t.inProgress,value:pending.length,tone:pending.length?'attention':'muted'},
        {label:t.completed,value:completed.length,tone:completed.length?'good':'muted'},
      ]}
      actions={pending.length
        ?[{label:t.recordOutcome,href:'#followup-pending',primary:true}]
        :ready.length
          ?[{label:t.start,href:'#ready-followups',primary:true}]
          :[{label:t.back,href:'/care-integrity',primary:true}]
      }
    />

    <section className="followup-panel followup-boundary"><ShieldCheck size={18}/><div><strong>{t.connectBoundaryTitle}</strong><p>{t.connectBoundary}</p></div></section>

    {congregations.length>1?<section className="journey-area-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={(event)=>void selectUnit(event.target.value)}>{congregations.map((item)=><option key={item.id} value={item.id}>{item.name}{item.city?` · ${item.city}`:''}</option>)}</select></label></section>:null}

    <section className="followup-section" id="ready-followups">
      <div className="followup-section-head"><div><span>{t.ready}</span><h2>{t.readyTitle}</h2></div><b>{ready.length}</b></div>
      <div className="followup-grid">
        {ready.map((request)=>{
          const person=peopleById.get(request.personId)
          const mine=request.ownerRef===access.userId
          return <article className={`followup-panel followup-card ${request.id===requestedCareId?'highlight':''}`} key={request.id}>
            <div className="followup-card-head"><span className="followup-icon"><HeartHandshake size={18}/></span><div><h3>{person?.name??t.unknownPerson}</h3><p>{t.due}: {formatDate(request.dueAt,locale)}</p></div><span className="followup-badge">{mine?t.yours:t.assigned}</span></div>
            <div className="followup-facts"><span><small>{t.contact}</small><b>{person?.consent&&person.phone?person.phone:t.contactUnavailable}</b></span><span><small>{t.promise}</small><b>{request.promiseHours}h</b></span></div>
            <button className="followup-button primary" disabled={busy||!mine||!person?.consent||!person.phone} onClick={()=>void start(request)}><UserCheck size={16}/>{mine?t.start:t.onlyOwner}</button>
          </article>
        })}
        {!ready.length?<div className="followup-panel"><GuidedEmptyState icon={UserCheck} title={readyEmpty.title} body={readyEmpty.body} primary={{label:readyEmpty.primary,href:'/care-integrity'}} secondary={{label:readyEmpty.secondary||t.back,href:'/my-today'}} compact/></div>:null}
      </div>
    </section>

    <section className="followup-section" id="followup-pending">
      <div className="followup-section-head"><div><span>{t.inProgress}</span><h2>{t.inProgressTitle}</h2></div><b>{pending.length}</b></div>
      <div className="followup-grid">
        {pending.map((item)=>{
          const person=peopleById.get(item.personId)
          const mine=item.ownerRef===access.userId
          const contactAllowed=Boolean(person?.consent&&person.phone)
          return <article className="followup-panel followup-card" key={item.id}>
            <div className="followup-card-head"><span className="followup-icon warning"><Clock3 size={18}/></span><div><h3>{person?.name??t.unknownPerson}</h3><p>{t.due}: {formatDate(item.dueAt,locale)}</p></div><span className="followup-badge attention">{t.pending}</span></div>
            <div className="followup-facts"><span><small>{t.contact}</small><b>{contactAllowed?person?.phone:t.contactUnavailable}</b></span><span><small>{t.source}</small><b>{t.firstContact}</b></span></div>
            {!contactAllowed?<p className="followup-revoked-note"><ShieldCheck size={15}/>{t.revokedHint}</p>:null}
            <div className="followup-card-actions">
              {contactAllowed?<a className="followup-button" aria-disabled={!mine} href={mine?buildConnectFollowupLaunchUrl(item.id):undefined} onClick={(event)=>{if(!mine)event.preventDefault()}}><MessageCircle size={16}/>{t.openConnect}</a>:null}
              {contactAllowed?<button className="followup-button primary" disabled={busy||!mine} onClick={()=>setResolving(item)}><CheckCircle2 size={16}/>{t.recordOutcome}</button>:null}
              {!contactAllowed?<button className="followup-button primary span-all" disabled={busy||!mine} onClick={()=>void closeRevoked(item)}><ShieldCheck size={16}/>{t.closeRevoked}</button>:null}
            </div>
          </article>
        })}
        {!pending.length?<div className="followup-panel"><GuidedEmptyState icon={MessageCircle} title={pendingEmpty.title} body={pendingEmpty.body} primary={{label:pendingEmpty.primary,href:'#ready-followups'}} secondary={{label:pendingEmpty.secondary||t.back,href:'/care-integrity'}} compact/></div>:null}
      </div>
    </section>

    <section className="followup-section">
      <div className="followup-section-head"><div><span>{t.completed}</span><h2>{t.completedTitle}</h2></div><b>{completed.length}</b></div>
      <div className="followup-grid">
        {completed.map((item)=>{
          const person=peopleById.get(item.personId)
          const action=item.nextActionCode??'none'
          return <article className="followup-panel followup-card completed" key={item.id}>
            <div className="followup-card-head"><span className="followup-icon success"><CheckCircle2 size={18}/></span><div><h3>{person?.name??t.unknownPerson}</h3><p>{item.completedAt?formatDate(item.completedAt,locale):'—'}</p></div><span className="followup-badge success">{t.done}</span></div>
            <div className="followup-facts"><span><small>{t.outcome}</small><b>{item.outcomeCode?t.outcomes[item.outcomeCode]:t.done}</b></span><span><small>{t.nextAction}</small><b>{t.nextActions[action]}</b></span></div>
            <a className="followup-button" href={nextActionHref(item.nextActionCode,item.personId)}>{t.openNext}<ArrowRight size={15}/></a>
          </article>
        })}
        {!completed.length?<div className="followup-panel"><GuidedEmptyState icon={CheckCircle2} title={completedEmpty.title} body={completedEmpty.body} primary={{label:completedEmpty.primary,href:'/care-integrity'}} secondary={{label:completedEmpty.secondary||t.back,href:'/my-today'}} compact/></div>:null}
      </div>
    </section>

    <p className="followup-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div>
  {resolving?<OutcomeModal locale={locale} busy={busy} close={()=>setResolving(null)} save={complete}/>:null}
  </main>
}

function OutcomeModal({locale,busy,close,save}:{locale:AppLocale;busy:boolean;close:()=>void;save:(outcome:FollowupOutcomeCode)=>Promise<void>}){
  const t=followupRuntimeCopy[locale]
  const [outcome,setOutcome]=useState<FollowupOutcomeCode>('responded')
  return <div className="followup-modal-backdrop" onMouseDown={close}><section className="followup-panel followup-modal" role="dialog" aria-modal="true" aria-labelledby="followup-outcome-title" onMouseDown={(event)=>event.stopPropagation()}>
    <div className="followup-modal-head"><div><span className="followup-kicker">Outcome</span><h2 id="followup-outcome-title">{t.recordOutcome}</h2></div><button className="followup-button" onClick={close} aria-label={t.cancel}><X size={17}/></button></div>
    <label className="followup-field"><span>{t.outcome}</span><select value={outcome} onChange={(event)=>setOutcome(event.target.value as FollowupOutcomeCode)}>{(Object.keys(t.outcomes) as FollowupOutcomeCode[]).filter((id)=>id!=='consent_revoked').map((id)=><option key={id} value={id}>{t.outcomes[id]}</option>)}</select></label>
    <p className="followup-modal-note">{t.outcomeRule}</p>
    <div className="followup-modal-actions"><button className="followup-button" onClick={close}>{t.cancel}</button><button className="followup-button primary" disabled={busy} onClick={()=>void save(outcome)}>{t.complete}</button></div>
  </section></div>
}
