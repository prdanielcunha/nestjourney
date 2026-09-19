import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ClipboardCheck, HeartHandshake, House, LayoutDashboard, Leaf, Menu, ShieldCheck,
  Sparkles, UserCheck, Users, X, ListTodo, UserCog
} from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import { getInitialLocale, type AppLocale } from './i18n'
import './JourneyShell.css'

type NavItem = {
  href: string
  label: string
  description: string
  icon: typeof LayoutDashboard
  allowed: (access: JourneyAccessContext) => boolean
}

const shellCopy: Record<AppLocale, {
  start: string; home: string; homeDesc: string; today: string; todayDesc: string; implementation: string; implementationDesc: string; team: string; teamDesc: string;
  journey: string; people: string; peopleDesc: string; reception: string; receptionDesc: string; care: string; careDesc: string;
  groups: string; groupsDesc: string; root: string; rootDesc: string; management: string; pastoral: string; pastoralDesc: string;
  privacy: string; privacyDesc: string; helpTitle: string; helpText: string; tagline: string; modules: string; quick: string; more: string; close: string;
}> = {
  'pt-BR': {
    start:'Começar', home:'Início', homeDesc:'Visão simples da jornada', today:'Meu Hoje', todayDesc:'O que precisa da sua atenção',
    implementation:'Implantação', implementationDesc:'As 7 semanas, passo a passo', team:'Equipe & Papéis', teamDesc:'Frentes, responsabilidades e acessos', journey:'Jornada da pessoa',
    people:'Pessoas', peopleDesc:'Cadastro e histórico da jornada', reception:'Recepção & Mesa', receptionDesc:'Chegada, vínculo e presença',
    care:'Cuidado & Conexão', careDesc:'Contato em 24–48h e próximos passos', groups:'Casas de Paz', groupsDesc:'Casas, participantes e entradas',
    root:'Raiz', rootDesc:'Discipulado inicial em 7 encontros', management:'Pastoral & gestão', pastoral:'Visão Pastoral', pastoralDesc:'Casos que pedem atenção pastoral',
    privacy:'Privacidade & Auditoria', privacyDesc:'LGPD, correções e histórico', helpTitle:'Não sabe por onde começar?',
    helpText:'Abra Implantação. O NestJourney guia a igreja pelas 7 semanas e depois acompanha a jornada no dia a dia.',
    tagline:'cuidado em cada passo', modules:'Módulos do NestJourney', quick:'Navegação rápida', more:'Mais', close:'Fechar',
  },
  en: {
    start:'Start', home:'Home', homeDesc:'A simple journey overview', today:'My Today', todayDesc:'What needs your attention',
    implementation:'Implementation', implementationDesc:'The 7 weeks, step by step', team:'Team & Roles', teamDesc:'Ministry fronts, responsibilities and access', journey:'Person journey',
    people:'People', peopleDesc:'Profile and journey history', reception:'Welcome & Table', receptionDesc:'Arrival, relationship and presence',
    care:'Care & Connection', careDesc:'24–48h contact and next steps', groups:'Peace Houses', groupsDesc:'Groups, participants and entry',
    root:'Root', rootDesc:'Initial discipleship in 7 meetings', management:'Pastoral & management', pastoral:'Pastoral View', pastoralDesc:'Cases needing pastoral attention',
    privacy:'Privacy & Audit', privacyDesc:'Privacy, corrections and history', helpTitle:'Not sure where to start?',
    helpText:'Open Implementation. NestJourney guides the church through the 7 weeks and then supports the daily journey.',
    tagline:'care at every step', modules:'NestJourney modules', quick:'Quick navigation', more:'More', close:'Close',
  },
  es: {
    start:'Comenzar', home:'Inicio', homeDesc:'Visión simple de la jornada', today:'Mi Hoy', todayDesc:'Lo que necesita tu atención',
    implementation:'Implementación', implementationDesc:'Las 7 semanas, paso a paso', team:'Equipo & Papeles', teamDesc:'Frentes, responsabilidades y accesos', journey:'Jornada de la persona',
    people:'Personas', peopleDesc:'Registro e historial de la jornada', reception:'Recepción & Mesa', receptionDesc:'Llegada, vínculo y presencia',
    care:'Cuidado & Conexión', careDesc:'Contacto en 24–48h y próximos pasos', groups:'Casas de Paz', groupsDesc:'Casas, participantes y entradas',
    root:'Raíz', rootDesc:'Discipulado inicial en 7 encuentros', management:'Pastoral & gestión', pastoral:'Visión Pastoral', pastoralDesc:'Casos que requieren atención pastoral',
    privacy:'Privacidad & Auditoría', privacyDesc:'Privacidad, correcciones e historial', helpTitle:'¿No sabes por dónde empezar?',
    helpText:'Abre Implementación. NestJourney guía a la iglesia durante las 7 semanas y luego acompaña la jornada diaria.',
    tagline:'cuidado en cada paso', modules:'Módulos de NestJourney', quick:'Navegación rápida', more:'Más', close:'Cerrar',
  },
}

