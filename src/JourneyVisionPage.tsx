import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Eye, ShieldCheck } from 'lucide-react'
import { auth } from './firebase'
import { evaluateCarePromise } from './intelligence'
import {
  careRequestToPromise,
  getActiveJourneyOrganizationId,
  listCareRequests,
  listJourneyAuditEvents,
  listJourneyCongregations,
  listJourneyDiscipleships,
  listJourneyGroups,
  loadJourneyModuleLabels,
  listJourneyOrganizationsForSystemAdmin,
  listJourneyPeople,
  listPastoralHandoffs,
  listPresenceSessions,
  loadJourneyAccess,
  type CareRequestRecord,
  type JourneyAccessContext,
  type JourneyAuditEvent,
  type JourneyCongregation,
  type JourneyDiscipleshipRecord,
  type JourneyGroupRecord,
  type JourneyModuleLabels,
  type JourneyOrganizationSummary,
  type JourneyPastoralHandoff,
  type JourneyPersonRecord,
  type PresenceSessionRecord,
} from './journeyRepository'
import {
  canViewJourneyVision,
  responsibilityDefinitions,
  resolveJourneyResponsibility,
  type JourneyResponsibility,
} from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import './JourneySectionPages.css'

const experienceCopy:Record<AppLocale,Record<JourneyResponsibility,{name:string;summary:string;items:string[]}>>={
  'pt-BR':{
    presence_host:{name:'Anfitrião de Presença',summary:'Entrada simples, sem painel de gestão.',items:['Próximo culto e sessão','Confirmar presença','Registrar visitante','Informar vínculo criado']},
    mesa_team:{name:'Equipe da Mesa',summary:'Tudo que a equipe precisa para a Mesa, sem acesso desnecessário a outras áreas.',items:['Sessão do culto','Convidados','Participação na Mesa','Anfitrião de vínculo']},
    caregiver:{name:'Cuidador',summary:'Fila pessoal de cuidado e prazo.',items:['Contatos atribuídos','Prazo de 24–48h','Resultado do contato','Próximo passo permitido']},
    group_leader:{name:'Líder de Casa',summary:'Operação da Casa sob sua responsabilidade.',items:['Próximo encontro','Participantes e convidados','Capacidade','Pedidos de entrada']},
    discipler:{name:'Discipulador',summary:'Acompanhamento relacional do Raiz.',items:['Pessoas acompanhadas','Encontro atual 1–7','Próxima data','Próximo passo registrado']},
    coordinator:{name:'Coordenador',summary:'Qualidade da operação e distribuição de carga.',items:['Pendências da área','Itens sem responsável','Carga da equipe','Pontos de atenção operacional']},
    pastor:{name:'Pastor',summary:'Visão de cuidado que realmente pede decisão pastoral.',items:['Care Debt','Encaminhamentos pastorais','Jornadas sem próximo passo factual','Saúde operacional']},
    admin:{name:'Dono / Administrador',summary:'Toda a organização em uma única visão.',items:['Todas as áreas','Equipes e acessos','Implantação','Relatórios e configurações']},
    ceo:{name:'CEO MillionsNest',summary:'Visão entre organizações e simulação segura de cada experiência.',items:['Organizações com NestJourney','Saúde do produto','Acessos e auditoria','Simulação de responsabilidades']},
    member:{name:'Usuário',summary:'Acesso sem responsabilidade operacional atribuída.',items:['Pessoas permitidas','Ajuda','Aguardar atribuição de área']},
  },
  en:{
    presence_host:{name:'Presence Host',summary:'Simple entry, without management noise.',items:['Next service and session','Confirm attendance','Register visitor','Record relationship']},
    mesa_team:{name:'Table Team',summary:'Everything needed for the Table without unnecessary access to other areas.',items:['Service session','Guests','Table participation','Relationship host']},
    caregiver:{name:'Caregiver',summary:'Personal care queue and promise timing.',items:['Assigned contacts','24–48h promise','Contact outcome','Allowed next step']},
    group_leader:{name:'House Leader',summary:'Operations for the group under your care.',items:['Next meeting','Participants and guests','Capacity','Entry requests']},
    discipler:{name:'Discipler',summary:'Relational Root follow-up.',items:['People you accompany','Current meeting 1–7','Next date','Recorded next step']},
    coordinator:{name:'Coordinator',summary:'Operational quality and workload distribution.',items:['Area pending work','Unassigned items','Team load','Operational attention points']},
    pastor:{name:'Pastor',summary:'Care view for what truly needs pastoral decision.',items:['Care Debt','Pastoral handoffs','Journeys without a factual next step','Operational health']},
    admin:{name:'Owner / Administrator',summary:'The whole organization in one view.',items:['All areas','Teams and access','Implementation','Reports and settings']},
    ceo:{name:'MillionsNest CEO',summary:'Cross-organization view and safe simulation of each experience.',items:['Organizations using NestJourney','Product health','Access and audit','Responsibility simulation']},
    member:{name:'User',summary:'Access without an assigned operational responsibility.',items:['Permitted people','Help','Wait for area assignment']},
  },
  es:{
    presence_host:{name:'Anfitrión de Presencia',summary:'Entrada simple, sin ruido de gestión.',items:['Próximo culto y sesión','Confirmar presencia','Registrar visitante','Informar vínculo']},
    mesa_team:{name:'Equipo de la Mesa',summary:'Todo lo necesario para la Mesa sin acceso innecesario a otras áreas.',items:['Sesión del culto','Invitados','Participación en la Mesa','Anfitrión de vínculo']},
    caregiver:{name:'Cuidador',summary:'Fila personal de cuidado y plazo.',items:['Contactos asignados','Plazo de 24–48h','Resultado del contacto','Próximo paso permitido']},
    group_leader:{name:'Líder de Casa',summary:'Operación de la Casa bajo su responsabilidad.',items:['Próximo encuentro','Participantes e invitados','Capacidad','Solicitudes de entrada']},
    discipler:{name:'Discipulador',summary:'Acompañamiento relacional de Raíz.',items:['Personas acompañadas','Encuentro actual 1–7','Próxima fecha','Próximo paso registrado']},
    coordinator:{name:'Coordinador',summary:'Calidad operativa y distribución de carga.',items:['Pendientes del área','Elementos sin responsable','Carga del equipo','Puntos de atención operativa']},
    pastor:{name:'Pastor',summary:'Visión de cuidado que realmente requiere decisión pastoral.',items:['Care Debt','Derivaciones pastorales','Jornadas sin próximo paso factual','Salud operativa']},
    admin:{name:'Dueño / Administrador',summary:'Toda la organización en una sola visión.',items:['Todas las áreas','Equipos y accesos','Implementación','Informes y configuración']},
    ceo:{name:'CEO MillionsNest',summary:'Visión entre organizaciones y simulación segura de cada experiencia.',items:['Organizaciones con NestJourney','Salud del producto','Accesos y auditoría','Simulación de responsabilidades']},
    member:{name:'Usuario',summary:'Acceso sin una responsabilidad operativa asignada.',items:['Personas permitidas','Ayuda','Esperar asignación de área']},
  },
}

