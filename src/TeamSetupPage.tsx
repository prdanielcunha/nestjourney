import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, HeartHandshake, House, Leaf, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import './TeamSetupPage.css'

const HUB_MEMBERS_URL='https://www.millionsnest.com/dashboard/organization/members'
const HUB_ROLES_URL='https://www.millionsnest.com/dashboard/organization/roles'

const copy={
  'pt-BR':{
    title:'Equipe & Papéis',subtitle:'Veja as frentes do NestJourney, quem precisa existir em cada uma e quais acessos o seu perfil possui.',
    back:'Início',loading:'Carregando equipe…',unit:'Organização',yourAccess:'Seu acesso no NestJourney',role:'Papel atual',
    full:'Acesso amplo',yes:'Permitido',no:'Sem acesso',members:'Membros & Convites',roles:'Cargos & Permissões',
    hubNote:'Usuários, convites e cargos pertencem ao MillionsNest Hub. O NestJourney usa esse cadastro compartilhado e não cria uma segunda lista de pessoas.',
    fronts:'Frentes do projeto',frontsDesc:'Estrutura inicial baseada nos manuais do Raiz e Mesa. Comece pequeno e aumente conforme a cultura amadurecer.',
    pastor:'Pastor guardião',pastorDesc:'Guarda visão, doutrina, segurança, correção e casos sensíveis.',pastorSize:'1 pastor + 1 auxiliar de referência',
    presence:'Equipe Presença',presenceDesc:'Coordenador, anfitrião de entrada, salão e vínculo. Recebe, nota, conecta e acompanha.',presenceSize:'Ideal inicial: 4–6 pessoas',
    table:'Mesa Aberta',tableDesc:'Prepara o ambiente simples e ajuda a igreja a permanecer, conversar e criar vínculos.',tableSize:'Ideal inicial: 3–5 pessoas',
    care:'Cuidado & Conexão',careDesc:'Garante contato autorizado em 24–48h, acompanha respostas e encaminha próximos passos.',careSize:'Ideal inicial: 3–4 pessoas',
    houses:'Casa de Paz',housesDesc:'Líder, anfitrião e aprendiz para comunidade pequena, Bíblia, conversa e oração.',housesSize:'Por Casa: 2–4 pessoas na equipe',
    root:'Raiz',rootDesc:'Discipuladores preparados para caminhar 1:1 ou 1:2 durante os sete encontros iniciais.',rootSize:'Ideal: 2 relações ativas por discipulador',
    capabilities:'O que você consegue operar',people:'Pessoas',implementation:'Implantação',privacy:'Privacidade & Auditoria',pastoralView:'Visão Pastoral',
    guidance:'Próximo passo',guidanceText:'Se a equipe ainda não foi formada, volte para Implantação. A preparação e as semanas indicam quando ativar cada frente.',
    error:'Não foi possível carregar seu acesso.'
  },
  en:{
    title:'Team & Roles',subtitle:'See NestJourney ministry fronts, the people each one needs, and the access your profile currently has.',
    back:'Home',loading:'Loading team…',unit:'Organization',yourAccess:'Your NestJourney access',role:'Current role',
    full:'Broad access',yes:'Allowed',no:'No access',members:'Members & Invites',roles:'Roles & Permissions',
    hubNote:'Users, invitations, and organization roles belong to MillionsNest Hub. NestJourney uses that shared identity and does not create a second people directory.',
    fronts:'Ministry fronts',frontsDesc:'Initial structure based on the Raiz e Mesa manuals. Start small and expand as the culture matures.',
    pastor:'Pastoral guardian',pastorDesc:'Protects vision, doctrine, safety, correction, and sensitive cases.',pastorSize:'1 pastor + 1 reference assistant',
    presence:'Welcome Team',presenceDesc:'Coordinator plus entrance, hall, and relationship hosts. Welcomes, notices, connects, and follows people.',presenceSize:'Initial ideal: 4–6 people',
    table:'Open Table',tableDesc:'Prepares a simple environment and helps the church stay, talk, and form relationships.',tableSize:'Initial ideal: 3–5 people',
    care:'Care & Connection',careDesc:'Ensures authorized contact within 24–48h, follows responses, and routes next steps.',careSize:'Initial ideal: 3–4 people',
    houses:'Peace House',housesDesc:'Leader, host, and apprentice for small community, Bible, conversation, and prayer.',housesSize:'Per house: 2–4 team members',
    root:'Root',rootDesc:'Prepared disciplers walking 1:1 or 1:2 through the seven initial meetings.',rootSize:'Ideal: 2 active relationships per discipler',
    capabilities:'What you can operate',people:'People',implementation:'Implementation',privacy:'Privacy & Audit',pastoralView:'Pastoral View',
    guidance:'Next step',guidanceText:'If the team is not formed yet, return to Implementation. Preparation and the weeks show when each front should start.',
    error:'Your access could not be loaded.'
  },
  es:{
    title:'Equipo & Papeles',subtitle:'Ve los frentes de NestJourney, quién necesita existir en cada uno y los accesos que tiene tu perfil.',
    back:'Inicio',loading:'Cargando equipo…',unit:'Organización',yourAccess:'Tu acceso en NestJourney',role:'Papel actual',
    full:'Acceso amplio',yes:'Permitido',no:'Sin acceso',members:'Miembros & Invitaciones',roles:'Cargos & Permisos',
    hubNote:'Usuarios, invitaciones y cargos pertenecen al MillionsNest Hub. NestJourney usa esa identidad compartida y no crea una segunda lista de personas.',
    fronts:'Frentes del proyecto',frontsDesc:'Estructura inicial basada en los manuales de Raiz e Mesa. Empieza pequeño y crece con la cultura.',
    pastor:'Pastor guardián',pastorDesc:'Guarda visión, doctrina, seguridad, corrección y casos sensibles.',pastorSize:'1 pastor + 1 auxiliar de referencia',
    presence:'Equipo Recepción',presenceDesc:'Coordinador y anfitriones de entrada, salón y vínculo. Recibe, conecta y acompaña.',presenceSize:'Ideal inicial: 4–6 personas',
    table:'Mesa Abierta',tableDesc:'Prepara un ambiente simple y ayuda a la iglesia a permanecer, conversar y crear vínculos.',tableSize:'Ideal inicial: 3–5 personas',
    care:'Cuidado & Conexión',careDesc:'Garantiza contacto autorizado en 24–48h, acompaña respuestas y dirige próximos pasos.',careSize:'Ideal inicial: 3–4 personas',
    houses:'Casa de Paz',housesDesc:'Líder, anfitrión y aprendiz para comunidad pequeña, Biblia, conversación y oración.',housesSize:'Por Casa: 2–4 personas en el equipo',
    root:'Raíz',rootDesc:'Discipuladores preparados para caminar 1:1 o 1:2 durante los siete encuentros iniciales.',rootSize:'Ideal: 2 relaciones activas por discipulador',
    capabilities:'Lo que puedes operar',people:'Personas',implementation:'Implementación',privacy:'Privacidad & Auditoría',pastoralView:'Visión Pastoral',
    guidance:'Próximo paso',guidanceText:'Si el equipo aún no está formado, vuelve a Implementación. La preparación y las semanas indican cuándo activar cada frente.',
    error:'No se pudo cargar tu acceso.'
  }
} as const

