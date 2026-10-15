import {useMemo,useState} from 'react'
import {CheckCircle2,RotateCcw,UsersRound} from 'lucide-react'
import type {AppLocale} from './i18n'
import {latestChecksByPerson,listPresencePeople,recordPresenceCheck,
  type JourneyAccessContext,type JourneyCongregation,type PresencePerson,type PresenceSessionRecord
} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import type {PresenceCheck} from './intelligence'
import './CrossUnitPresencePanel.css'

/** A visitor from another campus must keep the same canonical person ID.
 * Only tenant administrators may search a separate campus or record such visits.
 * Never suggest or create an absence for a non-home-campus person.
 */
export function CrossUnitPresencePanel({access,congregationId,units,session,checks,locale,onChanged}:{
  access:JourneyAccessContext
  congregationId:string
  units:JourneyCongregation[]
  session:PresenceSessionRecord
  checks:PresenceCheck[]
  locale:AppLocale
  onChanged:()=>Promise<void>
}){
  const candidates=units.filter(unit=>unit.id!==congregationId)
  const [expanded,setExpanded]=useState(false)
  const [homeUnit,setHomeUnit]=useState('')
  const [people,setPeople]=useState<PresencePerson[]>([])
  const [needle,setNeedle]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [loadedUnit,setLoadedUnit]=useState('')
  const latest=useMemo(()=>latestChecksByPerson(checks),[checks])
  const canManage=canImportJourneyMembers(access)&&access.canManagePresence
  const copy=locale==='en'?{
    title:'Member visiting from another campus',intro:'Use the existing person record. The visit is a real presence, never an absence or a new member profile.',
    home:'Home campus',search:'Search people by name',open:'Find member from another campus',
    load:'Load existing people',missing:'Choose another campus first',record:'Confirm visit',
    undo:'Undo visit with reason',seen:'Visit confirmed',error:'Could not check the person or register this visit.',
    empty:'No matching person in this campus.',reason:'Reason for correcting this recorded visit:',
    note:'This operation is reserved for a church administrator; home campus and person ID remain unchanged.',
  }:locale==='es'?{
    title:'Miembro visitante de otra sede',intro:'Use la misma ficha. La visita es una presencia real, nunca una ausencia ni un registro nuevo.',
    home:'Sede de origen',search:'Buscar por nombre',open:'Buscar persona de otra sede',
    load:'Consultar personas',missing:'Elija otra sede',record:'Confirmar visita',
    undo:'Deshacer visita con motivo',seen:'Visita confirmada',error:'No se pudo registrar o corregir la visita.',
    empty:'No hay personas coincidentes.',reason:'Motivo para corregir la visita:',
    note:'Solo administración de la iglesia; la sede principal y el ID no cambian.',
  }:{
    title:'Membro visitando outra unidade',intro:'Use o cadastro existente. A visita é uma presença real, nunca uma falta nem um novo cadastro.',
    home:'Unidade de origem',search:'Buscar nome da pessoa',open:'Localizar membro de outra unidade',
    load:'Consultar pessoas',missing:'Selecione a unidade de origem',record:'Confirmar visita',
    undo:'Desfazer visita com motivo',seen:'Visita confirmada',error:'Não foi possível registrar ou corrigir a visita.',
    empty:'Nenhuma pessoa encontrada nessa unidade.',reason:'Motivo para corrigir esta visita:',
    note:'Operação exclusiva da administração da igreja; unidade principal e ID permanecem intactos.',
  }
  if(!canManage||!candidates.length||session.status!=='open')return null
  const load=async()=>{
    if(!homeUnit)return
    setBusy(true);setError('')
    try{setPeople(await listPresencePeople(access.organizationId,homeUnit));setLoadedUnit(homeUnit)}
    catch(cause){console.error('Cross-campus person lookup denied',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  const record=async(person:PresencePerson,undo=false)=>{
    const previous=latest.get(person.id)
    if(undo&&(!previous||previous.state!=='present_confirmed'))return
    if(!undo&&previous?.state==='present_confirmed')return
    const reason=previous?window.prompt(copy.reason)?.trim():undefined
    if(previous&&(!reason||reason.length>240))return
    setBusy(true);setError('')
    try{
      await recordPresenceCheck({
        organizationId:access.organizationId,congregationId,
        sessionId:session.id,personId:person.id,actorId:access.userId,
        state:undo?'unverified':'present_confirmed',
        correctedFromCheckId:previous?.id,
        correctionReason:reason,
      })
      await onChanged()
    }catch(cause){console.error('Cross-campus attendance denied',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  const matches=people.filter(person=>person.name.toLocaleLowerCase(locale).includes(needle.trim().toLocaleLowerCase(locale))).slice(0,40)
  return <section className="cross-campus-panel">
    <header><UsersRound size={19}/><div><h2>{copy.title}</h2><p>{copy.intro}</p></div></header>
    <button type="button" onClick={()=>setExpanded(e=>!e)} aria-expanded={expanded}>{copy.open}</button>
    {expanded?<div className="cross-campus-body">
      <label>{copy.home}<select value={homeUnit} disabled={busy} onChange={e=>{setHomeUnit(e.target.value);setPeople([]);setLoadedUnit('')}}>
        <option value="">—</option>{candidates.map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}
      </select></label>
      <button type="button" disabled={busy||!homeUnit} onClick={()=>void load()}>{copy.load}</button>
      {loadedUnit===homeUnit&&homeUnit?<><label>{copy.search}<input value={needle} onChange={e=>setNeedle(e.target.value)} /></label>
        <div className="cross-campus-people">{matches.length?matches.map(person=>{
          const confirmed=latest.get(person.id)?.state==='present_confirmed'
          return <article key={person.id}><div><strong>{person.name}</strong>{confirmed?<small>{copy.seen}</small>:null}</div>
            <button type="button" disabled={busy} onClick={()=>void record(person,confirmed)}>{confirmed?<><RotateCcw size={15}/>{copy.undo}</>:<><CheckCircle2 size={15}/>{copy.record}</>}</button>
          </article>
        }):<p>{copy.empty}</p>}</div>
      </>:null}
      {error?<p role="alert" className="cross-campus-error">{error}</p>:null}
      <p className="cross-campus-note">{copy.note}</p>
    </div>:null}
  </section>
}
