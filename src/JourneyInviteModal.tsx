import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, MessageCircle, Share2, ShieldCheck, UserPlus, X } from 'lucide-react'
import { auth } from './firebase'
import type { AppLocale } from './i18n'
import type { JourneyAccessContext } from './journeyRepository'
import { validateJourneyInvitationUrl, type JourneyOrganizationInviteRole } from './journeyInvitation'
import {
  SERVICE_FRONTS, SERVICE_WORK_FRONTS, SERVICE_TEAM_ROLES,
  SERVICE_FRONT_LABELS, SERVICE_TEAM_ROLE_LABELS, DEFAULT_SERVICE_TEAM,
  legacyResponsibilityForTeam, parseJourneyServiceTeam,
  type JourneyServiceTeam, type ServiceFront, type ServiceTeamRole, type WorkFront,
} from './journeyServiceTeams'
import './JourneyInviteModal.css'

const HUB_API_BASE=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
const roleLabels:Record<AppLocale,Record<JourneyOrganizationInviteRole,string>>={
  'pt-BR':{admin:'Administrador',manager:'Gestor',member:'Membro',viewer:'Visualizador'},
  en:{admin:'Administrator',manager:'Manager',member:'Member',viewer:'Viewer'},
  es:{admin:'Administrador',manager:'Gestor',member:'Miembro',viewer:'Visualizador'},
}
const messages={
  'pt-BR':{
    eyebrow:'Convite seguro',title:'Convidar para servir',subtitle:'Defina onde a pessoa vai servir. Acesso e liderança serão limitados ao papel autorizado.',
    area:'Frente principal',role:'Papel na equipe',help:'Onde também pode ajudar?',helpHint:'São áreas de disponibilidade, não permissões para ver dados ou liderar.',
    allSupport:'Sem seleção: disponível para qualquer frente, sempre por solicitação.',
    other:'Qual função?',advanced:'Acesso administrativo (avançado)',orgRole:'Cargo no MillionsNest',
    orgHint:'Para voluntários, mantenha Membro. Cargos administrativos afetam outros módulos da organização.',
    restricted:'Apoio Geral não possui cargo de líder. Escolha outro papel.',
    create:'Gerar convite individual',creating:'Gerando…',created:'Convite pronto',invalid:'O MillionsNest retornou um link inválido.',
    error:'Não foi possível criar o convite agora. Confira as permissões e tente novamente.',
    copy:'Copiar',copied:'Copiado',whatsapp:'WhatsApp',share:'Compartilhar',another:'Novo convite',
    close:'Fechar',once:'Uso único',expires:'7 dias',bound:'Equipe definida',
    note:'Envie o link apenas à pessoa convidada. Não concede acesso geral às frentes marcadas como apoio.',
    shareText:'Você foi convidado(a) para servir no NestJourney. Entre por este link individual:',
    safe:'Permissões sempre verificadas pelo MillionsNest',
  },
  en:{
    eyebrow:'Secure invitation',title:'Invite to serve',subtitle:'Choose where someone will serve. Leadership and access follow authorized roles.',
    area:'Primary team',role:'Team role',help:'Where else can they help?',helpHint:'Availability only; not permission to view private data or lead.',
    allSupport:'No selection: available across all teams when requested.',
    other:'Specify function',advanced:'Administrative access (advanced)',orgRole:'MillionsNest organization role',
    orgHint:'Keep Member for volunteers. Administrative roles affect the wider organization.',
    restricted:'General Support cannot be a leader.',create:'Create personal link',creating:'Creating…',created:'Invitation ready',
    invalid:'MillionsNest returned an invalid URL.',error:'Could not create invitation. Check permissions and retry.',
    copy:'Copy',copied:'Copied',whatsapp:'WhatsApp',share:'Share',another:'New invitation',
    close:'Close',once:'One use',expires:'7 days',bound:'Team preassigned',
    note:'Send to the invited person only. Support teams do not grant broad data access.',
    shareText:'You are invited to serve in NestJourney. Use this personal link:',safe:'Access verified by MillionsNest',
  },
  es:{
    eyebrow:'Invitación segura',title:'Invitar a servir',subtitle:'Define dónde servirá la persona. El liderazgo y acceso requieren autorización.',
    area:'Equipo principal',role:'Papel en el equipo',help:'¿Dónde más puede ayudar?',helpHint:'Disponibilidad, no acceso a datos privados ni liderazgo.',
    allSupport:'Sin selección: disponible para todos los equipos bajo solicitud.',
    other:'Indica la función',advanced:'Acceso administrativo (avanzado)',orgRole:'Cargo en MillionsNest',
    orgHint:'Mantén Miembro para voluntarios. Otros cargos afectan toda la organización.',
    restricted:'Apoyo General no puede tener papel de líder.',create:'Crear enlace individual',creating:'Creando…',created:'Invitación lista',
    invalid:'MillionsNest devolvió un enlace inválido.',error:'No fue posible crear la invitación. Revisa los permisos.',
    copy:'Copiar',copied:'Copiado',whatsapp:'WhatsApp',share:'Compartir',another:'Nueva invitación',
    close:'Cerrar',once:'Un uso',expires:'7 días',bound:'Equipo definido',
    note:'Envía el enlace solo al invitado. Apoyo no concede acceso general a datos.',
    shareText:'Te han invitado a servir en NestJourney. Usa este enlace individual:',safe:'Acceso verificado por MillionsNest',
  },
} as const

