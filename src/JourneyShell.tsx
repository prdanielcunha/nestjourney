import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3, ChevronDown, CircleHelp, CloudOff, Eye, HeartHandshake, House, Languages, Leaf,
  ListTodo, MoreHorizontal, Settings2, UserCheck, Users, UsersRound, Workflow,
} from 'lucide-react'
import { auth } from './firebase'
import {
  getActiveJourneyOrganizationId,
  loadJourneyAccess,
  setJourneyViewAsRole,
  type JourneyAccessContext,
  type JourneyViewAsRole,
} from './journeyRepository'
import { canOpenJourneyArea, canViewJourneyPeople, canViewJourneyVision, resolveJourneyResponsibility } from './journeyExperience'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { useJourneyLabels } from './journeyLabels'
import './JourneyShell.css'

type NavItem={
  href:string
  label:string
  description:string
  icon:typeof ListTodo
  enabled?:(access:JourneyAccessContext)=>boolean
}

const copy={
  'pt-BR':{
    tagline:'cuidado em cada passo',today:'Hoje',todayDesc:'O que precisa de você agora',
    people:'Pessoas',peopleDesc:'Pessoas e jornada permitida',journey:'Jornada',journeyDesc:'O caminho de cuidado e suas áreas',
    vision:'Visão',visionDesc:'Leitura pastoral, operacional e executiva',management:'Gestão',managementDesc:'Equipe, implantação, relatórios e ajustes',
    areas:'Áreas de cuidado',presence:'Presença',presenceDesc:'Cultos, visitantes e vínculo',table:'Mesa Aberta',tableDesc:'Hospitalidade e participação',
    care:'Cuidado & Conexão',careDesc:'Contato em 24–48h e próximos passos',groups:'Casas de Paz',groupsDesc:'Casas, participantes e operação',
    root:'Raiz',rootDesc:'Discipulado inicial 1–7',restricted:'Sem acesso neste papel',
    language:'Idioma',role:'Seu acesso',realAccess:'Acesso real',viewAs:'Visualizar experiência como',
    viewing:'Visualizando como',backCeo:'Voltar à visão CEO',offline:'Sem conexão. As ações serão retomadas quando a internet voltar.',
  },
  en:{
    tagline:'care at every step',today:'Today',todayDesc:'What needs you now',
    people:'People',peopleDesc:'People and permitted journey',journey:'Journey',journeyDesc:'The care path and its areas',
    vision:'Vision',visionDesc:'Pastoral, operational, and executive read',management:'Management',managementDesc:'Team, rollout, reports, and settings',
    areas:'Care areas',presence:'Presence',presenceDesc:'Services, visitors, and relationships',table:'Open Table',tableDesc:'Hospitality and participation',
    care:'Care & Connection',careDesc:'24–48h contact and next steps',groups:'Peace Houses',groupsDesc:'Groups, participants, and operations',
    root:'Root',rootDesc:'Initial discipleship 1–7',restricted:'Not available for this role',
    language:'Language',role:'Your access',realAccess:'Real access',viewAs:'View experience as',
    viewing:'Viewing as',backCeo:'Return to CEO view',offline:'You are offline. Actions will resume when your internet connection returns.',
  },
  es:{
    tagline:'cuidado en cada paso',today:'Hoy',todayDesc:'Lo que necesita de ti ahora',
    people:'Personas',peopleDesc:'Personas y jornada permitida',journey:'Jornada',journeyDesc:'El camino de cuidado y sus áreas',
    vision:'Visión',visionDesc:'Lectura pastoral, operativa y ejecutiva',management:'Gestión',managementDesc:'Equipo, implementación, informes y ajustes',
    areas:'Áreas de cuidado',presence:'Presencia',presenceDesc:'Cultos, visitantes y vínculo',table:'Mesa Abierta',tableDesc:'Hospitalidad y participación',
    care:'Cuidado & Conexión',careDesc:'Contacto en 24–48h y próximos pasos',groups:'Casas de Paz',groupsDesc:'Casas, participantes y operación',
    root:'Raíz',rootDesc:'Discipulado inicial 1–7',restricted:'Sin acceso en este rol',
    language:'Idioma',role:'Tu acceso',realAccess:'Acceso real',viewAs:'Visualizar experiencia como',
    viewing:'Visualizando como',backCeo:'Volver a la visión CEO',offline:'Sin conexión. Las acciones se reanudarán cuando vuelva internet.',
  },
} as const

