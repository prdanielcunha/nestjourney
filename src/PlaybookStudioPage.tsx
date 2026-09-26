import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, CirclePlus, Copy, Route, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { auth } from './firebase'
import {
  canConfigureJourneyPlaybooks,
  ensureDefaultJourneyPlaybook,
  getActiveJourneyOrganizationId,
  listJourneyPlaybooks,
  loadActiveJourneyPlaybook,
  loadJourneyAccess,
  saveJourneyPlaybook,
  setActiveJourneyPlaybook,
  type JourneyAccessContext,
} from './journeyRepository'
import {
  JOURNEY_PLAYBOOK_DEFAULT_ID,
  createRaizEMesaPlaybook,
  normalizeJourneyPlaybook,
  type JourneyImplementationPhaseDefinition,
  type JourneyPlaybookDefinition,
  type JourneyPlaybookStage,
  type JourneyPlaybookStageKind,
} from './playbookEngine'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { AccessDeniedState } from './AccessDeniedState'
import './JourneySectionPages.css'
import './PlaybookStudioPage.css'

const copy={
  'pt-BR':{
    title:'Configurar jornada',subtitle:'Defina como sua igreja chama e organiza a jornada sem mudar código, permissões ou regras.',
    back:'Voltar à Gestão',active:'Jornada ativa',activate:'Usar nesta organização',save:'Salvar alterações',saving:'Salvando…',
    official:'Modelo oficial',officialHelp:'Raiz e Mesa 2026 é o modelo de referência. Para adaptar etapas e implantação, crie uma variação sem alterar o original.',
    clone:'Criar uma variação',newName:'Nome da jornada',description:'Propósito em uma frase',care:'Prazo de cuidado',hours:'horas',meetings:'Encontros de discipulado',
    names:'Nomes das áreas',stages:'Etapas da jornada',stagesHelp:'A ordem abaixo é a ordem que a pessoa enxerga. Etapas não medem valor espiritual.',
    addStage:'Adicionar etapa',entry:'Quando entra',completion:'Quando esta etapa termina',kind:'Tipo de apoio',owners:'Quem pode assumir',required:'Dados mínimos necessários',
    implementation:'Implantação',implementationHelp:'Crie fases e checklists para a igreja saber exatamente o que preparar e executar.',
    addPhase:'Adicionar fase',objective:'Objetivo',items:'Checklist — uma tarefa por linha',remove:'Remover',
    indicators:'Indicadores operacionais',routing:'Encaminhamentos permitidos',safe:'Somente sinais factuais e próximos passos. Nada de ranking espiritual, diagnóstico ou inferência íntima.',
    draft:'Rascunho',activeStatus:'Ativa',saved:'Jornada salva.',activated:'Jornada ativa atualizada.',error:'Não foi possível salvar a jornada.',
    noAccess:'Somente liderança autorizada pode configurar a jornada.',select:'Escolha uma jornada',empty:'Nenhuma jornada configurada.',
  },
  en:{
    title:'Configure journey',subtitle:'Define how your church names and organizes the journey without changing code, permissions, or rules.',
    back:'Back to Management',active:'Active journey',activate:'Use in this organization',save:'Save changes',saving:'Saving…',
    official:'Official template',officialHelp:'Raiz e Mesa 2026 is the reference model. To adapt stages and rollout, create a variation without changing the original.',
    clone:'Create a variation',newName:'Journey name',description:'Purpose in one sentence',care:'Care deadline',hours:'hours',meetings:'Discipleship meetings',
    names:'Area names',stages:'Journey stages',stagesHelp:'The order below is the order people see. Stages never measure spiritual worth.',
    addStage:'Add stage',entry:'When it starts',completion:'When this stage ends',kind:'Support type',owners:'Who may own it',required:'Minimum required data',
    implementation:'Implementation',implementationHelp:'Create phases and checklists so the church knows exactly what to prepare and execute.',
    addPhase:'Add phase',objective:'Objective',items:'Checklist — one task per line',remove:'Remove',
    indicators:'Operational indicators',routing:'Allowed routing',safe:'Factual signals and next steps only. No spiritual ranking, diagnosis, or intimate inference.',
    draft:'Draft',activeStatus:'Active',saved:'Journey saved.',activated:'Active journey updated.',error:'The journey could not be saved.',
    noAccess:'Only authorized leadership can configure the journey.',select:'Choose a journey',empty:'No journey configured.',
  },
  es:{
    title:'Configurar jornada',subtitle:'Define cómo tu iglesia nombra y organiza la jornada sin cambiar código, permisos o reglas.',
    back:'Volver a Gestión',active:'Jornada activa',activate:'Usar en esta organización',save:'Guardar cambios',saving:'Guardando…',
    official:'Modelo oficial',officialHelp:'Raiz e Mesa 2026 es el modelo de referencia. Para adaptar etapas e implementación, crea una variación sin cambiar el original.',
    clone:'Crear una variación',newName:'Nombre de la jornada',description:'Propósito en una frase',care:'Plazo de cuidado',hours:'horas',meetings:'Encuentros de discipulado',
    names:'Nombres de las áreas',stages:'Etapas de la jornada',stagesHelp:'El orden de abajo es el orden que ve la persona. Las etapas no miden valor espiritual.',
    addStage:'Agregar etapa',entry:'Cuándo entra',completion:'Cuándo termina esta etapa',kind:'Tipo de apoyo',owners:'Quién puede asumir',required:'Datos mínimos necesarios',
    implementation:'Implementación',implementationHelp:'Crea fases y listas para que la iglesia sepa exactamente qué preparar y ejecutar.',
    addPhase:'Agregar fase',objective:'Objetivo',items:'Checklist — una tarea por línea',remove:'Eliminar',
    indicators:'Indicadores operativos',routing:'Derivaciones permitidas',safe:'Solo señales factuales y próximos pasos. Sin ranking espiritual, diagnóstico ni inferencia íntima.',
    draft:'Borrador',activeStatus:'Activa',saved:'Jornada guardada.',activated:'Jornada activa actualizada.',error:'No se pudo guardar la jornada.',
    noAccess:'Solo liderazgo autorizado puede configurar la jornada.',select:'Elige una jornada',empty:'Ninguna jornada configurada.',
  },
} as const

