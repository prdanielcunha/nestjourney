import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { auth } from './firebase'
import { evaluateCarePromise } from './intelligence'
import { buildJourneyUnitPulse, type JourneyUnitPulse } from './journeyExecutive'
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
  setJourneyViewAsRole,
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
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyPath } from './JourneyPath'
import { JourneyAreaFocus } from './JourneyAreaFocus'
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
    ceo:{name:'CEO MillionsNest',summary:'Visão entre organizações e leitura segura de cada experiência.',items:['Organizações com NestJourney','Saúde operacional','Acessos e governança','Experiência por responsabilidade']},
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
    ceo:{name:'MillionsNest CEO',summary:'Cross-organization view and safe reading of each experience.',items:['Organizations using NestJourney','Operational health','Access and governance','Experience by responsibility']},
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
    ceo:{name:'CEO MillionsNest',summary:'Visión entre organizaciones y lectura segura de cada experiencia.',items:['Organizaciones con NestJourney','Salud operativa','Accesos y gobernanza','Experiencia por responsabilidad']},
    member:{name:'Usuario',summary:'Acceso sin una responsabilidad operativa asignada.',items:['Personas permitidas','Ayuda','Esperar asignación de área']},
  },
}

const copy={
  'pt-BR':{
    title:'Visão',subtitle:'O painel muda conforme a responsabilidade. Aqui liderança enxerga a operação sem transformar pessoas em métricas de fé.',
    loading:'Montando a visão…',noAccess:'Seu papel não possui uma visão de gestão.',organization:'Organização',unit:'Unidade',ecosystem:'Ecossistema',
    organizations:'Organizações',activeJourney:'NestJourney ativo',people:'Pessoas',careOpen:'Cuidados abertos',careDebt:'Care Debt',careUnassigned:'Cuidados sem responsável',maxLoad:'Maior carga individual',withoutNextStep:'Sem próximo passo registrado',sessions:'Sessões abertas',pastoral:'Pastoral pendente',audit:'Eventos de auditoria',
    simulation:'Experiência por papel',simulationDesc:'Veja como o NestJourney se reorganiza para cada responsabilidade. Seu acesso real continua sendo CEO MillionsNest.',
    current:'Sua experiência atual',openArea:'Abrir área',access:'Acessos',accessDesc:'Equipe, cargos e permissões continuam governados pelo MillionsNest Hub.',
    productHealth:'Saúde do produto',productHealthDesc:'Acompanhe organizações habilitadas e abra uma delas para inspecionar a operação.',
    selectOrg:'Ver organização',noUnit:'Nenhuma unidade ativa encontrada.',error:'Não foi possível montar esta visão.',
  },
  en:{
    title:'Vision',subtitle:'The dashboard changes with responsibility. Leadership sees operations without turning people into faith metrics.',
    loading:'Building vision…',noAccess:'Your role does not have a management view.',organization:'Organization',unit:'Campus',ecosystem:'Ecosystem',
    organizations:'Organizations',activeJourney:'NestJourney active',people:'People',careOpen:'Open care',careDebt:'Care Debt',careUnassigned:'Care without owner',maxLoad:'Largest individual load',withoutNextStep:'No recorded next step',sessions:'Open sessions',pastoral:'Pastoral pending',audit:'Audit events',
    simulation:'Experience by role',simulationDesc:'See how NestJourney reorganizes itself for each responsibility. Your real access remains MillionsNest CEO.',
    current:'Your current experience',openArea:'Open area',access:'Access',accessDesc:'Team, roles, and permissions remain governed by MillionsNest Hub.',
    productHealth:'Product health',productHealthDesc:'Follow enabled organizations and open one to inspect operations.',
    selectOrg:'View organization',noUnit:'No active campus found.',error:'This vision could not be built.',
  },
  es:{
    title:'Visión',subtitle:'El panel cambia según la responsabilidad. Liderazgo ve la operación sin convertir personas en métricas de fe.',
    loading:'Preparando la visión…',noAccess:'Tu papel no tiene una visión de gestión.',organization:'Organización',unit:'Sede',ecosystem:'Ecosistema',
    organizations:'Organizaciones',activeJourney:'NestJourney activo',people:'Personas',careOpen:'Cuidados abiertos',careDebt:'Care Debt',careUnassigned:'Cuidados sin responsable',maxLoad:'Mayor carga individual',withoutNextStep:'Sin próximo paso registrado',sessions:'Sesiones abiertas',pastoral:'Pastoral pendiente',audit:'Eventos de auditoría',
    simulation:'Experiencia por rol',simulationDesc:'Mira cómo NestJourney se reorganiza para cada responsabilidad. Tu acceso real sigue siendo CEO MillionsNest.',
    current:'Tu experiencia actual',openArea:'Abrir área',access:'Accesos',accessDesc:'Equipo, cargos y permisos siguen gobernados por MillionsNest Hub.',
    productHealth:'Salud del producto',productHealthDesc:'Acompaña organizaciones habilitadas y abre una para inspeccionar la operación.',
    selectOrg:'Ver organización',noUnit:'No se encontró una sede activa.',error:'No se pudo montar esta visión.',
  }
} as const

