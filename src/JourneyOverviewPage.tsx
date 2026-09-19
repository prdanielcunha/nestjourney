import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, ClipboardCheck, HeartHandshake, House, Leaf, ShieldCheck,
  Sparkles, UserCheck, Users
} from 'lucide-react'
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
  listPastoralHandoffs,
  listPresenceSessions,
  loadJourneyAccess,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyImplementationCycle,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { getInitialLocale, journeyHomeCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import './JourneyOverviewPage.css'

type ModuleCardProps = {
  href: string
  eyebrow: string
  title: string
  description: string
  metric?: string
  detail?: string
  icon: typeof Users
  locked?: boolean
}

function ModuleCard({ href, eyebrow, title, description, metric, detail, icon: Icon, locked }: ModuleCardProps) {
  return <a className={`home-module-card ${locked ? 'locked' : ''}`} href={locked ? '#' : href} onClick={locked ? (event) => event.preventDefault() : undefined}>
    <span className="home-module-icon"><Icon size={20}/></span>
    <div className="home-module-copy">
      <span className="home-module-eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {metric ? <small><b>{metric}</b>{detail ? ` · ${detail}` : ''}</small> : null}
    </div>
    <ArrowRight size={17}/>
  </a>
}

export default function JourneyOverviewPage() {
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=journeyHomeCopy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [care,setCare]=useState<CareRequestRecord[]>([])
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [groups,setGroups]=useState<JourneyGroupRecord[]>([])
  const [discipleships,setDiscipleships]=useState<JourneyDiscipleshipRecord[]>([])
  const [implementationCycles,setImplementationCycles]=useState<JourneyImplementationCycle[]>([])
  const [pastoralHandoffs,setPastoralHandoffs]=useState<JourneyPastoralHandoff[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const canView=Boolean(access&&(access.broadJourneyAccess||access.canManagePeople||access.canManageCare||access.canManagePresence||access.canManageGroups||access.canManageDiscipleship||access.canManageImplementation||access.canManagePastoral))
  const availability=useMemo(()=>({
    people:Boolean(access),
    care:Boolean(access&&(access.canManageCare||access.broadJourneyAccess)),
    presence:Boolean(access&&access.canManagePresence),
    groups:Boolean(access),
    discipleship:Boolean(access&&(access.canManageDiscipleship||access.broadJourneyAccess)),
    implementation:Boolean(access?.canManageImplementation),
    pastoral:Boolean(access?.canManagePastoral),
  }),[access])
  const overview=useMemo(()=>buildJourneyOverview({
    availability,people,careRequests:care,sessions,groups,discipleships,implementationCycles,pastoralHandoffs
  }),[availability,people,care,sessions,groups,discipleships,implementationCycles,pastoralHandoffs])

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextGroups,nextCare,nextSessions,nextDiscipleships,nextImplementation,nextPastoral]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unitId),
      listJourneyGroups(nextAccess.organizationId,unitId),
      nextAccess.canManageCare||nextAccess.broadJourneyAccess?listCareRequests(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManagePresence?listPresenceSessions(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess?listJourneyDiscipleships(nextAccess,unitId):Promise.resolve([]),
      nextAccess.canManageImplementation?listImplementationCycles(nextAccess.organizationId,unitId):Promise.resolve([]),
      nextAccess.canManagePastoral?listPastoralHandoffs(nextAccess.organizationId,unitId):Promise.resolve([]),
    ])
    setPeople(nextPeople);setGroups(nextGroups);setCare(nextCare);setSessions(nextSessions);setDiscipleships(nextDiscipleships);setImplementationCycles(nextImplementation);setPastoralHandoffs(nextPastoral)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      const units=await listJourneyCongregations(nextAccess);setCongregations(units)
      const unitId=units[0]?.id??'';setCongregationId(unitId)
      if(unitId)await refresh(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])

  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectUnit(unitId:string){
    if(!access)return
    setCongregationId(unitId);setBusy(true);setError('')
    try{await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  if(loading)return <main className="journey-overview"><div className="overview-loading">{t.loading}</div></main>
  if(!canView)return <main className="journey-overview"><section className="overview-panel overview-no-access"><ShieldCheck size={34}/><h1>{t.noAccessTitle}</h1><p>{t.noAccess}</p><button className="overview-button" onClick={()=>void bootstrap()}>{t.retry}</button></section></main>

  const implementation = overview.implementation
  const implementationFinished = implementation?.status === 'completed'
  const implementationWeek = implementation?.week ?? 1

  return <main className="journey-overview"><div className="overview-shell">
    <header className="home-utility">
      <label><span>{t.unit}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(x=><option key={x.id} value={x.id}>{x.name}{x.city?` · ${x.city}`:''}</option>)}</select></label>
      <div><a href="/my-today">{t.openToday}<ArrowRight size={15}/></a><select value={locale} aria-label="Language" onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div>
    </header>

    <section className="overview-hero home-hero">
      <span className="overview-kicker">{t.product} / Home</span>
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
    </section>

    {error?<div className="overview-error">{error}</div>:null}

    {access?.canManageImplementation ? <a className={`home-implementation ${implementationFinished?'done':''}`} href="/implementation-runtime">
      <span className="home-module-icon"><ClipboardCheck size={20}/></span>
      <div>
        <span className="home-module-eyebrow">{t.implementation}</span>
        <strong>{implementationFinished?t.implementationDone:t.implementationTitle}</strong>
        <p>{implementation ? `${t.week} ${implementationWeek} · ${implementation.percent}%` : t.implementationNotStarted}</p>
      </div>
      <b>{implementation ? t.implementationContinue : t.implementationStart}<ArrowRight size={15}/></b>
    </a> : null}

    <section className="home-section">
      <div className="home-section-heading"><div><span className="overview-kicker">AGORA</span><h2>{t.attentionTitle}</h2></div></div>
      <div className="home-attention-grid">
        {access && (access.canManageCare||access.broadJourneyAccess) ? <ModuleCard href="/care-integrity" eyebrow={t.care} title={overview.care?.debt ? `${overview.care.debt} ${t.careDebt}` : `${overview.care?.open??0} ${t.careOpen}`} description={t.careDesc} metric={overview.care?String(overview.care.open):'0'} detail={t.careOpen} icon={HeartHandshake}/> : null}
        {access?.canManagePresence ? <ModuleCard href="/presence-assist" eyebrow={t.presence} title={`${overview.presence?.openSessions??0} ${t.openSessions}`} description={t.presenceDesc} icon={UserCheck}/> : null}
        {access && (access.canManageGroups||access.broadJourneyAccess) ? <ModuleCard href="/groups-runtime" eyebrow={t.groups} title={String(overview.groups?.count??0)} description={t.groupsDesc} metric={overview.groups?String(overview.groups.nearCapacity):'0'} detail={t.nearCapacity} icon={House}/> : null}
        {access && (access.canManageDiscipleship||access.broadJourneyAccess) ? <ModuleCard href="/discipleship-runtime" eyebrow={t.raiz} title={String(overview.discipleship?.active??0)} description={t.raizDesc} metric={overview.discipleship?String(overview.discipleship.active):'0'} detail={t.activeRelations} icon={Leaf}/> : null}
      </div>
    </section>

    <section className="home-section">
      <div className="home-section-heading"><div><span className="overview-kicker">FLUXO</span><h2>{t.journeyTitle}</h2><p>{t.journeySubtitle}</p></div></div>
      <div className="home-journey-flow">
        {access?.canManagePresence ? <ModuleCard href="/presence-assist" eyebrow="01" title={t.stagePresence} description={t.stagePresenceDesc} icon={UserCheck}/> : null}
        {access && (access.canManageCare||access.broadJourneyAccess) ? <ModuleCard href="/care-integrity" eyebrow="02" title={t.stageCare} description={t.stageCareDesc} icon={HeartHandshake}/> : null}
        {access && (access.canManageGroups||access.broadJourneyAccess) ? <ModuleCard href="/groups-runtime" eyebrow="03" title={t.stageGroups} description={t.stageGroupsDesc} icon={House}/> : null}
        {access && (access.canManageDiscipleship||access.broadJourneyAccess) ? <ModuleCard href="/discipleship-runtime" eyebrow="04" title={t.stageRoot} description={t.stageRootDesc} icon={Leaf}/> : null}
      </div>
    </section>

    <section className="home-section">
      <div className="home-section-heading"><div><span className="overview-kicker">GESTÃO</span><h2>{t.people} & {t.pastoral}</h2></div></div>
      <div className="home-management-grid">
        {access && (access.canManagePeople||access.broadJourneyAccess) ? <ModuleCard href="/journey-profile" eyebrow={t.people} title={String(overview.people?.count??0)} description={t.peopleDesc} icon={Users}/> : null}
        {access?.canManagePastoral ? <ModuleCard href="/pastoral-handoff" eyebrow={t.pastoral} title={`${overview.pastoral?.open??0} ${t.pastoralOpen}`} description={t.pastoralDesc} icon={Sparkles}/> : null}
        {access?.canViewGovernance ? <ModuleCard href="/governance-runtime" eyebrow={t.governance} title={t.governance} description={t.governanceDesc} icon={ShieldCheck}/> : null}
      </div>
    </section>

    {access?.canManageImplementation ? <section className="home-start-card">
      <span className="home-module-icon"><ClipboardCheck size={20}/></span>
      <div><span className="overview-kicker">{t.startTitle}</span><h2>{t.startTitle}</h2><p>{t.startDesc}</p><ol><li>{t.start1}</li><li>{t.start2}</li><li>{t.start3}</li></ol></div>
      <a href="/implementation-runtime">{implementation ? t.implementationContinue : t.implementationStart}<ArrowRight size={15}/></a>
    </section> : null}

    <p className="overview-rule"><ShieldCheck size={15}/>{t.sourceRule}</p>
  </div></main>
}
