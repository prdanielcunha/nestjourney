import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw, Settings2 } from 'lucide-react'
import { auth } from './firebase'
import {
  getActiveJourneyOrganizationId,
  loadJourneyAccess,
  saveJourneyModuleLabels,
  type JourneyAccessContext,
  type JourneyModuleLabels,
} from './journeyRepository'
import { notifyJourneyLabelsChanged, useJourneyLabels } from './journeyLabels'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import './JourneySettingsPage.css'

const copy={
  'pt-BR':{
    title:'Configurações do NestJourney',subtitle:'Ajuste os nomes que sua igreja usa sem mudar a lógica, os dados ou a segurança do produto.',
    loading:'Carregando configurações…',noAccess:'Somente pastores e administradores autorizados podem alterar os nomes dos módulos.',
    names:'Nomes dos módulos',namesDesc:'Exemplos: “Mesa Aberta” pode virar “Café da Família”, “Casa de Paz” pode virar “PG” e “Raiz” pode virar “Caminho”.',
    presence:'Recepção',table:'Mesa Aberta',care:'Cuidado & Conexão',groups:'Casa de Paz',root:'Raiz',
    presenceHelp:'Equipe que recebe, identifica vínculo e registra presença.',tableHelp:'Momento de comunhão após o culto.',careHelp:'Contato autorizado em 24–48h e próximos passos.',groupsHelp:'Comunidade pequena nos lares.',rootHelp:'Discipulado inicial em sete encontros.',
    save:'Salvar nomes',saving:'Salvando…',saved:'Nomes atualizados',reset:'Usar nomes padrão',
    empty:'Deixe vazio para usar o nome padrão do idioma do usuário.',safety:'A personalização muda apenas a linguagem exibida. Permissões, coleções e histórico permanecem canônicos.',error:'Não foi possível salvar as configurações.'
  },
  en:{
    title:'NestJourney Settings',subtitle:'Adjust the names your church uses without changing product logic, data, or security.',
    loading:'Loading settings…',noAccess:'Only authorized pastors and administrators can change module names.',
    names:'Module names',namesDesc:'Examples: “Open Table” can become “Family Café”, “Peace House” can become “Small Group”, and “Root” can become “Path”.',
    presence:'Welcome',table:'Open Table',care:'Care & Connection',groups:'Peace House',root:'Root',
    presenceHelp:'Team that welcomes people, notices relationships, and records presence.',tableHelp:'Community time after the service.',careHelp:'Authorized 24–48h contact and next steps.',groupsHelp:'Small community in homes.',rootHelp:'Initial discipleship in seven meetings.',
    save:'Save names',saving:'Saving…',saved:'Names updated',reset:'Use default names',
    empty:'Leave blank to use the default name for the user language.',safety:'Customization changes display language only. Permissions, collections, and history remain canonical.',error:'Settings could not be saved.'
  },
  es:{
    title:'Configuración de NestJourney',subtitle:'Ajusta los nombres que usa tu iglesia sin cambiar la lógica, los datos ni la seguridad del producto.',
    loading:'Cargando configuración…',noAccess:'Solo pastores y administradores autorizados pueden cambiar los nombres de los módulos.',
    names:'Nombres de los módulos',namesDesc:'Ejemplos: “Mesa Abierta” puede ser “Café de la Familia”, “Casa de Paz” puede ser “PG” y “Raíz” puede ser “Camino”.',
    presence:'Recepción',table:'Mesa Abierta',care:'Cuidado & Conexión',groups:'Casa de Paz',root:'Raíz',
    presenceHelp:'Equipo que recibe, percibe vínculos y registra presencia.',tableHelp:'Momento de comunión después del culto.',careHelp:'Contacto autorizado en 24–48h y próximos pasos.',groupsHelp:'Comunidad pequeña en hogares.',rootHelp:'Discipulado inicial en siete encuentros.',
    save:'Guardar nombres',saving:'Guardando…',saved:'Nombres actualizados',reset:'Usar nombres predeterminados',
    empty:'Déjalo vacío para usar el nombre predeterminado del idioma del usuario.',safety:'La personalización cambia solo el texto mostrado. Permisos, colecciones e historial siguen siendo canónicos.',error:'No se pudo guardar la configuración.'
  }
} as const

export default function JourneySettingsPage(){
  const [locale,setLocale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const {labels,refresh}=useJourneyLabels()
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [form,setForm]=useState<JourneyModuleLabels>({})
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  const canEdit=useMemo(()=>Boolean(access&&(access.isSystemAdmin||access.isOwner||['owner','admin','pastor'].includes(access.role))),[access])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      setAccess(await loadJourneyAccess(user.uid,organizationId))
      await refresh()
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])

  useEffect(()=>{void bootstrap()},[bootstrap])
  useEffect(()=>{setForm(labels)},[labels])

  async function save(next:JourneyModuleLabels=form){
    if(!access||!canEdit)return
    setBusy(true);setMessage('');setError('')
    try{
      await saveJourneyModuleLabels(access,next)
      await refresh()
      notifyJourneyLabelsChanged()
      setMessage(t.saved)
    }catch(cause){console.error(cause);setError(t.error)}finally{setBusy(false)}
  }
  const fields=[
    ['presence',t.presence,t.presenceHelp],
    ['table',t.table,t.tableHelp],
    ['care',t.care,t.careHelp],
    ['groups',t.groups,t.groupsHelp],
    ['discipleship',t.root,t.rootHelp],
  ] as const

  if(loading)return <main className="journey-settings"><div className="settings-loading">{t.loading}</div></main>
  if(!canEdit)return <main className="journey-settings"><section className="settings-no-access"><Settings2 size={30}/><h1>{t.title}</h1><p>{t.noAccess}</p></section></main>

  return <main className="journey-settings"><div className="settings-shell">
    <header className="settings-header"><div><span className="settings-kicker">NestJourney / Settings</span><h1>{t.title}</h1><p>{t.subtitle}</p></div><select value={locale} onChange={e=>{const next=e.target.value as AppLocale;setLocale(next);persistLocale(next)}}>{(Object.keys(localeLabels) as AppLocale[]).map(id=><option key={id} value={id}>{localeLabels[id]}</option>)}</select></header>
    {error?<div className="settings-error">{error}</div>:null}{message?<div className="settings-success"><Check size={15}/>{message}</div>:null}
    <section className="settings-panel">
      <div className="settings-section-head"><span className="settings-kicker">{t.names}</span><h2>{t.names}</h2><p>{t.namesDesc}</p></div>
      <div className="settings-fields">{fields.map(([key,label,help])=><label key={key}><span><b>{label}</b><small>{help}</small></span><input maxLength={48} value={form[key]??''} placeholder={label} onChange={e=>setForm(current=>({...current,[key]:e.target.value}))}/></label>)}</div>
      <p className="settings-hint">{t.empty}</p>
      <div className="settings-actions"><button disabled={busy} className="secondary" onClick={()=>{const empty={presence:'',table:'',care:'',groups:'',discipleship:''};setForm(empty);void save(empty)}}><RotateCcw size={15}/>{t.reset}</button><button disabled={busy} className="primary" onClick={()=>void save()}>{busy?t.saving:t.save}</button></div>
    </section>
    <section className="settings-safety"><Settings2 size={18}/><p>{t.safety}</p></section>
  </div></main>
}