const copy={
  'pt-BR':{
    title:'Visão',subtitle:'O painel muda conforme a responsabilidade. Aqui liderança enxerga a operação sem transformar pessoas em métricas de fé.',
    loading:'Montando a visão…',noAccess:'Seu papel não possui uma visão de gestão.',organization:'Organização',unit:'Unidade',ecosystem:'Ecossistema',
    organizations:'Organizações',activeJourney:'NestJourney ativo',people:'Pessoas',careOpen:'Cuidados abertos',careDebt:'Care Debt',sessions:'Sessões abertas',pastoral:'Pastoral pendente',audit:'Eventos de auditoria',
    simulation:'Simular experiência',simulationDesc:'Prévia somente leitura. Não altera seu acesso real nem executa ações como outro usuário.',
    current:'Sua experiência atual',openArea:'Abrir área',access:'Acessos',accessDesc:'Equipe, cargos e permissões continuam governados pelo MillionsNest Hub.',
    productHealth:'Saúde do produto',productHealthDesc:'Acompanhe organizações habilitadas e abra uma delas para inspecionar a operação.',
    selectOrg:'Ver organização',noUnit:'Nenhuma unidade ativa encontrada.',error:'Não foi possível montar esta visão.',
  },
  en:{
    title:'Vision',subtitle:'The dashboard changes with responsibility. Leadership sees operations without turning people into faith metrics.',
    loading:'Building vision…',noAccess:'Your role does not have a management view.',organization:'Organization',unit:'Campus',ecosystem:'Ecosystem',
    organizations:'Organizations',activeJourney:'NestJourney active',people:'People',careOpen:'Open care',careDebt:'Care Debt',sessions:'Open sessions',pastoral:'Pastoral pending',audit:'Audit events',
    simulation:'Simulate experience',simulationDesc:'Read-only preview. It does not change your real access or act as another user.',
    current:'Your current experience',openArea:'Open area',access:'Access',accessDesc:'Team, roles, and permissions remain governed by MillionsNest Hub.',
    productHealth:'Product health',productHealthDesc:'Follow enabled organizations and open one to inspect operations.',
    selectOrg:'View organization',noUnit:'No active campus found.',error:'This vision could not be built.',
  },
  es:{
    title:'Visión',subtitle:'El panel cambia según la responsabilidad. Liderazgo ve la operación sin convertir personas en métricas de fe.',
    loading:'Preparando la visión…',noAccess:'Tu papel no tiene una visión de gestión.',organization:'Organización',unit:'Sede',ecosystem:'Ecosistema',
    organizations:'Organizaciones',activeJourney:'NestJourney activo',people:'Personas',careOpen:'Cuidados abiertos',careDebt:'Care Debt',sessions:'Sesiones abiertas',pastoral:'Pastoral pendiente',audit:'Eventos de auditoría',
    simulation:'Simular experiencia',simulationDesc:'Vista previa de solo lectura. No cambia tu acceso real ni actúa como otro usuario.',
    current:'Tu experiencia actual',openArea:'Abrir área',access:'Accesos',accessDesc:'Equipo, cargos y permisos siguen gobernados por MillionsNest Hub.',
    productHealth:'Salud del producto',productHealthDesc:'Acompaña organizaciones habilitadas y abre una para inspeccionar la operación.',
    selectOrg:'Ver organización',noUnit:'No se encontró una sede activa.',error:'No se pudo montar esta visión.',
  }
} as const

