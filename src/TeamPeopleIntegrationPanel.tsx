import {useEffect,useRef,useState} from 'react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyTeamInterestRecord} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {PeopleDirectoryError,refreshPeopleDirectory,registerCentralPeople,searchPeopleDirectory,type DirectoryPerson} from './peopleDirectoryClient'
import {approvedTeamPeople,teamPersonCandidates,type TeamPersonChoice} from './teamPeopleIntegration'
import './MemberImportPanel.css'

const words={
  'pt-BR':{title:'Participantes na presença do culto',hint:'As inscrições organizam a equipe. Inclua também os participantes em Pessoas para marcar presença nos cultos. Aniversários precisam de dia e mês cadastrados separadamente.',prepare:'Revisar participantes para presença',review:'Confira os nomes e selecione o cadastro existente quando for a mesma pessoa. Cada lote aceita até 75 inscrições. Nenhum login, permissão, mensagem ou presença é criado.',person:'Cadastro de',choose:'Escolha um cadastro',fresh:'Cadastrar nova pessoa',different:'Se for um homônimo, explique a diferença (mínimo 15 caracteres)',approve:'Revisei este participante',save:'Incluir revisados em Pessoas',done:'Participantes disponíveis em Pessoas e Presença:',fail:'Não foi possível concluir. Atualize a revisão e confira os cadastros e as permissões.',duplicate:'Já existe um cadastro com esse nome. Atualize a revisão e selecione a pessoa existente.',all:'Aprovar nomes sem correspondências',open:'Abrir Presença'},
  en:{title:'Team participants in service attendance',hint:'Sign-ups organize the team. Also add participants to People to record service attendance. Birthdays need a separately saved day and month.',prepare:'Review participants for attendance',review:'Check names and select an existing record only for the same person. Each batch accepts up to 75 sign-ups. No login, permission, message or attendance is created.',person:'Record for',choose:'Choose a record',fresh:'Register a new person',different:'For a namesake, explain the distinction (at least 15 characters)',approve:'I reviewed this participant',save:'Add reviewed participants to People',done:'Participants available in People and Attendance:',fail:'Could not complete. Refresh the review and check records and permissions.',duplicate:'A record with this name already exists. Refresh the review and select the existing person.',all:'Approve names without matches',open:'Open Attendance'},
  es:{title:'Participantes en la asistencia al culto',hint:'Las inscripciones organizan el equipo. Incluya también a los participantes en Personas para registrar asistencia. Los cumpleaños requieren día y mes por separado.',prepare:'Revisar participantes para asistencia',review:'Revise nombres y seleccione el registro existente solo si es la misma persona. Cada lote acepta hasta 75 inscripciones. No se crean accesos, permisos, mensajes ni asistencia.',person:'Registro de',choose:'Seleccione un registro',fresh:'Registrar nueva persona',different:'Si es un homónimo, explique la diferencia (mínimo 15 caracteres)',approve:'Revisé este participante',save:'Incluir revisados en Personas',done:'Participantes disponibles en Personas y Asistencia:',fail:'No se pudo completar. Actualice la revisión y compruebe registros y permisos.',duplicate:'Ya existe un registro con este nombre. Actualice la revisión y seleccione la persona existente.',all:'Aprobar nombres sin coincidencias',open:'Abrir Asistencia'},
}
export function TeamPeopleIntegrationPanel({access,unitId,records,locale}:{access:JourneyAccessContext;unitId:string;records:JourneyTeamInterestRecord[];locale:AppLocale}){
  const t=words[locale]
  const [rows,setRows]=useState<TeamPersonChoice[]>([]),[directory,setDirectory]=useState<DirectoryPerson[]>([])
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState<number|null>(null)
  const mounted=useRef(true),receipt=useRef({payload:'',id:crypto.randomUUID()})
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  if(!canImportJourneyMembers(access)||!unitId||!records.length)return null
  const scopedRecords=records.filter(row=>row.active&&row.organizationId===access.organizationId&&row.congregationId===unitId)
  const valid=(row:TeamPersonChoice)=>row.personId!==''&&(row.personId!=='new'||!teamPersonCandidates(row.name,directory).length||row.distinctReason.trim().length>=15)
  async function prepare(){
    if(busy)return
    setBusy(true);setError('');setDone(null)
    try{
      await refreshPeopleDirectory(access.organizationId)
      const people=await searchPeopleDirectory(access.organizationId,'')
      if(!mounted.current)return
      setDirectory(people)
      setRows(scopedRecords.map(row=>({id:row.id,name:row.name,personId:teamPersonCandidates(row.name,people).length?'':'new',distinctReason:'',approved:false})))
    }catch{if(mounted.current)setError(t.fail)}finally{if(mounted.current)setBusy(false)}
  }
  function patch(id:string,value:Partial<TeamPersonChoice>){setRows(current=>current.map(row=>row.id===id?{...row,...value}:row))}
  async function save(){
    const selected=rows.filter(row=>row.approved)
    if(busy||!selected.length||selected.length>75||selected.some(row=>!valid(row)))return
    setBusy(true);setError('');setDone(null)
    try{
      const approved=approvedTeamPeople(selected.map(row=>({...row,personId:row.personId==='new'?'':row.personId})))
      const payload=JSON.stringify([access.organizationId,unitId,approved])
      if(receipt.current.payload!==payload)receipt.current={payload,id:crypto.randomUUID()}
      const result=await registerCentralPeople(access.organizationId,unitId,receipt.current.id,approved)
      if(!mounted.current)return
      setDone(result.people.length);setRows([])
    }catch(cause){if(mounted.current)setError(cause instanceof PeopleDirectoryError&&cause.code==='POSSIBLE_DUPLICATE'?t.duplicate:t.fail)}finally{if(mounted.current)setBusy(false)}
  }
  return <section className="member-import-panel">
    <h2>{t.title}</h2><p>{t.hint}</p>
    <button type="button" className="member-import-toggle" disabled={busy} onClick={()=>void prepare()}>{busy?'…':t.prepare}</button>
    {error?<p role="alert" className="member-import-error">{error}</p>:null}
    {done!==null?<p role="status" className="member-import-success">{t.done} {done} <a href="/presence-assist">{t.open}</a></p>:null}
    {rows.length?<div className="member-import-body"><p>{t.review}</p>
      <button type="button" disabled={busy} onClick={()=>setRows(current=>{let count=0;return current.map(row=>({...row,approved:row.personId==='new'&&!teamPersonCandidates(row.name,directory).length&&++count<=75}))})}>{t.all}</button>
      <p>{rows.filter(row=>row.approved).length} / 75</p>
      {rows.map(row=>{const matches=teamPersonCandidates(row.name,directory);return <fieldset key={row.id} disabled={busy}>
        <legend>{row.name}</legend>
        <label>{t.person} {row.name}<select value={row.personId} onChange={e=>patch(row.id,{personId:e.target.value,approved:false,distinctReason:''})}>
          <option value="">{t.choose}</option>
          {matches.map(person=><option key={person.id} value={person.id}>{[person.name,person.phone,person.accountEmail].filter(Boolean).join(' · ')}{person.hasAccount?' · '+(locale==='en'?'Login account':locale==='es'?'Cuenta de acceso':'Conta de acesso'):''}</option>)}
          <option value="new">{t.fresh}</option>
        </select></label>
        {row.personId==='new'&&matches.length?<label>{t.different}<textarea maxLength={300} value={row.distinctReason} onChange={e=>patch(row.id,{distinctReason:e.target.value,approved:false})}/></label>:null}
        <label><input type="checkbox" disabled={!valid(row)} checked={row.approved} onChange={e=>patch(row.id,{approved:e.target.checked})}/>{t.approve} — {row.name}</label>
      </fieldset>})}
      <button type="button" className="member-import-save" disabled={busy||rows.filter(row=>row.approved).length>75||!rows.some(row=>row.approved)||rows.some(row=>row.approved&&!valid(row))} onClick={()=>void save()}>{busy?'…':t.save}</button>
    </div>:null}
  </section>
}