function allowedRoles(access:JourneyAccessContext):JourneyOrganizationInviteRole[]{
  if(access.isSystemAdmin||access.isOwner||access.organizationRole==='owner')return ['member','viewer','manager','admin']
  if(access.organizationRole==='admin')return ['member','viewer','manager']
  return ['member','viewer']
}

export function JourneyInviteModal({access,locale,open,onClose}:{access:JourneyAccessContext;locale:AppLocale;open:boolean;onClose:()=>void}){
  const t=messages[locale]
  const allowed=useMemo(()=>allowedRoles(access),[access])
  const canInviteLeader=access.isSystemAdmin||access.isOwner||['owner','admin'].includes(access.organizationRole)
  const [organizationRole,setOrganizationRole]=useState<JourneyOrganizationInviteRole>('member')
  const [team,setTeam]=useState<JourneyServiceTeam>({...DEFAULT_SERVICE_TEAM})
  const [inviteUrl,setInviteUrl]=useState('')
  const [creating,setCreating]=useState(false)
  const [copied,setCopied]=useState(false)
  const [error,setError]=useState('')
  useEffect(()=>{
    if(!open)return
    setOrganizationRole('member')
    setTeam({...DEFAULT_SERVICE_TEAM,supportAreas:[]})
    setInviteUrl('');setCreating(false);setCopied(false);setError('')
  },[open])

  if(!open)return null
  const validTeam=parseJourneyServiceTeam(team)
  const frontendRole=validTeam?legacyResponsibilityForTeam(validTeam):'member'
  const roleOptions=SERVICE_TEAM_ROLES.filter(role=>role!=='leader'||(team.primaryArea!=='support'&&canInviteLeader))
  const assignableOrgRoles=team.teamRole==='leader'?allowed:allowed.filter(role=>role==='member'||role==='viewer')
  function updateTeam(next:Partial<JourneyServiceTeam>){
    setTeam(current=>({...current,...next}))
    if (next.teamRole && next.teamRole !== 'leader') setOrganizationRole('member')
    setError('')
  }
  function setFront(front:ServiceFront){
    setTeam(current=>({...current,primaryArea:front,teamRole:front==='support'&&current.teamRole==='leader'?'auxiliary':current.teamRole,supportAreas:current.supportAreas.filter(area=>area!==front)}))
    if (front==='support') setOrganizationRole('member')
    setError('')
  }
  function toggleSupport(front:WorkFront){
    setTeam(current=>({...current,supportAreas:current.supportAreas.includes(front)?current.supportAreas.filter(x=>x!==front):[...current.supportAreas,front]}))
  }

  async function createInvite(){
    const user=auth?.currentUser
    if(!user||creating||!validTeam||!assignableOrgRoles.includes(organizationRole))return
    setCreating(true);setError('');setCopied(false)
    try{
      const idToken=await user.getIdToken()
      const response=await fetch(`${HUB_API_BASE}/api/v1/invitations`,{
        method:'POST',
        headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          organizationId:access.organizationId,role:organizationRole,mode:'link',
          targetAppId:'nestjourney',nestJourneyResponsibility:frontendRole,nestJourneyTeam:validTeam,
        }),
      })
      const data=await response.json().catch(()=>({}))
      if(!response.ok||data?.success!==true)throw new Error(data?.reasonCode||'INVITE_CREATE_FAILED')
      const url=typeof data.inviteUrl==='string'?data.inviteUrl:''
      if(!validateJourneyInvitationUrl(url,access.organizationId))throw new Error('INVALID_INVITE_URL')
      setInviteUrl(url)
    }catch(cause){
      console.error('NestJourney invite failed',cause instanceof Error?cause.message:'unknown')
      setError(cause instanceof Error&&cause.message==='INVALID_INVITE_URL'?t.invalid:t.error)
    }finally{setCreating(false)}
  }
  async function copyLink(){
    if(!inviteUrl)return
    try{await navigator.clipboard.writeText(inviteUrl);setCopied(true)}catch{setError(t.error)}
  }
  const teamDescription=`${SERVICE_FRONT_LABELS[locale][team.primaryArea]} · ${SERVICE_TEAM_ROLE_LABELS[locale][team.teamRole]}`
  const shareText=`${t.shareText}\n${teamDescription}\n\n${inviteUrl}`
  const whatsappUrl=`https://wa.me/?text=${encodeURIComponent(shareText)}`
  async function shareLink(){
    if(!inviteUrl)return
    if(navigator.share)try{await navigator.share({title:'NestJourney',text:t.shareText,url:inviteUrl});return}catch(cause){
      if((cause as DOMException)?.name==='AbortError')return
    }
    await copyLink()
  }

  return <div className="journey-invite-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="journey-invite-modal" role="dialog" aria-modal="true" aria-labelledby="journey-invite-title">
      <button className="journey-invite-close" type="button" onClick={onClose} aria-label={t.close}><X size={18}/></button>
      <div className="journey-invite-heading"><span className="journey-invite-icon"><UserPlus size={19}/></span>
        <div><small>{t.eyebrow}</small><h2 id="journey-invite-title">{t.title}</h2><p>{t.subtitle}</p></div>
      </div>
      {!inviteUrl?<div className="journey-invite-form">
        <label><span>{t.area}</span><select value={team.primaryArea} disabled={creating} onChange={event=>setFront(event.target.value as ServiceFront)}>
          {SERVICE_FRONTS.map(front=><option key={front} value={front}>{SERVICE_FRONT_LABELS[locale][front]}</option>)}
        </select></label>
        <label><span>{t.role}</span><select value={team.teamRole} disabled={creating} onChange={event=>updateTeam({teamRole:event.target.value as ServiceTeamRole,otherLabel:undefined})}>
          {roleOptions.map(role=><option key={role} value={role}>{SERVICE_TEAM_ROLE_LABELS[locale][role]}</option>)}
        </select></label>
        {team.teamRole==='other'?<label><span>{t.other}</span><input className="journey-invite-textinput" maxLength={80} value={team.otherLabel||''} onChange={event=>updateTeam({otherLabel:event.target.value})}/></label>:null}
        <div className="journey-invite-support">
          <strong>{t.help}</strong><small>{t.helpHint}</small>
          <div className="journey-invite-support-options">
            {SERVICE_WORK_FRONTS.filter(front=>front!==team.primaryArea).map(front=><label key={front}>
              <input type="checkbox" checked={team.supportAreas.includes(front)} onChange={()=>toggleSupport(front)} disabled={creating}/>
              <span>{SERVICE_FRONT_LABELS[locale][front]}</span>
            </label>)}
          </div>
          {team.primaryArea==='support'&&!team.supportAreas.length?<small>{t.allSupport}</small>:null}
        </div>
        <details className="journey-invite-advanced"><summary>{t.advanced}</summary>
          <label><span>{t.orgRole}</span><select value={organizationRole} onChange={event=>setOrganizationRole(event.target.value as JourneyOrganizationInviteRole)} disabled={creating}>
            {assignableOrgRoles.map(role=><option key={role} value={role}>{roleLabels[locale][role]}</option>)}
          </select><small>{t.orgHint}</small></label>
        </details>
        {organizationRole==='admin'||organizationRole==='manager'?<div className="journey-invite-warning">{t.orgHint}</div>:null}
        {team.primaryArea==='support'&&team.teamRole==='leader'?<div className="journey-invite-error">{t.restricted}</div>:null}
        {error?<div className="journey-invite-error">{error}</div>:null}
        <button className="journey-invite-primary" type="button" disabled={creating||!validTeam||!assignableOrgRoles.includes(organizationRole)} onClick={()=>void createInvite()}><Link2 size={16}/>{creating?t.creating:t.create}</button>
        <p className="journey-invite-note"><ShieldCheck size={14}/>{t.safe}</p>
      </div>:<div className="journey-invite-result">
        <div className="journey-invite-success"><Check size={18}/><div><strong>{t.created}</strong><span>{teamDescription} · {roleLabels[locale][organizationRole]}</span></div></div>
        <div className="journey-invite-badges"><span>{t.once}</span><span>{t.expires}</span><span>{t.bound}</span></div>
        <div className="journey-invite-url"><input readOnly value={inviteUrl} aria-label={t.created}/><button type="button" onClick={()=>void copyLink()}><Copy size={15}/>{copied?t.copied:t.copy}</button></div>
        <div className="journey-invite-share"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16}/>{t.whatsapp}</a>
          <button type="button" onClick={()=>void shareLink()}><Share2 size={16}/>{t.share}</button></div>
        <p className="journey-invite-note"><ShieldCheck size={14}/>{t.note}</p>
        <button className="journey-invite-secondary" type="button" onClick={()=>{setInviteUrl('');setError('');setCopied(false)}}>{t.another}</button>
      </div>}
    </section>
  </div>
}
