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
import './TeamSetupPage.css'

const HUB_MEMBERS_URL='https://www.millionsnest.com/dashboard/organization/members'
const HUB_ROLES_URL='https://www.millionsnest.com/dashboard/organization/roles'
const HUB_API_BASE=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')

type Responsibility='member'|'presence_host'|'mesa_team'|'caregiver'|'group_leader'|'discipler'|'coordinator'|'pastor'
type ResponsibilityDraft={responsibility:Responsibility}

const responsibilityOrder:Responsibility[]=[
  'member','presence_host','mesa_team','caregiver','group_leader','discipler','coordinator','pastor',
]

function responsibilityCopy(locale:AppLocale){
  if(locale==='en')return{
    member:['No operational responsibility','Uses only what is explicitly available to a regular member.'],
    presence_host:['Presence Host','Next service, attendance, visitors, and real relationship registration.'],
    mesa_team:['Table Team','Preparation, guests, participation, and relationship continuity.'],
    caregiver:['Caregiver','Assigned contacts, 24–48h promise, outcome, and next step.'],
    group_leader:['House Leader','Meetings, participants, guests, capacity, and operations for their house.'],
    discipler:['Discipler','People accompanied, meeting 1–7, preparation, and next step.'],
    coordinator:['Coordinator','Operational pending work, workload distribution, and team quality.'],
    pastor:['Pastor','Care Debt, pastoral handoffs, and whole-journey pastoral vision.'],
  } as const
  if(locale==='es')return{
    member:['Sin responsabilidad operativa','Usa solamente lo que está disponible para un miembro regular.'],
    presence_host:['Anfitrión de Presencia','Próximo culto, presencia, visitantes y registro de vínculo real.'],
    mesa_team:['Equipo de la Mesa','Preparación, invitados, participación y continuidad del vínculo.'],
    caregiver:['Cuidador','Contactos asignados, plazo de 24–48h, resultado y próximo paso.'],
    group_leader:['Líder de Casa','Encuentros, participantes, invitados, capacidad y operación de su Casa.'],
    discipler:['Discipulador','Personas acompañadas, encuentro 1–7, preparación y próximo paso.'],
    coordinator:['Coordinador','Pendientes operativos, distribución de carga y calidad del equipo.'],
    pastor:['Pastor','Care Debt, derivaciones pastorales y visión pastoral de toda la jornada.'],
  } as const
  return{
    member:['Sem função operacional','Usa apenas o que estiver liberado para um membro comum.'],
    presence_host:['Anfitrião de Presença','Próximo culto, presença, visitantes e registro de vínculo real.'],
    mesa_team:['Equipe da Mesa','Preparação, convidados, participação e continuidade do vínculo.'],
    caregiver:['Cuidador','Contatos atribuídos, prazo de 24–48h, resultado e próximo passo.'],
    group_leader:['Líder de Casa','Encontros, participantes, convidados, capacidade e operação da sua Casa.'],
    discipler:['Discipulador','Pessoas acompanhadas, encontro 1–7, preparação e próximo passo.'],
    coordinator:['Coordenador','Pendências operacionais, distribuição de carga e qualidade da equipe.'],
    pastor:['Pastor','Care Debt, encaminhamentos pastorais e visão pastoral de toda a jornada.'],
  } as const
}

