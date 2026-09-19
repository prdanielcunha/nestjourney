import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ClipboardCheck, HeartHandshake, House, LayoutDashboard, Leaf, Menu, ShieldCheck,
  Sparkles, UserCheck, Users, X, ListTodo
} from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
import './JourneyShell.css'

type NavItem = {
  href: string
  label: string
  description: string
  icon: typeof LayoutDashboard
  allowed: (access: JourneyAccessContext) => boolean
}

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Começar',
    items: [
      { href: '/', label: 'Início', description: 'Visão simples da jornada', icon: LayoutDashboard, allowed: () => true },
      { href: '/my-today', label: 'Meu Hoje', description: 'O que precisa da sua atenção', icon: ListTodo, allowed: (a) => a.broadJourneyAccess || a.canManageCare || a.canManagePresence || a.canManageGroups || a.canManageDiscipleship || a.canManagePastoral },
      { href: '/implementation-runtime', label: 'Implantação', description: 'As 7 semanas, passo a passo', icon: ClipboardCheck, allowed: (a) => a.canManageImplementation },
    ],
  },
  {
    label: 'Jornada da pessoa',
    items: [
      { href: '/journey-profile', label: 'Pessoas', description: 'Cadastro e histórico da jornada', icon: Users, allowed: (a) => a.broadJourneyAccess || a.canManagePeople },
      { href: '/presence-assist', label: 'Recepção & Mesa', description: 'Chegada, vínculo e presença', icon: UserCheck, allowed: (a) => a.canManagePresence },
      { href: '/care-integrity', label: 'Cuidado & Conexão', description: 'Contato em 24–48h e próximos passos', icon: HeartHandshake, allowed: (a) => a.broadJourneyAccess || a.canManageCare },
      { href: '/groups-runtime', label: 'Casas de Paz', description: 'Casas, participantes e entradas', icon: House, allowed: (a) => a.broadJourneyAccess || a.canManageGroups },
      { href: '/discipleship-runtime', label: 'Raiz', description: 'Discipulado inicial em 7 encontros', icon: Leaf, allowed: (a) => a.broadJourneyAccess || a.canManageDiscipleship },
    ],
  },
  {
    label: 'Pastoral & gestão',
    items: [
      { href: '/pastoral-handoff', label: 'Visão Pastoral', description: 'Casos que pedem atenção pastoral', icon: Sparkles, allowed: (a) => a.canManagePastoral },
      { href: '/governance-runtime', label: 'Privacidade & Auditoria', description: 'LGPD, correções e histórico', icon: ShieldCheck, allowed: (a) => a.canViewGovernance },
    ],
  },
]

function sameRoute(href: string, pathname: string) {
  if (href === '/') return pathname === '/' || pathname === '/journey-overview'
  return pathname === href
}

export function JourneyShell({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [open, setOpen] = useState(false)
  const pathname = window.location.pathname

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
  }, [access])

  const navigate = (href: string) => {
    if (href !== window.location.pathname) {
      window.history.pushState({}, '', href)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    setOpen(false)
  }

  const essentials = [
    { href: '/', label: 'Início', icon: LayoutDashboard },
    { href: '/my-today', label: 'Hoje', icon: ListTodo },
    { href: '/presence-assist', label: 'Recepção', icon: UserCheck },
    { href: '/care-integrity', label: 'Cuidado', icon: HeartHandshake },
  ].filter(item => visibleGroups.some(group => group.items.some(nav => nav.href === item.href)))

  return <div className="journey-app-frame">
    <aside className="journey-side-nav">
      <button className="journey-side-brand" onClick={() => navigate('/')} aria-label="Ir para o início do NestJourney">
        <img src="/icon.svg" alt="" />
        <span><strong>NestJourney</strong><small>cuidado em cada passo</small></span>
      </button>

      <nav aria-label="Módulos do NestJourney">
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
        <strong>Não sabe por onde começar?</strong>
        <span>Abra Implantação. O NestJourney guia a igreja pelas 7 semanas e depois acompanha a jornada no dia a dia.</span>
      </div>
    </aside>

    <section className="journey-app-content">{children}</section>

    <nav className="journey-mobile-bar" aria-label="Navegação rápida">
      {essentials.map(item => {
        const Icon=item.icon
        return <button className={sameRoute(item.href, pathname)?'active':''} key={item.href} onClick={() => navigate(item.href)}>
          <Icon size={18}/><span>{item.label}</span>
        </button>
      })}
      <button className={open?'active':''} onClick={() => setOpen(true)}><Menu size={18}/><span>Mais</span></button>
    </nav>

    {open ? <>
      <button className="journey-mobile-scrim" aria-label="Fechar menu" onClick={() => setOpen(false)} />
      <aside className="journey-mobile-drawer">
        <header><div><strong>NestJourney</strong><span>Todos os módulos</span></div><button onClick={() => setOpen(false)} aria-label="Fechar"><X size={19}/></button></header>
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
