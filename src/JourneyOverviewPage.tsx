import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, HeartHandshake, House, Leaf, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { auth } from './firebase'
import { buildJourneyOverview } from './journeyOverview'
import {
  getActiveJourneyOrganizationId,
  listCareRequests,
  listImplementationCycles,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroups,
  listJourneyPeople,
  listPresenceSessions,
  loadJourneyAccess,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyImplementationCycle,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, journeyOverviewCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import './JourneyOverviewPage.css'

export default function JourneyOverviewPage() {
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale),t=journeyOverviewCopy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null),[congregations,setCongregations]=useState<JourneyCongregation[]>([]),[congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([]),[care,setCare]=useState<CareRequestRecord[]>([]),[sessions,setSessions]=useState<PresenceSessionRecord[]>([]),[groups,setGroups]=useState<JourneyGroupRecord[]>([]),[discipleships,setDiscipleships]=useState<JourneyDiscipleshipRecord[]>([]),[implementationCycles,setImplementationCycles]=useState<JourneyImplementationCycle[]>([])
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')

  const canView=Boolean(access&&(access.broadJourneyAccess||access.canManagePeople||access.canManageCare||access.canManagePresence||access.canManageGroups||access.canManageDiscipleship||access.canManageImplementation))
  const availability=useMemo(()=>({
    people:Boolean(access),
    care:Boolean(access&&(access.canManageCare||access.broadJourneyAccess)),
    presence:Boolean(access&&access.canManagePresence),
    groups:Boolean(access),
    discipleship:Boolean(access&&(access.canManageDiscipleship||access.broadJourneyAccess)),
    implementation:Boolean(access?.canManageImplementation),
  }),[access])
  const overview=useMemo(()=>buildJourneyOverview({availability,people,careRequests:care,sessions,groups,discipleships,implementationCycles}),[availability,people,care,sessions,groups,discipleships,implementationCycles])

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextGroups,nextCare,nextSessions,nextDiscipleships,nextImplementation]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unitId),
      listJourneyGroups(nextAccess.organizationId,unitId),
      nextAccess.canManageCare||nextAccess.broadJourneyAccess?listCareRequests(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManagePresence?listPresenceSessions(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess?listJourneyDiscipleships(nextAccess,unitId):Promise.resolve([]),
      nextAccess.canManageImplementation?listImplementationCycles(nextAccess.organizationId,unitId):Promise.resolve([]),
    ])
    setPeople(nextPeople);setGroups(nextGroups);setCare(nextCare);setSessions(nextSessions);setDiscipleships(nextDiscipleships);setImplementationCycles(nextImplementation)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      const units=await listJourneyCongregations(nextAccess);setCongregations(units);const unitId=units[0]?.id??'';setCongregationId(unitId)
      if(unitId)await refresh(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])
  async function selectUnit(unitId:string){if(!access)return;setCongregationId(unitId);setBusy(true);setError('');try{await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}

  if(loading)return <main className="journey-overview"><div className="overview-loading">{t.loading}</div></main>
  if(!canView)return <main className="journey-overview"><section className="overview-panel overview-no-access"><ShieldCheck size={34}/><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="overview-button" onClick={()=>void bootstrap()}>{t.retry}</button></section></main>

  const restricted=<><strong>—</strong><small>{t.restricted}</small></>
  return <main className="journey-overview"><div className="overview-shell">
    <header className="overview-topbar"><div className="overview-brand"><img src="/icon.svg" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div><div className="overview-actions">{access?.broadJourneyAccess?<a href="/legacy">{t.legacy}</a>:null}<a href="/my-today">{t.today}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="overview-hero"><span className="overview-kicker">Journey / Overview</span><h1>{t.title}</h1><p>{t.subtitle}</p></section>
    {error?<div className="overview-error">{error}</div>:null}
    <section className="overview-panel overview-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}{x.city?` · ${x.city}`:''}</option>)}</select></label></section>

    <section className="overview-grid">
      <a className="overview-panel overview-card" href="/journey-profile"><span className="overview-icon"><Users size={19}/></span><div><span>{t.people}</span>{overview.people?<><strong>{overview.people.count}</strong><small>{t.peopleDetail}</small></>:restricted}</div><b>{t.peopleAction}</b></a>
      <a className="overview-panel overview-card" href="/care-integrity"><span className="overview-icon"><HeartHandshake size={19}/></span><div><span>{t.careDebt}</span>{overview.care?<><strong className={overview.care.debt?'attention':''}>{overview.care.debt}</strong><small>{overview.care.open} {t.careOpen} · {overview.care.unassigned} {t.careUnassigned} · {overview.care.dueSoon} {t.careDueSoon}</small></>:restricted}</div><b>{t.careAction}</b></a>
      <a className="overview-panel overview-card" href="/presence-assist"><span className="overview-icon"><UserCheck size={19}/></span><div><span>{t.presence}</span>{overview.presence?<><strong>{overview.presence.openSessions}</strong><small>{t.openSessions}</small></>:restricted}</div><b>{t.presenceAction}</b></a>
      <a className="overview-panel overview-card" href="/groups-runtime"><span className="overview-icon"><House size={19}/></span><div><span>{t.groups}</span>{overview.groups?<><strong>{overview.groups.count}</strong><small>{overview.groups.nearCapacity} {t.nearCapacity}</small></>:restricted}</div><b>{t.groupsAction}</b></a>
      {access?.canManageImplementation?<a className="overview-panel overview-card" href="/implementation-runtime"><span className="overview-icon"><ClipboardCheck size={19}/></span><div><span>{t.implementation}</span>{overview.implementation?<><strong>{overview.implementation.percent}%</strong><small>{overview.implementation.status==='completed'?t.implementationCompleted:`${t.implementationWeek} ${overview.implementation.week}`}</small></>:<><strong>—</strong><small>{t.implementationNotStarted}</small></>}</div><b>{t.implementationAction}</b></a>:null}
      <a className="overview-panel overview-card" href="/discipleship-runtime"><span className="overview-icon"><Leaf size={19}/></span><div><span>{t.discipleship}</span>{overview.discipleship?<><strong>{overview.discipleship.active}</strong><small>{t.activeRelations}</small></>:restricted}</div><b>{t.discipleshipAction}</b></a>
    </section>
    <p className="overview-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div></main>
}