const roleLabels:Record<AppLocale,Record<JourneyViewAsRole,string>>={
  'pt-BR':{
    ceo:'CEO MillionsNest',admin:'Dono / Administrador',pastor:'Pastor',coordinator:'Coordenador',
    presence_host:'Presença',mesa_team:'Mesa Aberta',caregiver:'Cuidado & Conexão',
    group_leader:'Líder de Casa de Paz',discipler:'Discipulador',
  },
  en:{
    ceo:'MillionsNest CEO',admin:'Owner / Administrator',pastor:'Pastor',coordinator:'Coordinator',
    presence_host:'Presence',mesa_team:'Open Table',caregiver:'Care & Connection',
    group_leader:'Peace House Leader',discipler:'Discipler',
  },
  es:{
    ceo:'CEO MillionsNest',admin:'Dueño / Administrador',pastor:'Pastor',coordinator:'Coordinador',
    presence_host:'Presencia',mesa_team:'Mesa Abierta',caregiver:'Cuidado & Conexión',
    group_leader:'Líder de Casa de Paz',discipler:'Discipulador',
  },
}

const viewAsOptions:JourneyViewAsRole[]=[
  'ceo','admin','pastor','coordinator','presence_host','mesa_team','caregiver','group_leader','discipler',
]

function sameRoute(href:string,pathname:string){
  if(href==='/my-today')return pathname==='/'||pathname==='/my-today'
  if(href==='/areas')return pathname==='/areas'||['/presence-assist','/mesa-runtime','/care-integrity','/groups-runtime','/discipleship-runtime'].includes(pathname)
  if(href==='/more')return pathname==='/more'||['/team-runtime','/implementation-runtime','/reports','/governance-runtime','/settings-runtime','/help','/pastoral-handoff'].includes(pathname)
  return pathname===href
}

