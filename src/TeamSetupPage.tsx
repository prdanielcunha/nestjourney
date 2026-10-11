import { useCallback, useEffect, useState } from 'react'
import {
  ArrowUpRight, ClipboardCheck, HeartHandshake, House, Leaf,
  Save, ShieldCheck, UserCheck, Users,
} from 'lucide-react'
import { auth } from './firebase'
import {
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyOrganizationMembers,
  loadJourneyAccess,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyOrganizationMember,
} from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import { GuidedEmptyState } from './GuidedEmptyState'
import { emptyGuidance } from './emptyGuidance'
import { JourneyAreaFocus } from './JourneyAreaFocus'
import { JourneyInviteModal } from './JourneyInviteModal'
import { SERVICE_FRONTS, SERVICE_WORK_FRONTS, SERVICE_TEAM_ROLES, SERVICE_FRONT_LABELS, SERVICE_TEAM_ROLE_LABELS,
  teamFromLegacy, parseJourneyServiceTeam, legacyResponsibilityForTeam,
  type JourneyServiceTeam, type ServiceFront, type ServiceTeamRole, type WorkFront,
} from './journeyServiceTeams'
import './TeamSetupPage.css'

const HUB_MEMBERS_URL='https://www.millionsnest.com/dashboard/organization/members'
const HUB_API_BASE=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')

type ResponsibilityDraft={team:JourneyServiceTeam}

function responsibilityCopy(locale:AppLocale){
  if(locale==='en')return{
    member:['No operational responsibility','Uses only what is explicitly available to a regular member.'],
    presence_host:['Presence Host','Next service, attendance, visitors, and real relationship registration.'],
    mesa_team:['Table Team','Preparation, guests, participation, and relationship continuity.'],
    caregiver:['Caregiver','Assigned contacts, 24–48h promise, outcome, and next step.'],
    group_leader:['House Leader','Meetings, participants, guests, capacity, and operations for their house.'],
    discipler:['Discipler','People accompanied, meeting 1–7, preparation, and next step.'],
    coordinator:['Coordinator','Operational pending work, workload distribution, and team quality.'],
    pastor:['Pastor','Overdue care, pastoral handoffs, and whole-journey pastoral vision.'],
  } as const
  if(locale==='es')return{
    member:['Sin responsabilidad operativa','Usa solamente lo que está disponible para un miembro regular.'],
    presence_host:['Anfitrión de Presencia','Próximo culto, presencia, visitantes y registro de vínculo real.'],
    mesa_team:['Equipo de la Mesa','Preparación, invitados, participación y continuidad del vínculo.'],
    caregiver:['Cuidador','Contactos asignados, plazo de 24–48h, resultado y próximo paso.'],
    group_leader:['Líder de Casa','Encuentros, participantes, invitados, capacidad y operación de su Casa.'],
    discipler:['Discipulador','Personas acompañadas, encuentro 1–7, preparación y próximo paso.'],
    coordinator:['Coordinador','Pendientes operativos, distribución de carga y calidad del equipo.'],
    pastor:['Pastor','Cuidado atrasado, derivaciones pastorales y visión pastoral de toda la jornada.'],
  } as const
  return{
    member:['Sem função operacional','Usa apenas o que estiver liberado para um membro comum.'],
    presence_host:['Anfitrião de Presença','Próximo culto, presença, visitantes e registro de vínculo real.'],
    mesa_team:['Equipe da Mesa','Preparação, convidados, participação e continuidade do vínculo.'],
    caregiver:['Cuidador','Contatos atribuídos, prazo de 24–48h, resultado e próximo passo.'],
    group_leader:['Líder de Casa','Encontros, participantes, convidados, capacidade e operação da sua Casa.'],
    discipler:['Discipulador','Pessoas acompanhadas, encontro 1–7, preparação e próximo passo.'],
    coordinator:['Coordenador','Pendências operacionais, distribuição de carga e qualidade da equipe.'],
    pastor:['Pastor','Cuidado atrasado, encaminhamentos pastorais e visão pastoral de toda a jornada.'],
  } as const
}

