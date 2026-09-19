import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, HeartHandshake, House, Leaf, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { auth } from './firebase'
import { evaluateCarePromise } from './intelligence'
import {
  careRequestToPromise,
  getActiveJourneyOrganizationId,
  listCareRequests,
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
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import { canViewJourneyReports } from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import './JourneySectionPages.css'

const copy={
  'pt-BR':{
    title:'Relatórios',subtitle:'Indicadores objetivos da operação. Sem score espiritual, sem ranking de pessoas.',
    loading:'Montando os relatórios…',noAccess:'Seu papel não possui acesso aos relatórios de gestão.',unit:'Unidade',
    people:'Pessoas',careOpen:'Cuidados abertos',careDebt:'Care Debt',sessions:'Sessões abertas',groups:'Casas',nearCapacity:'Casas perto da capacidade',root:'Raiz ativo',pastoral:'Encaminhamentos pastorais',
    careHealth:'Cuidado no prazo',careHealthDesc:'Compromissos abertos e atrasados ajudam a coordenação a redistribuir carga.',
    journeyHealth:'Saúde operacional',journeyHealthDesc:'Os números representam registros do sistema, não maturidade espiritual ou qualidade humana.',
    noData:'Sem dados registrados nesta unidade.',error:'Não foi possível montar os relatórios.',
  },
  en:{
    title:'Reports',subtitle:'Objective operational indicators. No spiritual score and no ranking of people.',
    loading:'Building reports…',noAccess:'Your role does not have access to management reports.',unit:'Campus',
    people:'People',careOpen:'Open care',careDebt:'Care Debt',sessions:'Open sessions',groups:'Houses',nearCapacity:'Houses near capacity',root:'Active Root',pastoral:'Pastoral handoffs',
    careHealth:'Care timing',careHealthDesc:'Open and overdue commitments help coordinators redistribute workload.',
    journeyHealth:'Operational health',journeyHealthDesc:'Numbers represent recorded facts, not spiritual maturity or human worth.',
    noData:'No data recorded in this campus.',error:'Reports could not be built.',
  },
  es:{
    title:'Informes',subtitle:'Indicadores operativos objetivos. Sin puntuación espiritual ni ranking de personas.',
    loading:'Preparando informes…',noAccess:'Tu papel no tiene acceso a los informes de gestión.',unit:'Sede',
    people:'Personas',careOpen:'Cuidados abiertos',careDebt:'Care Debt',sessions:'Sesiones abiertas',groups:'Casas',nearCapacity:'Casas cerca de capacidad',root:'Raíz activo',pastoral:'Derivaciones pastorales',
    careHealth:'Cuidado a tiempo',careHealthDesc:'Compromisos abiertos y atrasados ayudan a redistribuir la carga.',
    journeyHealth:'Salud operativa',journeyHealthDesc:'Los números representan hechos registrados, no madurez espiritual ni valor humano.',
    noData:'No hay datos registrados en esta sede.',error:'No se pudieron montar los informes.',
  }
} as const

export default function JourneyReportsPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const {labels}=useJourneyLabels()
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [unitId,setUnitId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [care,setCare]=useState<CareRequestRecord[]>([])
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [groups,setGroups]=useState<JourneyGroupRecord[]>([])
  const [discipleships,setDiscipleships]=useState<JourneyDiscipleshipRecord[]>([])
  const [pastoral,setPastoral]=useState<JourneyPastoralHandoff[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const loadScope=useCallback(async(nextAccess:JourneyAccessContext,nextUnit:string)=>{
    const [p,c,s,g,d,h]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,nextUnit),
      nextAccess.canManageCare||nextAccess.broadJourneyAccess?listCareRequests(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      nextAccess.canManagePresence||nextAccess.canManageMesa?listPresenceSessions(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      nextAccess.canManageGroups||nextAccess.broadJourneyAccess?listJourneyGroups(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess?listJourneyDiscipleships(nextAccess,nextUnit):Promise.resolve([]),
      nextAccess.canManagePastoral?listPastoralHandoffs(nextAccess.organizationId,nextUnit):Promise.resolve([]),
    ])
    setPeople(p);setCare(c);setSessions(s);setGroups(g);setDiscipleships(d);setPastoral(h)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      if(!canViewJourneyReports(nextAccess))return
      const nextUnits=await listJourneyCongregations(nextAccess);setUnits(nextUnits)
      const nextUnit=nextUnits[0]?.id??'';setUnitId(nextUnit)
      if(nextUnit)await loadScope(nextAccess,nextUnit)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[loadScope,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectUnit(nextUnit:string){
    if(!access)return
    setUnitId(nextUnit);setBusy(true);setError('')
    try{await loadScope(access,nextUnit)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  const metrics=useMemo(()=>{
    const openCare=care.filter(x=>x.status==='open')
    const debt=openCare.filter(x=>evaluateCarePromise(careRequestToPromise(x)).state==='debt').length
    const near=groups.filter(g=>(g.capacity??0)>0&&(g.participants??0)/(g.capacity??1)>=.85).length
    return {
      people:people.length,
      careOpen:openCare.length,
      careDebt:debt,
      sessions:sessions.filter(x=>x.status==='open').length,
      groups:groups.length,
      near,
      discipleships:discipleships.filter(x=>x.status==='active').length,
      pastoral:pastoral.filter(x=>x.status==='open').length,
    }
  },[people,care,sessions,groups,discipleships,pastoral])

  if(loading)return <main className="journey-section-page"><div className="journey-loading">{t.loading}</div></main>
  if(!access||!canViewJourneyReports(access))return <main className="journey-section-page"><div className="journey-no-access"><ShieldCheck size={32}/><h1>{t.title}</h1><p>{t.noAccess}</p></div></main>

  const stats=[
    [t.people,metrics.people,Users],
    [labels.care||t.careOpen,metrics.careOpen,HeartHandshake],
    [t.careDebt,metrics.careDebt,HeartHandshake],
    [t.sessions,metrics.sessions,UserCheck],
    [labels.groups||t.groups,metrics.groups,House],
    [t.nearCapacity,metrics.near,House],
    [labels.discipleship||t.root,metrics.discipleships,Leaf],
    [t.pastoral,metrics.pastoral,ShieldCheck],
  ] as const
  const careRatio=metrics.careOpen===0?'0 / 0':String(Math.max(0,metrics.careOpen-metrics.careDebt))+' / '+String(metrics.careOpen)

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Reports</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="journey-error">{error}</div>:null}
    <section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.unit}</span><h2>{units.find(x=>x.id===unitId)?.name||'—'}</h2></div><select className="journey-section-select" value={unitId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{units.map(x=><option key={x.id} value={x.id}>{x.name+(x.city?' · '+x.city:'')}</option>)}</select></header>
      <div className="journey-stat-grid">{stats.map(([label,value,Icon])=><div className="journey-stat" key={label}><span>{label}</span><strong>{value}</strong><small><Icon size={13}/></small></div>)}</div>
    </section>
    <section className="journey-card-grid journey-section-block"><article className="journey-card"><span className="journey-card-icon"><HeartHandshake size={20}/></span><span className="journey-card-copy"><small>{t.careHealth}</small><strong>{careRatio}</strong><p>{t.careHealthDesc}</p></span></article><article className="journey-card"><span className="journey-card-icon"><BarChart3 size={20}/></span><span className="journey-card-copy"><small>{t.journeyHealth}</small><strong>{metrics.people||t.noData}</strong><p>{t.journeyHealthDesc}</p></span></article></section>
    <div className="journey-section-note"><ShieldCheck size={18}/><p>{t.journeyHealthDesc}</p></div>
  </div></main>
}
