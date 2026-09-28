import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarClock, Check, ChevronLeft, CircleCheck, Clock3, Play, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react'
import { auth } from './firebase'
import {
  completeImplementationStep,
  createImplementationCycle,
  ensureDefaultJourneyPlaybook,
  getActiveJourneyOrganizationId,
  listImplementationCycles,
  listJourneyCongregations,
  listJourneyOrganizationMembers,
  listJourneyPlaybooks,
  planImplementationStep,
  loadActiveJourneyPlaybook,
  loadJourneyAccess,
  resolveActiveJourneyCongregationId,
  setActiveJourneyCongregationId,
  subscribeJourneyLiveChanges,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyImplementationCycle,
  type JourneyOrganizationMember,
} from './journeyRepository'
import {
  IMPLEMENTATION_PREPARATION_KEYS,
  implementationPlaybooks,
  implementationWeekForProgress,
  implementationWeekKeys,
} from './implementationPlaybook'
import {
  JOURNEY_PLAYBOOK_DEFAULT_ID,
  implementationKeysForPhases,
  type JourneyPlaybookDefinition,
} from './playbookEngine'
import { getInitialLocale, implementationRuntimeCopy, localeLabels, persistLocale, type AppLocale } from './i18n'
import { AccessDeniedState } from './AccessDeniedState'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import './ImplementationRuntimePage.css'

function genericProgress(requiredKeys:string[],completedKeys:string[]){
  const completed=new Set(completedKeys)
  const done=requiredKeys.filter(key=>completed.has(key)).length
  const total=requiredKeys.length
  return {done,total,percent:total?Math.round((done/total)*100):0}
}

const extraCopy={
  'pt-BR':{studio:'Configurar jornada',activePlaybook:'Jornada ativa',customIntro:'Esta organização usa uma implantação configurada. Conclua somente fatos realmente executados; o histórico permanece auditável.',phase:'Fase',startNamed:'Iniciar implantação',noSteps:'Esta jornada ainda não possui um checklist de implantação válido.',plan:'Planejar item',planned:'Responsabilidades combinadas',owner:'Responsável',due:'Prazo',overdue:'atrasado(s)',noPlanned:'Nenhum item com responsável e prazo definido ainda.',chooseItem:'Escolha o item',chooseOwner:'Escolha o responsável',savePlan:'Salvar responsabilidade'},
  en:{studio:'Configure journey',activePlaybook:'Active journey',customIntro:'This organization uses a configured implementation. Complete only work that actually happened; history remains auditable.',phase:'Phase',startNamed:'Start implementation',noSteps:'This journey does not yet have a valid implementation checklist.',plan:'Plan item',planned:'Agreed responsibilities',owner:'Owner',due:'Due',overdue:'overdue',noPlanned:'No item has an owner and due date yet.',chooseItem:'Choose the item',chooseOwner:'Choose the owner',savePlan:'Save responsibility'},
  es:{studio:'Configurar jornada',activePlaybook:'Jornada activa',customIntro:'Esta organización usa una implementación configurada. Completa solo hechos realmente ejecutados; el historial permanece auditable.',phase:'Fase',startNamed:'Iniciar implementación',noSteps:'Esta jornada todavía no tiene una lista de implementación válida.',plan:'Planificar ítem',planned:'Responsabilidades acordadas',owner:'Responsable',due:'Plazo',overdue:'atrasado(s)',noPlanned:'Todavía no hay ítems con responsable y plazo.',chooseItem:'Elige el ítem',chooseOwner:'Elige el responsable',savePlan:'Guardar responsabilidad'},
} as const

