import {useCallback,useEffect,useState} from 'react'
import {ClipboardCopy,Link2,UserRoundPlus,ShieldCheck} from 'lucide-react'
import {auth} from './firebase'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import type {AppLocale} from './i18n'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import './JourneyIntakeAdminPanel.css'

const API=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
type Intake={id:string;name:string;phone:string;congregationId:string;consentContact:boolean;createdAtMs:number|null}
type IntakeLink={id:string;congregationId:string;congregationName:string;expiresAtMs:number;submissionsCount:number;maxSubmissions:number}
export function JourneyIntakeAdminPanel({access,congregationId,people,locale,onIntegrated}:{
  access:JourneyAccessContext
  congregationId:string
  people:JourneyPersonRecord[]
  locale:AppLocale
  onIntegrated:()=>Promise<void>
}){
  const [requests,setRequests]=useState<Intake[]>([])
  const [links,setLinks]=useState<IntakeLink[]>([])
  const [nextCursor,setNextCursor]=useState<string|null>(null)
  const [url,setUrl]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [info,setInfo]=useState('')
  const [existing,setExisting]=useState<Record<string,string>>({})
  const canManage=canImportJourneyMembers(access)
  const t=locale==='en'?{
    title:'Public registration',about:'Share a secure link for this campus. New submissions wait for your approval.',
    create:'Create registration link',copy:'Copy link',requests:'Pending for review',approve:'Review and integrate',new:'Register as a new visitor',empty:'No pending records here.',
    notice:'A submission never grants an app login or confirms attendance.',done:'Registration integrated.',
    failure:'Could not complete the action. Check connection and access.',
  }:locale==='es'?{
    title:'Registro mediante enlace',about:'Comparte un enlace seguro de esta sede. Cada solicitud necesita revisión.',
    create:'Crear enlace',copy:'Copiar enlace',requests:'Solicitudes pendientes',approve:'Revisar e integrar',new:'Registrar como visitante nuevo',empty:'No hay solicitudes pendientes.',
    notice:'Enviar los datos no crea una cuenta ni confirma presencia.',done:'Registro integrado.',
    failure:'No se pudo completar. Comprueba la conexión y el acceso.',
  }:{
    title:'Cadastro por link',about:'Crie um link desta congregação para a própria pessoa preencher nome e telefone. A equipe confere antes de cadastrar.',
    create:'Gerar link desta igreja',copy:'Copiar link',requests:'Aguardando conferência',approve:'Conferir e integrar',new:'Criar novo cadastro de visitante',empty:'Nenhum cadastro pendente nesta unidade.',
    notice:'O link não cria login MillionsNest nem registra presença automaticamente.',done:'Cadastro integrado.',
    failure:'Não foi possível concluir. Verifique conexão, autorizações e se a pessoa já está cadastrada.',
  }
  const call=useCallback(async(path:string,options?:RequestInit)=>{
    const token=await auth?.currentUser?.getIdToken()
    if(!token)throw Error('UNAUTHENTICATED')
    const response=await fetch(API+path,{...options,cache:'no-store',headers:{
      Authorization:'Bearer '+token,...(options?.body?{'Content-Type':'application/json'}:{}),...options?.headers,
    }})
    const data=await response.json().catch(()=>({}))
    if(!response.ok||data.success!==true)throw Error(data.reasonCode||'API_FAILED')
    return data
  },[])
  const base='/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney'
  const reload=useCallback(async()=>{
    const [result,linkData]=await Promise.all([call(base+'/intakes'),call(base+'/intake-links')])
    setRequests(result.requests||[])
    setNextCursor(typeof result.nextCursor==='string'?result.nextCursor:null)
    setLinks(linkData.links||[])
  },[base,call])
  const loadMore=async()=>{
    if(!nextCursor||busy)return
    setBusy(true);setError('')
    try{
      const result=await call(base+'/intakes?cursor='+encodeURIComponent(nextCursor))
      setRequests(v=>[...v,...(result.requests||[]).filter((row:Intake)=>!v.some(old=>old.id===row.id))])
      setNextCursor(typeof result.nextCursor==='string'?result.nextCursor:null)
    }catch{setError(t.failure)}finally{setBusy(false)}
  }
  useEffect(()=>{if(!canManage)return;let current=true;void reload().catch(()=>{if(current)setRequests([])});return()=>{current=false}},[canManage,reload])
  const link=async()=>{
    setBusy(true);setError('');setInfo('')
    try{
      const data=await call('/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney/intake-links',{
        method:'POST',body:JSON.stringify({congregationId}),
      })
      setUrl(String(data.url||''))
      await reload()
    }catch{setError(t.failure)}finally{setBusy(false)}
  }
  const reject=async(row:Intake)=>{
    const confirmation=locale==='en'?'Reject and erase this submission?':locale==='es'?'¿Rechazar y borrar esta solicitud?':'Rejeitar e apagar nome e telefone desta solicitação?'
    if(!window.confirm(confirmation))return
    setBusy(true);setError('');setInfo('')
    try{
      await call('/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney/intakes/'+encodeURIComponent(row.id)+'/reject',{
        method:'POST',body:JSON.stringify({}),
      })
      await reload()
      setInfo(locale==='en'?'Submission rejected and contact erased.':locale==='es'?'Solicitud rechazada y datos eliminados.':'Solicitação rejeitada e dados de contato apagados.')
    }catch{setError(t.failure)}finally{setBusy(false)}
  }
  const revoke=async(linkId?:string)=>{
    if((!linkId&&!url)||!window.confirm(locale==='en'?'Revoke this link?':locale==='es'?'¿Revocar este enlace?':'Revogar este link?'))return
    setBusy(true);setError('');setInfo('')
    try{
      const token=linkId?'':url.split('/').pop()||''
      await call(base+'/intake-links/revoke',{
        method:'POST',body:JSON.stringify(linkId?{linkId}:{token}),
      })
      setUrl('');await reload();setInfo(locale==='en'?'Link revoked.':locale==='es'?'Enlace revocado.':'Link revogado.')
    }catch{setError(t.failure)}finally{setBusy(false)}
  }
  const integrate=async(row:Intake)=>{
    if(!window.confirm(t.approve+' — '+row.name+'?'))return
    setBusy(true);setError('');setInfo('')
    try{
      await call('/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney/intakes/'+encodeURIComponent(row.id)+'/approve',{
        method:'POST',body:JSON.stringify({existingPersonId:existing[row.id]||''}),
      })
      await Promise.all([reload(),onIntegrated()])
      setInfo(t.done)
    }catch{setError(t.failure)}finally{setBusy(false)}
  }
  if(!canManage||!congregationId)return null
  const scoped=requests.filter(row=>row.congregationId===congregationId)
  return <section className="intake-admin-panel">
    <div className="intake-admin-head"><div><span><UserRoundPlus size={16}/>NestJourney</span><h2>{t.title}</h2><p>{t.about}</p></div><button onClick={()=>void link()} disabled={busy}><Link2 size={16}/>{t.create}</button></div>
    {url?<div className="intake-admin-link"><input aria-label="Registration link" readOnly value={url}/><button onClick={()=>{void navigator.clipboard?.writeText(url).then(()=>setInfo(t.copy))}}><ClipboardCopy size={15}/>{t.copy}</button><button type="button" disabled={busy} onClick={()=>void revoke()}>{locale==='en'?'Revoke':locale==='es'?'Revocar':'Revogar'}</button></div>:null}
    {links.filter(l=>l.congregationId===congregationId).length>0?<div className="intake-admin-requests">
      <h3>{locale==='en'?'Active registration links':locale==='es'?'Enlaces de registro activos':'Links de cadastro ativos'}</h3>
      {links.filter(l=>l.congregationId===congregationId).map(l=><article key={l.id}>
        <div className="intake-admin-person"><strong>{l.congregationName}</strong>
          <span>{locale==='en'?'Expires':locale==='es'?'Caduca':'Expira'} {new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short'}).format(l.expiresAtMs)} · {l.submissionsCount}/{l.maxSubmissions}</span>
        </div>
        <button type="button" disabled={busy} onClick={()=>void revoke(l.id)}>{locale==='en'?'Revoke':locale==='es'?'Revocar':'Revogar'}</button>
      </article>)}
    </div>:null}
    {info?<p role="status" className="intake-admin-info">{info}</p>:null}
    {error?<p role="alert" className="intake-admin-error">{error}</p>:null}
    <h3>{t.requests} · {scoped.length}</h3>
    <div className="intake-admin-requests">{scoped.length===0?<p>{t.empty}</p>:scoped.map(row=><article key={row.id}>
      <div className="intake-admin-person"><strong>{row.name}</strong><span>{row.phone} · {row.consentContact?'Contato autorizado':'Sem autorização de contato'}</span></div>
      <select disabled={busy} value={existing[row.id]||''} aria-label="Select existing person or create new" onChange={e=>setExisting(v=>({...v,[row.id]:e.target.value}))}>
        <option value="">{t.new}</option>
        {people.map(person=><option value={person.id} key={person.id}>{person.preferredName||person.name}</option>)}
      </select>
      <button type="button" disabled={busy} onClick={()=>void integrate(row)}>{t.approve}</button><button type="button" disabled={busy} onClick={()=>void reject(row)}>{locale==='en'?'Reject':locale==='es'?'Rechazar':'Rejeitar'}</button>
    </article>)}</div>
    {nextCursor?<button type="button" disabled={busy} onClick={()=>void loadMore()}>{locale==='en'?'Load more pending registrations':locale==='es'?'Cargar más solicitudes':'Carregar mais solicitações pendentes'}</button>:null}
    <div className="intake-admin-notice"><ShieldCheck size={15}/><small>{t.notice}</small></div>
  </section>
}
