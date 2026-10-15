import {useState} from 'react'
import {ShieldCheck,UserRound} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {saveAdministrativePersonProfile,normalizeCommunityStatus,type CommunityStatus} from './personProfileAdmin'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import './PersonAdminPanel.css'

const statusNames:Record<AppLocale,Record<CommunityStatus,string>>={
  'pt-BR':{not_informed:'Não informado',visitor:'Visitante',regular:'Frequentador(a)',member:'Membro',former_member:'Ex-membro'},
  en:{not_informed:'Not informed',visitor:'Visitor',regular:'Regular attendee',member:'Member',former_member:'Former member'},
  es:{not_informed:'No informado',visitor:'Visitante',regular:'Asistente habitual',member:'Miembro',former_member:'Exmiembro'},
}
export function PersonAdminPanel({access,person,locale,onSaved}:{
  access:JourneyAccessContext
  person:JourneyPersonRecord
  locale:AppLocale
  onSaved:()=>Promise<void>
}){
  const [expanded,setExpanded]=useState(false)
  const [preferredName,setPreferredName]=useState(person.preferredName||'')
  const [status,setStatus]=useState<CommunityStatus>(normalizeCommunityStatus(person.communityStatus||'not_informed'))
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [saved,setSaved]=useState(false)
  if(!canImportJourneyMembers(access))return null
  const copy=locale==='en'
    ? {title:'Administrative profile',description:'Explicit community status — never inferred from attendance. Names and consent have separate correction flows.',open:'Edit administrative details',close:'Close editing',preferred:'Preferred name',status:'Declared community status',save:'Save with audit trail',cancel:'Cancel',ok:'Changes saved with an audit record.',failure:'Unable to save. The profile may have changed; refresh and try again.'}
    :locale==='es'
      ? {title:'Datos administrativos',description:'Situación comunitaria declarada, nunca inferida por asistencia. Nombre y consentimientos usan procesos distintos.',open:'Editar datos',close:'Cerrar edición',preferred:'Nombre preferido',status:'Situación comunitaria declarada',save:'Guardar con auditoría',cancel:'Cancelar',ok:'Cambios guardados con registro de auditoría.',failure:'No se pudo guardar. Puede haber cambios; actualice la ficha.'}
      : {title:'Dados administrativos',description:'Situação comunitária declarada, nunca deduzida pela frequência. Nome civil e consentimentos têm fluxos de correção separados.',open:'Editar dados',close:'Fechar edição',preferred:'Nome preferido',status:'Situação na comunidade',save:'Salvar com auditoria',cancel:'Cancelar',ok:'Alterações salvas com registro de auditoria.',failure:'Não foi possível salvar. O cadastro pode ter mudado; atualize a ficha.'}
  const save=async()=>{
    setBusy(true);setError('');setSaved(false)
    try{
      await saveAdministrativePersonProfile({access,person,preferredName,communityStatus:status})
      await onSaved()
      setSaved(true);setExpanded(false)
    }catch(cause){console.error('Person profile update denied',cause);setError(copy.failure)}
    finally{setBusy(false)}
  }
  return <section className="person-admin-panel">
    <div className="person-admin-header"><UserRound size={20}/><div><h2>{copy.title}</h2><p>{copy.description}</p></div></div>
    <button className="person-admin-toggle" type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?copy.close:copy.open}</button>
    {saved?<p role="status" className="person-admin-success"><ShieldCheck size={15}/>{copy.ok}</p>:null}
    {error?<p role="alert" className="person-admin-error">{error}</p>:null}
    {expanded?<form onSubmit={e=>{e.preventDefault();void save()}} className="person-admin-form">
      <label>{copy.preferred}<input value={preferredName} maxLength={120} disabled={busy} onChange={e=>setPreferredName(e.target.value)}/></label>
      <label>{copy.status}<select value={status} disabled={busy} onChange={e=>setStatus(e.target.value as CommunityStatus)}>
        {Object.entries(statusNames[locale]).map(([key,value])=><option key={key} value={key}>{value}</option>)}
      </select></label>
      <div><button type="button" disabled={busy} onClick={()=>setExpanded(false)}>{copy.cancel}</button><button type="submit" disabled={busy}>{busy?'…':copy.save}</button></div>
    </form>:null}
  </section>
}