export function JourneyShell({children}:{children:ReactNode}){
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const [pathname,setPathname]=useState(()=>window.location.pathname)
  const [online,setOnline]=useState(()=>navigator.onLine)
  const [accessOpen,setAccessOpen]=useState(false)
  const {labels}=useJourneyLabels()
  const t=copy[locale]

  useEffect(()=>{
    const syncPath=()=>{setPathname(window.location.pathname);setAccessOpen(false)}
    window.addEventListener('popstate',syncPath)
    return()=>window.removeEventListener('popstate',syncPath)
  },[])
  useEffect(()=>{
    const handleOnline=()=>setOnline(true)
    const handleOffline=()=>setOnline(false)
    window.addEventListener('online',handleOnline)
    window.addEventListener('offline',handleOffline)
    return()=>{
      window.removeEventListener('online',handleOnline)
      window.removeEventListener('offline',handleOffline)
    }
  },[])
  useEffect(()=>{
    const syncLocale=(event:Event)=>{
      const next=(event as CustomEvent<AppLocale>).detail
      if(next)setLocale(next)
    }
    window.addEventListener('nestjourney:locale',syncLocale)
    return()=>window.removeEventListener('nestjourney:locale',syncLocale)
  },[])
  useEffect(()=>{
    const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
    if(!user||!organizationId)return
    void loadJourneyAccess(user.uid,organizationId).then(setAccess).catch(()=>setAccess(null))
  },[pathname])

  const names=useMemo(()=>({
    presence:labels.presence||t.presence,
    mesa:labels.table||t.table,
    care:labels.care||t.care,
    groups:labels.groups||t.groups,
    root:labels.discipleship||t.root,
  }),[labels,t])

  const primary:NavItem[]=[
    {href:'/my-today',label:t.today,description:t.todayDesc,icon:ListTodo},
    {href:'/journey-profile',label:t.people,description:t.peopleDesc,icon:Users,enabled:a=>canViewJourneyPeople(a)},
    {href:'/areas',label:t.journey,description:t.journeyDesc,icon:Workflow},
    {href:'/vision',label:t.vision,description:t.visionDesc,icon:Eye,enabled:a=>canViewJourneyVision(a)},
  ]
  const areas:NavItem[]=[
    {href:'/presence-assist',label:names.presence,description:t.presenceDesc,icon:UserCheck,enabled:a=>canOpenJourneyArea(a,'presence')},
    {href:'/mesa-runtime',label:names.mesa,description:t.tableDesc,icon:UsersRound,enabled:a=>canOpenJourneyArea(a,'mesa')},
    {href:'/care-integrity',label:names.care,description:t.careDesc,icon:HeartHandshake,enabled:a=>canOpenJourneyArea(a,'care')},
    {href:'/groups-runtime',label:names.groups,description:t.groupsDesc,icon:House,enabled:a=>canOpenJourneyArea(a,'groups')},
    {href:'/discipleship-runtime',label:names.root,description:t.rootDesc,icon:Leaf,enabled:a=>canOpenJourneyArea(a,'discipleship')},
  ]

  const visiblePrimary=primary.filter(item=>!item.enabled||Boolean(access&&item.enabled(access)))
  const visibleAreas=areas.filter(item=>!item.enabled||Boolean(access&&item.enabled(access)))

  const navigate=(href:string,enabled=true)=>{
    if(!enabled)return
    if(href!==window.location.pathname){
      window.history.pushState({},'',href)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const renderItem=(item:NavItem)=>{
    const Icon=item.icon
    const enabled=!item.enabled||Boolean(access&&item.enabled(access))
    return <button
      key={item.href}
      className={(sameRoute(item.href,pathname)?'active ':'')+(enabled?'':'disabled')}
      onClick={()=>navigate(item.href,enabled)}
      title={enabled?item.description:t.restricted}
      aria-label={item.label}
    >
      <Icon size={17}/>
      <span>{item.label}</span>
    </button>
  }

  const responsibility=access?resolveJourneyResponsibility(access):'member'
  const roleShortcut=
    responsibility==='presence_host'?{href:'/presence-assist',label:names.presence,icon:UserCheck}
    :responsibility==='mesa_team'?{href:'/mesa-runtime',label:names.mesa,icon:UsersRound}
    :responsibility==='caregiver'?{href:'/care-integrity',label:names.care,icon:HeartHandshake}
    :responsibility==='group_leader'?{href:'/groups-runtime',label:names.groups,icon:House}
    :responsibility==='discipler'?{href:'/discipleship-runtime',label:names.root,icon:Leaf}
    :{href:'/help',label:locale==='en'?'Help':locale==='es'?'Ayuda':'Ajuda',icon:CircleHelp}

  const mobileFourth=access&&canViewJourneyVision(access)
    ?{href:'/vision',label:t.vision,icon:BarChart3}
    :roleShortcut
  const mobileSecond=access&&canViewJourneyPeople(access)
    ?{href:'/journey-profile',label:t.people,icon:Users}
    :roleShortcut
  const mobileCandidates=[
    {href:'/my-today',label:t.today,icon:ListTodo},
    mobileSecond,
    {href:'/areas',label:t.journey,icon:Workflow},
    mobileFourth,
    {href:'/more',label:t.management,icon:MoreHorizontal},
  ]
  const mobile=mobileCandidates.filter((item,index,items)=>items.findIndex(candidate=>candidate.href===item.href)===index)

  const isRealCeo=Boolean(access&&(access.actualIsSystemAdmin||access.isSystemAdmin))
  const currentView=(access?.viewAsRole||(access?.isSystemAdmin?'ceo':undefined)) as JourneyViewAsRole|undefined
  const displayRole=currentView
    ?roleLabels[locale][currentView]
    :access?.isOwner?'Owner':access?.role||'member'

  const chooseView=(role:JourneyViewAsRole)=>{
    setJourneyViewAsRole(role==='ceo'?null:role)
    setAccessOpen(false)
    window.location.reload()
  }

  return <div className="journey-app-frame">
    {!online?<div className="journey-network-banner" role="status"><CloudOff size={15}/><span>{t.offline}</span></div>:null}
    {isRealCeo&&currentView&&currentView!=='ceo'?<div className="journey-view-banner" role="status">
      <span>{t.viewing} <strong>{roleLabels[locale][currentView]}</strong></span>
      <button onClick={()=>chooseView('ceo')}>{t.backCeo}</button>
    </div>:null}

    <aside className="journey-side-nav">
      <button className="journey-side-brand" onClick={()=>navigate('/my-today')}>
        <img src="/nestjourney-icon.svg" alt=""/>
        <span><strong>NestJourney</strong><small>{t.tagline}</small></span>
      </button>

      <nav aria-label="NestJourney">
        <section className="journey-nav-group journey-nav-primary">
          {visiblePrimary.map(renderItem)}
        </section>

        {visibleAreas.length?<section className="journey-nav-group journey-nav-areas">
          <span className="journey-nav-label">{t.areas}</span>
          {visibleAreas.map(renderItem)}
        </section>:null}

        <section className="journey-nav-group journey-nav-management">
          {renderItem({href:'/more',label:t.management,description:t.managementDesc,icon:Settings2})}
        </section>
      </nav>

      <div className="journey-side-footer">
        {access?<div className="journey-access-wrap">
          {isRealCeo?<button className={'journey-access-chip interactive '+(accessOpen?'open':'')} onClick={()=>setAccessOpen(value=>!value)} aria-expanded={accessOpen}>
            <span><small>{t.role}</small><strong>{displayRole}</strong></span><ChevronDown size={15}/>
          </button>:<div className="journey-access-chip"><span><small>{t.role}</small><strong>{displayRole}</strong></span></div>}
          {isRealCeo&&accessOpen?<div className="journey-access-menu">
            <div className="journey-access-real"><small>{t.realAccess}</small><strong>CEO MillionsNest</strong></div>
            <div className="journey-access-menu-title">{t.viewAs}</div>
            <div className="journey-access-options">
              {viewAsOptions.map(role=><button className={currentView===role?'active':''} key={role} onClick={()=>chooseView(role)}>
                <span>{roleLabels[locale][role]}</span>{currentView===role?<b>✓</b>:null}
              </button>)}
            </div>
          </div>:null}
        </div>:null}
        <label className="journey-language"><span>{t.language}</span><select className="journey-locale" value={locale} onChange={event=>{const next=event.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></label>
      </div>
    </aside>

    <div className="journey-mobile-utility">
      <label className="journey-mobile-locale" aria-label={t.language}>
        <Languages size={14}/>
        <select value={locale} onChange={event=>{const next=event.target.value as AppLocale;setLocale(next);persistLocale(next)}}>
          <option value="pt-BR">PT</option>
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
      </label>
      {isRealCeo?<div className="journey-mobile-access-wrap">
        <button className="journey-mobile-access" onClick={()=>setAccessOpen(value=>!value)} aria-expanded={accessOpen}>
          <span>{displayRole}</span><ChevronDown size={14}/>
        </button>
        {accessOpen?<div className="journey-access-menu mobile">
          <div className="journey-access-real"><small>{t.realAccess}</small><strong>CEO MillionsNest</strong></div>
          <div className="journey-access-menu-title">{t.viewAs}</div>
          <div className="journey-access-options">
            {viewAsOptions.map(role=><button className={currentView===role?'active':''} key={role} onClick={()=>chooseView(role)}>
              <span>{roleLabels[locale][role]}</span>{currentView===role?<b>✓</b>:null}
            </button>)}
          </div>
        </div>:null}
      </div>:null}
    </div>

    <section className="journey-app-content">{children}</section>

    <nav className="journey-mobile-bar" aria-label="NestJourney">
      {mobile.map(item=>{
        const Icon=item.icon
        const active=sameRoute(item.href,pathname)
        return <button className={active?'active':''} key={item.href} onClick={()=>navigate(item.href)}><Icon size={19}/><span>{item.label}</span></button>
      })}
    </nav>
  </div>
}