const kindLabels:Record<AppLocale,Record<JourneyPlaybookStageKind,string>>={
  'pt-BR':{presence:'Presença/acolhimento',table:'Mesa/hospitalidade',care:'Cuidado',groups:'Grupo/comunidade',discipleship:'Discipulado',service:'Vida e serviço',multiplication:'Multiplicação',custom:'Marco personalizado'},
  en:{presence:'Presence/welcome',table:'Table/hospitality',care:'Care',groups:'Group/community',discipleship:'Discipleship',service:'Life and service',multiplication:'Multiplication',custom:'Custom milestone'},
  es:{presence:'Presencia/recepción',table:'Mesa/hospitalidad',care:'Cuidado',groups:'Grupo/comunidad',discipleship:'Discipulado',service:'Vida y servicio',multiplication:'Multiplicación',custom:'Hito personalizado'},
}

const roleLabels:Record<AppLocale,Record<string,string>>={
  'pt-BR':{owner:'Dono',admin:'Administrador',pastor:'Pastor',coordinator:'Coordenador',presence_host:'Equipe de presença',mesa_team:'Equipe da Mesa',caregiver:'Cuidador',group_leader:'Líder de grupo',discipler:'Discipulador'},
  en:{owner:'Owner',admin:'Administrator',pastor:'Pastor',coordinator:'Coordinator',presence_host:'Presence team',mesa_team:'Table team',caregiver:'Caregiver',group_leader:'Group leader',discipler:'Discipler'},
  es:{owner:'Dueño',admin:'Administrador',pastor:'Pastor',coordinator:'Coordinador',presence_host:'Equipo de presencia',mesa_team:'Equipo de Mesa',caregiver:'Cuidador',group_leader:'Líder de grupo',discipler:'Discipulador'},
}
const roles=['owner','admin','pastor','coordinator','presence_host','mesa_team','caregiver','group_leader','discipler']
const requiredFields=[
  ['name',{ 'pt-BR':'Nome',en:'Name',es:'Nombre'}],
  ['phone',{ 'pt-BR':'Telefone',en:'Phone',es:'Teléfono'}],
  ['consent',{ 'pt-BR':'Autorização de contato',en:'Contact authorization',es:'Autorización de contacto'}],
  ['firstVisit',{ 'pt-BR':'Primeira visita',en:'First visit',es:'Primera visita'}],
] as const
const indicatorOptions=[
  ['care_debt',{ 'pt-BR':'Cuidado atrasado',en:'Overdue care',es:'Cuidado atrasado'}],
  ['unassigned_care',{ 'pt-BR':'Cuidado sem responsável',en:'Unassigned care',es:'Cuidado sin responsable'}],
  ['open_presence_sessions',{ 'pt-BR':'Sessões de presença abertas',en:'Open presence sessions',es:'Sesiones de presencia abiertas'}],
  ['group_capacity',{ 'pt-BR':'Capacidade dos grupos',en:'Group capacity',es:'Capacidad de grupos'}],
  ['active_discipleships',{ 'pt-BR':'Discipulados ativos',en:'Active discipleships',es:'Discipulados activos'}],
  ['pastoral_handoffs',{ 'pt-BR':'Encaminhamentos pastorais',en:'Pastoral handoffs',es:'Derivaciones pastorales'}],
] as const
const routeOptions=[
  ['visitor_to_first_contact',{ 'pt-BR':'Visitante → primeiro cuidado',en:'Visitor → first care',es:'Visitante → primer cuidado'}],
  ['confirmed_absence_to_care',{ 'pt-BR':'Ausência confirmada → cuidado',en:'Confirmed absence → care',es:'Ausencia confirmada → cuidado'}],
  ['care_to_pastoral_handoff',{ 'pt-BR':'Cuidado → contato pastoral',en:'Care → pastoral contact',es:'Cuidado → contacto pastoral'}],
  ['group_interest_to_entry_request',{ 'pt-BR':'Interesse em grupo → pedido de entrada',en:'Group interest → entry request',es:'Interés en grupo → solicitud de entrada'}],
] as const