const unitPulseCopy={
  'pt-BR':{title:'Leitura rápida por unidade',desc:'Troque de unidade sem abrir módulo por módulo. O destaque usa apenas fatos operacionais registrados.',attention:'Precisa de atenção',watch:'Acompanhar',clear:'Sem pendência crítica',people:'Pessoas',debt:'Care Debt',unassigned:'Sem responsável',pastoral:'Pastoral',root:'Raiz ativo'},
  en:{title:'Quick campus read',desc:'Switch campuses without opening every module. Highlights use only recorded operational facts.',attention:'Needs attention',watch:'Watch',clear:'No critical pending work',people:'People',debt:'Care Debt',unassigned:'Unassigned',pastoral:'Pastoral',root:'Active Root'},
  es:{title:'Lectura rápida por sede',desc:'Cambia de sede sin abrir módulo por módulo. El destaque usa solo hechos operativos registrados.',attention:'Necesita atención',watch:'Acompañar',clear:'Sin pendiente crítico',people:'Personas',debt:'Care Debt',unassigned:'Sin responsable',pastoral:'Pastoral',root:'Raíz activo'},
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
  const [unitPulses,setUnitPulses]=useState<JourneyUnitPulse[]>([])
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

  const loadUnitPulse=useCallback(async(nextAccess:JourneyAccessContext,unit:JourneyCongregation)=>{
    const [p,c,s,g,d,h]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unit.id),
      (nextAccess.canManageCare||nextAccess.broadJourneyAccess)?listCareRequests(nextAccess.organizationId,unit.id):Promise.resolve([]),
      (nextAccess.canManagePresence||nextAccess.canManageMesa)?listPresenceSessions(nextAccess.organizationId,unit.id):Promise.resolve([]),
      (nextAccess.canManageGroups||nextAccess.broadJourneyAccess)?listJourneyGroups(nextAccess.organizationId,unit.id):Promise.resolve([]),
      (nextAccess.canManageDiscipleship||nextAccess.broadJourneyAccess)?listJourneyDiscipleships(nextAccess,unit.id):Promise.resolve([]),
      nextAccess.canManagePastoral?listPastoralHandoffs(nextAccess.organizationId,unit.id):Promise.resolve([]),
    ])
    return buildJourneyUnitPulse({unit,people:p,care:c,sessions:s,groups:g,discipleships:d,pastoral:h})
  },[])

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
    const pulses=await Promise.all(nextUnits.map(unit=>loadUnitPulse(nextAccess,unit)))
    setUnitPulses(pulses)
    const nextUnit=nextUnits[0]?.id??'';setUnitId(nextUnit)
    if(nextUnit)await loadUnit(nextAccess,nextUnit)
    else {setPeople([]);setCare([]);setSessions([]);setGroups([]);setDiscipleships([]);setPastoral([]);setAudit([])}
  },[loadUnit,loadUnitPulse])

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
    const ownerLoads=new Map<string,number>()
    for(const item of openCare){
      if(item.ownerRef)ownerLoads.set(item.ownerRef,(ownerLoads.get(item.ownerRef)??0)+1)
    }
    const activeDiscipleshipIds=new Set(discipleships.filter(x=>x.status==='active').map(x=>x.personId))
    const openCarePersonIds=new Set(openCare.map(x=>x.personId))
    const withoutNextStep=people.filter(person=>!person.groupId&&!activeDiscipleshipIds.has(person.id)&&!openCarePersonIds.has(person.id)).length
    return {
      people:people.length,
      careOpen:openCare.length,
      careDebt:debt,
      careUnassigned:openCare.filter(x=>!x.ownerRef).length,
      maxLoad:Math.max(0,...ownerLoads.values()),
      withoutNextStep,
      sessions:sessions.filter(x=>x.status==='open').length,
      pastoral:pastoral.filter(x=>x.status==='open').length,
      audit:audit.length,
      groups:groups.length,
      discipleships:discipleships.filter(x=>x.status==='active').length,
    }
  },[people,care,sessions,pastoral,audit,groups,discipleships])

  if(loading)return <main className="journey-section-page"><div className="journey-loading">{t.loading}</div></main>
  if(!access||!canViewJourneyVision(access))return <main className="journey-section-page"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} /></main>

  const currentExperience=experienceCopy[locale][resolveJourneyResponsibility(access)]
  const preview=experienceCopy[locale][simulation]
  const pulseText=unitPulseCopy[locale]
  const activeJourneyCount=organizations.filter(x=>x.journeyStatus==='active'||x.journeyStatus==='trialing').length
  const areaNames={
    presence:labels.presence||('pt-BR'===locale?'Presença':locale==='es'?'Presencia':'Presence'),
    mesa:labels.table||('pt-BR'===locale?'Mesa Aberta':locale==='es'?'Mesa Abierta':'Open Table'),
    care:labels.care||('pt-BR'===locale?'Cuidado & Conexão':locale==='es'?'Cuidado & Conexión':'Care & Connection'),
    groups:labels.groups||('pt-BR'===locale?'Casas de Paz':locale==='es'?'Casas de Paz':'Peace Houses'),
    root:labels.discipleship||('pt-BR'===locale?'Raiz':locale==='es'?'Raíz':'Root'),
  }
  const activeUnit=units.find(unit=>unit.id===unitId)
  const attentionTotal=metrics.careDebt+metrics.careUnassigned+metrics.pastoral+metrics.withoutNextStep
  const focusTitle=metrics.careDebt>0
    ?locale==='en'?metrics.careDebt+' overdue care promise(s)':locale==='es'?metrics.careDebt+' promesa(s) de cuidado vencida(s)':metrics.careDebt+' promessa(s) de cuidado vencida(s)'
    :metrics.pastoral>0
      ?locale==='en'?metrics.pastoral+' pastoral handoff(s) waiting':locale==='es'?metrics.pastoral+' derivación(es) pastoral(es) pendientes':metrics.pastoral+' encaminhamento(s) pastoral(is) aguardando'
      :metrics.careUnassigned>0
        ?locale==='en'?metrics.careUnassigned+' care item(s) without an owner':locale==='es'?metrics.careUnassigned+' cuidado(s) sin responsable':metrics.careUnassigned+' cuidado(s) sem responsável'
        :metrics.withoutNextStep>0
          ?locale==='en'?metrics.withoutNextStep+' people without a recorded next step':locale==='es'?metrics.withoutNextStep+' personas sin próximo paso registrado':metrics.withoutNextStep+' pessoa(s) sem próximo passo registrado'
          :locale==='en'?'No critical operational attention in this campus':locale==='es'?'Sin atención operativa crítica en esta sede':'Nenhuma atenção operacional crítica nesta unidade'
  const focusBody=attentionTotal>0
    ?locale==='en'?'Use these signals as a care thermometer, not as a score. Open only the area that needs a real decision or next step.'
      :locale==='es'?'Usa estas señales como termómetro de cuidado, no como puntuación. Abre solo el área que necesita una decisión o próximo paso real.'
      :'Use estes sinais como termômetro de cuidado, não como pontuação. Abra somente a área que precisa de uma decisão ou próximo passo real.'
    :locale==='en'?'The selected campus is operationally caught up. Keep the view quiet until a real care signal appears.'
      :locale==='es'?'La sede seleccionada está operativamente al día. Mantén la vista tranquila hasta que aparezca una señal real de cuidado.'
      :'A unidade selecionada está operacionalmente em dia. Mantenha a visão tranquila até surgir um sinal real de cuidado.'
  const primaryHref=metrics.careDebt>0||metrics.careUnassigned>0?'/care-integrity':metrics.pastoral>0?'/pastoral-handoff':metrics.withoutNextStep>0?'/journey-profile':'/my-today'
  const primaryLabel=metrics.careDebt>0||metrics.careUnassigned>0
    ?areaNames.care
    :metrics.pastoral>0
      ?(locale==='en'?'Open pastoral care':locale==='es'?'Abrir cuidado pastoral':'Abrir cuidado pastoral')
      :metrics.withoutNextStep>0
        ?(locale==='en'?'Open People':locale==='es'?'Abrir Personas':'Abrir Pessoas')
        :(locale==='en'?'Back to Today':locale==='es'?'Volver a Hoy':'Voltar para Hoje')

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / Vision</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="journey-error">{error}</div>:null}

    <section className="journey-area-toolbar journey-vision-scope">
      {access.isSystemAdmin&&organizations.length>0?<label><span>{t.organization}</span><select value={organizationId} disabled={busy} onChange={e=>void selectOrganization(e.target.value)}>{organizations.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>:null}
      {units.length>1?<label><span>{t.unit}</span><select value={unitId} disabled={busy||!units.length} onChange={e=>void selectUnit(e.target.value)}>{units.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>:null}
      {access.isSystemAdmin?<div className="journey-vision-ecosystem"><span>{t.organizations}<strong>{organizations.length}</strong></span><span>{t.activeJourney}<strong>{activeJourneyCount}</strong></span></div>:null}
    </section>

    {unitPulses.length>1?<section className="journey-unit-pulse-wrap">
      <div className="journey-unit-pulse-heading"><div><strong>{pulseText.title}</strong><span>{pulseText.desc}</span></div></div>
      <div className="journey-unit-pulse-grid">{unitPulses.map(pulse=><button key={pulse.unitId} className={'journey-unit-pulse '+pulse.level+(pulse.unitId===unitId?' selected':'')} aria-pressed={pulse.unitId===unitId} onClick={()=>void selectUnit(pulse.unitId)} disabled={busy}>
        <div className="journey-unit-pulse-top"><span><strong>{pulse.name}</strong><small>{pulse.city||pulseText.people+' '+pulse.people}</small></span><b>{pulse.level==='attention'?pulseText.attention:pulse.level==='watch'?pulseText.watch:pulseText.clear}</b></div>
        <div className="journey-unit-pulse-metrics"><span><small>{pulseText.people}</small><strong>{pulse.people}</strong></span><span><small>{pulseText.debt}</small><strong>{pulse.careDebt}</strong></span><span><small>{pulseText.unassigned}</small><strong>{pulse.careUnassigned}</strong></span><span><small>{pulseText.pastoral}</small><strong>{pulse.pastoralOpen}</strong></span><span><small>{pulseText.root}</small><strong>{pulse.activeDiscipleships}</strong></span></div>
      </button>)}</div>
    </section>:null}

    {!unitId?<div className="journey-empty">{t.noUnit}</div>:<>
      <JourneyAreaFocus
        locale={locale}
        context={[organizations.find(x=>x.id===organizationId)?.name,activeUnit?.name].filter(Boolean).join(' · ')||undefined}
        title={focusTitle}
        body={focusBody}
        metrics={[
          {label:t.careDebt,value:metrics.careDebt,tone:metrics.careDebt?'attention':'muted'},
          {label:t.careUnassigned,value:metrics.careUnassigned,tone:metrics.careUnassigned?'attention':'muted'},
          {label:t.pastoral,value:metrics.pastoral,tone:metrics.pastoral?'attention':'muted'},
          {label:t.withoutNextStep,value:metrics.withoutNextStep,tone:metrics.withoutNextStep?'attention':'muted'},
        ]}
        actions={[{label:primaryLabel,href:primaryHref,primary:true}]}
      />

      <div className="journey-vision-lanes">
        <a href="/presence-assist"><span><strong>{areaNames.presence} + {areaNames.mesa}</strong><p>{locale==='en'?'People, open sessions, and the current service flow.':locale==='es'?'Personas, sesiones abiertas y el flujo actual del culto.':'Pessoas, sessões abertas e o fluxo atual do culto.'}</p></span><b>{metrics.people} · {metrics.sessions}</b><ArrowRight size={14}/></a>
        <a href="/care-integrity"><span><strong>{areaNames.care}</strong><p>{locale==='en'?'Open promises and the highest individual load.':locale==='es'?'Promesas abiertas y la mayor carga individual.':'Promessas abertas e a maior carga individual.'}</p></span><b>{metrics.careOpen} · {metrics.maxLoad}</b><ArrowRight size={14}/></a>
        <a href="/groups-runtime"><span><strong>{areaNames.groups}</strong><p>{locale==='en'?'Active communities in the selected campus.':locale==='es'?'Comunidades activas en la sede seleccionada.':'Comunidades ativas na unidade selecionada.'}</p></span><b>{metrics.groups}</b><ArrowRight size={14}/></a>
        <a href="/discipleship-runtime"><span><strong>{areaNames.root}</strong><p>{locale==='en'?'Active Root relationships and continuity.':locale==='es'?'Acompañamientos activos de Raíz y continuidad.':'Acompanhamentos ativos no Raiz e continuidade.'}</p></span><b>{metrics.discipleships}</b><ArrowRight size={14}/></a>
      </div>

      <JourneyPath locale={locale} />
    </>}

    <section className="journey-section-block journey-current-experience"><header><div><span className="journey-section-kicker">{t.current}</span><h2>{currentExperience.name}</h2><p className="journey-section-copy">{currentExperience.summary}</p></div></header>
      <div className="journey-experience-points">{currentExperience.items.map(item=><span key={item}><ShieldCheck size={13}/>{item}</span>)}</div>
    </section>

    {(access.isSystemAdmin||access.actualIsSystemAdmin)?<section className="journey-section-block journey-experience-switch"><header><div><span className="journey-section-kicker">{t.simulation}</span><h2>{preview.name}</h2><p className="journey-section-copy">{t.simulationDesc}</p></div><button className="journey-primary-button" onClick={()=>{setJourneyViewAsRole(simulation==='ceo'?null:simulation as Exclude<JourneyResponsibility,'member'>);window.location.assign('/my-today')}}>{locale==='en'?'View as ':locale==='es'?'Visualizar como ':'Visualizar como '}{preview.name}<ArrowRight size={14}/></button></header>
      <div className="journey-segmented">{responsibilityDefinitions.filter(x=>x.id!=='member').map(x=><button className={simulation===x.id?'active':''} key={x.id} onClick={()=>setSimulation(x.id)}>{experienceCopy[locale][x.id].name}</button>)}</div>
      <div className="journey-experience-points">{preview.items.map(item=><span key={item}>{item}</span>)}</div>
    </section>:null}

    <section className="journey-section-block journey-access-entry"><header><div><span className="journey-section-kicker">{t.access}</span><h2>{t.access}</h2><p className="journey-section-copy">{t.accessDesc}</p></div><a className="journey-primary-button" href="/team-runtime">{t.openArea}<ArrowRight size={14}/></a></header></section>
  </div></main>

}
