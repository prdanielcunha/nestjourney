import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, ClipboardList, FileClock, LockKeyhole, Search,
  ShieldCheck, UserCog, Users,
} from 'lucide-react'
import { auth } from './firebase'
import {
  createPrivacyRequest,
  getActiveJourneyOrganizationId,
  listJourneyAuditEvents,
  listJourneyCongregations,
  listJourneyPeople,
  listPrivacyRequests,
  loadJourneyAccess,
  type JourneyAccessContext,
  type JourneyAuditEvent,
  type JourneyCongregation,
  type JourneyPersonRecord,
  type JourneyPrivacyRequest,
  type PrivacyCorrectionField,
  type PrivacyRequestType,
} from './journeyRepository'
import { getInitialLocale, governanceRuntimeCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import './GovernanceRuntimePage.css'

type Tab = 'privacy' | 'audit' | 'boundaries'

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

export default function GovernanceRuntimePage() {
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=governanceRuntimeCopy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [requests,setRequests]=useState<JourneyPrivacyRequest[]>([])
  const [audit,setAudit]=useState<JourneyAuditEvent[]>([])
  const [tab,setTab]=useState<Tab>('privacy')
  const [personId,setPersonId]=useState('')
  const [requestType,setRequestType]=useState<PrivacyRequestType>('consent_revocation')
  const [targetField,setTargetField]=useState<PrivacyCorrectionField>('name')
  const [proposedValue,setProposedValue]=useState('')
  const [search,setSearch]=useState('')
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')

  const canView=Boolean(access?.canViewGovernance)
  const canManagePrivacy=Boolean(access?.canManagePrivacy)
  const selectedPerson=people.find((person)=>person.id===personId)
  const openRequests=useMemo(()=>requests.filter((item)=>item.status==='open'),[requests])
  const filteredAudit=useMemo(()=>{
    const needle=search.trim().toLowerCase()
    if(!needle)return audit
    return audit.filter((item)=>[item.action,item.actorId,item.targetRef,item.subjectRef,item.requestType].some((value)=>String(value??'').toLowerCase().includes(needle)))
  },[audit,search])

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextRequests,nextAudit]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unitId),
      nextAccess.canManagePrivacy?listPrivacyRequests(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canViewGovernance?listJourneyAuditEvents(nextAccess.organizationId,unitId):Promise.resolve([]),
    ])
    setPeople(nextPeople)
    setRequests(nextRequests)
    setAudit(nextAudit)
    if(nextPeople.length)setPersonId((current)=>nextPeople.some((item)=>item.id===current)?current:nextPeople[0].id)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId)
      setAccess(nextAccess)
      if(!nextAccess.canViewGovernance)return
      if(!nextAccess.canManagePrivacy)setTab('audit')
      const units=await listJourneyCongregations(nextAccess)
      setCongregations(units)
      const unitId=units[0]?.id??''
      setCongregationId(unitId)
      if(unitId)await refresh(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])

  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectUnit(unitId:string){
    if(!access)return
    setCongregationId(unitId);setBusy(true);setError('')
    try{await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function submit(){
    if(!access||!selectedPerson||!canManagePrivacy)return
    if(requestType==='correction'&&!proposedValue.trim())return
    setBusy(true);setError('')
    try{
      await createPrivacyRequest({
        organizationId:access.organizationId,
        congregationId,
        actorId:access.userId,
        person:selectedPerson,
        requestType,
        targetField:requestType==='correction'?targetField:undefined,
        proposedValue:requestType==='correction'?proposedValue.trim():undefined,
      })
      setProposedValue('')
      await refresh(access,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  if(loading)return <main className="governance-runtime"><div className="governance-loading">{t.loading}</div></main>
  if(!canView)return <main className="governance-runtime"><section className="governance-panel governance-no-access"><ShieldCheck size={34}/><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="governance-button" onClick={()=>void bootstrap()}>{t.retry}</button></section></main>

  const requestLabels=t.requestTypes
  return <main className="governance-runtime"><div className="governance-shell">
    <header className="governance-topbar">
      <div className="governance-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div>
      <div className="governance-actions"><a href="/journey-overview"><ArrowLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div>
    </header>

    <section className="governance-hero"><div><span className="governance-kicker">Journey / Governance</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><span className="governance-role"><UserCog size={16}/>{access?.role||t.systemRole}</span></section>
    {error?<div className="governance-error">{error}</div>:null}

    <section className="governance-panel governance-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(unit=><option key={unit.id} value={unit.id}>{unit.name}{unit.city?` · ${unit.city}`:''}</option>)}</select></label></section>

    <section className="governance-metrics">
      <article className="governance-panel governance-metric"><span><FileClock size={18}/></span><div><small>{t.openRequests}</small><strong>{canManagePrivacy?openRequests.length:'—'}</strong><p>{canManagePrivacy?t.openRequestsHint:t.restricted}</p></div></article>
      <article className="governance-panel governance-metric"><span><ClipboardList size={18}/></span><div><small>{t.auditEvents}</small><strong>{audit.length}</strong><p>{t.auditHint}</p></div></article>
      <article className="governance-panel governance-metric"><span><LockKeyhole size={18}/></span><div><small>{t.accessBoundary}</small><strong>{access?.congregationIds.length||congregations.length}</strong><p>{t.accessBoundaryHint}</p></div></article>
    </section>

    <nav className="governance-tabs" aria-label={t.sections}>
      {canManagePrivacy?<button className={tab==='privacy'?'active':''} onClick={()=>setTab('privacy')}>{t.privacy}</button>:null}
      <button className={tab==='audit'?'active':''} onClick={()=>setTab('audit')}>{t.audit}</button>
      <button className={tab==='boundaries'?'active':''} onClick={()=>setTab('boundaries')}>{t.boundaries}</button>
    </nav>

    {tab==='privacy'&&canManagePrivacy?<section className="governance-grid">
      <div className="governance-panel governance-form">
        <span className="governance-kicker">{t.newRequest}</span><h2>{t.newRequestTitle}</h2><p>{t.newRequestHint}</p>
        <label><span>{t.person}</span><select value={personId} onChange={e=>setPersonId(e.target.value)}>{people.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        <label><span>{t.requestType}</span><select value={requestType} onChange={e=>setRequestType(e.target.value as PrivacyRequestType)}>{(Object.keys(requestLabels) as PrivacyRequestType[]).map(type=><option key={type} value={type}>{requestLabels[type]}</option>)}</select></label>
        {requestType==='correction'?<><label><span>{t.field}</span><select value={targetField} onChange={e=>setTargetField(e.target.value as PrivacyCorrectionField)}>{(Object.keys(t.fields) as PrivacyCorrectionField[]).map(field=><option key={field} value={field}>{t.fields[field]}</option>)}</select></label><label><span>{t.proposedValue}</span><input maxLength={120} value={proposedValue} onChange={e=>setProposedValue(e.target.value)} placeholder={t.proposedValuePlaceholder}/></label></>:null}
        <div className="governance-minimize"><ShieldCheck size={16}/><p>{t.minimize}</p></div>
        <button className="governance-button primary" disabled={busy||!selectedPerson||(requestType==='correction'&&!proposedValue.trim())} onClick={()=>void submit()}>{t.createRequest}</button>
      </div>
      <div className="governance-panel governance-list">
        <div className="governance-list-head"><div><span className="governance-kicker">{t.queue}</span><h2>{t.privacyQueue}</h2></div><span>{openRequests.length}</span></div>
        {requests.length?requests.map(item=><article className="governance-request" key={item.id}><i>{initials(item.personName||'?')}</i><div><strong>{item.personName||t.unknownPerson}</strong><span>{requestLabels[item.requestType]}</span><small>{item.requestType==='correction'&&item.targetField?`${t.fields[item.targetField]} · ${item.proposedValue??''}`:t.noSensitiveDetails}</small></div><time>{formatDate(item.requestedAt)}</time></article>):<div className="governance-empty"><CheckCircle2 size={24}/><strong>{t.emptyQueue}</strong><p>{t.emptyQueueHint}</p></div>}
      </div>
    </section>:null}

    {tab==='audit'?<section className="governance-panel governance-audit">
      <div className="governance-list-head"><div><span className="governance-kicker">{t.audit}</span><h2>{t.auditTitle}</h2><p>{t.auditDescription}</p></div></div>
      <label className="governance-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.searchAudit}/></label>
      <div className="governance-audit-list">{filteredAudit.length?filteredAudit.map(item=><article key={item.id}><span className="governance-audit-icon"><ClipboardList size={15}/></span><div><strong>{item.action}</strong><small>{item.subjectRef||item.targetRef||t.operationalEvent}</small></div><span>{item.actorId}</span><time>{formatDate(item.createdAt)}</time></article>):<div className="governance-empty"><ClipboardList size={24}/><strong>{t.emptyAudit}</strong></div>}</div>
      <div className="governance-caveat"><ShieldCheck size={17}/><p>{t.auditCaveat}</p></div>
    </section>:null}

    {tab==='boundaries'?<section className="governance-grid">
      <div className="governance-panel governance-boundaries"><span className="governance-kicker">{t.boundaries}</span><h2>{t.boundaryTitle}</h2><div className="governance-capabilities">
        <article><span>{t.role}</span><strong>{access?.role||t.systemRole}</strong></article>
        <article><span>{t.peopleCapability}</span><strong>{access?.canManagePeople?t.allowed:t.notAllowed}</strong></article>
        <article><span>{t.careCapability}</span><strong>{access?.canManageCare?t.allowed:t.notAllowed}</strong></article>
        <article><span>{t.presenceCapability}</span><strong>{access?.canManagePresence?t.allowed:t.notAllowed}</strong></article>
        <article><span>{t.groupsCapability}</span><strong>{access?.canManageGroups?t.allowed:t.notAllowed}</strong></article>
        <article><span>{t.discipleshipCapability}</span><strong>{access?.canManageDiscipleship?t.allowed:t.notAllowed}</strong></article>
        <article><span>{t.privacyCapability}</span><strong>{access?.canManagePrivacy?t.allowed:t.notAllowed}</strong></article>
      </div></div>
      <div className="governance-panel governance-principles"><span className="governance-kicker">{t.privacyByDesign}</span><h2>{t.principlesTitle}</h2><div className="governance-principle-list">{t.principles.map((item,index)=><article key={item}><span>{index+1}</span><p>{item}</p></article>)}</div><div className="governance-caveat"><Users size={17}/><p>{t.hubBoundary}</p></div></div>
    </section>:null}
  </div></main>
}
