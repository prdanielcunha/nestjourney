import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleDot, Flag, Route, Search, ShieldCheck } from 'lucide-react'
import { auth } from './firebase'
import {
  canOperateJourneyStage,
  completeJourneyMilestone,
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyMilestones,
  listJourneyPeople,
  loadActiveJourneyPlaybook,
  loadJourneyAccess,
  resolveActiveJourneyCongregationId,
  setActiveJourneyCongregationId,
  startJourneyMilestone,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyMilestoneRecord,
  type JourneyPersonRecord,
} from './journeyRepository'
import type { JourneyPlaybookDefinition, JourneyPlaybookStage } from './playbookEngine'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { AccessDeniedState } from './AccessDeniedState'
import { GuidedEmptyState } from './GuidedEmptyState'
import './JourneyRuntimePages.css'

const copy={
  'pt-BR':{
    title:'Próximos passos',subtitle:'Acompanhe marcos reais depois da integração, sem transformar crescimento em pontuação.',
    loading:'Carregando próximos passos…',back:'Voltar à Jornada',unit:'Unidade',person:'Pessoa',search:'Buscar pessoa',
    stages:'Etapas configuradas',notStarted:'Ainda não iniciado',active:'Em andamento',completed:'Concluído',
    start:'Iniciar etapa',complete:'Concluir etapa',started:'Etapa iniciada',done:'Etapa concluída',
    noStages:'Esta jornada não possui etapas adicionais configuradas.',noPeople:'Nenhuma pessoa disponível neste escopo.',
    choose:'Escolha uma pessoa para ver os próximos passos.',entry:'Quando começa',completion:'Quando termina',
    responsibility:'Responsabilidade',required:'Dados mínimos',missing:'Falta registrar',ready:'Dados mínimos prontos',privacy:'Registre somente o marco factual. Não use esta área para relatos íntimos, avaliações espirituais ou diagnósticos.',
    noAccess:'Seu papel não possui acesso aos próximos passos configuráveis.',error:'Não foi possível concluir a operação.',
  },
  en:{
    title:'Next steps',subtitle:'Follow real milestones after integration without turning growth into a score.',
    loading:'Loading next steps…',back:'Back to Journey',unit:'Campus',person:'Person',search:'Search person',
    stages:'Configured stages',notStarted:'Not started',active:'In progress',completed:'Completed',
    start:'Start stage',complete:'Complete stage',started:'Stage started',done:'Stage completed',
    noStages:'This journey has no additional stages configured.',noPeople:'No people are available in this scope.',
    choose:'Choose a person to see the next steps.',entry:'When it starts',completion:'When it ends',
    responsibility:'Responsibility',required:'Minimum data',missing:'Still required',ready:'Minimum data ready',privacy:'Record only the factual milestone. Do not use this area for intimate stories, spiritual ratings, or diagnoses.',
    noAccess:'Your role does not have access to configurable next steps.',error:'The operation could not be completed.',
  },
  es:{
    title:'Próximos pasos',subtitle:'Acompaña hitos reales después de la integración sin convertir el crecimiento en puntuación.',
    loading:'Cargando próximos pasos…',back:'Volver a la Jornada',unit:'Sede',person:'Persona',search:'Buscar persona',
    stages:'Etapas configuradas',notStarted:'Aún no iniciado',active:'En curso',completed:'Concluido',
    start:'Iniciar etapa',complete:'Concluir etapa',started:'Etapa iniciada',done:'Etapa concluida',
    noStages:'Esta jornada no tiene etapas adicionales configuradas.',noPeople:'No hay personas disponibles en este alcance.',
    choose:'Elige una persona para ver los próximos pasos.',entry:'Cuándo comienza',completion:'Cuándo termina',
    responsibility:'Responsabilidad',required:'Datos mínimos',missing:'Falta registrar',ready:'Datos mínimos listos',privacy:'Registra solo el hito factual. No uses esta área para relatos íntimos, evaluaciones espirituales ni diagnósticos.',
    noAccess:'Tu papel no tiene acceso a los próximos pasos configurables.',error:'No se pudo completar la operación.',
  },
} as const

function isExtendedStage(stage:JourneyPlaybookStage){
  return stage.kind==='service'||stage.kind==='multiplication'||stage.kind==='custom'
}

