import {useEffect,useState,type FormEvent} from 'react'
import {MapPin,ShieldCheck,Trash2} from 'lucide-react'
import {auth} from './firebase'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import type {AppLocale} from './i18n'
import './PersonAddressPanel.css'
const API=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
type Key='street'|'number'|'district'|'complement'|'city'|'region'|'postalCode'
type Address=Record<Key,string>
const empty:Address={street:'',number:'',district:'',complement:'',city:'',region:'',postalCode:''}
const labels:Record<Key,string>={
 street:'Rua / Avenida',number:'Número',district:'Bairro',complement:'Complemento',city:'Cidade',region:'Estado',postalCode:'CEP',
}
export function PersonAddressPanel({access,person,locale}:{
 access:JourneyAccessContext
 person:JourneyPersonRecord
 locale:AppLocale
}){
 const [expanded,setExpanded]=useState(false)
 const [data,setData]=useState<Address>(empty)
 const [permission,setPermission]=useState(false)
 const [busy,setBusy]=useState(false)
 const [info,setInfo]=useState('')
 const [error,setError]=useState('')
 const [hasData,setHasData]=useState(false)
 const authorized=canImportJourneyMembers(access)
 const url=API+'/api/v1/organizations/'+encodeURIComponent(access.organizationId)+'/nestjourney/people/'+encodeURIComponent(person.id)+'/address'
 const call=async(method:string,body?:unknown)=>{
   const token=await auth?.currentUser?.getIdToken()
   if(!token)throw Error('UNAUTHENTICATED')
   const resp=await fetch(url,{
     method,cache:'no-store',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
     ...(body?{body:JSON.stringify(body)}:{}),
   })
   const json=await resp.json().catch(()=>({}))
   if(!resp.ok||json.success!==true)throw Error('API_FAILED')
   return json
 }
 useEffect(()=>{
   if(!expanded||!authorized)return
   let active=true
   void call('GET').then(result=>{
     if(!active)return
     const address=result.address as Partial<Address>|null
     setData({...empty,...(address||{})})
     setHasData(Boolean(address))
     setPermission(false)
   }).catch(()=>{if(active)setError('Não foi possível carregar o endereço.')})
   return()=>{active=false}
 // The address record is scoped by person key; opening a new profile remounts this panel.
 },[expanded,person.id])
 const save=async(e:FormEvent)=>{
   e.preventDefault();if(!permission)return
   setBusy(true);setError('');setInfo('')
   try{
     await call('PUT',{address:data,permissionConfirmed:true})
     setHasData(true);setPermission(false);setInfo(locale==='en'?'Address saved.':locale==='es'?'Dirección guardada.':'Endereço salvo com registro de alteração.')
   }catch{setError('Não foi possível salvar. Verifique sua conexão e permissões.')}
   finally{setBusy(false)}
 }
 const remove=async()=>{
   if(!window.confirm('Remover o endereço cadastrado?'))return
   setBusy(true);setError('');setInfo('')
   try{
     await call('DELETE');setData(empty);setHasData(false);setPermission(false)
     setInfo('Endereço removido.')
   }catch{setError('Não foi possível remover o endereço.')}
   finally{setBusy(false)}
 }
 if(!authorized)return null
 return <section className="person-address-panel">
   <div className="person-address-head">
     <div><span><MapPin size={16}/>Dados complementares</span><h3>{locale==='en'?'Optional address':locale==='es'?'Dirección opcional':'Endereço (opcional)'}</h3><p>Preencha somente depois do primeiro contato, quando houver necessidade e autorização da pessoa. Não é obrigatório.</p></div>
     <button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?'Fechar':'Completar cadastro'}</button>
   </div>
   {expanded?<form onSubmit={e=>void save(e)}>
     <div className="person-address-fields">{(Object.keys(labels) as Key[]).map(key=><label key={key}>{labels[key]}<input autoComplete={key==='postalCode'?'postal-code':'off'} value={data[key]} maxLength={key==='street'?140:key==='number'?20:120} onChange={e=>setData(v=>({...v,[key]:e.target.value}))}/></label>)}</div>
     <label className="person-address-agree"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/><span>Confirmo que a pessoa, ou responsável legal, autorizou o armazenamento deste endereço para a finalidade de acolhimento e cuidado.</span></label>
     {info?<p className="person-address-success" role="status">{info}</p>:null}
     {error?<p className="person-address-error" role="alert">{error}</p>:null}
     <div className="person-address-actions">{hasData?<button type="button" onClick={()=>void remove()} disabled={busy}><Trash2 size={15}/>Remover</button>:null}<button className="primary" type="submit" disabled={busy||!permission}>{busy?'Salvando…':'Salvar endereço'}</button></div>
   </form>:null}
   <small className="person-address-privacy"><ShieldCheck size={14}/>Visível somente a administradores autorizados da organização.</small>
 </section>
}
