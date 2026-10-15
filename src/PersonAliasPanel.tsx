import {useCallback,useEffect,useState} from 'react'
import {Link2,RotateCcw,ShieldCheck} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyCongregation,JourneyPersonRecord} from './journeyRepository'
import {listJourneyPeople} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {
  getJourneyPersonAlias,listJourneyPersonInboundAliases,linkJourneyPersonAlias,
  revertJourneyPersonAlias,type JourneyPersonAlias,
} from './journeyPersonAliases'
import './PersonAliasPanel.css'

export function PersonAliasPanel({access,person,people,units,locale}:{
  access:JourneyAccessContext
  person:JourneyPersonRecord
  people:JourneyPersonRecord[]
  units:JourneyCongregation[]
  locale:AppLocale
}){
  const [alias,setAlias]=useState<JourneyPersonAlias|null>(null)
  const [inbound,setInbound]=useState<JourneyPersonAlias[]>([])
  const [expanded,setExpanded]=useState(false)
  const [unitId,setUnitId]=useState(person.congregationId)
  const [options,setOptions]=useState<JourneyPersonRecord[]>(people)
  const [canonicalId,setCanonicalId]=useState('')
  const [reason,setReason]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const allowed=canImportJourneyMembers(access)
  const copy=locale==='en'?{
    title:'Review duplicate person records',intro:'Human-confirmed logical alias only. Both original IDs, attendance histories, family links and consent remain untouched.',
    open:'Review possible duplicate',close:'Close',unit:'Where is the primary person recorded?',
    primary:'Primary person (confirmed same identity)',reason:'Document how identity was verified (not pastoral details)',
    search:'Load people from this campus',link:'Confirm reversible alias',unlink:'Reverse link with reason',
    linked:'Linked to person ID:',inbound:'Other records linked to this person:',
    warning:'Confirm independently that these are the same individual. Names alone are not evidence. Do not merge contacts, guardian rights or consent.',
    confirm:'I verified identity independently and understand neither record nor history will be erased. Continue?',
    done:'Link status saved. Original records remain intact.',
    error:'Could not save this reconciliation. Check identity, permissions and stale data.',
    noOptions:'No other person records found in this campus.',
    reverted:'This link was reversed. The historical record is retained; open a new review for a different decision.',
  }:locale==='es'?{
    title:'Revisar fichas duplicadas',intro:'Vínculo lógico confirmado por un administrador. Los IDs, históricos, familias y permisos siguen intactos.',
    open:'Revisar posible duplicado',close:'Cerrar',unit:'¿Dónde está la ficha principal?',
    primary:'Ficha principal (misma persona confirmada)',reason:'Describa cómo verificó la identidad, sin notas pastorales',
    search:'Consultar personas de la sede',link:'Confirmar vínculo reversible',unlink:'Revertir vínculo con motivo',
    linked:'Vinculada a la ficha:',inbound:'Otras fichas vinculadas:',
    warning:'Confirme la identidad por medios independientes. El nombre no es prueba. No mezclar teléfonos, tutelas ni consentimientos.',
    confirm:'Confirmo que verifiqué la identidad y que no se borrará ningún registro. ¿Continuar?',
    done:'Vínculo guardado; los registros originales permanecen.',
    error:'No fue posible guardar. Revise permisos y datos.',
    noOptions:'No hay otras personas disponibles en esta sede.',
    reverted:'Este vínculo fue revertido y el historial permanece; solicite una nueva revisión para otro vínculo.',
  }:{
    title:'Conciliação de cadastros duplicados',intro:'Vínculo lógico confirmado por um administrador. IDs originais, presenças, famílias e consentimentos permanecem intactos.',
    open:'Conferir possível duplicidade',close:'Fechar',unit:'Em qual unidade está o cadastro principal?',
    primary:'Cadastro principal (mesma pessoa confirmada)',reason:'Como a identidade foi conferida? Não inclua informações pastorais',
    search:'Consultar cadastros da unidade',link:'Confirmar vínculo reversível',unlink:'Desfazer vínculo com justificativa',
    linked:'Vinculado ao cadastro:',inbound:'Outros cadastros vinculados:',
    warning:'Confira a identidade por informação independente: nomes iguais não bastam. O vínculo não transfere telefone, tutela ou consentimento.',
    confirm:'Confirmei a identidade sem deduções e compreendo que nenhum cadastro ou histórico será apagado. Continuar?',
    done:'Vínculo registrado; cadastros originais preservados.',
    error:'Não foi possível registrar a conciliação. Confira permissões e informações.',
    noOptions:'Nenhum outro cadastro nesta unidade.',
    reverted:'O vínculo foi desfeito, mantendo o histórico. Para outra conciliação, solicite nova revisão administrativa.',
  }
  const reload=useCallback(async()=>{
    const [nextAlias,nextInbound]=await Promise.all([
      getJourneyPersonAlias(access,person.id),
      listJourneyPersonInboundAliases(access,person.id),
    ])
    setAlias(nextAlias);setInbound(nextInbound)
  },[access,person.id])
  useEffect(()=>{
    if(!allowed)return
    let active=true
    void Promise.all([getJourneyPersonAlias(access,person.id),listJourneyPersonInboundAliases(access,person.id)])
      .then(([a,i])=>{if(active){setAlias(a);setInbound(i)}})
      .catch(cause=>{console.error('Person alias lookup failed',cause);if(active)setError(copy.error)})
    return()=>{active=false}
  },[access,person.id,allowed])
  if(!allowed)return null
  const available=options.filter(candidate=>candidate.id!==person.id)
  const loadOptions=async(nextUnit:string)=>{
    setUnitId(nextUnit);setCanonicalId('');setError('')
    if(nextUnit===person.congregationId){setOptions(people);return}
    setBusy(true)
    try{setOptions(await listJourneyPeople(access.organizationId,nextUnit))}
    catch(cause){console.error('Cross-unit alias lookup denied',cause);setOptions([]);setError(copy.error)}
    finally{setBusy(false)}
  }
  const save=async(reversal:boolean)=>{
    const destination=available.find(item=>item.id===canonicalId)
    if(!reversal&&!destination)return
    const normalized=reason.trim()
    if(normalized.length<15||normalized.length>300||!window.confirm(copy.confirm))return
    setBusy(true);setError('');setFeedback('')
    try{
      if(reversal&&alias)await revertJourneyPersonAlias({access,alias,reason:normalized})
      else if(destination)await linkJourneyPersonAlias({access,duplicate:person,canonical:destination,reason:normalized})
      await reload();setExpanded(false);setReason('');setFeedback(copy.done)
    }catch(cause){console.error('Person alias reconciliation rejected',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  return <section className="person-alias-panel">
    <header><Link2 size={20}/><div><h2>{copy.title}</h2><p>{copy.intro}</p></div></header>
    {alias?.status==='active'?<p className="person-alias-link"><ShieldCheck size={15}/>{copy.linked} <code>{alias.canonicalPersonId}</code></p>:null}
    {inbound.length?<p className="person-alias-link">{copy.inbound} {inbound.map(v=>v.duplicatePersonId).join(', ')}</p>:null}
    {error?<p role="alert" className="person-alias-error">{error}</p>:null}
    {feedback?<p role="status" className="person-alias-success">{feedback}</p>:null}
    <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?copy.close:copy.open}</button>
    {expanded?<div className="person-alias-fields">
      <p className="person-alias-warning">{copy.warning}</p>
      {!alias?<>
        <label>{copy.unit}<select disabled={busy} value={unitId} onChange={e=>void loadOptions(e.target.value)}>
          {units.map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select></label>
        <label>{copy.primary}<select disabled={busy} value={canonicalId} onChange={e=>setCanonicalId(e.target.value)}>
          <option value="">—</option>
          {available.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.preferredName||candidate.name} ({candidate.id.slice(0,8)})</option>)}
        </select></label>
        {!available.length?<p className="person-alias-warning">{copy.noOptions}</p>:null}
      </>:null}
      {alias?.status==='reverted'?<p className="person-alias-warning">{copy.reverted}</p>:null}
      {alias?.status!=='reverted'?<label>{copy.reason}<textarea value={reason} maxLength={300} minLength={15} rows={3} onChange={e=>setReason(e.target.value)} /></label>:null}
      {alias?.status!=='reverted'?<button type="button" disabled={busy||reason.trim().length<15||(!alias?.status||alias.status!=='active')&&!canonicalId} onClick={()=>void save(alias?.status==='active')}>
        {alias?.status==='active'?<RotateCcw size={16}/>:<Link2 size={16}/>}
        {alias?.status==='active'?copy.unlink:copy.link}
      </button>:null}
    </div>:null}
  </section>
}
