import {useCallback,useEffect,useState} from 'react'
import {MessageCircleHeart,ShieldCheck} from 'lucide-react'
import {auth} from './firebase'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import type {AppLocale} from './i18n'
import {canManageBirthdays} from './birthdayRepository'
import './BirthdayWhatsAppConsentPanel.css'

const API=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
const phrases={
 'pt-BR':{
  title:'Felicitação de aniversário pelo WhatsApp',
  desc:'É uma autorização separada do contato comum. O envio automático depende da aprovação da Meta e do orçamento de mensagens da organização.',
  on:'Autorização registrada',off:'Ainda não autorizado',
  agree:'Confirmo que a própria pessoa (ou responsável legal) autorizou expressamente receber felicitações anuais pelo WhatsApp. Ela pode cancelar quando quiser.',
  save:'Registrar autorização',remove:'Retirar autorização',
  noContact:'Antes, registre o telefone e a autorização de contato da pessoa. A data de aniversário também precisa estar cadastrada.',
  error:'Não foi possível salvar. Confira a data de aniversário, o contato e as permissões.',
  saved:'Preferência atualizada com auditoria.',
 },
 en:{
  title:'Birthday greetings on WhatsApp',desc:'This requires separate consent. Automatic sending awaits Meta approval and an approved organizational budget.',
  on:'Consent recorded',off:'Not authorized',
  agree:'I confirm this person or legal guardian explicitly opted in to yearly WhatsApp birthday greetings and can opt out at any time.',
  save:'Save consent',remove:'Withdraw consent',
  noContact:'First record the person’s authorized phone contact and birthday.',
  error:'Could not save. Check the birthday, contact permission and access.',
  saved:'Preference saved with audit.',
 },
 es:{
  title:'Felicitaciones por WhatsApp',desc:'Requiere una autorización diferente. El envío automático depende de la aprobación de Meta y el presupuesto autorizado.',
  on:'Autorización registrada',off:'No autorizado',
  agree:'Confirmo que la persona, o responsable legal, aceptó expresamente felicitaciones anuales por WhatsApp y puede cancelarlas.',
  save:'Guardar autorización',remove:'Retirar autorización',
  noContact:'Primero registra el teléfono autorizado y el cumpleaños.',
  error:'No se pudo guardar. Verifica el cumpleaños, el contacto y los permisos.',
  saved:'Preferencia guardada con auditoría.',
 }
}
export function BirthdayWhatsAppConsentPanel({access,person,locale}:{
 access:JourneyAccessContext
 person:JourneyPersonRecord
 locale:AppLocale
}){
 const [current,setCurrent]=useState(false)
 const [accepted,setAccepted]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [info,setInfo]=useState('')
 const t=phrases[locale]
 const permitted=canManageBirthdays(access)
 const endpoint=API+'/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney/people/'+encodeURIComponent(person.id)+'/birthday-whatsapp-consent'
 const call=useCallback(async(method:'GET'|'PUT',body?:unknown)=>{
  const jwt=await auth?.currentUser?.getIdToken()
  if(!jwt)throw Error('UNAUTHENTICATED')
  const resp=await fetch(endpoint,{
    method,cache:'no-store',
    headers:{Authorization:'Bearer '+jwt,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
  })
  const data=await resp.json().catch(()=>({}))
  if(!resp.ok||data.success!==true)throw Error('API_FAILED')
  return data
 },[endpoint])
 useEffect(()=>{
  if(!permitted)return
  let active=true
  setLoading(true)
  void call('GET').then(data=>{if(active)setCurrent(data.optedIn===true)})
    .catch(()=>{if(active)setError(t.error)})
    .finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[call,permitted,t.error])
 const change=async(optedIn:boolean)=>{
  if(busy||(optedIn&&!accepted))return
  setBusy(true);setError('');setInfo('')
  try{
    const result=await call('PUT',{optedIn,permissionConfirmed:optedIn&&accepted})
    setCurrent(result.optedIn===true);setAccepted(false);setInfo(t.saved)
  }catch{setError(t.error)}
  finally{setBusy(false)}
 }
 if(!permitted)return null
 const ready=person.consent===true&&Boolean(person.phone?.trim())
 return <section className="birthday-whatsapp-consent">
  <div className="birthday-whatsapp-heading"><MessageCircleHeart size={20}/><div>
   <h3>{t.title}</h3><p>{t.desc}</p><strong>{loading?'…':current?t.on:t.off}</strong>
  </div></div>
  {!ready?<p className="birthday-whatsapp-help">{t.noContact}</p>:current?
   <button type="button" disabled={busy||loading} onClick={()=>void change(false)}>{t.remove}</button>:
   <><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>{t.agree}</span></label>
   <button type="button" disabled={busy||loading||!accepted} onClick={()=>void change(true)}>{t.save}</button></>}
  {error?<p role="alert" className="birthday-whatsapp-error">{error}</p>:null}
  {info?<p role="status" className="birthday-whatsapp-info">{info}</p>:null}
  <small><ShieldCheck size={14}/>O cadastro desta autorização não efetua nenhum envio pago.</small>
 </section>
}
