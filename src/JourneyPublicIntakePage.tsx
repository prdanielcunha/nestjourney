import {useEffect,useState,type FormEvent} from 'react'
import {CheckCircle2,ShieldCheck,HeartHandshake,ArrowRight} from 'lucide-react'
import './JourneyPublicIntakePage.css'

const API=(import.meta.env.VITE_MILLIONSNEST_URL||'https://www.millionsnest.com').replace(/\/$/,'')
type Details={organizationName:string;congregationName:string}
export default function JourneyPublicIntakePage(){
  const token=window.location.pathname.split('/')[2]||''
  const [details,setDetails]=useState<Details|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [done,setDone]=useState(false)
  const [busy,setBusy]=useState(false)
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [consentContact,setConsentContact]=useState(false)
  const [privacyAcknowledged,setPrivacyAcknowledged]=useState(false)
  const [website,setWebsite]=useState('')
  useEffect(()=>{
    let mounted=true
    if(!/^[a-zA-Z0-9_-]{32,80}$/.test(token)){setLoading(false);setError('Este link não está disponível.');return}
    void fetch(API+'/api/public/nestjourney/intake/'+encodeURIComponent(token),{cache:'no-store'})
      .then(async r=>{if(!r.ok)throw Error('unavailable');return r.json()})
      .then(data=>{if(mounted)setDetails({organizationName:String(data.organizationName),congregationName:String(data.congregationName)})})
      .catch(()=>{if(mounted)setError('Este link expirou ou não está disponível. Peça outro à igreja.')})
      .finally(()=>{if(mounted)setLoading(false)})
    return()=>{mounted=false}
  },[token])
  const submit=async(e:FormEvent)=>{
    e.preventDefault()
    if(!details||busy)return
    setBusy(true);setError('')
    try{
      const r=await fetch(API+'/api/public/nestjourney/intake/'+encodeURIComponent(token),{
        method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name,phone,consentContact,privacyAcknowledged,website}),
      })
      if(!r.ok)throw Error('failed')
      setDone(true)
    }catch{setError('Não foi possível enviar. Confira os dados e tente novamente, ou procure a equipe da igreja.')}
    finally{setBusy(false)}
  }
  return <main className="intake-public-page"><section className="intake-public-card">
    <header><img src="/brand/nestjourney-symbol-light.png" alt="NestJourney"/><span>NestJourney <small>Uma jornada de cuidado</small></span></header>
    {loading?<p role="status">Confirmando seu convite…</p>:done?
      <div className="intake-success"><CheckCircle2 size={42}/><h1>Obrigado pelo contato!</h1><p>Seus dados foram enviados para conferência pela equipe de {details?.congregationName}. Nenhum acesso ao sistema foi criado. Seja bem-vindo!</p><a href="/">Conhecer o NestJourney <ArrowRight size={15}/></a></div>
    :details?<><span className="intake-kicker"><HeartHandshake size={16}/>Você é importante para nós</span>
      <h1>Queremos conhecer você</h1>
      <p className="intake-lead">É rápido. Informe seu nome e telefone para que a equipe possa acolher você. Outros dados, como aniversário e endereço, ficam para depois e são opcionais.</p>
      <div className="intake-unit"><b>{details.organizationName}</b><span>{details.congregationName}</span></div>
      <form onSubmit={e=>void submit(e)}>
        <label>Seu nome<input required autoComplete="name" minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?"/></label>
        <label>Seu telefone (com DDD)<input required autoComplete="tel" inputMode="tel" type="tel" minLength={10} maxLength={22} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(00) 00000-0000"/></label>
        <div className="intake-honeypot" aria-hidden="true"><label>Site<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label></div>
        <label className="intake-check"><input type="checkbox" checked={consentContact} onChange={e=>setConsentContact(e.target.checked)}/><span>Autorizo a equipe desta igreja a entrar em contato comigo pelo telefone ou WhatsApp informado. <small>Opcional. Você pode retirar essa autorização depois.</small></span></label>
        <label className="intake-check"><input required type="checkbox" checked={privacyAcknowledged} onChange={e=>setPrivacyAcknowledged(e.target.checked)}/><span>Estou ciente de que meus dados serão usados para meu acolhimento e conferidos pela igreja indicada acima. <small>Meu cadastro não será vendido ou compartilhado com outras igrejas.</small></span></label>
        {error?<p className="intake-error" role="alert">{error}</p>:null}
        <button type="submit" disabled={busy||!privacyAcknowledged||name.trim().length<2}>{busy?'Enviando…':'Enviar meus dados'}<ArrowRight size={16}/></button>
      </form>
      <div className="intake-privacy"><ShieldCheck size={16}/><p>Seus dados não são publicados e não criam automaticamente um login. Esta solicitação será avaliada pela equipe autorizada.</p></div>
    </>:<div className="intake-unavailable"><h1>Link indisponível</h1><p role="alert">{error}</p></div>}
  </section></main>
}