const copy={
  'pt-BR':{
    title:'Equipe & Papéis',subtitle:'Defina claramente quem faz o quê. Cada pessoa entra no NestJourney vendo somente o trabalho que depende dela.',
    back:'Início',loading:'Carregando equipe…',yourAccess:'Seu acesso no NestJourney',role:'Função no NestJourney',
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
    back:'Home',loading:'Loading team…',yourAccess:'Your NestJourney access',role:'NestJourney responsibility',
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
    back:'Inicio',loading:'Cargando equipo…',yourAccess:'Tu acceso en NestJourney',role:'Función en NestJourney',
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
            responsibility:(responsibilityOrder.includes(member.journeyRole as Responsibility)?member.journeyRole:'member') as Responsibility,
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


  function setResponsibility(memberId:string,responsibility:Responsibility){
    setSavedId('')
    setDrafts(current=>({
      ...current,
      [memberId]:{responsibility},
    }))
  }

  async function saveResponsibility(memberId:string){
    if(!access||!canAssign)return
    const user=auth?.currentUser
    const draft=drafts[memberId]
    if(!user||!draft)return
    setSavingId(memberId);setSavedId('');setError('')
    try{
      const token=await user.getIdToken()
      const response=await fetch(
        `${HUB_API_BASE}/api/v1/organizations/${encodeURIComponent(access.organizationId)}/members/${encodeURIComponent(memberId)}/nestjourney-responsibility`,
        {
          method:'PATCH',
          headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify({responsibility:draft.responsibility}),
        },
      )
      const data=await response.json().catch(()=>({}))
      if(!response.ok||data?.success!==true)throw new Error(data?.reasonCode||'RESPONSIBILITY_UPDATE_FAILED')
      setMembers(current=>current.map(member=>member.id===memberId?{
        ...member,
        journeyRole:draft.responsibility,
      }:member))
      setSavedId(memberId)
    }catch(cause){console.error(cause);setError(t.error)}
    finally{setSavingId('')}
  }

  const empty=emptyGuidance(locale,'team_no_members')
  const orgWideMembers=members.filter(member=>['owner','admin'].includes(member.organizationRole)).length
  const unassignedMembers=members.filter(member=>!['owner','admin'].includes(member.organizationRole)&&(!member.journeyRole||member.journeyRole==='member')).length
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
        {label:unassignedMembers>0?(locale==='en'?'Assign responsibilities':locale==='es'?'Asignar responsabilidades':'Atribuir responsabilidades'):(locale==='en'?'Review team':locale==='es'?'Revisar equipo':'Revisar equipe'),href:'#team-responsibilities',primary:true},
        {label:t.members,href:HUB_MEMBERS_URL},
      ]:[{label:t.members,href:HUB_MEMBERS_URL,primary:true}]}
    />

    {canAssign?<section className="team-section team-responsibility-section" id="team-responsibilities">
      <div className="team-section-heading"><span className="team-kicker">{t.responsibilities}</span><h2>{t.responsibilities}</h2><p>{t.responsibilitiesDesc}</p></div>
      <div className="team-member-list">
        {members.map(member=>{
          const orgWide=['owner','admin'].includes(member.organizationRole)
          const draft=drafts[member.id]??{responsibility:'member' as Responsibility}
          const roleMeta=responsibilities[draft.responsibility]
          const changed=!orgWide&&draft.responsibility!==member.journeyRole
          return <article className="team-member-card" key={member.id}>
            <div className="team-member-identity"><span className="team-member-avatar">{member.name.split(' ').filter(Boolean).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email||member.organizationRole}</small></div></div>
            {orgWide?<div className="team-org-wide"><ShieldCheck size={17}/><div><strong>{t.orgAccess}</strong><small>{t.orgAccessDesc}</small></div></div>:<>
              <div className="team-role-editor">
                <label><span>{t.role}</span><select value={draft.responsibility} disabled={savingId===member.id} onChange={e=>setResponsibility(member.id,e.target.value as Responsibility)}>{responsibilityOrder.map(role=><option key={role} value={role}>{responsibilities[role][0]}</option>)}</select></label>
                <p>{roleMeta[1]}</p>
              </div>
              <div className="team-scope-editor readonly"><span>{t.scope}</span><div>{member.congregationIds.length?member.congregationIds.map(id=><span className="team-scope-chip" key={id}>{congregations.find(unit=>unit.id===id)?.name||id}</span>):<span className="team-scope-chip muted">—</span>}</div><small>{t.scopeHint}</small></div>
              <div className="team-member-actions"><span>{savedId===member.id?t.saved:''}</span><button className="team-save-button" disabled={!changed||savingId===member.id} onClick={()=>void saveResponsibility(member.id)}><Save size={14}/>{savingId===member.id?t.saving:t.save}</button></div>
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
