import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { auth } from './firebase'
import { getInitialLocale, type AppLocale } from './i18n'
import { getJourneyInvitationOrganizationId } from './journeyInvitation'
import './JourneyJoinPage.css'

const HUB_API_BASE=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')

const copy={
  'pt-BR':{
    joining:'Confirmando seu convite…',joiningHelp:'Estamos vinculando sua conta à organização e preparando seu acesso no NestJourney.',
    success:'Acesso confirmado',successHelp:'Tudo certo. Abrindo seu espaço no NestJourney…',
    invalid:'Este link de convite não é válido.',expired:'Este convite expirou ou já foi utilizado.',
    denied:'Este convite não pode ser usado por esta conta.',failed:'Não foi possível aceitar o convite agora.',
    back:'Ir para o NestJourney',security:'O convite é validado pelo MillionsNest e usado uma única vez.',
  },
  en:{
    joining:'Confirming your invitation…',joiningHelp:'We are linking your account to the organization and preparing your NestJourney access.',
    success:'Access confirmed',successHelp:'All set. Opening your NestJourney workspace…',
    invalid:'This invitation link is not valid.',expired:'This invitation expired or has already been used.',
    denied:'This invitation cannot be used by this account.',failed:'The invitation could not be accepted right now.',
    back:'Go to NestJourney',security:'The invitation is validated by MillionsNest and can be used only once.',
  },
  es:{
    joining:'Confirmando tu invitación…',joiningHelp:'Estamos vinculando tu cuenta a la organización y preparando tu acceso en NestJourney.',
    success:'Acceso confirmado',successHelp:'Todo listo. Abriendo tu espacio en NestJourney…',
    invalid:'Este enlace de invitación no es válido.',expired:'Esta invitación expiró o ya fue utilizada.',
    denied:'Esta invitación no puede ser usada por esta cuenta.',failed:'No fue posible aceptar la invitación ahora.',
    back:'Ir a NestJourney',security:'La invitación es validada por MillionsNest y se usa una sola vez.',
  },
} as const

function messageFor(reason:string,t:(typeof copy)[AppLocale]){
  if(['INVITE_EXPIRED','INVITE_ALREADY_CONSUMED','INVITE_MAX_USES_REACHED','INVITE_NOT_FOUND'].includes(reason))return t.expired
  if(['INVITE_IDENTITY_MISMATCH','PERMISSION_DENIED'].includes(reason))return t.denied
  if(['INVALID_TOKEN','INVALID_ORGANIZATION_ID','INVITE_STATE_INCONSISTENT'].includes(reason))return t.invalid
  return t.failed
}

export default function JourneyJoinPage(){
  const locale=getInitialLocale()
  const t=copy[locale]
  const [state,setState]=useState<'joining'|'success'|'error'>('joining')
  const [message,setMessage]=useState<string>(t.joiningHelp)

  useEffect(()=>{
    let disposed=false
    const organizationId=getJourneyInvitationOrganizationId(window.location.pathname)
    const token=new URLSearchParams(window.location.search).get('token')||''
    const user=auth?.currentUser
    if(!organizationId||!token||!user){setState('error');setMessage(t.invalid);return}

    void (async()=>{
      try{
        const idToken=await user.getIdToken()
        const response=await fetch(`${HUB_API_BASE}/api/v1/invitations/accept`,{
          method:'POST',
          headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},
          body:JSON.stringify({token,organizationId}),
        })
        const data=await response.json().catch(()=>({}))
        if(!response.ok||data?.success!==true)throw new Error(data?.reasonCode||'INVITE_ACCEPT_FAILED')
        if(disposed)return
        try{
          sessionStorage.setItem('mn_ecosystem_org_id',organizationId)
          localStorage.setItem('mn_nestjourney_last_org_id',organizationId)
        }catch{}
        window.history.replaceState({},'',`/join/${encodeURIComponent(organizationId)}`)
        setState('success');setMessage(t.successHelp)
        window.setTimeout(()=>window.location.replace('/my-today'),650)
      }catch(cause){
        if(disposed)return
        setState('error');setMessage(messageFor(cause instanceof Error?cause.message:'',t))
      }
    })()
    return()=>{disposed=true}
  },[t])

  return <main className="journey-join-page"><section className="journey-join-card">
    <img src="/brand/nestjourney-horizontal-light.png" alt="NestJourney"/>
    <div className={'journey-join-state '+state}>
      {state==='joining'?<LoaderCircle className="journey-join-spinner" size={30}/>:state==='success'?<CheckCircle2 size={30}/>:<CircleAlert size={30}/>}
      <h1>{state==='joining'?t.joining:state==='success'?t.success:message}</h1>
      <p>{state==='error'?t.security:message}</p>
    </div>
    {state==='error'?<button type="button" onClick={()=>window.location.assign('/')}>{t.back}</button>:null}
    <small><ShieldCheck size={13}/>{t.security}</small>
  </section></main>
}