export default function ImplementationRuntimePage() {
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=implementationRuntimeCopy[locale],builtIn=implementationPlaybooks[locale],x=extraCopy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [congregationId,setCongregationId]=useState('')
  const [cycles,setCycles]=useState<JourneyImplementationCycle[]>([])
  const [playbooks,setPlaybooks]=useState<JourneyPlaybookDefinition[]>([])
  const [activePlaybook,setActivePlaybook]=useState<JourneyPlaybookDefinition|null>(null)
  const [team,setTeam]=useState<JourneyOrganizationMember[]>([])
  const [planning,setPlanning]=useState(false)
  const [selectedWeek,setSelectedWeek]=useState(1)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')

  const cycle=useMemo(()=>{
    if(!cycles.length)return undefined
    if(activePlaybook){
      return cycles.find(item=>item.playbookId===activePlaybook.id&&item.status==='active')
        ??cycles.find(item=>item.playbookId===activePlaybook.id)
        ??cycles[0]
    }
    return cycles[0]
  },[cycles,activePlaybook])
  const cyclePlaybook=useMemo(()=>{
    if(!cycle)return activePlaybook
    return playbooks.find(item=>item.id===cycle.playbookId)
      ??(cycle.playbookId===JOURNEY_PLAYBOOK_DEFAULT_ID?activePlaybook:null)
      ??activePlaybook
  },[cycle,playbooks,activePlaybook])
  const requiredKeys=cyclePlaybook?.implementationKeys??[]
  const progress=useMemo(()=>genericProgress(requiredKeys,cycle?.completedKeys??[]),[requiredKeys,cycle])
  const defaultCycle=cycle?.playbookId===JOURNEY_PLAYBOOK_DEFAULT_ID
  const suggestedWeek=useMemo(()=>defaultCycle?implementationWeekForProgress(cycle?.completedKeys??[]):1,[cycle,defaultCycle])
  const completed=useMemo(()=>new Set(cycle?.completedKeys??[]),[cycle])
  const week=builtIn.weeks[selectedWeek-1]

  const refresh=useCallback(async(orgId:string,unitId:string)=>{
    const next=await listImplementationCycles(orgId,unitId)
    setCycles(next)
    const defaultActive=next.find(item=>item.playbookId===JOURNEY_PLAYBOOK_DEFAULT_ID&&item.status==='active')
    if(defaultActive)setSelectedWeek(implementationWeekForProgress(defaultActive.completedKeys))
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      if(!nextAccess.canManageImplementation)return
      await ensureDefaultJourneyPlaybook(nextAccess)
      const [units,nextPlaybooks,nextActive,nextTeam]=await Promise.all([
        listJourneyCongregations(nextAccess),
        listJourneyPlaybooks(nextAccess),
        loadActiveJourneyPlaybook(nextAccess),
        listJourneyOrganizationMembers(nextAccess),
      ])
      setCongregations(units)
      setPlaybooks(nextPlaybooks.length?nextPlaybooks:[nextActive])
      setActivePlaybook(nextActive)
      setTeam(nextTeam)
      const unitId=resolveActiveJourneyCongregationId(nextAccess.organizationId,units);setCongregationId(unitId)
      if(unitId)await refresh(organizationId,unitId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])
  useEffect(()=>{
    if(!access||!congregationId||!access.canManageImplementation)return
    return subscribeJourneyLiveChanges({
      organizationId:access.organizationId,
      congregationId,
      collections:['implementationCycles'],
      onChange:()=>{void refresh(access.organizationId,congregationId)},
      onError:(cause)=>console.error('Implementation live sync failed',cause),
    })
  },[access,congregationId,refresh])

  async function selectUnit(unitId:string){
    if(!access)return
    setCongregationId(unitId);setActiveJourneyCongregationId(access.organizationId,unitId);setBusy(true);setError('')
    try{await refresh(access.organizationId,unitId)}catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }
  async function start(){
    if(!access||!congregationId||!activePlaybook)return
    setBusy(true);setError('')
    try{
      await createImplementationCycle({
        organizationId:access.organizationId,
        congregationId,
        actorId:access.userId,
        playbookId:activePlaybook.id,
      })
      await refresh(access.organizationId,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }
  async function mark(key:string){
    if(!access||!cycle||!cyclePlaybook||completed.has(key)||cycle.status==='completed')return
    setBusy(true);setError('')
    try{
      await completeImplementationStep({
        organizationId:access.organizationId,
        cycle,
        actorId:access.userId,
        key,
        requiredKeys:cyclePlaybook.implementationKeys,
      })
      await refresh(access.organizationId,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  function itemLabel(key:string){
    const prepIndex=IMPLEMENTATION_PREPARATION_KEYS.indexOf(key)
    if(defaultCycle&&prepIndex>=0)return builtIn.preparation[prepIndex]??key
    const teach=key.match(/^week\.(\d+)\.teach\.(\d+)$/)
    if(defaultCycle&&teach){
      const target=builtIn.weeks[Number(teach[1])-1]
      return target?.teaching[Number(teach[2])-1]??key
    }
    const practice=key.match(/^week\.(\d+)\.practice$/)
    if(defaultCycle&&practice)return builtIn.weeks[Number(practice[1])-1]?.practice??key
    for(const phase of cyclePlaybook?.implementationPhases??[]){
      const keys=implementationKeysForPhases([phase])
      const index=keys.indexOf(key)
      if(index>=0)return phase.items[index]??key
    }
    return key
  }

  async function savePlan(key:string,owner:JourneyOrganizationMember,dueAt:string){
    if(!access||!cycle||!cyclePlaybook)return
    setBusy(true);setError('')
    try{
      await planImplementationStep({
        organizationId:access.organizationId,
        cycle,
        actorId:access.userId,
        key,
        requiredKeys:cyclePlaybook.implementationKeys,
        ownerRef:owner.id,
        ownerName:owner.name,
        dueAt,
      })
      setPlanning(false)
      await refresh(access.organizationId,congregationId)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }

  if(loading)return <main className="implementation-runtime"><div className="implementation-loading">{t.loading}</div></main>
  if(!access?.canManageImplementation)return <main className="implementation-runtime"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={()=>void bootstrap()} /></main>

  const activeUnit=congregations.find(unit=>unit.id===congregationId)
  const unitTeam=team.filter(member=>['owner','admin','pastor'].includes(member.organizationRole)||member.congregationIds.includes(congregationId))
  const plannedSteps=(cycle?.steps??[]).filter(step=>step.status==='pending')
  const overdueSteps=plannedSteps.filter(step=>step.dueAt&&Date.parse(step.dueAt)<Date.now())
  const uncompletedKeys=requiredKeys.filter(key=>!completed.has(key))
  const configured=activePlaybook??cyclePlaybook
  const cycleComplete=Boolean(cycle&&requiredKeys.length&&requiredKeys.every(key=>completed.has(key)))
  const focusTitle=!cycle
    ?locale==='en'?'Start '+(configured?.name??'the implementation')+' when the team is ready':locale==='es'?'Inicia '+(configured?.name??'la implementación')+' cuando el equipo esté listo':'Inicie '+(configured?.name??'a implantação')+' quando a equipe estiver pronta'
    :cycleComplete
      ?locale==='en'?'Implementation cycle completed':locale==='es'?'Ciclo de implementación concluido':'Ciclo de implantação concluído'
      :defaultCycle
        ?locale==='en'?'Continue with week '+suggestedWeek:locale==='es'?'Continúa con la semana '+suggestedWeek:'Continue pela semana '+suggestedWeek
        :locale==='en'?'Continue the configured checklist':locale==='es'?'Continúa la lista configurada':'Continue o checklist configurado'
  const focusBody=!cycle
    ?(configured?.description||builtIn.progressiveDecision)
    :cycleComplete
      ?(locale==='en'?'The implementation checklist is complete. Keep the operational areas active and review only when leadership needs it.':locale==='es'?'La lista de implementación está concluida. Mantén activas las áreas operativas y revisa solo cuando liderazgo lo necesite.':'O checklist de implantação está concluído. Mantenha as áreas operacionais ativas e revise somente quando a liderança precisar.')
      :defaultCycle
        ?builtIn.weeks[suggestedWeek-1]?.objective||builtIn.progressiveDecision
        :x.customIntro

  return <main className="implementation-runtime"><div className="implementation-shell">
    <header className="implementation-topbar"><div className="implementation-brand"><img src="/brand/nestjourney-symbol-light.png" alt=""/><span><strong>{t.product}</strong><small>Journey & Care Engine</small></span></div><div className="implementation-actions"><a href="/more"><ChevronLeft size={16}/>{t.back}</a><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></div></header>
    <section className="implementation-hero"><div><span className="implementation-kicker">Journey / Playbook</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><a className="implementation-button" href="/playbook-studio"><Settings2 size={16}/>{x.studio}</a></section>
    {error?<div className="implementation-error">{error}</div>:null}

    <JourneyAreaFocus
      locale={locale}
      context={activeUnit?.name}
      title={focusTitle}
      body={focusBody}
      metrics={[
        {label:x.activePlaybook,value:configured?.name??'—',tone:configured?'good':'muted'},
        {label:t.progress,value:cycle?progress.percent+'%':'—',tone:cycleComplete?'good':cycle?'attention':'muted'},
        {label:t.week,value:defaultCycle?(cycleComplete?'7/7':String(suggestedWeek)+'/7'):(cycle?progress.done+'/'+progress.total:'—'),tone:cycle?'good':'muted'},
        {label:x.due,value:cycle?String(overdueSteps.length)+' '+x.overdue:'—',tone:overdueSteps.length?'attention':'good'},
      ]}
      actions={!cycle
        ?[{label:x.startNamed,onClick:()=>void start(),disabled:busy||!congregationId||!configured||!configured.implementationKeys.length,primary:true}]
        :cycleComplete
          ?[{label:locale==='en'?'Open Today':locale==='es'?'Abrir Hoy':'Abrir Hoje',href:'/my-today',primary:true}]
          :defaultCycle
            ?[{label:(locale==='en'?'Open week ':locale==='es'?'Abrir semana ':'Abrir semana ')+suggestedWeek,onClick:()=>{setSelectedWeek(suggestedWeek);document.getElementById('implementation-weeks')?.scrollIntoView({behavior:'smooth',block:'start'})},primary:true}]
            :[{label:locale==='en'?'Continue checklist':locale==='es'?'Continuar lista':'Continuar checklist',onClick:()=>document.getElementById('implementation-custom')?.scrollIntoView({behavior:'smooth',block:'start'}),primary:true}]
      }
    />

    {congregations.length>1?<section className="journey-area-toolbar"><label><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={e=>void selectUnit(e.target.value)}>{congregations.map(unit=><option key={unit.id} value={unit.id}>{unit.name}{unit.city?' · '+unit.city:''}</option>)}</select></label></section>:null}

    {!cycle?<section className="implementation-panel implementation-empty"><BookOpen size={28}/><h2>{t.noCycle}</h2><p>{configured?.description||builtIn.progressiveDecision}</p>{configured?.implementationKeys.length?<button className="implementation-button primary" disabled={busy||!congregationId} onClick={()=>void start()}><Play size={17}/>{x.startNamed}</button>:<p>{x.noSteps}</p>}</section>:<>
      <section className="implementation-panel implementation-cycle"><div><span className="implementation-kicker">{cycleComplete?t.completedCycle:t.activeCycle}</span><h2>{cyclePlaybook?.name??builtIn.title}</h2><p>{cyclePlaybook?.description??builtIn.subtitle}</p></div><div className="implementation-progress"><div><span>{t.progress}</span><strong>{progress.percent}%</strong></div><div className="implementation-progress-track"><i style={{width:progress.percent+'%'}}/></div><small>{progress.done} / {progress.total}</small></div></section>
      {cycleComplete?<section className="implementation-panel implementation-complete"><CircleCheck size={26}/><div><strong>{t.completedCycle}</strong><p>{t.allDone}</p></div></section>:null}

      {!cycleComplete?<section className="implementation-panel implementation-planning">
        <div className="implementation-section-title"><div><span className="implementation-kicker">{x.planned}</span><h2>{x.planned}</h2><p>{locale==='en'?'Assign operational owners and due dates without turning people into scores.':locale==='es'?'Asigna responsables y plazos operativos sin convertir personas en puntuaciones.':'Defina responsáveis e prazos operacionais sem transformar pessoas em pontuação.'}</p></div><button className="implementation-button" disabled={busy||!uncompletedKeys.length||!unitTeam.length} onClick={()=>setPlanning(true)}><CalendarClock size={16}/>{x.plan}</button></div>
        {plannedSteps.length?<div className="implementation-plan-list">{plannedSteps.map(step=>{const late=Boolean(step.dueAt&&Date.parse(step.dueAt)<Date.now());return <article key={step.key} className={late?'late':''}><div><strong>{itemLabel(step.key)}</strong><span>{x.owner}: {step.ownerName||'—'}</span></div><b>{x.due}: {step.dueAt?new Date(step.dueAt).toLocaleDateString(locale):'—'}{late?' · '+x.overdue:''}</b><button className="implementation-button" disabled={busy} onClick={()=>void mark(step.key)}><Check size={14}/>{t.markDone}</button></article>})}</div>:<p className="implementation-muted">{x.noPlanned}</p>}
      </section>:null}

      {defaultCycle?<>
        <section className="implementation-panel implementation-source"><Sparkles size={18}/><div><strong>{t.progressive}</strong><p>{builtIn.progressiveDecision}</p><small>{t.source}</small></div></section>
        <section className="implementation-panel implementation-prep"><div className="implementation-section-title"><div><span className="implementation-kicker">0 / PREPARAÇÃO</span><h2>{t.preparation}</h2><p>{builtIn.preparationIntro}</p></div><span className="implementation-step-count">{IMPLEMENTATION_PREPARATION_KEYS.filter(key=>completed.has(key)).length}/{IMPLEMENTATION_PREPARATION_KEYS.length}</span></div><div className="implementation-checklist">{builtIn.preparation.map((item,index)=>{const key=IMPLEMENTATION_PREPARATION_KEYS[index],done=completed.has(key);return <button key={key} className={done?'done':''} disabled={busy||done||cycleComplete} onClick={()=>void mark(key)}><span>{done?<Check size={16}/>:index+1}</span><p>{item}</p><b>{done?t.done:t.markDone}</b></button>})}</div></section>
        <section className="implementation-rhythm"><div className="implementation-section-title"><div><span className="implementation-kicker">40–45 MIN</span><h2>{t.rhythm}</h2></div></div><div className="implementation-rhythm-grid">{builtIn.rhythm.map(item=><article className="implementation-panel" key={item.block}><Clock3 size={16}/><strong>{item.time}</strong><span>{item.block}</span><p>{item.objective}</p></article>)}</div></section>
        <section className="implementation-week-layout" id="implementation-weeks">
          <aside className="implementation-panel implementation-week-nav"><span className="implementation-kicker">{t.weeks}</span>{builtIn.weeks.map(item=>{const keys=implementationWeekKeys(item.week),doneCount=keys.filter(key=>completed.has(key)).length,isDone=doneCount===keys.length;return <button key={item.week} className={selectedWeek===item.week?'active':''} onClick={()=>setSelectedWeek(item.week)}><span className={isDone?'done':''}>{isDone?<Check size={14}/>:item.week}</span><div><strong>{t.week} {item.week}</strong><small>{item.title}</small></div><b>{doneCount}/{keys.length}</b>{suggestedWeek===item.week&&!cycleComplete?<i/>:null}</button>})}</aside>
          <section className="implementation-panel implementation-week-card"><div className="implementation-week-heading"><span className="implementation-kicker">{t.week} {week.week}</span><h2>{week.title}</h2><p>{week.objective}</p></div><blockquote>{week.facilitatorQuote}<small>{t.facilitator}</small></blockquote><div className="implementation-scriptures"><span>{t.scriptures}</span>{week.scriptures.map(ref=><b key={ref}>{ref}</b>)}</div><div className="implementation-content-block"><h3>{t.teaching}</h3><div className="implementation-checklist">{week.teaching.map((item,index)=>{const key='week.'+week.week+'.teach.'+(index+1),done=completed.has(key);return <button key={key} className={done?'done':''} disabled={busy||done||cycleComplete} onClick={()=>void mark(key)}><span>{done?<Check size={16}/>:index+1}</span><p>{item}</p><b>{done?t.done:t.markDone}</b></button>})}</div></div><div className="implementation-practice"><span className="implementation-kicker">{t.practice}</span><p>{week.practice}</p>{(()=>{const key='week.'+week.week+'.practice',done=completed.has(key);return <button className={'implementation-button '+(done?'done':'')} disabled={busy||done||cycleComplete} onClick={()=>void mark(key)}>{done?<Check size={16}/>:<CircleCheck size={16}/>} {done?t.done:t.markDone}</button>})()}</div></section>
        </section>
      </>:<section className="implementation-panel implementation-prep" id="implementation-custom">
        <div className="implementation-section-title"><div><span className="implementation-kicker">{x.activePlaybook}</span><h2>{cyclePlaybook?.name}</h2><p>{x.customIntro}</p></div><span className="implementation-step-count">{progress.done}/{progress.total}</span></div>
        {(cyclePlaybook?.implementationPhases??[]).map((phase,phaseIndex)=>{
          const keys=implementationKeysForPhases([phase])
          return <div className="implementation-content-block" key={phase.id}>
            <h3>{x.phase} {phaseIndex+1} · {phase.title}</h3>
            <p>{phase.objective}</p>
            <div className="implementation-checklist">{phase.items.map((item,index)=>{
              const key=keys[index],done=completed.has(key)
              return <button key={key} className={done?'done':''} disabled={busy||done||cycleComplete} onClick={()=>void mark(key)}><span>{done?<Check size={16}/>:index+1}</span><p>{item}</p><b>{done?t.done:t.markDone}</b></button>
            })}</div>
          </div>
        })}
      </section>}
      <p className="implementation-rule"><ShieldCheck size={15}/>{t.sourceNote}</p>
    </>}
    {planning&&cycle?<ImplementationPlanModal locale={locale} keys={uncompletedKeys} labelFor={itemLabel} members={unitTeam} close={()=>setPlanning(false)} save={savePlan}/>:null}
  </div></main>
}

function ImplementationPlanModal({locale,keys,labelFor,members,close,save}:{locale:AppLocale;keys:string[];labelFor:(key:string)=>string;members:JourneyOrganizationMember[];close:()=>void;save:(key:string,owner:JourneyOrganizationMember,dueAt:string)=>Promise<void>}){
  const x=extraCopy[locale]
  const [key,setKey]=useState(keys[0]??'')
  const [ownerId,setOwnerId]=useState(members[0]?.id??'')
  const [due,setDue]=useState('')
  const owner=members.find(member=>member.id===ownerId)
  return <div className="implementation-modal-backdrop" onMouseDown={close}><section className="implementation-panel implementation-modal" role="dialog" aria-modal="true" onMouseDown={event=>event.stopPropagation()}>
    <div className="implementation-modal-head"><div><span className="implementation-kicker">{x.plan}</span><h2>{x.plan}</h2></div><button className="implementation-button" onClick={close}><X size={16}/></button></div>
    <div className="implementation-plan-form">
      <label><span>{x.chooseItem}</span><select value={key} onChange={event=>setKey(event.target.value)}>{keys.map(item=><option value={item} key={item}>{labelFor(item)}</option>)}</select></label>
      <label><span>{x.chooseOwner}</span><select value={ownerId} onChange={event=>setOwnerId(event.target.value)}>{members.map(member=><option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
      <label><span>{x.due}</span><input type="date" value={due} min={new Date().toISOString().slice(0,10)} onChange={event=>setDue(event.target.value)}/></label>
    </div>
    <div className="implementation-modal-actions"><button className="implementation-button" onClick={close}>{locale==='en'?'Cancel':locale==='es'?'Cancelar':'Cancelar'}</button><button className="implementation-button primary" disabled={!key||!owner||!due} onClick={()=>owner&&void save(key,owner,new Date(due+'T23:59:59').toISOString())}>{x.savePlan}</button></div>
  </section></div>
}