export default function TeamSetupPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      setAccess(await loadJourneyAccess(user.uid,organizationId))
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[t.error])
  useEffect(()=>{void bootstrap()},[bootstrap])

  if(loading)return <main className="team-setup"><div className="team-loading">{t.loading}</div></main>

  const fronts=[
    {icon:ShieldCheck,title:t.pastor,description:t.pastorDesc,size:t.pastorSize},
    {icon:UserCheck,title:t.presence,description:t.presenceDesc,size:t.presenceSize},
    {icon:Users,title:t.table,description:t.tableDesc,size:t.tableSize},
    {icon:HeartHandshake,title:t.care,description:t.careDesc,size:t.careSize},
    {icon:House,title:t.houses,description:t.housesDesc,size:t.housesSize},
    {icon:Leaf,title:t.root,description:t.rootDesc,size:t.rootSize},
  ]
  const capabilities=access?[
    [t.people,access.canManagePeople||access.broadJourneyAccess],
    [t.presence,access.canManagePresence],
    [t.care,access.canManageCare||access.broadJourneyAccess],
    [t.houses,access.canManageGroups||access.broadJourneyAccess],
    [t.root,access.canManageDiscipleship||access.broadJourneyAccess],
    [t.implementation,access.canManageImplementation],
    [t.pastoralView,access.canManagePastoral],
    [t.privacy,access.canViewGovernance],
  ]:[]

  return <main className="team-setup"><div className="team-shell">
    <header className="team-topbar"><div><span className="team-kicker">NestJourney / Team</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="team-error">{error}</div>:null}
    <section className="team-access-card">
      <div><span className="team-kicker">{t.yourAccess}</span><h2>{access?.isSystemAdmin||access?.isOwner?t.full:(access?.role||'—')}</h2><p>{t.hubNote}</p></div>
      <div className="team-hub-actions"><a href={HUB_MEMBERS_URL}>{t.members}<ArrowUpRight size={15}/></a><a href={HUB_ROLES_URL}>{t.roles}<ArrowUpRight size={15}/></a></div>
    </section>
    <section className="team-capabilities"><div className="team-section-heading"><span className="team-kicker">{t.capabilities}</span></div><div>{capabilities.map(([label,allowed])=><span className={allowed?'allowed':'blocked'} key={String(label)}><b>{String(label)}</b><small>{allowed?t.yes:t.no}</small></span>)}</div></section>
    <section className="team-section"><div className="team-section-heading"><span className="team-kicker">{t.fronts}</span><h2>{t.fronts}</h2><p>{t.frontsDesc}</p></div><div className="team-front-grid">{fronts.map(item=>{const Icon=item.icon;return <article key={item.title}><span><Icon size={18}/></span><div><strong>{item.title}</strong><p>{item.description}</p><small>{item.size}</small></div></article>})}</div></section>
    <section className="team-guidance"><ClipboardCheck size={20}/><div><strong>{t.guidance}</strong><p>{t.guidanceText}</p></div><a href="/implementation-runtime">{t.implementation}<ArrowUpRight size={14}/></a></section>
  </div></main>
}
