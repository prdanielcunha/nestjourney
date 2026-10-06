import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, MessageCircle, Send, Share2, UserPlus, X } from 'lucide-react'
import { auth } from './firebase'
import type { AppLocale } from './i18n'
import type { JourneyAccessContext } from './journeyRepository'
import {
  JOURNEY_INVITE_RESPONSIBILITIES,
  validateJourneyInvitationUrl,
  type JourneyInviteResponsibility,
  type JourneyOrganizationInviteRole,
} from './journeyInvitation'
import './JourneyInviteModal.css'

const HUB_API_BASE=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')

const responsibilityLabels:Record<AppLocale,Record<JourneyInviteResponsibility,string>>={
  'pt-BR':{member:'Sem função operacional',presence_host:'Anfitrião de Presença',mesa_team:'Equipe da Mesa',caregiver:'Cuidador',group_leader:'Líder de Casa',discipler:'Discipulador',coordinator:'Coordenador',pastor:'Pastor'},
  en:{member:'No operational responsibility',presence_host:'Presence Host',mesa_team:'Table Team',caregiver:'Caregiver',group_leader:'House Leader',discipler:'Discipler',coordinator:'Coordinator',pastor:'Pastor'},
  es:{member:'Sin responsabilidad operativa',presence_host:'Anfitrión de Presencia',mesa_team:'Equipo de la Mesa',caregiver:'Cuidador',group_leader:'Líder de Casa',discipler:'Discipulador',coordinator:'Coordinador',pastor:'Pastor'},
}
const roleLabels:Record<AppLocale,Record<JourneyOrganizationInviteRole,string>>={
  'pt-BR':{admin:'Administrador',manager:'Gestor',member:'Membro',viewer:'Visualizador'},
  en:{admin:'Administrator',manager:'Manager',member:'Member',viewer:'Viewer'},
  es:{admin:'Administrador',manager:'Gestor',member:'Miembro',viewer:'Visualizador'},
}
const copy={
  'pt-BR':{
    eyebrow:'Convite seguro',title:'Convidar para o NestJourney',
    subtitle:'Crie um link que já leva a pessoa para esta organização e aplica a função escolhida quando ela aceitar.',
    orgRole:'Nível na organização',orgRoleHelp:'Define a autoridade geral no MillionsNest. Para a maioria das pessoas, use Membro.',
    journeyRole:'Função no NestJourney',journeyRoleHelp:'Define o trabalho que a pessoa verá e poderá operar dentro do NestJourney.',
    create:'Gerar link de convite',creating:'Gerando link…',created:'Link pronto',
    singleUse:'Uso único',expires:'Expira em 7 dias',bound:'Organização e função já definidas',
    copy:'Copiar link',copied:'Copiado',whatsapp:'WhatsApp',share:'Compartilhar',another:'Gerar outro',
    close:'Fechar',error:'Não foi possível gerar o convite agora.',invalid:'O Hub retornou um link de convite inválido.',
    note:'Envie este link somente para a pessoa convidada. Depois do primeiro aceite ele não poderá ser usado novamente.',
    broad:'Administrador ou Gestor têm autoridade ampla na organização; a função do NestJourney não reduz essa autoridade.',
    shareText:'Você foi convidado para entrar no NestJourney. Abra este link para entrar na organização e concluir seu acesso:',
  },
  en:{
    eyebrow:'Secure invitation',title:'Invite to NestJourney',
    subtitle:'Create a link that sends the person to this organization and applies the selected responsibility when accepted.',
    orgRole:'Organization level',orgRoleHelp:'Defines general MillionsNest authority. Member is the right choice for most people.',
    journeyRole:'NestJourney responsibility',journeyRoleHelp:'Defines the work this person can see and operate inside NestJourney.',
    create:'Create invitation link',creating:'Creating link…',created:'Link ready',
    singleUse:'Single use',expires:'Expires in 7 days',bound:'Organization and role are preset',
    copy:'Copy link',copied:'Copied',whatsapp:'WhatsApp',share:'Share',another:'Create another',
    close:'Close',error:'The invitation could not be created right now.',invalid:'The Hub returned an invalid invitation link.',
    note:'Send this link only to the invited person. It cannot be used again after the first acceptance.',
    broad:'Administrator or Manager has broad organization authority; the NestJourney responsibility does not reduce it.',
    shareText:'You were invited to NestJourney. Open this link to join the organization and complete your access:',
  },
  es:{
    eyebrow:'Invitación segura',title:'Invitar a NestJourney',
    subtitle:'Crea un enlace que lleva a la persona a esta organización y aplica la función elegida al aceptar.',
    orgRole:'Nivel en la organización',orgRoleHelp:'Define la autoridad general en MillionsNest. Miembro es la opción correcta para la mayoría.',
    journeyRole:'Función en NestJourney',journeyRoleHelp:'Define el trabajo que la persona verá y podrá operar dentro de NestJourney.',
    create:'Generar enlace de invitación',creating:'Generando enlace…',created:'Enlace listo',
    singleUse:'Uso único',expires:'Expira en 7 días',bound:'Organización y función predefinidas',
    copy:'Copiar enlace',copied:'Copiado',whatsapp:'WhatsApp',share:'Compartir',another:'Generar otro',
    close:'Cerrar',error:'No fue posible generar la invitación ahora.',invalid:'El Hub devolvió un enlace de invitación inválido.',
    note:'Envía este enlace solamente a la persona invitada. No podrá reutilizarse después del primer acceso.',
    broad:'Administrador o Gestor tienen autoridad amplia en la organización; la función de NestJourney no reduce esa autoridad.',
    shareText:'Fuiste invitado a NestJourney. Abre este enlace para entrar en la organización y completar tu acceso:',
  },
} as const