function draftVariation(organizationId:string,source:JourneyPlaybookDefinition){
  const now=Date.now().toString(36)
  return normalizeJourneyPlaybook({
    ...source,
    id:'journey-'+now,
    organizationId,
    name:source.id===JOURNEY_PLAYBOOK_DEFAULT_ID?'Minha jornada':source.name+' · cópia',
    status:'draft',
    createdAt:undefined,createdBy:undefined,updatedAt:undefined,updatedBy:undefined,
  },'journey-'+now)
}

export default function PlaybookStudioPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [playbooks,setPlaybooks]=useState<JourneyPlaybookDefinition[]>([])
  const [activeId,setActiveId]=useState('')
  const [selectedId,setSelectedId]=useState('')
  const [form,setForm]=useState<JourneyPlaybookDefinition|null>(null)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')

  const reload=useCallback(async(nextAccess:JourneyAccessContext)=>{
    await ensureDefaultJourneyPlaybook(nextAccess)
    const [items,active]=await Promise.all([listJourneyPlaybooks(nextAccess),loadActiveJourneyPlaybook(nextAccess)])
    setPlaybooks(items)
    setActiveId(active.id)
    setSelectedId(current=>items.some(item=>item.id===current)?current:active.id)
    setForm(current=>{
      const id=current&&items.some(item=>item.id===current.id)?current.id:active.id
      return items.find(item=>item.id===id)??active
    })
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const next=await loadJourneyAccess(user.uid,organizationId);setAccess(next)
      if(!canConfigureJourneyPlaybooks(next))return
      await reload(next)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[reload,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  useEffect(()=>{
    if(!selectedId)return
    const selected=playbooks.find(item=>item.id===selectedId)
    if(selected)setForm(selected)
  },[selectedId,playbooks])

  const official=form?.id===JOURNEY_PLAYBOOK_DEFAULT_ID
  const kinds=Object.keys(kindLabels[locale]) as JourneyPlaybookStageKind[]
  const setArea=(key:keyof JourneyPlaybookDefinition['areaLabels'],value:string)=>setForm(current=>current?({...current,areaLabels:{...current.areaLabels,[key]:value}}):current)
  const setStage=(index:number,patch:Partial<JourneyPlaybookStage>)=>setForm(current=>current?({...current,stages:current.stages.map((stage,i)=>i===index?{...stage,...patch}:stage)}):current)
  const setPhase=(index:number,patch:Partial<JourneyImplementationPhaseDefinition>)=>setForm(current=>current?({...current,implementationPhases:current.implementationPhases.map((phase,i)=>i===index?{...phase,...patch}:phase)}):current)

  async function save(nextStatus?:'draft'|'active'){
    if(!access||!form||official)return
    setBusy(true);setMessage('');setError('')
    try{
      const normalized=normalizeJourneyPlaybook({...form,status:nextStatus??form.status,organizationId:access.organizationId},form.id)
      const saved=await saveJourneyPlaybook(access,normalized)
      if(nextStatus==='active'){
        await setActiveJourneyPlaybook(access,saved.id)
        setMessage(t.activated)
      }else setMessage(t.saved)
      await reload(access)
      setSelectedId(saved.id)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  if(loading)return <main className="journey-section-page"><div className="journey-loading">NestJourney…</div></main>
  if(!access||!canConfigureJourneyPlaybooks(access))return <main className="journey-section-page"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} retryLabel="OK" onRetry={()=>window.history.back()}/></main>

  return <main className="journey-section-page"><div className="journey-section-shell playbook-studio">
    <header className="journey-section-header">
      <div><span className="journey-section-kicker">NestJourney / Playbook Studio</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <div className="playbook-header-actions"><a className="journey-primary-button" href="/more"><ArrowLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div>
    </header>
    {error?<div className="settings-error">{error}</div>:null}{message?<div className="settings-success"><Check size={15}/>{message}</div>:null}

    <section className="journey-section-note"><ShieldCheck size={18}/><p>{t.safe}</p></section>

    <section className="playbook-layout">
      <aside className="journey-section-block playbook-list">
        <span className="journey-section-kicker">{t.select}</span>
        {playbooks.map(item=><button key={item.id} className={selectedId===item.id?'active':''} onClick={()=>setSelectedId(item.id)}>
          <span><strong>{item.name}</strong><small>{item.id===activeId?t.active:item.status==='active'?t.activeStatus:t.draft}</small></span>{item.id===activeId?<Check size={16}/>:null}
        </button>)}
        {!playbooks.length?<p>{t.empty}</p>:null}
      </aside>

      {form?<section className="playbook-editor">
        {official?<section className="journey-section-block playbook-official"><Sparkles size={20}/><div><span className="journey-section-kicker">{t.official}</span><h2>{form.name}</h2><p>{t.officialHelp}</p><button className="journey-primary-button" onClick={()=>{const next=draftVariation(access.organizationId,createRaizEMesaPlaybook(access.organizationId));setForm(next);setSelectedId(next.id)}}><Copy size={16}/>{t.clone}</button></div></section>:null}

        <section className="journey-section-block">
          <div className="playbook-grid two">
            <label><span>{t.newName}</span><input disabled={official} value={form.name} maxLength={80} onChange={e=>setForm(current=>current?({...current,name:e.target.value}):current)}/></label>
            <label><span>{t.description}</span><input disabled={official} value={form.description} maxLength={280} onChange={e=>setForm(current=>current?({...current,description:e.target.value}):current)}/></label>
            <label><span>{t.care}</span><div className="playbook-number"><input disabled={official} type="number" min={1} max={168} value={form.carePromiseHours} onChange={e=>setForm(current=>current?({...current,carePromiseHours:Number(e.target.value)}):current)}/><small>{t.hours}</small></div></label>
            <label><span>{t.meetings}</span><input disabled={official} type="number" min={1} max={24} value={form.discipleshipMeetingCount} onChange={e=>setForm(current=>current?({...current,discipleshipMeetingCount:Number(e.target.value)}):current)}/></label>
          </div>
        </section>

        <section className="journey-section-block">
          <header><div><span className="journey-section-kicker">{t.names}</span><h2>{t.names}</h2></div></header>
          <div className="playbook-grid area-labels">
            {(Object.keys(form.areaLabels) as Array<keyof typeof form.areaLabels>).map(key=><label key={key}><span>{kindLabels[locale][key==='presence'?'presence':key==='table'?'table':key==='care'?'care':key==='groups'?'groups':'discipleship']}</span><input disabled={official} value={form.areaLabels[key]} maxLength={48} onChange={e=>setArea(key,e.target.value)}/></label>)}
          </div>
        </section>

        <section className="journey-section-block">
          <header><div><span className="journey-section-kicker">{t.stages}</span><h2>{t.stages}</h2><p>{t.stagesHelp}</p></div>{!official?<button className="journey-primary-button" onClick={()=>setForm(current=>current?({...current,stages:[...current.stages,{id:'stage-'+(current.stages.length+1),label:'',kind:'custom',entryCriteria:'',completionCriteria:'',responsibleRoles:['coordinator'],requiredFields:['name']}]}):current)}><CirclePlus size={16}/>{t.addStage}</button>:null}</header>
          <div className="playbook-stack">{form.stages.map((stage,index)=><article className="playbook-stage" key={stage.id+'-'+index}>
            <div className="playbook-row-head"><b>{index+1}</b><input disabled={official} value={stage.label} maxLength={64} onChange={e=>setStage(index,{label:e.target.value})}/>{!official&&form.stages.length>1?<button aria-label={t.remove} onClick={()=>setForm(current=>current?({...current,stages:current.stages.filter((_,i)=>i!==index)}):current)}><Trash2 size={15}/></button>:null}</div>
            <div className="playbook-grid two">
              <label><span>{t.kind}</span><select disabled={official} value={stage.kind} onChange={e=>setStage(index,{kind:e.target.value as JourneyPlaybookStageKind})}>{kinds.map(kind=><option key={kind} value={kind}>{kindLabels[locale][kind]}</option>)}</select></label>
              <label><span>{t.entry}</span><input disabled={official} value={stage.entryCriteria} maxLength={280} onChange={e=>setStage(index,{entryCriteria:e.target.value})}/></label>
              <label><span>{t.completion}</span><input disabled={official} value={stage.completionCriteria} maxLength={280} onChange={e=>setStage(index,{completionCriteria:e.target.value})}/></label>
            </div>
            <div className="playbook-choice"><span>{t.owners}</span><div>{roles.map(role=><label key={role}><input disabled={official} type="checkbox" checked={stage.responsibleRoles.includes(role)} onChange={e=>setStage(index,{responsibleRoles:e.target.checked?[...stage.responsibleRoles,role]:stage.responsibleRoles.filter(item=>item!==role)})}/><b>{roleLabels[locale][role]}</b></label>)}</div></div>
            <div className="playbook-choice"><span>{t.required}</span><div>{requiredFields.map(([field,label])=><label key={field}><input disabled={official} type="checkbox" checked={stage.requiredFields.includes(field)} onChange={e=>setStage(index,{requiredFields:e.target.checked?[...stage.requiredFields,field]:stage.requiredFields.filter(item=>item!==field)})}/><b>{label[locale]}</b></label>)}</div></div>
          </article>)}</div>
        </section>

        <section className="journey-section-block">
          <header><div><span className="journey-section-kicker">{t.implementation}</span><h2>{t.implementation}</h2><p>{t.implementationHelp}</p></div>{!official?<button className="journey-primary-button" onClick={()=>setForm(current=>current?({...current,implementationPhases:[...current.implementationPhases,{id:'phase-'+(current.implementationPhases.length+1),title:'',objective:'',items:['']}] }):current)}><CirclePlus size={16}/>{t.addPhase}</button>:null}</header>
          <div className="playbook-stack">{form.implementationPhases.map((phase,index)=><article className="playbook-stage" key={phase.id+'-'+index}>
            <div className="playbook-row-head"><b>{index+1}</b><input disabled={official} value={phase.title} maxLength={80} onChange={e=>setPhase(index,{title:e.target.value})}/>{!official&&form.implementationPhases.length>1?<button aria-label={t.remove} onClick={()=>setForm(current=>current?({...current,implementationPhases:current.implementationPhases.filter((_,i)=>i!==index)}):current)}><Trash2 size={15}/></button>:null}</div>
            <label><span>{t.objective}</span><input disabled={official} value={phase.objective} maxLength={280} onChange={e=>setPhase(index,{objective:e.target.value})}/></label>
            <label><span>{t.items}</span><textarea disabled={official} rows={Math.max(3,phase.items.length)} value={phase.items.join('\n')} onChange={e=>setPhase(index,{items:e.target.value.split('\n')})}/></label>
          </article>)}</div>
        </section>

        <section className="journey-section-block">
          <div className="playbook-grid two">
            <div className="playbook-choice"><span>{t.indicators}</span><div>{indicatorOptions.map(([id,label])=><label key={id}><input disabled={official} type="checkbox" checked={form.indicators.includes(id)} onChange={e=>setForm(current=>current?({...current,indicators:e.target.checked?[...current.indicators,id]:current.indicators.filter(item=>item!==id)}):current)}/><b>{label[locale]}</b></label>)}</div></div>
            <div className="playbook-choice"><span>{t.routing}</span><div>{routeOptions.map(([id,label])=><label key={id}><input disabled={official} type="checkbox" checked={form.routingRules.includes(id)} onChange={e=>setForm(current=>current?({...current,routingRules:e.target.checked?[...current.routingRules,id]:current.routingRules.filter(item=>item!==id)}):current)}/><b>{label[locale]}</b></label>)}</div></div>
          </div>
        </section>

        {!official?<div className="playbook-savebar"><button className="journey-primary-button secondary" disabled={busy} onClick={()=>void save('draft')}><Save size={16}/>{busy?t.saving:t.save}</button><button className="journey-primary-button" disabled={busy} onClick={()=>void save('active')}><Route size={16}/>{t.activate}</button></div>:activeId!==form.id?<div className="playbook-savebar"><button className="journey-primary-button" disabled={busy} onClick={async()=>{if(!access)return;setBusy(true);try{await setActiveJourneyPlaybook(access,form.id);await reload(access);setMessage(t.activated)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}}}><Route size={16}/>{t.activate}</button></div>:null}
      </section>:null}
    </section>
  </div></main>
}
