import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, HeartHandshake, House, MessageCircleHeart, ShieldCheck, UserRoundCog } from 'lucide-react'
import { auth } from './firebase'
import {
  createContactUpdateSignal,
  createExitFeedback,
  createGroupInterestSignal,
  createPulseCheckin,
  createSafeVoiceCase,
  getActiveJourneyOrganizationId,
  listJourneyCongregations,
  listJourneyGroups,
  listMyMemberSignals,
  loadJourneyAccess,
  resolveActiveJourneyCongregationId,
  setActiveJourneyCongregationId,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyExitReason,
  type JourneyGroupRecord,
  type JourneyMemberSignal,
  type JourneyPulseState,
  type JourneySafeVoiceCategory,
  type JourneySafeVoiceReporterMode,
} from './journeyRepository'
import { getInitialLocale, type AppLocale } from './i18n'
import './MemberJourneyPage.css'

const copy={
  'pt-BR':{
    title:'Minha Jornada',subtitle:'Um espaço simples para participar do cuidado sem transformar sua vida em um perfil de pontuação.',
    unit:'Unidade',pulse:'Como você está hoje?',pulseHint:'Escolha somente se quiser. O NestJourney não tenta adivinhar emoções e não insiste quando você prefere não falar.',
    states:{well:'Estou bem',prayer:'Quero oração',talk:'Quero conversar',help:'Preciso de ajuda',feedback:'Quero dar feedback',prefer_not_now:'Prefiro não falar agora'} as Record<JourneyPulseState,string>,
    mayContact:'Pode alguém da equipe entrar em contato comigo sobre isso?',sendPulse:'Enviar',sent:'Enviado com segurança.',
    houses:'Encontrar uma Casa',housesHint:'Veja opções da sua unidade e sinalize interesse. Isso não confirma entrada automaticamente.',
    interested:'Tenho interesse',interestSent:'Interesse enviado',capacity:'pessoas',noHouses:'Nenhuma Casa disponível nesta unidade agora.',
    contact:'Atualizar contato',contactHint:'Seu novo telefone fica protegido e aparece apenas para quem pode tratar dados de contato.',phone:'Novo telefone',sendUpdate:'Enviar atualização',
    voice:'Canal seguro',voiceHint:'Use para sugestão, experiência negativa, preocupação de segurança ou outro relato sensível. O acesso é separado da operação comum.',
    categories:{suggestion:'Sugestão',negative_experience:'Experiência negativa',safety_concern:'Preocupação de segurança',sensitive_manifestation:'Relato sensível'} as Record<JourneySafeVoiceCategory,string>,
    modes:{identified:'Identificado para o canal responsável',confidential:'Confidencial'} as Record<JourneySafeVoiceReporterMode,string>,
    summary:'Conte o necessário, sem incluir detalhes íntimos que não sejam importantes para o encaminhamento.',sendVoice:'Enviar ao canal seguro',
    exit:'Pausar ou encerrar minha participação',exitHint:'Se você decidiu pausar ou sair, pode registrar o motivo. A liderança recebe tendências agregadas; contato só acontece se você permitir.',
    paused:'Estou pausando',left:'Estou saindo',
    reasons:{moving:'Mudança de cidade/região',routine:'Rotina ou horários',another_church:'Vou para outra igreja',lack_of_connection:'Não consegui criar conexão',negative_experience:'Tive uma experiência negativa',disagreement:'Discordância',other:'Outro motivo'} as Record<JourneyExitReason,string>,
    exitContact:'Pode alguém entrar em contato sobre minha saída?',sendExit:'Registrar decisão',
    openSignals:'Solicitações em andamento',openSignalsHint:'Você vê somente as solicitações que iniciou.',resolved:'Resolvido',open:'Aguardando cuidado',
    principle:'Você decide o que compartilhar. O sistema registra apenas o necessário para cuidado e próximos passos.',
    help:'Entender a jornada',error:'Não foi possível concluir esta ação.',loading:'Preparando sua jornada…',
  },
  en:{
    title:'My Journey',subtitle:'A simple space to take part in care without turning your life into a scored profile.',
    unit:'Campus',pulse:'How are you today?',pulseHint:'Choose only if you want to. NestJourney does not guess emotions and does not insist when you prefer not to talk.',
    states:{well:'I am well',prayer:'I want prayer',talk:'I want to talk',help:'I need help',feedback:'I want to give feedback',prefer_not_now:'I prefer not to talk now'} as Record<JourneyPulseState,string>,
    mayContact:'May someone from the team contact me about this?',sendPulse:'Send',sent:'Sent safely.',
    houses:'Find a House',housesHint:'See options in your campus and signal interest. This does not confirm entry automatically.',
    interested:'I am interested',interestSent:'Interest sent',capacity:'people',noHouses:'No House is available in this campus right now.',
    contact:'Update contact',contactHint:'Your new phone stays protected and is visible only to people allowed to handle contact data.',phone:'New phone',sendUpdate:'Send update',
    voice:'Safe channel',voiceHint:'Use it for a suggestion, negative experience, safety concern, or another sensitive report. Access is separate from normal operations.',
    categories:{suggestion:'Suggestion',negative_experience:'Negative experience',safety_concern:'Safety concern',sensitive_manifestation:'Sensitive report'} as Record<JourneySafeVoiceCategory,string>,
    modes:{identified:'Identified to the responsible channel',confidential:'Confidential'} as Record<JourneySafeVoiceReporterMode,string>,
    summary:'Share only what is needed, without intimate details that are not important for routing.',sendVoice:'Send to safe channel',
    exit:'Pause or end my participation',exitHint:'If you decided to pause or leave, you can register a reason. Leadership receives aggregate trends; contact only happens if you allow it.',
    paused:'I am pausing',left:'I am leaving',
    reasons:{moving:'Moving city/region',routine:'Routine or schedule',another_church:'Going to another church',lack_of_connection:'Could not build connection',negative_experience:'Had a negative experience',disagreement:'Disagreement',other:'Other reason'} as Record<JourneyExitReason,string>,
    exitContact:'May someone contact me about my exit?',sendExit:'Record decision',
    openSignals:'Open requests',openSignalsHint:'You only see requests you started.',resolved:'Resolved',open:'Waiting for care',
    principle:'You choose what to share. The system records only what is needed for care and next steps.',
    help:'Understand the journey',error:'This action could not be completed.',loading:'Preparing your journey…',
  },
  es:{
    title:'Mi Jornada',subtitle:'Un espacio simple para participar del cuidado sin convertir tu vida en un perfil de puntuación.',
    unit:'Sede',pulse:'¿Cómo estás hoy?',pulseHint:'Elige solo si quieres. NestJourney no intenta adivinar emociones ni insiste cuando prefieres no hablar.',
    states:{well:'Estoy bien',prayer:'Quiero oración',talk:'Quiero conversar',help:'Necesito ayuda',feedback:'Quiero dar feedback',prefer_not_now:'Prefiero no hablar ahora'} as Record<JourneyPulseState,string>,
    mayContact:'¿Puede alguien del equipo contactarme sobre esto?',sendPulse:'Enviar',sent:'Enviado con seguridad.',
    houses:'Encontrar una Casa',housesHint:'Mira opciones de tu sede y señala interés. Esto no confirma entrada automáticamente.',
    interested:'Tengo interés',interestSent:'Interés enviado',capacity:'personas',noHouses:'No hay Casas disponibles en esta sede ahora.',
    contact:'Actualizar contacto',contactHint:'Tu nuevo teléfono queda protegido y solo lo ve quien puede tratar datos de contacto.',phone:'Nuevo teléfono',sendUpdate:'Enviar actualización',
    voice:'Canal seguro',voiceHint:'Úsalo para sugerencia, experiencia negativa, preocupación de seguridad u otro relato sensible. El acceso es separado de la operación común.',
    categories:{suggestion:'Sugerencia',negative_experience:'Experiencia negativa',safety_concern:'Preocupación de seguridad',sensitive_manifestation:'Relato sensible'} as Record<JourneySafeVoiceCategory,string>,
    modes:{identified:'Identificado para el canal responsable',confidential:'Confidencial'} as Record<JourneySafeVoiceReporterMode,string>,
    summary:'Cuenta solo lo necesario, sin detalles íntimos que no sean importantes para el encaminamiento.',sendVoice:'Enviar al canal seguro',
    exit:'Pausar o terminar mi participación',exitHint:'Si decidiste pausar o salir, puedes registrar el motivo. Liderazgo recibe tendencias agregadas; solo habrá contacto si lo permites.',
    paused:'Estoy pausando',left:'Estoy saliendo',
    reasons:{moving:'Cambio de ciudad/región',routine:'Rutina u horarios',another_church:'Voy a otra iglesia',lack_of_connection:'No logré crear conexión',negative_experience:'Tuve una experiencia negativa',disagreement:'Desacuerdo',other:'Otro motivo'} as Record<JourneyExitReason,string>,
    exitContact:'¿Puede alguien contactarme sobre mi salida?',sendExit:'Registrar decisión',
    openSignals:'Solicitudes en curso',openSignalsHint:'Ves solo las solicitudes que tú iniciaste.',resolved:'Resuelto',open:'Esperando cuidado',
    principle:'Tú decides qué compartir. El sistema registra solo lo necesario para cuidado y próximos pasos.',
    help:'Entender la jornada',error:'No se pudo completar esta acción.',loading:'Preparando tu jornada…',
  },
} as const

