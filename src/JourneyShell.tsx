import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3, CircleHelp, Eye, HeartHandshake, House, Leaf, LayoutGrid, ListTodo,
  MoreHorizontal, Settings2, UserCheck, Users, UsersRound,
} from 'lucide-react'
import { auth } from './firebase'
import { getActiveJourneyOrganizationId, loadJourneyAccess, type JourneyAccessContext } from './journeyRepository'
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
    tagline:'cuidado em cada passo',primary:'Principal',today:'Hoje',todayDesc:'O que depende de você agora',
    people:'Pessoas',peopleDesc:'Cadastro, busca e jornada permitida',areas:'Áreas',areasDesc:'As cinco frentes operacionais',
    vision:'Visão',visionDesc:'Coordenação, pastoral, gestão e CEO',more:'Mais',moreDesc:'Gestão, implantação e ajustes',
    presence:'Presença',presenceDesc:'Cultos, visitantes e vínculo',table:'Mesa Aberta',tableDesc:'Convidados e participação',
    care:'Cuidado & Conexão',careDesc:'Contato em 24–48h e próximos passos',groups:'Casas de Paz',groupsDesc:'Casas, participantes e operação',
    root:'Raiz',rootDesc:'Discipulado inicial 1–7',available:'Disponível',restricted:'Sem acesso neste papel',
    language:'Idioma',role:'Seu acesso',
  },
  en:{
    tagline:'care at every step',primary:'Main',today:'Today',todayDesc:'What depends on you now',
    people:'People',peopleDesc:'Profile, search, and permitted journey',areas:'Areas',areasDesc:'The five operational fronts',
    vision:'Vision',visionDesc:'Coordination, pastoral, management, and CEO',more:'More',moreDesc:'Management, implementation, and settings',
    presence:'Presence',presenceDesc:'Services, visitors, and relationship',table:'Open Table',tableDesc:'Guests and participation',
    care:'Care & Connection',careDesc:'24–48h contact and next steps',groups:'Peace Houses',groupsDesc:'Houses, participants, and operations',
    root:'Root',rootDesc:'Initial discipleship 1–7',available:'Available',restricted:'Not available for this role',
    language:'Language',role:'Your access',
  },
  es:{
    tagline:'cuidado en cada paso',primary:'Principal',today:'Hoy',todayDesc:'Lo que depende de ti ahora',
    people:'Personas',peopleDesc:'Registro, búsqueda y jornada permitida',areas:'Áreas',areasDesc:'Los cinco frentes operativos',
    vision:'Visión',visionDesc:'Coordinación, pastoral, gestión y CEO',more:'Más',moreDesc:'Gestión, implementación y configuración',
    presence:'Presencia',presenceDesc:'Cultos, visitantes y vínculo',table:'Mesa Abierta',tableDesc:'Invitados y participación',
    care:'Cuidado & Conexión',careDesc:'Contacto en 24–48h y próximos pasos',groups:'Casas de Paz',groupsDesc:'Casas, participantes y operación',
    root:'Raíz',rootDesc:'Discipulado inicial 1–7',available:'Disponible',restricted:'Sin acceso en este papel',
    language:'Idioma',role:'Tu acceso',
  },
} as const

function sameRoute(href:string,pathname:string){
  if(href==='/my-today')return pathname==='/'||pathname==='/my-today'
  if(href==='/areas')return pathname==='/areas'||['/presence-assist','/mesa-runtime','/care-integrity','/groups-runtime','/discipleship-runtime'].includes(pathname)
  if(href==='/more')return pathname==='/more'||['/team-runtime','/implementation-runtime','/reports','/governance-runtime','/settings-runtime','/help'].includes(pathname)
  return pathname===href
}

export function JourneyShell({children}:{children:ReactNode}){
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const [pathname,setPathname]=useState(()=>window.location.pathname)
  const {labels}=useJourneyLabels()
  const t=copy[locale]

  useEffect(()=>{
    const syncPath=()=>setPathname(window.location.pathname)
    window.addEventListener('popstate',syncPath)
    return()=>window.removeEventListener('popstate',syncPath)
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
    return <button key={item.href} className={(sameRoute(item.href,pathname)?'active ':'')+(enabled?'':'disabled')} onClick={()=>navigate(item.href,enabled)}>
      <span className="journey-nav-icon"><Icon size={17}/></span>
      <span className="journey-nav-copy"><strong>{item.label}</strong><small>{enabled?item.description:t.restricted}</small></span>
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
    :{href:'/help',label:locale==='en'?'Help':locale==='es'?'Ayuda':'Ajuda',icon:CircleHelp}
  const mobileCandidates=[
    {href:'/my-today',label:t.today,icon:ListTodo},
    mobileSecond,
    {href:'/areas',label:t.areas,icon:LayoutGrid},
    mobileFourth,
    {href:'/more',label:t.more,icon:MoreHorizontal},
  ]
  const mobile=mobileCandidates.filter((item,index,items)=>items.findIndex(candidate=>candidate.href===item.href)===index)

  return <div className="journey-app-frame">
    <aside className="journey-side-nav">
      <button className="journey-side-brand" onClick={()=>navigate('/my-today')}>
        <img src="/icon.svg" alt=""/>
        <span><strong>NestJourney</strong><small>{t.tagline}</small></span>
      </button>

      <nav aria-label="NestJourney">
        <section className="journey-nav-group">
          <span className="journey-nav-label">{t.primary}</span>
          {visiblePrimary.map(renderItem)}
        </section>

        <section className="journey-nav-group">
          <button className={sameRoute('/areas',pathname)?'active section-link':''} onClick={()=>navigate('/areas')}>
            <span className="journey-nav-icon"><LayoutGrid size={17}/></span>
            <span className="journey-nav-copy"><strong>{t.areas}</strong><small>{t.areasDesc}</small></span>
          </button>
          <div className="journey-nav-children">{visibleAreas.map(renderItem)}</div>
        </section>

        <section className="journey-nav-group">
          <button className={sameRoute('/more',pathname)?'active section-link':''} onClick={()=>navigate('/more')}>
            <span className="journey-nav-icon"><MoreHorizontal size={17}/></span>
            <span className="journey-nav-copy"><strong>{t.more}</strong><small>{t.moreDesc}</small></span>
          </button>
        </section>
      </nav>

      <div className="journey-side-footer">
        {access?<div className="journey-access-chip"><Settings2 size={14}/><span><small>{t.role}</small><strong>{access.isSystemAdmin?'CEO MillionsNest':access.isOwner?'Owner':access.role||'member'}</strong></span></div>:null}
        <label className="journey-language"><span>{t.language}</span><select className="journey-locale" value={locale} onChange={event=>{const next=event.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option value={id} key={id}>{localeLabels[id]}</option>)}</select></label>
      </div>
    </aside>

    <section className="journey-app-content">{children}</section>

    <nav className="journey-mobile-bar" aria-label="NestJourney">
      {mobile.map(item=>{
        const Icon=item.icon
        return <button className={sameRoute(item.href,pathname)?'active':''} key={item.href} onClick={()=>navigate(item.href)}><Icon size={19}/><span>{item.label}</span></button>
      })}
    </nav>
  </div>
}
