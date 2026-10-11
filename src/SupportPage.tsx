import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, HandHeart, Plus, ShieldCheck, X } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { getInitialLocale, type AppLocale } from './i18n'
import { SERVICE_WORK_FRONTS, SERVICE_FRONT_LABELS, type WorkFront } from './journeyServiceTeams'
import './SupportPage.css'

type Task = {
  id:string;front:WorkFront;title:string;note:string;assigneeId:string;status:'offered'|'accepted'|'completed'|'cancelled';
  createdBy:string;createdAtMs:number|null
}
type Candidate = {uid:string;name:string}
const HUB_API_BASE=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
const copy={
  'pt-BR':{
    title:'Apoio Geral',subtitle:'Ajude onde for necessário, sem assumir liderança ou acesso administrativo.',
    loading:'Preparando suas solicitações…',restricted:'Você ainda não tem uma designação de apoio.',
    available:'Onde você pode ajudar',scope:'Disponibilidade não concede acesso a dados privados.',
    create:'Solicitar apoio',front:'Frente',person:'Quem vai apoiar?',task:'Qual é a tarefa?',note:'Orientações (sem dados pessoais)',send:'Enviar solicitação',
    pending:'Aguardando aceite',accepted:'Aceita',completed:'Concluída',cancelled:'Cancelada',
    requests:'Minhas solicitações',empty:'Nenhuma solicitação de apoio por enquanto.',
    accept:'Aceitar',finish:'Concluir',cancel:'Cancelar',refresh:'Atualizar',
    error:'Não foi possível carregar ou atualizar as solicitações.',choose:'Selecione um voluntário',
    noVolunteers:'Nenhum voluntário disponível nessa frente. Confira as designações da equipe.',
    help:'O líder encaminha a tarefa, o voluntário aceita e registra a conclusão. Nenhuma dessas ações dá acesso a dados sensíveis.',
    today:'Voltar para Hoje',team:'Gerenciar equipe'
  },
  en:{
    title:'General Support',subtitle:'Help wherever needed without assuming leadership or organization-wide access.',
    loading:'Preparing requests…',restricted:'You do not have a support assignment yet.',
    available:'Where you can help',scope:'Availability does not grant access to private records.',
    create:'Request support',front:'Team',person:'Who will help?',task:'Task description',note:'Instructions (no personal information)',send:'Send request',
    pending:'Awaiting acceptance',accepted:'Accepted',completed:'Completed',cancelled:'Cancelled',
    requests:'My support requests',empty:'No support requests yet.',
    accept:'Accept',finish:'Complete',cancel:'Cancel',refresh:'Refresh',
    error:'Could not load or update requests.',choose:'Select a volunteer',
    noVolunteers:'No volunteer available for this team. Check team assignments.',
    help:'Leaders offer a task, volunteers accept and mark it complete. No sensitive-data access is granted.',
    today:'Back to Today',team:'Manage team'
  },
  es:{
    title:'Apoyo General',subtitle:'Ayuda donde haga falta sin asumir liderazgo o acceso administrativo.',
    loading:'Preparando solicitudes…',restricted:'Aún no tienes una asignación de apoyo.',
    available:'Dónde puedes ayudar',scope:'La disponibilidad no permite acceder a datos privados.',
    create:'Solicitar apoyo',front:'Equipo',person:'¿Quién ayudará?',task:'Tarea',note:'Indicaciones (sin datos personales)',send:'Enviar solicitud',
    pending:'Pendiente de aceptación',accepted:'Aceptada',completed:'Completada',cancelled:'Cancelada',
    requests:'Mis solicitudes',empty:'Todavía no hay solicitudes.',
    accept:'Aceptar',finish:'Completar',cancel:'Cancelar',refresh:'Actualizar',
    error:'No fue posible cargar o actualizar solicitudes.',choose:'Selecciona un voluntario',
    noVolunteers:'No hay voluntarios disponibles. Comprueba los equipos.',
    help:'Los líderes ofrecen tareas; los voluntarios aceptan y completan. No se concede acceso a datos sensibles.',
    today:'Volver a Hoy',team:'Gestionar equipo'
  }
} as const
const descriptions:Record<AppLocale,Record<WorkFront,string>>={
  'pt-BR':{presence:'Recepção e acolhimento',table:'Ambiente e hospitalidade',care:'Logística autorizada, sem dados privados',house:'Organização dos encontros',discipleship:'Materiais e preparação'},
  en:{presence:'Welcome and hospitality',table:'Room setup and hospitality',care:'Authorized logistics, no private records',house:'Meeting organization',discipleship:'Materials and preparation'},
  es:{presence:'Recepción y bienvenida',table:'Ambiente y hospitalidad',care:'Logística autorizada, sin datos privados',house:'Organización de encuentros',discipleship:'Materiales y preparación'}
}
function leadFront(access:JourneyAccessContext):WorkFront|null{
  if(access.nestJourneyTeam?.teamRole==='leader'&&access.nestJourneyTeam.primaryArea!=='support')return access.nestJourneyTeam.primaryArea
  const roles:Record<string,WorkFront>={presence_host:'presence',mesa_team:'table',caregiver:'care',group_leader:'house',discipler:'discipleship'}
  return !access.nestJourneyTeam?roles[access.role]||null:null
}
export default function SupportPage(){
  const locale=getInitialLocale()
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [loading,setLoading]=useState(true)
  const [tasks,setTasks]=useState<Task[]>([])
  const [candidates,setCandidates]=useState<Candidate[]>([])
  const [front,setFront]=useState<WorkFront>('presence')
  const [assigneeId,setAssigneeId]=useState('')
  const [title,setTitle]=useState('')
  const [note,setNote]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [refresh,setRefresh]=useState(0)

  useEffect(()=>{
    let active=true
    const user=auth?.currentUser,orgId=getActiveJourneyOrganizationId()
    if(!user||!orgId){setLoading(false);return}
    void loadJourneyAccess(user.uid,orgId).then(a=>{if(active){
      setAccess(a)
      const ownLead=leadFront(a)
      if(ownLead)setFront(ownLead)
    }}).catch(()=>{if(active)setError(t.error)}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[t.error])
  const privileged=Boolean(access&&(access.isSystemAdmin||access.isOwner||['owner','admin'].includes(access.organizationRole)))
  const ownFront=access?leadFront(access):null
  const canCreate=privileged||Boolean(ownFront)
  const eligibleFronts=privileged?SERVICE_WORK_FRONTS:ownFront?[ownFront]:[]
  const team=access?.nestJourneyTeam
  const available=useMemo(()=>{
    if(!team)return [] as WorkFront[]
    if (team.primaryArea === 'support' && team.supportAreas.length === 0) return [...SERVICE_WORK_FRONTS]
    const primary = team.primaryArea!=='support' && team.teamRole!=='leader' ? [team.primaryArea] : []
    return [...new Set([...primary,...team.supportAreas])] as WorkFront[]
  },[team])

  const api=useCallback(async (endpoint:string,method='GET',body?:unknown)=>{
    if(!access||!auth?.currentUser)throw new Error('not_authenticated')
    const token=await auth.currentUser.getIdToken()
    const url=`${HUB_API_BASE}/api/v1/organizations/${encodeURIComponent(access.organizationId)}/nestjourney/${endpoint}`
    const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)})})
    const json=await response.json().catch(()=>({}))
    if(!response.ok||json.success!==true)throw new Error(json.reasonCode||'REQUEST_FAILED')
    return json
  },[access])

  useEffect(()=>{
    if(!access)return
    let active=true
    void api('support-assignments').then(data=>{
      if(active)setTasks(Array.isArray(data.assignments)?data.assignments:[])
    }).catch(()=>{if(active)setError(t.error)})
    return ()=>{active=false}
  },[access,api,refresh,t.error])
  useEffect(()=>{
    if(!access||!canCreate||!eligibleFronts.includes(front)){setCandidates([]);return}
    let active=true
    void api(`support-candidates?front=${encodeURIComponent(front)}`).then(data=>{
      if(active)setCandidates(Array.isArray(data.candidates)?data.candidates:[])
    }).catch(()=>{if(active)setCandidates([])})
    return ()=>{active=false}
  },[access,api,canCreate,front,t.error])

  async function createRequest(){
    if(!assigneeId||title.trim().length<3||busy)return
    setBusy(true);setError('')
    try {
      await api('support-assignments','POST',{front,assigneeId,title:title.trim(),note:note.trim()})
      setTitle('');setNote('');setAssigneeId('');setRefresh(x=>x+1)
    }catch{setError(t.error)}finally{setBusy(false)}
  }
  async function changeStatus(id:string,status:'accepted'|'completed'|'cancelled'){
    if(busy)return
    setBusy(true);setError('')
    try{await api(`support-assignments/${encodeURIComponent(id)}`,'PATCH',{status});setRefresh(x=>x+1)}
    catch{setError(t.error)}finally{setBusy(false)}
  }
  const statusLabel=(s:Task['status'])=>({offered:t.pending,accepted:t.accepted,completed:t.completed,cancelled:t.cancelled})[s]
  const personalTasks=tasks.filter(task=>task.assigneeId===access?.userId||canCreate)
    .sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0))
  return <main className="journey-support-page"><div className="journey-support-shell">
    <header><span className="journey-support-kicker">NestJourney / {t.title}</span><h1><HandHeart size={26}/>{t.title}</h1><p>{t.subtitle}</p></header>
    {loading?<p>{t.loading}</p>:!team&&!canCreate?<section className="journey-support-empty">
      <ShieldCheck size={22}/><strong>{t.restricted}</strong><a href="/my-today">{t.today}<ArrowRight size={14}/></a>
    </section>:<>
      {error?<p className="journey-support-error" role="alert">{error}</p>:null}
      <section className="journey-support-info"><ShieldCheck size={21}/><p>{t.scope} {t.help}</p></section>
      {available.length?<><h2>{t.available}</h2><div className="journey-support-grid">
        {available.map(area=><article key={area}><strong>{SERVICE_FRONT_LABELS[locale][area]}</strong><p>{descriptions[locale][area]}</p></article>)}
      </div></>:null}
      {canCreate?<section className="journey-support-form"><h2><Plus size={18}/>{t.create}</h2>
        <div className="journey-support-inputs">
          <label>{t.front}<select value={front} onChange={e=>{setFront(e.target.value as WorkFront);setAssigneeId('')}}>
            {eligibleFronts.map(a=><option value={a} key={a}>{SERVICE_FRONT_LABELS[locale][a]}</option>)}
          </select></label>
          <label>{t.person}<select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)}>
            <option value="">{t.choose}</option>{candidates.map(a=><option value={a.uid} key={a.uid}>{a.name}</option>)}
          </select></label>
          <label>{t.task}<input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>
          <label>{t.note}<textarea value={note} maxLength={300} rows={2} onChange={e=>setNote(e.target.value)}/></label>
        </div>{candidates.length===0?<p>{t.noVolunteers}</p>:null}
        <button type="button" disabled={busy||!assigneeId||title.trim().length<3||!eligibleFronts.includes(front)} onClick={()=>void createRequest()}>{t.send}<ArrowRight size={14}/></button>
      </section>:null}
      <section className="journey-support-requests">
        <div className="journey-support-requests-heading"><h2>{t.requests}</h2>
          <button type="button" onClick={()=>setRefresh(x=>x+1)}>{t.refresh}</button></div>
        {personalTasks.length===0?<p>{t.empty}</p>:<div className="journey-support-task-list">
          {personalTasks.map(task=><article key={task.id}>
            <div><small>{SERVICE_FRONT_LABELS[locale][task.front]} · {statusLabel(task.status)}</small>
              <strong>{task.title}</strong>{task.note?<p>{task.note}</p>:null}</div>
            <div className="journey-support-task-actions">
              {task.assigneeId===access?.userId&&task.status==='offered'?<button disabled={busy} onClick={()=>void changeStatus(task.id,'accepted')}><Check size={14}/>{t.accept}</button>:null}
              {task.assigneeId===access?.userId&&task.status==='accepted'?<button disabled={busy} onClick={()=>void changeStatus(task.id,'completed')}><Check size={14}/>{t.finish}</button>:null}
              {canCreate&&['offered','accepted'].includes(task.status)?<button disabled={busy} onClick={()=>void changeStatus(task.id,'cancelled')}><X size={14}/>{t.cancel}</button>:null}
            </div>
          </article>)}
        </div>}
      </section>
      <section className="journey-support-next"><a href={canCreate?'/team-runtime':'/my-today'}>{canCreate?t.team:t.today}<ArrowRight size={14}/></a></section>
    </>}
  </div></main>
}