const pulseStates:JourneyPulseState[]=['well','prayer','talk','help','feedback','prefer_not_now']
const voiceCategories:JourneySafeVoiceCategory[]=['suggestion','negative_experience','safety_concern','sensitive_manifestation']
const exitReasons:JourneyExitReason[]=['moving','routine','another_church','lack_of_connection','negative_experience','disagreement','other']

export default function MemberJourneyPage(){
  const [locale]=useState<AppLocale>(getInitialLocale)
  const t=copy[locale]
  const [access,setAccess]=useState<JourneyAccessContext|null>(null)
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [unitId,setUnitId]=useState('')
  const [groups,setGroups]=useState<JourneyGroupRecord[]>([])
  const [signals,setSignals]=useState<JourneyMemberSignal[]>([])
  const [pulse,setPulse]=useState<JourneyPulseState>('well')
  const [pulseContact,setPulseContact]=useState(false)
  const [phone,setPhone]=useState('')
  const [category,setCategory]=useState<JourneySafeVoiceCategory>('suggestion')
  const [reporterMode,setReporterMode]=useState<JourneySafeVoiceReporterMode>('confidential')
  const [summary,setSummary]=useState('')
  const [exitStatus,setExitStatus]=useState<'paused'|'left'>('paused')
  const [exitReason,setExitReason]=useState<JourneyExitReason>('routine')
  const [exitContact,setExitContact]=useState(false)
  const [busy,setBusy]=useState('')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)

  const refresh=useCallback(async(nextAccess:JourneyAccessContext,nextUnit:string)=>{
    const [nextGroups,nextSignals]=await Promise.all([
      listJourneyGroups(nextAccess.organizationId,nextUnit),
      listMyMemberSignals(nextAccess),
    ])
    setGroups(nextGroups)
    setSignals(nextSignals)
  },[])

  const bootstrap=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const user=auth?.currentUser,organizationId=getActiveJourneyOrganizationId()
      if(!user||!organizationId)throw new Error('missing_ecosystem_context')
      const nextAccess=await loadJourneyAccess(user.uid,organizationId);setAccess(nextAccess)
      const nextUnits=await listJourneyCongregations(nextAccess);setUnits(nextUnits)
      const nextUnit=resolveActiveJourneyCongregationId(nextAccess.organizationId,nextUnits);setUnitId(nextUnit)
      if(nextUnit)await refresh(nextAccess,nextUnit)
    }catch(cause){console.error(cause);setError(t.error)}finally{setLoading(false)}
  },[refresh,t.error])

  useEffect(()=>{void bootstrap()},[bootstrap])

  async function changeUnit(next:string){
    if(!access)return
    setUnitId(next);setActiveJourneyCongregationId(access.organizationId,next);setBusy('scope')
    try{await refresh(access,next)}finally{setBusy('')}
  }
  async function run(key:string,action:()=>Promise<unknown>,success=t.sent){
    setBusy(key);setError('');setMessage('')
    try{await action();setMessage(success);if(access&&unitId)await refresh(access,unitId)}
    catch(cause){console.error(cause);setError(t.error)}
    finally{setBusy('')}
  }

  const openSignals=signals.filter(item=>item.status==='open')
  const groupInterests=useMemo(()=>new Set(openSignals.filter(item=>item.kind==='group_interest').map(item=>item.groupId)),[openSignals])

  if(loading)return <main className="member-journey"><div className="member-journey-loading">{t.loading}</div></main>
  if(!access)return <main className="member-journey"><div className="member-journey-loading">{t.error}</div></main>

  return <main className="member-journey"><div className="member-journey-shell">
    <header className="member-journey-hero"><div><span>NestJourney / Member</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>{units.length>1?<label><small>{t.unit}</small><select value={unitId} onChange={e=>void changeUnit(e.target.value)} disabled={Boolean(busy)}>{units.map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>:null}</header>
    {error?<div className="member-journey-error">{error}</div>:null}
    {message?<div className="member-journey-success"><CheckCircle2 size={15}/>{message}</div>:null}

    <section className="member-journey-focus">
      <div><span className="member-kicker">Pulse</span><h2>{t.pulse}</h2><p>{t.pulseHint}</p></div>
      <div className="member-pulse-options">{pulseStates.map(state=><button className={pulse===state?'active':''} onClick={()=>{setPulse(state);if(state==='well'||state==='prefer_not_now')setPulseContact(false)}} key={state}>{t.states[state]}</button>)}</div>
      {!['well','prefer_not_now'].includes(pulse)?<label className="member-check"><input type="checkbox" checked={pulseContact} onChange={e=>setPulseContact(e.target.checked)}/><span>{t.mayContact}</span></label>:null}
      <button className="member-primary" disabled={Boolean(busy)||!unitId} onClick={()=>void run('pulse',()=>createPulseCheckin({access,congregationId:unitId,state:pulse,contactAllowed:pulseContact}))}>{t.sendPulse}<ArrowRight size={14}/></button>
    </section>

    <section className="member-section">
      <header><span className="member-section-icon"><House size={18}/></span><div><h2>{t.houses}</h2><p>{t.housesHint}</p></div></header>
      <div className="member-house-list">{groups.length?groups.map(group=>{
        const sent=groupInterests.has(group.id)
        return <article key={group.id}><div><strong>{group.name}</strong><p>{[group.neighborhood,group.weekday,group.time].filter(Boolean).join(' · ')||'—'}</p><small>{group.participants??0}/{group.capacity??'—'} {t.capacity}</small></div><button disabled={Boolean(busy)||sent} onClick={()=>void run('group-'+group.id,()=>createGroupInterestSignal(access,unitId,group.id),t.interestSent)}>{sent?t.interestSent:t.interested}</button></article>
      }):<p className="member-empty">{t.noHouses}</p>}</div>
    </section>

    <section className="member-grid">
      <article className="member-section compact">
        <header><span className="member-section-icon"><UserRoundCog size={18}/></span><div><h2>{t.contact}</h2><p>{t.contactHint}</p></div></header>
        <label className="member-field"><span>{t.phone}</span><input value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+55…"/></label>
        <button className="member-primary" disabled={Boolean(busy)||phone.trim().length<6} onClick={()=>void run('contact',async()=>{await createContactUpdateSignal(access,unitId,phone);setPhone('')})}>{t.sendUpdate}</button>
      </article>

      <article className="member-section compact">
        <header><span className="member-section-icon"><MessageCircleHeart size={18}/></span><div><h2>{t.voice}</h2><p>{t.voiceHint}</p></div></header>
        <label className="member-field"><span>{locale==='en'?'Category':locale==='es'?'Categoría':'Categoria'}</span><select value={category} onChange={e=>setCategory(e.target.value as JourneySafeVoiceCategory)}>{voiceCategories.map(value=><option key={value} value={value}>{t.categories[value]}</option>)}</select></label>
        <label className="member-field"><span>{locale==='en'?'Privacy':locale==='es'?'Privacidad':'Privacidade'}</span><select value={reporterMode} onChange={e=>setReporterMode(e.target.value as JourneySafeVoiceReporterMode)}><option value="confidential">{t.modes.confidential}</option><option value="identified">{t.modes.identified}</option></select></label>
        <label className="member-field"><span>{t.summary}</span><textarea rows={4} maxLength={600} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
        <button className="member-primary" disabled={Boolean(busy)||summary.trim().length<8} onClick={()=>void run('voice',async()=>{await createSafeVoiceCase({access,congregationId:unitId,category,reporterMode,summary});setSummary('')})}>{t.sendVoice}</button>
      </article>
    </section>

    <section className="member-section member-exit">
      <header><span className="member-section-icon"><HeartHandshake size={18}/></span><div><h2>{t.exit}</h2><p>{t.exitHint}</p></div></header>
      <div className="member-exit-form">
        <label className="member-field"><span>{locale==='en'?'Decision':locale==='es'?'Decisión':'Decisão'}</span><select value={exitStatus} onChange={e=>setExitStatus(e.target.value as 'paused'|'left')}><option value="paused">{t.paused}</option><option value="left">{t.left}</option></select></label>
        <label className="member-field"><span>{locale==='en'?'Reason':locale==='es'?'Motivo':'Motivo'}</span><select value={exitReason} onChange={e=>setExitReason(e.target.value as JourneyExitReason)}>{exitReasons.map(reason=><option value={reason} key={reason}>{t.reasons[reason]}</option>)}</select></label>
        <label className="member-check"><input type="checkbox" checked={exitContact} onChange={e=>setExitContact(e.target.checked)}/><span>{t.exitContact}</span></label>
        <button className="member-secondary" disabled={Boolean(busy)} onClick={()=>void run('exit',()=>createExitFeedback({access,congregationId:unitId,status:exitStatus,reason:exitReason,contactAllowed:exitContact}))}>{t.sendExit}</button>
      </div>
    </section>

    {openSignals.length?<section className="member-section">
      <header><div><h2>{t.openSignals}</h2><p>{t.openSignalsHint}</p></div></header>
      <div className="member-signal-list">{openSignals.map(item=><div key={item.id}><span>{item.kind.replaceAll('_',' ')}</span><strong>{t.open}</strong></div>)}</div>
    </section>:null}

    <footer className="member-principle"><ShieldCheck size={17}/><p>{t.principle}</p><a href="/help">{t.help}<ArrowRight size={13}/></a></footer>
  </div></main>
}
