import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BarChart3, BookOpen, ClipboardCheck, History, Settings2, ShieldCheck, UserCog } from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { canViewJourneyReports } from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import './JourneySectionPages.css'

const copy={
  'pt-BR':{
    title:'Mais',subtitle:'Gestão, implantação e configurações ficam aqui — fora do caminho do cuidado diário.',
    loading:'Preparando opções…',available:'Disponível',restricted:'Sem acesso neste papel',
    team:'Equipe e papéis',teamDesc:'Frentes, responsabilidades, membros, convites e permissões.',
    implementation:'Implantação',implementationDesc:'Acompanhe a preparação e as sete semanas de implantação.',
    reports:'Relatórios',reportsDesc:'Indicadores operacionais objetivos para coordenação e liderança.',
    privacy:'Privacidade',privacyDesc:'Solicitações de correção, consentimento, retenção e proteção de dados.',
    audit:'Auditoria',auditDesc:'Histórico factual de ações e mudanças autorizadas.',
    settings:'Configurações',settingsDesc:'Nomes dos módulos e preferências da organização.',
    help:'Ajuda',helpDesc:'Entenda o que fazer em cada área sem precisar aprender o sistema inteiro.',
  },
  en:{
    title:'More',subtitle:'Management, implementation, and settings live here — outside the daily care workflow.',
    loading:'Preparing options…',available:'Available',restricted:'Not available for this role',
    team:'Team & roles',teamDesc:'Ministry fronts, responsibilities, members, invitations, and permissions.',
    implementation:'Implementation',implementationDesc:'Follow preparation and the seven implementation weeks.',
    reports:'Reports',reportsDesc:'Objective operational indicators for coordinators and leaders.',
    privacy:'Privacy',privacyDesc:'Correction, consent, retention, and data protection requests.',
    audit:'Audit',auditDesc:'Factual history of authorized actions and changes.',
    settings:'Settings',settingsDesc:'Organization module names and preferences.',
    help:'Help',helpDesc:'Understand what to do in each area without learning the whole system.',
  },
  es:{
    title:'Más',subtitle:'Gestión, implementación y configuración quedan aquí, fuera del trabajo diario de cuidado.',
    loading:'Preparando opciones…',available:'Disponible',restricted:'Sin acceso en este papel',
    team:'Equipo y papeles',teamDesc:'Frentes, responsabilidades, miembros, invitaciones y permisos.',
    implementation:'Implementación',implementationDesc:'Acompaña la preparación y las siete semanas de implementación.',
    reports:'Informes',reportsDesc:'Indicadores operativos objetivos para coordinación y liderazgo.',
    privacy:'Privacidad',privacyDesc:'Solicitudes de corrección, consentimiento, retención y protección de datos.',
    audit:'Auditoría',auditDesc:'Historial factual de acciones y cambios autorizados.',
    settings:'Configuración',settingsDesc:'Nombres de módulos y preferencias de la organización.',
    help:'Ayuda',helpDesc:'Entiende qué hacer en cada área sin aprender todo el sistema.',
  }
} as const

export default function MorePage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [loading,setLoading]=useState(true)

  const bootstrap=useCallback(async()=>{
    setLoading(true)
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      setAccess(await loadJourneyAccess(user.uid,organizationId))
    }finally{setLoading(false)}
  },[])
  useEffect(()=>{void bootstrap()},[bootstrap])
  if(loading)return <main className="journey-section-page"><div className="journey-loading">{t.loading}</div></main>

  const canManageSettings=Boolean(access&&(access.isSystemAdmin||access.isOwner||['owner','admin','pastor'].includes(access.organizationRole)||access.role==='pastor'))
  const cards=[
    {title:t.team,desc:t.teamDesc,href:'/team-runtime',Icon:UserCog,allowed:Boolean(access&&(access.isSystemAdmin||access.isOwner||access.canManageImplementation||access.canViewGovernance))},
    {title:t.implementation,desc:t.implementationDesc,href:'/implementation-runtime',Icon:ClipboardCheck,allowed:Boolean(access?.canManageImplementation)},
    {title:t.reports,desc:t.reportsDesc,href:'/reports',Icon:BarChart3,allowed:Boolean(access&&canViewJourneyReports(access))},
    {title:t.privacy,desc:t.privacyDesc,href:'/governance-runtime?view=privacy',Icon:ShieldCheck,allowed:Boolean(access?.canManagePrivacy)},
    {title:t.audit,desc:t.auditDesc,href:'/governance-runtime?view=audit',Icon:History,allowed:Boolean(access?.canViewGovernance)},
    {title:t.settings,desc:t.settingsDesc,href:'/settings-runtime',Icon:Settings2,allowed:canManageSettings},
    {title:t.help,desc:t.helpDesc,href:'/help',Icon:BookOpen,allowed:true},
  ]

  return <main className="journey-section-page"><div className="journey-section-shell">
    <header className="journey-section-header"><div><span className="journey-section-kicker">NestJourney / More</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    <section className="journey-card-grid">{cards.map(item=>{const Icon=item.Icon;return <a key={item.title} className={`journey-card ${item.allowed?'':'disabled'}`} href={item.allowed?item.href:'#'} onClick={item.allowed?undefined:e=>e.preventDefault()}><span className="journey-card-icon"><Icon size={20}/></span><span className="journey-card-copy"><small>{item.allowed?t.available:t.restricted}</small><strong>{item.title}</strong><p>{item.desc}</p></span><ArrowRight size={16}/></a>})}</section>
  </div></main>
}