const copy={
  'pt-BR':{
    title:'Equipe & Papéis',subtitle:'Defina claramente quem faz o quê. Cada pessoa entra no NestJourney vendo somente o trabalho que depende dela.',
    back:'Início',loading:'Carregando equipe…',yourAccess:'Seu acesso no NestJourney',role:'Função no NestJourney',invite:'Convidar pessoa',
    full:'Acesso amplo',yes:'Permitido',no:'Sem acesso',members:'Membros & Convites',roles:'Cargos da organização',
    hubNote:'Identidade, convites e cargos da organização continuam no MillionsNest Hub. Aqui você define a responsabilidade operacional específica do NestJourney.',
    fronts:'Frentes do projeto',frontsDesc:'Estrutura inicial baseada nos manuais do Raiz e Mesa. Comece pequeno e aumente conforme a cultura amadurecer.',
    pastor:'Pastor guardião',pastorDesc:'Guarda visão, doutrina, segurança, correção e casos sensíveis.',pastorSize:'1 pastor + 1 auxiliar de referência',
    presence:'Equipe Presença',presenceDesc:'Recebe, nota, conecta e acompanha sem transformar pessoas em números.',presenceSize:'Ideal inicial: 4–6 pessoas',
    table:'Mesa Aberta',tableDesc:'Prepara um ambiente simples para permanência, conversa e vínculo.',tableSize:'Ideal inicial: 3–5 pessoas',
    care:'Cuidado & Conexão',careDesc:'Garante contato autorizado em 24–48h e registra resultado e próximo passo.',careSize:'Ideal inicial: 3–4 pessoas',
    houses:'Casa de Paz',housesDesc:'Líder, anfitrião e aprendiz para comunidade pequena, Bíblia, conversa e oração.',housesSize:'Por Casa: 2–4 pessoas na equipe',
    root:'Raiz',rootDesc:'Discipuladores preparados para caminhar 1:1 ou 1:2 durante os sete encontros iniciais.',rootSize:'Ideal: 2 relações ativas por discipulador',
    capabilities:'O que você consegue operar',people:'Pessoas',implementation:'Implantação',privacy:'Privacidade & Auditoria',pastoralView:'Visão Pastoral',
    responsibilities:'Responsabilidades no NestJourney',responsibilitiesDesc:'O cargo no Hub diz a autoridade na organização. A função abaixo diz o que esta pessoa encontra e opera dentro do NestJourney.',
    orgAccess:'Acesso amplo pela organização',orgAccessDesc:'Dono e administrador continuam vendo todas as áreas, independentemente de uma função operacional.',
    scope:'Unidades definidas no Hub',scopeHint:'A unidade em que a pessoa serve é governada pelo MillionsNest Hub. Aqui você altera somente a responsabilidade dentro do NestJourney.',
    save:'Salvar função',saved:'Função atualizada.',saving:'Salvando…',emptyMembers:'Nenhum membro ativo encontrado.',
    guidance:'Próximo passo',guidanceText:'Depois de definir as funções, cada pessoa pode abrir Hoje e receber uma experiência própria, sem precisar aprender o sistema inteiro.',
    error:'Não foi possível carregar ou atualizar a equipe.'
  },
  en:{
    title:'Team & Roles',subtitle:'Define clearly who does what. Each person enters NestJourney seeing only the work that depends on them.',
    back:'Home',loading:'Loading team…',yourAccess:'Your NestJourney access',role:'NestJourney responsibility',invite:'Invite person',
    full:'Broad access',yes:'Allowed',no:'No access',members:'Members & Invites',roles:'Organization roles',
    hubNote:'Identity, invitations, and organization roles stay in MillionsNest Hub. Here you define each person’s NestJourney operational responsibility.',
    fronts:'Ministry fronts',frontsDesc:'Initial structure based on the Raiz e Mesa manuals. Start small and expand as the culture matures.',
    pastor:'Pastoral guardian',pastorDesc:'Protects vision, doctrine, safety, correction, and sensitive cases.',pastorSize:'1 pastor + 1 reference assistant',
    presence:'Presence Team',presenceDesc:'Welcomes, notices, connects, and follows people without turning them into numbers.',presenceSize:'Initial ideal: 4–6 people',
    table:'Open Table',tableDesc:'Prepares a simple place for people to stay, talk, and form relationships.',tableSize:'Initial ideal: 3–5 people',
    care:'Care & Connection',careDesc:'Ensures authorized contact within 24–48h and records outcome and next step.',careSize:'Initial ideal: 3–4 people',
    houses:'Peace House',housesDesc:'Leader, host, and apprentice for small community, Bible, conversation, and prayer.',housesSize:'Per house: 2–4 team members',
    root:'Root',rootDesc:'Prepared disciplers walking 1:1 or 1:2 through seven initial meetings.',rootSize:'Ideal: 2 active relationships per discipler',
    capabilities:'What you can operate',people:'People',implementation:'Implementation',privacy:'Privacy & Audit',pastoralView:'Pastoral View',
    responsibilities:'NestJourney responsibilities',responsibilitiesDesc:'The Hub role defines organization authority. The responsibility below defines what this person sees and operates inside NestJourney.',
    orgAccess:'Broad organization access',orgAccessDesc:'Owners and administrators keep access to every area regardless of an operational responsibility.',
    scope:'Campuses defined in Hub',scopeHint:'Where a person serves is governed by MillionsNest Hub. Here you change only their NestJourney responsibility.',
    save:'Save responsibility',saved:'Responsibility updated.',saving:'Saving…',emptyMembers:'No active members found.',
    guidance:'Next step',guidanceText:'After responsibilities are defined, each person can open Today and receive their own experience without learning the whole system.',
    error:'The team could not be loaded or updated.'
  },
  es:{
    title:'Equipo & Papeles',subtitle:'Define con claridad quién hace qué. Cada persona entra en NestJourney viendo solo el trabajo que depende de ella.',
    back:'Inicio',loading:'Cargando equipo…',yourAccess:'Tu acceso en NestJourney',role:'Función en NestJourney',invite:'Invitar persona',
    full:'Acceso amplio',yes:'Permitido',no:'Sin acceso',members:'Miembros & Invitaciones',roles:'Cargos de la organización',
    hubNote:'Identidad, invitaciones y cargos siguen en MillionsNest Hub. Aquí defines la responsabilidad operativa específica de NestJourney.',
    fronts:'Frentes del proyecto',frontsDesc:'Estructura inicial basada en los manuales de Raiz e Mesa. Empieza pequeño y crece con la cultura.',
    pastor:'Pastor guardián',pastorDesc:'Guarda visión, doctrina, seguridad, corrección y casos sensibles.',pastorSize:'1 pastor + 1 auxiliar de referencia',
    presence:'Equipo Presencia',presenceDesc:'Recibe, observa, conecta y acompaña sin convertir personas en números.',presenceSize:'Ideal inicial: 4–6 personas',
    table:'Mesa Abierta',tableDesc:'Prepara un ambiente simple para permanecer, conversar y crear vínculos.',tableSize:'Ideal inicial: 3–5 personas',
    care:'Cuidado & Conexión',careDesc:'Garantiza contacto autorizado en 24–48h y registra resultado y próximo paso.',careSize:'Ideal inicial: 3–4 personas',
    houses:'Casa de Paz',housesDesc:'Líder, anfitrión y aprendiz para comunidad pequeña, Biblia, conversación y oración.',housesSize:'Por Casa: 2–4 personas',
    root:'Raíz',rootDesc:'Discipuladores preparados para caminar 1:1 o 1:2 durante siete encuentros.',rootSize:'Ideal: 2 relaciones activas por discipulador',
    capabilities:'Lo que puedes operar',people:'Personas',implementation:'Implementación',privacy:'Privacidad & Auditoría',pastoralView:'Visión Pastoral',
    responsibilities:'Responsabilidades en NestJourney',responsibilitiesDesc:'El cargo en Hub define autoridad organizacional. La función abajo define lo que esta persona ve y opera dentro de NestJourney.',
    orgAccess:'Acceso amplio por la organización',orgAccessDesc:'Dueño y administrador siguen viendo todas las áreas sin depender de una función operativa.',
    scope:'Sedes definidas en Hub',scopeHint:'La sede donde sirve la persona es gobernada por MillionsNest Hub. Aquí cambias solamente su responsabilidad en NestJourney.',
    save:'Guardar función',saved:'Función actualizada.',saving:'Guardando…',emptyMembers:'No se encontraron miembros activos.',
    guidance:'Próximo paso',guidanceText:'Después de definir las funciones, cada persona puede abrir Hoy y recibir su propia experiencia sin aprender todo el sistema.',
    error:'No se pudo cargar o actualizar el equipo.'
  }
} as const