function buildGroups(copy: typeof shellCopy[AppLocale]): Array<{ label: string; items: NavItem[] }> {
  return [
    {
      label: copy.start,
      items: [
        { href: '/', label: copy.home, description: copy.homeDesc, icon: LayoutDashboard, allowed: () => true },
        { href: '/my-today', label: copy.today, description: copy.todayDesc, icon: ListTodo, allowed: (a) => a.broadJourneyAccess || a.canManageCare || a.canManagePresence || a.canManageGroups || a.canManageDiscipleship || a.canManagePastoral },
        { href: '/implementation-runtime', label: copy.implementation, description: copy.implementationDesc, icon: ClipboardCheck, allowed: (a) => a.canManageImplementation },
        { href: '/team-runtime', label: copy.team, description: copy.teamDesc, icon: UserCog, allowed: (a) => a.isOwner || a.isSystemAdmin || a.canManageImplementation || a.canViewGovernance },
      ],
    },
    {
      label: copy.journey,
      items: [
        { href: '/journey-profile', label: copy.people, description: copy.peopleDesc, icon: Users, allowed: (a) => a.broadJourneyAccess || a.canManagePeople },
        { href: '/presence-assist', label: copy.reception, description: copy.receptionDesc, icon: UserCheck, allowed: (a) => a.canManagePresence },
        { href: '/care-integrity', label: copy.care, description: copy.careDesc, icon: HeartHandshake, allowed: (a) => a.broadJourneyAccess || a.canManageCare },
        { href: '/groups-runtime', label: copy.groups, description: copy.groupsDesc, icon: House, allowed: (a) => a.broadJourneyAccess || a.canManageGroups },
        { href: '/discipleship-runtime', label: copy.root, description: copy.rootDesc, icon: Leaf, allowed: (a) => a.broadJourneyAccess || a.canManageDiscipleship },
      ],
    },
    {
      label: copy.management,
      items: [
        { href: '/pastoral-handoff', label: copy.pastoral, description: copy.pastoralDesc, icon: Sparkles, allowed: (a) => a.canManagePastoral },
        { href: '/governance-runtime', label: copy.privacy, description: copy.privacyDesc, icon: ShieldCheck, allowed: (a) => a.canViewGovernance },
      ],
    },
  ]
}

function sameRoute(href: string, pathname: string) {
  if (href === '/') return pathname === '/' || pathname === '/journey-overview'
  return pathname === href
}

export function JourneyShell({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [open, setOpen] = useState(false)
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const pathname = window.location.pathname
  const copy = shellCopy[locale]
  const groups = useMemo(() => buildGroups(copy), [copy])

  useEffect(() => {
    const syncLocale = (event: Event) => {
      const next = (event as CustomEvent<AppLocale>).detail
      if (next) setLocale(next)
    }
    window.addEventListener('nestjourney:locale', syncLocale)
    return () => window.removeEventListener('nestjourney:locale', syncLocale)
  }, [])

  useEffect(() => {
    const user = auth?.currentUser
    const organizationId = getActiveJourneyOrganizationId()
    if (!user || !organizationId) return
    void loadJourneyAccess(user.uid, organizationId).then(setAccess).catch(() => setAccess(null))
  }, [pathname])

  const visibleGroups = useMemo(() => {
    if (!access) return groups.map(group => ({ ...group, items: group.items.filter(item => item.href === '/') }))
    return groups
      .map(group => ({ ...group, items: group.items.filter(item => item.allowed(access)) }))
      .filter(group => group.items.length)
  }, [access, groups])

  const navigate = (href: string) => {
    if (href !== window.location.pathname) {
      window.history.pushState({}, '', href)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    setOpen(false)
  }

  const essentials = [
    { href: '/', label: copy.home, icon: LayoutDashboard },
    { href: '/my-today', label: copy.today, icon: ListTodo },
    { href: '/presence-assist', label: copy.reception.split(' & ')[0], icon: UserCheck },
    { href: '/care-integrity', label: copy.care.split(' & ')[0], icon: HeartHandshake },
  ].filter(item => visibleGroups.some(group => group.items.some(nav => nav.href === item.href)))

  return <div className="journey-app-frame">
    <aside className="journey-side-nav">
      <button className="journey-side-brand" onClick={() => navigate('/')} aria-label={copy.home}>
        <img src="/icon.svg" alt="" />
        <span><strong>NestJourney</strong><small>{copy.tagline}</small></span>
      </button>

      <nav aria-label={copy.modules}>
        {visibleGroups.map(group => <section className="journey-nav-group" key={group.label}>
          <span className="journey-nav-label">{group.label}</span>
          {group.items.map(item => {
            const Icon = item.icon
            const active = sameRoute(item.href, pathname)
            return <button key={item.href} className={active ? 'active' : ''} onClick={() => navigate(item.href)}>
              <span className="journey-nav-icon"><Icon size={17} /></span>
              <span className="journey-nav-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          })}
        </section>)}
      </nav>

      <div className="journey-side-help">
        <strong>{copy.helpTitle}</strong>
        <span>{copy.helpText}</span>
      </div>
    </aside>

    <section className="journey-app-content">{children}</section>

    <nav className="journey-mobile-bar" aria-label={copy.quick}>
      {essentials.map(item => {
        const Icon=item.icon
        return <button className={sameRoute(item.href, pathname)?'active':''} key={item.href} onClick={() => navigate(item.href)}>
          <Icon size={18}/><span>{item.label}</span>
        </button>
      })}
      <button className={open?'active':''} onClick={() => setOpen(true)}><Menu size={18}/><span>{copy.more}</span></button>
    </nav>

    {open ? <>
      <button className="journey-mobile-scrim" aria-label={copy.close} onClick={() => setOpen(false)} />
      <aside className="journey-mobile-drawer">
        <header><div><strong>NestJourney</strong><span>{copy.modules}</span></div><button onClick={() => setOpen(false)} aria-label={copy.close}><X size={19}/></button></header>
        {visibleGroups.map(group => <section className="journey-nav-group" key={group.label}>
          <span className="journey-nav-label">{group.label}</span>
          {group.items.map(item => {
            const Icon=item.icon
            return <button key={item.href} className={sameRoute(item.href,pathname)?'active':''} onClick={() => navigate(item.href)}>
              <span className="journey-nav-icon"><Icon size={17}/></span>
              <span className="journey-nav-copy"><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          })}
        </section>)}
      </aside>
    </> : null}
  </div>
}