export default function JourneyVisionPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [scopeAccess,setScopeAccess]=useState<JourneyAccessContext|null>(null)
  const [organizations,setOrganizations]=useState<JourneyOrganizationSummary[]>([])
  const [organizationId,setOrganizationId]=useState('')
  const [labels,setLabels]=useState<JourneyModuleLabels>({})
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [unitId,setUnitId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [care,setCare]=useState<CareRequestRecord[]>([])
  const [sessions,setSessions]=useState<PresenceSessionRecord[]>([])
  const [groups,setGroups]=useState<JourneyGroupRecord[]>([])
  const [discipleships,setDiscipleships]=useState<JourneyDiscipleshipRecord[]>([])
  const [pastoral,setPastoral]=useState<JourneyPastoralHandoff[]>([])
  const [audit,setAudit]=useState<JourneyAuditEvent[]>([])
  const [simulation,setSimulation]=useState<JourneyResponsibility>('coordinator')
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  const loadUnit=useCallback(async(nextAccess:JourneyAccessContext,nextUnit:string)=>{
    const [p,c,s,g,d,h,a]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,nextUnit),
      (nextAccess.canManageCare||nextAccess.broadJourneyAccess)?listCareRequests(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      (nextAccess.canManagePresence||nextAccess.canManageMesa)?listPresenceSessions(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      (nextAccess.canManageGroups||nextAccess.broadJourneyAccess)?listJourneyGroups(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      (nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess)?listJourneyDiscipleships(nextAccess,nextUnit):Promise.resolve([]),
      nextAccess.canManagePastoral?listPastoralHandoffs(nextAccess.organizationId,nextUnit):Promise.resolve([]),
      nextAccess.canViewGovernance?listJourneyAuditEvents(nextAccess.organizationId,nextUnit):Promise.resolve([]),
    ])
    setPeople(p);setCare(c);setSessions(s);setGroups(g);setDiscipleships(d);setPastoral(h);setAudit(a)
  },[])

  const loadOrganization=useCallback(async(userId:string,nextOrgId:string)=>{
    const nextAccess=await loadJourneyAccess(userId,nextOrgId)
    setScopeAccess(nextAccess)
    setLabels(await loadJourneyModuleLabels(nextOrgId))
    const nextUnits=await listJourneyCongregations(nextAccess);setUnits(nextUnits)
    const nextUnit=nextUnits[0]?.id??'';setUnitId(nextUnit)
    if(nextUnit)await loadUnit(nextAccess,nextUnit)
    else {setPeople([]);setCare([]);setSessions([]);setGroups([]);setDiscipleships([]);setPastoral([]);setAudit([])}
  },[loadUnit])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,currentOrg=getActiveJourneyOrganizationId()
      if(!user||!currentOrg)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,currentOrg);setAccess(nextAccess)
      if(!canViewJourneyVision(nextAccess))return
      const orgs=nextAccess.isSystemAdmin?await listJourneyOrganizationsForSystemAdmin(nextAccess):[]
      setOrganizations(orgs)
      setOrganizationId(currentOrg)
      setSimulation(resolveJourneyResponsibility(nextAccess))
      await loadOrganization(user.uid,currentOrg)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[loadOrganization,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  async function selectOrganization(nextOrg:string){
    const user=auth?.currentUser
    if(!user)return
    setBusy(true);setOrganizationId(nextOrg);setError('')
    try{await loadOrganization(user.uid,nextOrg)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }
  async function selectUnit(nextUnit:string){
    if(!scopeAccess)return
    setBusy(true);setUnitId(nextUnit);setError('')
    try{await loadUnit(scopeAccess,nextUnit)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  const metrics=useMemo(()=>{
    const openCare=care.filter(x=>x.status==='open')
    const debt=openCare.filter(x=>evaluateCarePromise(careRequestToPromise(x)).state==='debt').length
    return {
      people:people.length,
      careOpen:openCare.length,
      careDebt:debt,
      sessions:sessions.filter(x=>x.status==='open').length,
      pastoral:pastoral.filter(x=>x.status==='open').length,
      audit:audit.length,
      groups:groups.length,
      discipleships:discipleships.filter(x=>x.status==='active').length,
    }
  },[people,care,sessions,pastoral,audit,groups,discipleships])

  if(loading)return <main className="journey-section-page"><div className="journey-loading">{t.loading}</div></main>
  if(!access||!canViewJourneyVision(access))return <main className="journey-section-page"><div className="journey-no-access"><Eye size={32}/><h1>{t.title}</h1><p>{t.noAccess}</p></div></main>

  const currentExperience=experienceCopy[locale][resolveJourneyResponsibility(access)]
  const preview=experienceCopy[locale][simulation]
  const activeJourneyCount=organizations.filter(x=>x.journeyStatus==='active'||x.journeyStatus==='trialing').length
  const areaNames={
    presence:labels.presence||('pt-BR'===locale?'Presença':locale==='es'?'Presencia':'Presence'),
    mesa:labels.table||('pt-BR'===locale?'Mesa Aberta':locale==='es'?'Mesa Abierta':'Open Table'),
    care:labels.care||('pt-BR'===locale?'Cuidado & Conexão':locale==='es'?'Cuidado & Conexión':'Care & Connection'),
    groups:labels.groups||('pt-BR'===locale?'Casas de Paz':locale==='es'?'Casas de Paz':'Peace Houses'),
    root:labels.discipleship||('pt-BR'===locale?'Raiz':locale==='es'?'Raíz':'Root'),
  }

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Vision</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="journey-error">{error}</div>:null}

    {access.isSystemAdmin?<section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.ecosystem}</span><h2>{t.productHealth}</h2><p className="journey-section-copy">{t.productHealthDesc}</p></div></header>
      <div className="journey-stat-grid"><div className="journey-stat"><span>{t.organizations}</span><strong>{organizations.length}</strong><small>{t.ecosystem}</small></div><div className="journey-stat"><span>{t.activeJourney}</span><strong>{activeJourneyCount}</strong><small>NestJourney</small></div></div>
      <div className="journey-list journey-section-block">{organizations.map(org=><button className="journey-list-row" key={org.id} onClick={()=>void selectOrganization(org.id)} disabled={busy}><div><strong>{org.name}</strong><span>{org.city||org.id}</span></div><span className={'journey-status '+((org.journeyStatus==='active'||org.journeyStatus==='trialing')?'':'muted')}>{org.journeyStatus}</span></button>)}</div>
    </section>:null}

    <section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.organization}</span><h2>{organizations.find(x=>x.id===organizationId)?.name||organizationId}</h2></div><div className="journey-inline-actions">{access.isSystemAdmin?<select className="journey-section-select" value={organizationId} disabled={busy} onChange={e=>void selectOrganization(e.target.value)}>{organizations.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select>:null}<select className="journey-section-select" value={unitId} disabled={busy||!units.length} onChange={e=>void selectUnit(e.target.value)}>{units.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div></header>
      {!unitId?<div className="journey-empty">{t.noUnit}</div>:<div className="journey-stat-grid">
        <div className="journey-stat"><span>{t.people}</span><strong>{metrics.people}</strong><small>{areaNames.presence}</small></div>
        <div className="journey-stat"><span>{t.careOpen}</span><strong>{metrics.careOpen}</strong><small>{areaNames.care}</small></div>
        <div className="journey-stat"><span>{t.careDebt}</span><strong>{metrics.careDebt}</strong><small>{areaNames.care}</small></div>
        <div className="journey-stat"><span>{t.sessions}</span><strong>{metrics.sessions}</strong><small>{areaNames.presence} · {areaNames.mesa}</small></div>
        <div className="journey-stat"><span>{areaNames.groups}</span><strong>{metrics.groups}</strong><small>{t.organization}</small></div>
        <div className="journey-stat"><span>{areaNames.root}</span><strong>{metrics.discipleships}</strong><small>{t.organization}</small></div>
        <div className="journey-stat"><span>{t.pastoral}</span><strong>{metrics.pastoral}</strong><small>{t.organization}</small></div>
        <div className="journey-stat"><span>{t.audit}</span><strong>{metrics.audit}</strong><small>{t.organization}</small></div>
      </div>}
    </section>

    <section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.current}</span><h2>{currentExperience.name}</h2><p className="journey-section-copy">{currentExperience.summary}</p></div></header><div className="journey-card-grid">{currentExperience.items.map(item=><article className="journey-card" key={item}><span className="journey-card-icon"><ShieldCheck size={18}/></span><span className="journey-card-copy"><strong>{item}</strong></span></article>)}</div></section>

    {access.isSystemAdmin?<section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.simulation}</span><h2>{preview.name}</h2><p className="journey-section-copy">{t.simulationDesc}</p></div></header>
      <div className="journey-segmented">{responsibilityDefinitions.filter(x=>x.id!=='ceo'&&x.id!=='member').map(x=><button className={simulation===x.id?'active':''} key={x.id} onClick={()=>setSimulation(x.id)}>{experienceCopy[locale][x.id].name}</button>)}</div>
      <div className="journey-card-grid journey-section-block">{preview.items.map(item=><article className="journey-card" key={item}><span className="journey-card-icon"><Eye size={18}/></span><span className="journey-card-copy"><strong>{item}</strong><p>{preview.summary}</p></span></article>)}</div>
    </section>:null}

    <section className="journey-section-block"><header><div><span className="journey-section-kicker">{t.access}</span><h2>{t.access}</h2><p className="journey-section-copy">{t.accessDesc}</p></div><a className="journey-primary-button" href="/team-runtime">{t.openArea}<ArrowRight size={14}/></a></header></section>
  </div></main>
}
