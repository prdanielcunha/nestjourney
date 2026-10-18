import {useCallback,useEffect,useState} from 'react'
import {CalendarRange,Link2,Copy,ShieldCheck,Trash2,RefreshCw} from 'lucide-react'
import {auth} from './firebase'
import type {JourneyAccessContext} from './journeyRepository'
import type {AppLocale} from './i18n'
import './BirthdayCalendarSubscriptionPanel.css'

const API=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
type Feed={id:string;congregationId:string;createdBy:string;createdAtMs:number|null}
const translations={
 'pt-BR':{
   title:'Agenda que se mantém atualizada',description:'Assine um calendário privado desta congregação. Novos aniversários autorizados aparecem quando seu aplicativo de agenda atualiza a assinatura.',
   enable:'Criar assinatura',permission:'Estou ciente de que o aplicativo de agenda escolhido receberá nomes e datas dos aniversários compartilhados com a equipe. Guardarei o link de forma privada.',
   copy:'Copiar endereço',copied:'Endereço copiado.',revoke:'Revogar',subscriptions:'Assinaturas ativas',none:'Nenhuma assinatura ativa.',
   how:'Apple Agenda: Arquivo > Nova assinatura de calendário. Google Agenda: Outras agendas > Adicionar pelo URL. Outlook: Adicionar calendário > Assinar pela Web.',
   note:'Os provedores escolhem a frequência de atualização; a sincronização não é instantânea. Revogar o link impede novas leituras, mas não apaga eventos que outra agenda já armazenou.',
   error:'Não foi possível concluir. Confira a conexão e seu acesso.',revoked:'A assinatura foi revogada.',
 },
 en:{
   title:'Calendar that stays updated',description:'Subscribe to this campus private calendar. Consented birthdays update whenever your calendar refreshes the feed.',
   enable:'Create subscription',permission:'I understand my calendar provider receives names and dates of team-shared birthdays, and I will protect this private link.',
   copy:'Copy subscription URL',copied:'Link copied.',revoke:'Revoke',subscriptions:'Active subscriptions',none:'No active subscriptions.',
   how:'Apple Calendar: File > New Calendar Subscription. Google Calendar: Other calendars > From URL. Outlook: Add calendar > Subscribe from web.',
   note:'Providers set their own refresh interval. Revoking blocks future access but does not erase cached events.',
   error:'Could not complete this action.',revoked:'Subscription revoked.',
 },
 es:{
   title:'Agenda siempre actualizada',description:'Suscríbete al calendario privado de esta congregación. Las fechas autorizadas se actualizan cuando tu proveedor consulta la suscripción.',
   enable:'Crear suscripción',permission:'Entiendo que mi proveedor de calendario recibirá nombres y fechas compartidas con el equipo. Protegeré este enlace.',
   copy:'Copiar enlace',copied:'Enlace copiado.',revoke:'Revocar',subscriptions:'Suscripciones activas',none:'Ninguna suscripción activa.',
   how:'Apple Calendario: Archivo > Nueva suscripción. Google Calendar: Otras agendas > Desde URL. Outlook: Agregar calendario > Suscribirse desde web.',
   note:'El proveedor determina cuándo actualiza. Revocar impide nuevas consultas pero no borra eventos guardados.',
   error:'No se pudo completar.',revoked:'Suscripción revocada.',
 }
}
export function BirthdayCalendarSubscriptionPanel({access,congregationId,locale}:{
  access:JourneyAccessContext
  congregationId:string
  locale:AppLocale
}){
 const t=translations[locale]
 const [disclosure,setDisclosure]=useState(false)
 const [url,setUrl]=useState('')
 const [feeds,setFeeds]=useState<Feed[]>([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [info,setInfo]=useState('')
 const base='/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney'
 const call=useCallback(async(path:string,init?:RequestInit)=>{
   const token=await auth?.currentUser?.getIdToken()
   if(!token)throw Error('NO_SESSION')
   const response=await fetch(API+path,{
     ...init,cache:'no-store',
     headers:{Authorization:'Bearer '+token,...(init?.body?{'Content-Type':'application/json'}:{}),...init?.headers},
   })
   const data=await response.json().catch(()=>({}))
   if(!response.ok||data.success!==true)throw Error(String(data.reasonCode||'API_FAILED'))
   return data
 },[])
 const refresh=useCallback(async()=>{
   const data=await call(base+'/calendar-feeds')
   setFeeds((data.feeds||[]) as Feed[])
 },[base,call])
 useEffect(()=>{
   let active=true
   void refresh().catch(()=>{if(active)setFeeds([])})
   return()=>{active=false}
 },[refresh])
 const create=async()=>{
   if(!disclosure||!congregationId)return
   setBusy(true);setError('');setInfo('')
   try{
     const result=await call(base+'/calendar-feed',{method:'POST',body:JSON.stringify({congregationId,calendarDisclosureAccepted:true})})
     setUrl(String(result.url||''));setDisclosure(false)
     await refresh()
   }catch{setError(t.error)}finally{setBusy(false)}
 }
 const revoke=async(feed:Feed)=>{
   if(!window.confirm(t.revoke+'?'))return
   setBusy(true);setError('');setInfo('')
   try{
     await call(base+'/calendar-feed/revoke',{method:'POST',body:JSON.stringify({feedId:feed.id})})
     setUrl('');await refresh();setInfo(t.revoked)
   }catch{setError(t.error)}finally{setBusy(false)}
 }
 const current=feeds.filter(f=>f.congregationId===congregationId)
 return <section className="birthday-sync">
   <header><span className="birthday-sync-icon"><RefreshCw size={21}/></span><div><h2>{t.title}</h2><p>{t.description}</p></div></header>
   <label className="birthday-sync-consent"><input type="checkbox" checked={disclosure} onChange={e=>setDisclosure(e.target.checked)}/><span>{t.permission}</span></label>
   <button type="button" className="birthday-sync-action" disabled={busy||!disclosure} onClick={()=>void create()}><Link2 size={15}/>{t.enable}</button>
   {url?<div className="birthday-sync-url"><input aria-label="Private calendar URL" readOnly value={url}/><button type="button" onClick={()=>void navigator.clipboard.writeText(url).then(()=>setInfo(t.copied)).catch(()=>setError(t.error))}><Copy size={15}/>{t.copy}</button></div>:null}
   {info?<p role="status" className="birthday-sync-info">{info}</p>:null}
   {error?<p role="alert" className="birthday-sync-error">{error}</p>:null}
   <p className="birthday-sync-how"><CalendarRange size={16}/>{t.how}</p>
   <h3>{t.subscriptions} · {current.length}</h3>
   <div className="birthday-sync-feeds">{current.length?current.map(f=><div key={f.id}>
     <span>{f.createdAtMs?new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(f.createdAtMs):'—'}</span>
     <button type="button" disabled={busy} onClick={()=>void revoke(f)}><Trash2 size={14}/>{t.revoke}</button>
   </div>):<p>{t.none}</p>}</div>
   <footer><ShieldCheck size={16}/><span>{t.note}</span></footer>
 </section>
}