export default function TeamSetupPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const responsibilities=responsibilityCopy(locale)
  const { labels }=useJourneyLabels()
  const presenceName=labels.presence||t.presence
  const tableName=labels.table||t.table
  const careName=labels.care||t.care
  const groupsName=labels.groups||t.houses
  const rootName=labels.discipleship||t.root
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [members,setMembers]=useState<JourneyOrganizationMember[]>([])
  const [congregations,setCongregations]=useState<JourneyCongregation[]>([])
  const [drafts,setDrafts]=useState<Record<string,ResponsibilityDraft>>({})
  const [savingId,setSavingId]=useState('')
  const [savedId,setSavedId]=useState('')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [inviteOpen,setInviteOpen]=useState(false)

  const canAssign=Boolean(access&&(access.isSystemAdmin||access.isOwner||['owner','admin'].includes(access.organizationRole)))

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId)
      setAccess(nextAccess)
      const canManage=nextAccess.isSystemAdmin||nextAccess.isOwner||['owner','admin'].includes(nextAccess.organizationRole)
      if(canManage){
        const [nextMembers,nextCongregations]=await Promise.all([
          listJourneyOrganizationMembers(nextAccess),
          listJourneyCongregations(nextAccess),
        ])
        setMembers(nextMembers)
        setCongregations(nextCongregations)
        setDrafts(Object.fromEntries(nextMembers.map(member=>[
          member.id,
          {
            team:teamFromLegacy(member.journeyRole,member.nestJourneyTeam),
          },
        ])))
      }
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  const fronts=[
    {icon:ShieldCheck,title:t.pastor,description:t.pastorDesc,size:t.pastorSize},
    {icon:UserCheck,title:presenceName,description:t.presenceDesc,size:t.presenceSize},
    {icon:Users,title:tableName,description:t.tableDesc,size:t.tableSize},
    {icon:HeartHandshake,title:careName,description:t.careDesc,size:t.careSize},
    {icon:House,title:groupsName,description:t.housesDesc,size:t.housesSize},
    {icon:Leaf,title:rootName,description:t.rootDesc,size:t.rootSize},
    {icon:HeartHandshake,title:SERVICE_FRONT_LABELS[locale].support,
      description:locale==='en'?'Helps wherever needed without leading another team.':locale==='es'?'Ayuda donde hace falta, sin asumir liderazgo.':'Ajuda qualquer frente de serviço, sem assumir liderança.',
      size:locale==='en'?'On request · no administrative access':locale==='es'?'Bajo solicitud · sin acceso administrativo':'Sob solicitação · sem acesso administrativo'},
  ]
  const capabilities=access?[
    [t.people,access.canManagePeople||access.broadJourneyAccess],
    [presenceName,access.canManagePresence],
    [tableName,access.canManageMesa],
    [careName,access.canManageCare||access.broadJourneyAccess],
    [groupsName,access.canManageGroups||access.broadJourneyAccess],
    [rootName,access.canManageDiscipleship||access.broadJourneyAccess],
    [t.implementation,access.canManageImplementation],
    [t.pastoralView,access.canManagePastoral],
    [t.privacy,access.canViewGovernance],
  ]:[]


  function setTeamDraft(memberId:string,changes:Partial<JourneyServiceTeam>){
    setSavedId('')
    setDrafts(current=>{
      const team=current[memberId]?.team
      if(!team)return current
      return {...current,[memberId]:{team:{...team,...changes}}}
    })
  }
  function setPrimaryFront(memberId:string,front:ServiceFront){
    const team=drafts[memberId]?.team
    if(!team)return
    setTeamDraft(memberId,{primaryArea:front,teamRole:front==='support'&&team.teamRole==='leader'?'auxiliary':team.teamRole})
  }
  function toggleHelpFront(memberId:string,front:WorkFront){
    const team=drafts[memberId]?.team
    if(!team)return
    setTeamDraft(memberId,{supportAreas:team.supportAreas.includes(front)?team.supportAreas.filter(a=>a!==front):[...team.supportAreas,front]})
  }

  async function saveResponsibility(memberId:string){
    if(!access||!canAssign)return
    const user=auth?.currentUser
    const draft=drafts[memberId]
    if(!user||!draft)return
    const validTeam=parseJourneyServiceTeam(draft.team)
    if(!validTeam){setError(t.error);return}
    setSavingId(memberId);setSavedId('');setError('')
    try{
      const token=await user.getIdToken()
      const response=await fetch(
        `${HUB_API_BASE}/api/v1/organizations/${encodeURIComponent(access.organizationId)}/members/${encodeURIComponent(memberId)}/nestjourney-responsibility`,
        {
          method:'PATCH',
          headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify({responsibility:legacyResponsibilityForTeam(validTeam),nestJourneyTeam:validTeam}),
        },
      )
      const data=await response.json().catch(()=>({}))
      if(!response.ok||data?.success!==true)throw new Error(data?.reasonCode||'RESPONSIBILITY_UPDATE_FAILED')
      setMembers(current=>current.map(member=>member.id===memberId?{
        ...member,
        journeyRole:legacyResponsibilityForTeam(validTeam),
        nestJourneyTeam:validTeam,
      }:member))
      setSavedId(memberId)
    }catch(cause){console.error(cause);setError(t.error)}
    finally{setSavingId('')}
  }

  const empty=emptyGuidance(locale,'team_no_members')
  const orgWideMembers=members.filter(member=>['owner','admin'].includes(member.organizationRole)).length
  const unassignedMembers=members.filter(member=>!['owner','admin'].includes(member.organizationRole)&&!member.nestJourneyTeam&&(!member.journeyRole||member.journeyRole==='member')).length
  const assignedMembers=Math.max(0,members.length-orgWideMembers-unassignedMembers)
  const focusTitle=!canAssign
    ?(locale==='en'?'Your access is managed by the organization':locale==='es'?'Tu acceso es gestionado por la organización':'Seu acesso é gerenciado pela organização')
    :unassignedMembers>0
      ?(locale==='en'?unassignedMembers+' member(s) still need a NestJourney responsibility':locale==='es'?unassignedMembers+' miembro(s) todavía necesitan una responsabilidad en NestJourney':unassignedMembers+' membro(s) ainda precisam de uma responsabilidade no NestJourney')
      :(locale==='en'?'Every active member has a clear operating context':locale==='es'?'Cada miembro activo tiene un contexto operativo claro':'Cada membro ativo tem um contexto operacional claro')
  const focusBody=!canAssign
    ?t.hubNote
    :unassignedMembers>0
      ?(locale==='en'?'Assign only the responsibility each person actually serves in. Organization authority remains in MillionsNest Hub.':locale==='es'?'Asigna solamente la responsabilidad en la que cada persona realmente sirve. La autoridad de la organización permanece en MillionsNest Hub.':'Atribua somente a responsabilidade em que cada pessoa realmente serve. A autoridade da organização continua no MillionsNest Hub.')
      :t.guidanceText

  if(loading)return <main className="team-setup"><div className="team-loading">{t.loading}</div></main>

  return <main className="team-setup"><div className="team-shell">
    <header className="team-topbar"><div><span className="team-kicker">NestJourney / Team</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="team-error">{error}</div>:null}
    {access&&canAssign?<JourneyInviteModal access={access} locale={locale} open={inviteOpen} onClose={()=>setInviteOpen(false)}/>:null}

    <JourneyAreaFocus
      locale={locale}
      context={access?.isSystemAdmin||access?.isOwner?t.full:(access?.role||undefined)}
      title={focusTitle}
      body={focusBody}
      metrics={canAssign?[
        {label:locale==='en'?'Assigned':locale==='es'?'Asignados':'Atribuídos',value:assignedMembers,tone:assignedMembers?'good':'muted'},
        {label:locale==='en'?'Needs role':locale==='es'?'Sin función':'Sem função',value:unassignedMembers,tone:unassignedMembers?'attention':'muted'},
        {label:locale==='en'?'Broad access':locale==='es'?'Acceso amplio':'Acesso amplo',value:orgWideMembers,tone:orgWideMembers?'good':'muted'},
      ]:capabilities.slice(0,3).map(([label,allowed])=>({label:String(label),value:allowed?t.yes:t.no,tone:allowed?'good' as const:'muted' as const}))}
      actions={canAssign?[
        {label:t.invite,onClick:()=>setInviteOpen(true),primary:true},
        {label:unassignedMembers>0?(locale==='en'?'Assign responsibilities':locale==='es'?'Asignar responsabilidades':'Atribuir responsabilidades'):(locale==='en'?'Review team':locale==='es'?'Revisar equipo':'Revisar equipe'),href:'#team-responsibilities'},
        {label:t.members,href:HUB_MEMBERS_URL},
      ]:[{label:t.members,href:HUB_MEMBERS_URL,primary:true}]}
    />

    {canAssign?<section className="team-section team-responsibility-section" id="team-responsibilities">
      <div className="team-section-heading"><span className="team-kicker">{t.responsibilities}</span><h2>{t.responsibilities}</h2><p>{t.responsibilitiesDesc}</p></div>
      <div className="team-member-list">
        {members.map(member=>{
          const orgWide=['owner','admin'].includes(member.organizationRole)
          const draft=drafts[member.id]??{team:teamFromLegacy(member.journeyRole,member.nestJourneyTeam)}
          const team=draft.team
          const roleMeta=responsibilities[legacyResponsibilityForTeam(team)]
          const teamSaved=teamFromLegacy(member.journeyRole,member.nestJourneyTeam)
          const changed=!orgWide&&JSON.stringify(team)!==JSON.stringify(teamSaved)
          const canChooseLeader=canAssign
          return <article className="team-member-card" key={member.id}>
            <div className="team-member-identity"><span className="team-member-avatar">{member.name.split(' ').filter(Boolean).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email||member.organizationRole}</small></div></div>
            {orgWide?<div className="team-org-wide"><ShieldCheck size={17}/><div><strong>{t.orgAccess}</strong><small>{t.orgAccessDesc}</small></div></div>:<>
              <div className="team-role-editor">
                <label><span>{locale==='en'?'Primary service team':locale==='es'?'Equipo principal':'Frente principal de serviço'}</span>
                  <select value={team.primaryArea} disabled={savingId===member.id} onChange={e=>setPrimaryFront(member.id,e.target.value as ServiceFront)}>
                    {SERVICE_FRONTS.map(front=><option key={front} value={front}>{SERVICE_FRONT_LABELS[locale][front]}</option>)}
                  </select></label>
                <label><span>{locale==='en'?'Team role':locale==='es'?'Papel en el equipo':'Papel na equipe'}</span>
                  <select value={team.teamRole} disabled={savingId===member.id} onChange={e=>setTeamDraft(member.id,{teamRole:e.target.value as ServiceTeamRole,otherLabel:undefined})}>
                    {SERVICE_TEAM_ROLES.filter(role=>role!=='leader'||(team.primaryArea!=='support'&&canChooseLeader)).map(role=><option key={role} value={role}>{SERVICE_TEAM_ROLE_LABELS[locale][role]}</option>)}
                  </select></label>
                {team.teamRole==='other'?<label><span>{locale==='en'?'Specify function':locale==='es'?'Especifique la función':'Qual função?'}</span>
                  <input maxLength={80} value={team.otherLabel||''} onChange={e=>setTeamDraft(member.id,{otherLabel:e.target.value})}/></label>:null}
                <fieldset className="journey-team-help"><legend>{locale==='en'?'Can also help in':locale==='es'?'También puede apoyar':'Também pode apoiar'}</legend>
                  <div>{SERVICE_WORK_FRONTS.filter(front=>front!==team.primaryArea).map(front=><label key={front}>
                    <input type="checkbox" disabled={savingId===member.id} checked={team.supportAreas.includes(front)} onChange={()=>toggleHelpFront(member.id,front)}/>
                    <span>{SERVICE_FRONT_LABELS[locale][front]}</span>
                  </label>)}</div>
                </fieldset>
                <p>{team.primaryArea==='support'?(locale==='en'?'Support does not grant leadership or unrestricted access.':locale==='es'?'Apoyo no otorga liderazgo ni acceso general.':'Apoio não concede liderança nem acesso amplo.'):roleMeta[1]}</p>
              </div>
              <div className="team-scope-editor readonly"><span>{t.scope}</span><div>{member.congregationIds.length?member.congregationIds.map(id=><span className="team-scope-chip" key={id}>{congregations.find(unit=>unit.id===id)?.name||id}</span>):<span className="team-scope-chip muted">—</span>}</div><small>{t.scopeHint}</small></div>
              <div className="team-member-actions"><span>{savedId===member.id?t.saved:''}</span><button className="team-save-button" disabled={!changed||savingId===member.id||!parseJourneyServiceTeam(team)} onClick={()=>void saveResponsibility(member.id)}><Save size={14}/>{savingId===member.id?t.saving:t.save}</button></div>
            </>}
          </article>
        })}
        {!members.length?<div className="team-empty"><GuidedEmptyState icon={Users} title={empty.title} body={empty.body} primary={{label:empty.primary,href:HUB_MEMBERS_URL}} secondary={{label:empty.secondary||t.back,href:'/my-today'}}/></div>:null}
      </div>
    </section>:null}

    <section className="team-section"><div className="team-section-heading"><span className="team-kicker">{t.fronts}</span><h2>{t.fronts}</h2><p>{t.frontsDesc}</p></div><div className="team-front-grid">{fronts.map(item=>{const Icon=item.icon;return <article key={item.title}><span><Icon size={18}/></span><div><strong>{item.title}</strong><p>{item.description}</p><small>{item.size}</small></div></article>})}</div></section>
    <section className="team-guidance"><ClipboardCheck size={20}/><div><strong>{t.guidance}</strong><p>{t.guidanceText}</p></div><a href="/implementation-runtime">{t.implementation}<ArrowUpRight size={14}/></a></section>
  </div></main>
}