function allowedOrganizationRoles(access:JourneyAccessContext):JourneyOrganizationInviteRole[]{
  if(access.isSystemAdmin||access.isOwner||access.organizationRole==='owner')return['admin','manager','member','viewer']
  if(access.organizationRole==='admin')return['manager','member','viewer']
  return['member','viewer']
}

export function JourneyInviteModal({access,locale,open,onClose}:{access:JourneyAccessContext;locale:AppLocale;open:boolean;onClose:()=>void}){
  const t=copy[locale]
  const allowedRoles=useMemo(()=>allowedOrganizationRoles(access),[access])
  const [organizationRole,setOrganizationRole]=useState<JourneyOrganizationInviteRole>('member')
  const [responsibility,setResponsibility]=useState<JourneyInviteResponsibility>('member')
  const [inviteUrl,setInviteUrl]=useState('')
  const [creating,setCreating]=useState(false)
  const [copied,setCopied]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>{
    if(!open)return
    setOrganizationRole(allowedRoles.includes('member')?'member':allowedRoles[0])
    setResponsibility('member');setInviteUrl('');setCreating(false);setCopied(false);setError('')
  },[open,allowedRoles])

  if(!open)return null

  async function createInvite(){
    const user=auth?.currentUser
    if(!user||creating)return
    setCreating(true);setError('');setCopied(false)
    try{
      const token=await user.getIdToken()
      const response=await fetch(`${HUB_API_BASE}/api/v1/invitations`,{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({
          organizationId:access.organizationId,
          role:organizationRole,
          mode:'link',
          targetAppId:'nestjourney',
          nestJourneyResponsibility:responsibility,
        }),
      })
      const data=await response.json().catch(()=>({}))
      if(!response.ok||data?.success!==true)throw new Error(data?.reasonCode||'INVITE_CREATE_FAILED')
      const nextUrl=typeof data?.inviteUrl==='string'?data.inviteUrl:''
      if(!validateJourneyInvitationUrl(nextUrl,access.organizationId))throw new Error('INVALID_INVITE_URL')
      setInviteUrl(nextUrl)
    }catch(cause){
      console.error(cause)
      setError(cause instanceof Error&&cause.message==='INVALID_INVITE_URL'?t.invalid:t.error)
    }finally{setCreating(false)}
  }

  async function copyLink(){
    if(!inviteUrl)return
    try{await navigator.clipboard.writeText(inviteUrl);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}
    catch{setError(t.error)}
  }
  const message=`${t.shareText}\n\n${inviteUrl}`
  const whatsappUrl=`https://wa.me/?text=${encodeURIComponent(message)}`
  async function shareLink(){
    if(!inviteUrl)return
    if(navigator.share){
      try{await navigator.share({title:'NestJourney',text:t.shareText,url:inviteUrl});return}catch(cause){
        if((cause as DOMException)?.name==='AbortError')return
      }
    }
    await copyLink()
  }

  return <div className="journey-invite-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section className="journey-invite-modal" role="dialog" aria-modal="true" aria-labelledby="journey-invite-title">
      <button className="journey-invite-close" type="button" onClick={onClose} aria-label={t.close}><X size={18}/></button>
      <div className="journey-invite-heading">
        <span className="journey-invite-icon"><UserPlus size={19}/></span>
        <div><small>{t.eyebrow}</small><h2 id="journey-invite-title">{t.title}</h2><p>{t.subtitle}</p></div>
      </div>

      {!inviteUrl?<div className="journey-invite-form">
        <label><span>{t.orgRole}</span><select value={organizationRole} onChange={event=>setOrganizationRole(event.target.value as JourneyOrganizationInviteRole)}>
          {allowedRoles.map(role=><option value={role} key={role}>{roleLabels[locale][role]}</option>)}
        </select><small>{t.orgRoleHelp}</small></label>
        <label><span>{t.journeyRole}</span><select value={responsibility} onChange={event=>setResponsibility(event.target.value as JourneyInviteResponsibility)}>
          {JOURNEY_INVITE_RESPONSIBILITIES.map(role=><option value={role} key={role}>{responsibilityLabels[locale][role]}</option>)}
        </select><small>{t.journeyRoleHelp}</small></label>
        {['admin','manager'].includes(organizationRole)?<div className="journey-invite-warning">{t.broad}</div>:null}
        {error?<div className="journey-invite-error">{error}</div>:null}
        <button className="journey-invite-primary" type="button" disabled={creating} onClick={()=>void createInvite()}><Link2 size={16}/>{creating?t.creating:t.create}</button>
      </div>:<div className="journey-invite-result">
        <div className="journey-invite-success"><Check size={18}/><div><strong>{t.created}</strong><span>{roleLabels[locale][organizationRole]} · {responsibilityLabels[locale][responsibility]}</span></div></div>
        <div className="journey-invite-badges"><span>{t.singleUse}</span><span>{t.expires}</span><span>{t.bound}</span></div>
        <div className="journey-invite-url"><input readOnly value={inviteUrl} aria-label={t.created}/><button type="button" onClick={()=>void copyLink()}><Copy size={15}/>{copied?t.copied:t.copy}</button></div>
        <div className="journey-invite-share">
          <a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16}/>{t.whatsapp}</a>
          <button type="button" onClick={()=>void shareLink()}><Share2 size={16}/>{t.share}</button>
        </div>
        <p className="journey-invite-note"><Send size={14}/>{t.note}</p>
        {error?<div className="journey-invite-error">{error}</div>:null}
        <button className="journey-invite-secondary" type="button" onClick={()=>{setInviteUrl('');setError('');setCopied(false)}}>{t.another}</button>
      </div>}
    </section>
  </div>
}