function statusFor(milestone:JourneyMilestoneRecord|undefined){
  return milestone?.status??'not_started'
}

function missingRequiredFields(person:JourneyPersonRecord|undefined,fields:string[]){
  if(!person)return fields
  return fields.filter(field=>{
    if(field==='name')return !person.name.trim()
    if(field==='phone')return !person.phone?.trim()
    if(field==='consent')return person.consent!==true
    if(field==='firstVisit')return !person.firstVisit?.trim()
    return false
  })
}

function requiredFieldLabel(locale:AppLocale,field:string){
  const labels:Record<string,Record<AppLocale,string>>={
    name:{'pt-BR':'nome',en:'name',es:'nombre'},
    phone:{'pt-BR':'telefone',en:'phone',es:'teléfono'},
    consent:{'pt-BR':'consentimento',en:'consent',es:'consentimiento'},
    firstVisit:{'pt-BR':'primeira visita',en:'first visit',es:'primera visita'},
  }
  return labels[field]?.[locale]??field
}

export default function JourneyMilestonesPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [milestones,setMilestones]=useState<JourneyMilestoneRecord[]>([])
  const [playbook,setPlaybook]=useState<JourneyPlaybookDefinition|null>(null)
  const [selectedId,setSelectedId]=useState('')
  const [query,setQuery]=useState('')
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')

  const stages=useMemo(()=>playbook?.stages.filter(isExtendedStage)??[],[playbook])
  const visibleStages=useMemo(()=>access?stages.filter(stage=>canOperateJourneyStage(access,stage.responsibleRoles)):[],[access,stages])
  const filteredPeople=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(locale)
    return needle?people.filter(person=>person.name.toLocaleLowerCase(locale).includes(needle)):people
  },[people,query,locale])
  const selected=people.find(person=>person.id===selectedId)??filteredPeople[0]??people[0]
  const selectedMilestones=useMemo(()=>new Map(
    milestones.filter(item=>item.personId===selected?.id).map(item=>[item.stageId,item]),
  ),[milestones,selected])

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,unitId:string)=>{
    const [nextPeople,nextMilestones,nextPlaybook]=await Promise.all([
      listJourneyPeople(nextAccess.organizationId,unitId),
      listJourneyMilestones(nextAccess,unitId),
      loadActiveJourneyPlaybook(nextAccess),
    ])
    setPeople(nextPeople)
    setMilestones(nextMilestones)
    setPlaybook(nextPlaybook)
    setSelectedId(current=>nextPeople.some(person=>person.id===current)?current:nextPeople[0]?.id??'')
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId)
      setAccess(nextAccess)
      const units=await listJourneyCongregations(nextAccess)
      setCongregations(units)
      const unitId=resolveActiveJourneyCongregationId(nextAccess.organizationId,units)
      setCongregationId(unitId)
      if(unitId)await refresh(nextAccess,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])
  useEffect(()=>{
    if(!access||!congregationId)return
    return subscribeJourneyLiveChanges({
      organizationId:access.organizationId,congregationId,collections:['people','journeyMilestones'],
      onChange:()=>{void refresh(access,congregationId)},
      onError:cause=>console.error('Milestone live sync failed',cause),
    })
  },[access,congregationId,refresh])

  async function selectUnit(unitId:string){
    if(!access)return
    setCongregationId(unitId);setActiveJourneyCongregationId(access.organizationId,unitId);setBusy(true);setError('')
    try{await refresh(access,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function start(stage:JourneyPlaybookStage){
    if(!access||!playbook||!selected)return
    setBusy(true);setError('')
    try{
      await startJourneyMilestone({access,congregationId,person:selected,playbook,stageId:stage.id})
      await refresh(access,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  async function complete(stage:JourneyPlaybookStage,milestone:JourneyMilestoneRecord){
    if(!access)return
    setBusy(true);setError('')
    try{
      await completeJourneyMilestone({access,milestone,responsibleRoles:stage.responsibleRoles})
      await refresh(access,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  if(loading)return <main className="journey-runtime"><div className="runtime-loading">{t.loading}</div></main>
  if(!access)return <main className="journey-runtime"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} retryLabel="OK" onRetry={()=>void bootstrap()}/></main>

  const hasAccess=visibleStages.length>0
  if(stages.length>0&&!hasAccess)return <main className="journey-runtime"><AccessDeniedState locale={locale} title={t.title} body={t.noAccess} retryLabel={t.back} onRetry={()=>window.location.assign('/areas')}/></main>

  return <main className="journey-runtime"><div className="runtime-shell">
    <header className="runtime-topbar">
      <div className="runtime-brand"><img src="/brand/nestjourney-symbol-light.png" alt=""/><span><strong>NestJourney</strong><small>Journey & Care Engine</small></span></div>
      <div className="runtime-actions"><a href="/areas"><ArrowLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></div>
    </header>

    <section className="runtime-hero"><div><span className="runtime-kicker">Journey / Milestones</span><h1>{t.title}</h1><p>{t.subtitle}</p></div></section>
    {error?<div className="runtime-error" role="alert">{error}</div>:null}
    <section className="runtime-panel runtime-rule"><ShieldCheck size={16}/><p>{t.privacy}</p></section>

    {congregations.length>1?<section className="journey-area-toolbar"><label><span>{t.unit}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(unit=><option value={unit.id} key={unit.id}>{unit.name}{unit.city?' · '+unit.city:''}</option>)}</select></label></section>:null}

    {!stages.length?<section className="runtime-panel"><GuidedEmptyState icon={Route} title={t.noStages} body={playbook?.description??t.noStages} primary={{label:t.back,href:'/areas'}} secondary={{label:locale==='en'?'Configure journey':locale==='es'?'Configurar jornada':'Configurar jornada',href:'/playbook-studio'}}/></section>:!people.length?<section className="runtime-panel"><GuidedEmptyState icon={Flag} title={t.noPeople} body={t.choose} primary={{label:t.back,href:'/areas'}}/></section>:<>
      <section className="journey-area-toolbar">
        <label className="grow"><span>{t.person}</span><span className="journey-search-inline"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></span></label>
        <label><span>{t.person}</span><select value={selected?.id??''} onChange={e=>setSelectedId(e.target.value)}>{filteredPeople.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
      </section>

      <section className="runtime-grid">
        {visibleStages.map(stage=>{
          const milestone=selectedMilestones.get(stage.id)
          const status=statusFor(milestone)
          const missing=missingRequiredFields(selected,stage.requiredFields)
          const requirementsLabel=stage.requiredFields.length?stage.requiredFields.map(field=>requiredFieldLabel(locale,field)).join(' · '):'—'
          return <article className="runtime-panel runtime-card" key={stage.id}>
            <div className="runtime-card-head">
              <span className="runtime-icon">{status==='completed'?<CheckCircle2 size={18}/>:<CircleDot size={18}/>}</span>
              <div><h2>{stage.label}</h2><p>{playbook?.name}</p></div>
              <span className={'runtime-badge '+(status==='completed'?'':status==='active'?'attention':'')}>{status==='completed'?t.completed:status==='active'?t.active:t.notStarted}</span>
            </div>
            <div className="runtime-meta-grid">
              <div><small>{t.entry}</small><strong>{stage.entryCriteria||'—'}</strong></div>
              <div><small>{t.completion}</small><strong>{stage.completionCriteria||'—'}</strong></div>
              <div><small>{t.responsibility}</small><strong>{stage.responsibleRoles.join(' · ')||'—'}</strong></div>
              <div><small>{t.required}</small><strong>{requirementsLabel}</strong></div>
            </div>
            {stage.requiredFields.length?<p className={missing.length?'runtime-warning':'runtime-muted'}>{missing.length?`${t.missing}: ${missing.map(field=>requiredFieldLabel(locale,field)).join(', ')}`:t.ready}</p>:null}
            <div className="runtime-card-actions">
              {!milestone?<button className="runtime-button primary" disabled={busy||!selected||missing.length>0} onClick={()=>void start(stage)}><Flag size={16}/>{t.start}</button>:milestone.status==='active'?<button className="runtime-button primary" disabled={busy||missing.length>0} onClick={()=>void complete(stage,milestone)}><CheckCircle2 size={16}/>{t.complete}</button>:<span className="runtime-muted">{t.done}</span>}
            </div>
          </article>
        })}
      </section>
    </>}
  </div></main>
}
