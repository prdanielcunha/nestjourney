import {useEffect,useState} from 'react'
import {ShieldCheck,SlidersHorizontal} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {
  loadJourneyRolloutFlags,saveJourneyRolloutFlags,ROLLOUT_KEYS,DEFAULT_JOURNEY_ROLLOUT_FLAGS,
  type JourneyRolloutFlags,type JourneyRolloutKey,
} from './journeyReleaseFlags'
import './JourneyReleaseFlagsPanel.css'
const names:Record<AppLocale,Record<JourneyRolloutKey,string>>={
  'pt-BR':{memberBulkImport:'Importação de membros',personProfileEdit:'Edição administrativa de pessoas',familyLinks:'Vínculos familiares',verifiedFrequency:'Frequência com evidências',optionalProjects:'Catálogo de projetos opcionais'},
  en:{memberBulkImport:'Member CSV import',personProfileEdit:'Administrative person editor',familyLinks:'Family relationships',verifiedFrequency:'Evidence-only attendance',optionalProjects:'Optional project catalog'},
  es:{memberBulkImport:'Importación de miembros',personProfileEdit:'Edición administrativa de personas',familyLinks:'Vínculos familiares',verifiedFrequency:'Asistencia verificada',optionalProjects:'Catálogo de programas opcionales'},
}
export function JourneyReleaseFlagsPanel({access,locale}:{
  access:JourneyAccessContext;locale:AppLocale
}){
  const [flags,setFlags]=useState<JourneyRolloutFlags>(DEFAULT_JOURNEY_ROLLOUT_FLAGS)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [saved,setSaved]=useState(false)
  const canManage=canImportJourneyMembers(access)
  useEffect(()=>{
    if(!canManage){setLoading(false);return}
    let active=true
    setLoading(true)
    void loadJourneyRolloutFlags(access)
      .then(value=>{if(active)setFlags(value)})
      .catch(()=>{if(active)setError('flags_load_failed')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[access,canManage])
  if(!canManage)return null
  const copy=locale==='en'?{
    title:'Gradual rollout by church',subtitle:'New features start disabled. Enable only after checking your church’s data, roles and training.',
    save:'Save module rollout',saved:'Rollout settings saved.',error:'Could not save rollout settings.',loading:'Loading rollout settings…',
    note:'This controls interface visibility. Firestore permissions and privacy rules remain mandatory.',
  }:locale==='es'?{
    title:'Activación gradual por iglesia',subtitle:'Los nuevos módulos comienzan desactivados. Active solo después de revisar datos, permisos y capacitación.',
    save:'Guardar activaciones',saved:'Configuración guardada.',error:'No fue posible guardar las activaciones.',loading:'Cargando activaciones…',
    note:'Esto controla la visibilidad de la interfaz. Las reglas de permisos siguen siendo obligatorias.',
  }:{
    title:'Liberação gradual por igreja',subtitle:'Os novos módulos começam desligados. Ative somente após conferir dados, permissões e treinamento da unidade.',
    save:'Salvar módulos habilitados',saved:'Configuração de liberação salva.',error:'Não foi possível salvar a liberação.',loading:'Carregando liberações…',
    note:'Isto controla a visibilidade das telas. As permissões e regras de privacidade continuam obrigatórias.',
  }
  const save=async()=>{
    setBusy(true);setError('');setSaved(false)
    try{setFlags(await saveJourneyRolloutFlags(access,flags));setSaved(true)}
    catch(cause){console.error('Rollout settings rejected',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  return <section className="journey-rollout-panel" aria-label={copy.title}>
    <header><SlidersHorizontal size={20}/><div><h2>{copy.title}</h2><p>{copy.subtitle}</p></div></header>
    {loading?<p>{copy.loading}</p>:<>
      <div className="journey-rollout-list">{ROLLOUT_KEYS.map(key=><label key={key}>
        <input type="checkbox" disabled={busy} checked={flags[key]} onChange={e=>{setSaved(false);setFlags(v=>({...v,[key]:e.target.checked}))}}/>
        <span>{names[locale][key]}</span>
      </label>)}</div>
      {error?<p className="journey-rollout-error" role="alert">{error}</p>:null}
      {saved?<p className="journey-rollout-success" role="status">{copy.saved}</p>:null}
      <button type="button" disabled={busy} onClick={()=>void save()}>{copy.save}</button>
    </>}
    <p className="journey-rollout-note"><ShieldCheck size={14}/>{copy.note}</p>
  </section>
}
