import {useCallback,useEffect,useMemo,useState} from 'react'
import {BookOpenCheck,PlusCircle,ShieldCheck,UsersRound} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyCongregation,JourneyPersonRecord} from './journeyRepository'
import {listJourneyCongregations,listJourneyPeople} from './journeyRepository'
import {canImportJourneyMembers} from './memberBulkImportRepository'
import {
  listJourneyOptionalProjects,createJourneyOptionalProject,changeJourneyProjectStatus,
  enrollJourneyPersonInProject,listJourneyProjectEnrollments,
  type JourneyOptionalProject,type JourneyProjectEnrollment,
} from './journeyOptionalProjects'
import './OptionalProjectsPanel.css'

export function OptionalProjectsPanel({access,locale}:{
  access:JourneyAccessContext
  locale:AppLocale
}){
  const [units,setUnits]=useState<JourneyCongregation[]>([])
  const [projects,setProjects]=useState<JourneyOptionalProject[]>([])
  const [enrollments,setEnrollments]=useState<JourneyProjectEnrollment[]>([])
  const [people,setPeople]=useState<JourneyPersonRecord[]>([])
  const [selectedProject,setSelectedProject]=useState('')
  const [selectedUnit,setSelectedUnit]=useState('')
  const [selectedPerson,setSelectedPerson]=useState('')
  const [name,setName]=useState('')
  const [description,setDescription]=useState('')
  const [unitIds,setUnitIds]=useState<string[]>([])
  const [showCreate,setShowCreate]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const canManage=canImportJourneyMembers(access)
  const project=projects.find(item=>item.id===selectedProject)
  const available=useMemo(()=>people.filter(person=>!enrollments.some(row=>row.personId===person.id)),[people,enrollments])
  const copy=locale==='en'?
    {title:'Optional programs',intro:'A church starts without any program. Create explicitly, activate when ready and enroll existing person IDs without duplication.',
     new:'New program',name:'Program name',description:'Purpose (optional)',unit:'Units where the program operates',
     create:'Create draft',activate:'Activate this program',archive:'Archive program',empty:'No optional program registered.',
     chosen:'Selected program',status:'Status',version:'Version',enroll:'Enroll an existing person',pick:'Select person',
     add:'Enroll person',members:'Enrolled people',cancel:'Cancel',saved:'Change saved with version history.',
     error:'Could not complete this action. Review authorization and active unit.',privacy:'An enrollment is a relationship, not attendance or consent.',
     confirm:'Are you sure? This changes the program lifecycle.',draft:'Draft',active:'Active',archived:'Archived'}
    :locale==='es'?
    {title:'Programas opcionales',intro:'Una iglesia comienza sin programas obligatorios. Cree, active y vincule personas existentes sin duplicarlas.',
     new:'Nuevo programa',name:'Nombre del programa',description:'Propósito (opcional)',unit:'Sedes donde participa el programa',
     create:'Crear borrador',activate:'Activar programa',archive:'Archivar programa',empty:'No hay programas registrados.',
     chosen:'Programa seleccionado',status:'Estado',version:'Versión',enroll:'Incluir una persona existente',pick:'Seleccionar persona',
     add:'Incluir persona',members:'Personas incluidas',cancel:'Cancelar',saved:'Cambio guardado con historial de versión.',
     error:'No se pudo completar. Revise permisos y sede.',privacy:'Un vínculo no presume asistencia ni consentimiento.',
     confirm:'¿Confirma el cambio de estado del programa?',draft:'Borrador',active:'Activo',archived:'Archivado'}
    :{title:'Projetos opcionais',intro:'Uma igreja começa sem projetos obrigatórios. Crie, ative quando estiver pronto e vincule pessoas existentes sem duplicar cadastros.',
     new:'Novo projeto',name:'Nome do projeto',description:'Propósito (opcional)',unit:'Unidades participantes',
     create:'Criar rascunho',activate:'Ativar projeto',archive:'Arquivar projeto',empty:'Nenhum projeto opcional registrado.',
     chosen:'Projeto selecionado',status:'Situação',version:'Versão',enroll:'Vincular pessoa já cadastrada',pick:'Selecionar pessoa',
     add:'Vincular pessoa',members:'Pessoas vinculadas',cancel:'Cancelar',saved:'Alteração registrada com histórico de versões.',
     error:'Não foi possível concluir. Confira permissões e unidade.',privacy:'Inscrição em projeto não é presença nem consentimento.',
     confirm:'Confirma a mudança de situação deste projeto?',draft:'Rascunho',active:'Ativo',archived:'Arquivado'}

  const refresh=useCallback(async()=>{
    const [nextUnits,nextProjects]=await Promise.all([listJourneyCongregations(access),listJourneyOptionalProjects(access)])
    setUnits(nextUnits);setProjects(nextProjects)
    setSelectedProject(current=>nextProjects.some(item=>item.id===current)?current:nextProjects[0]?.id||'')
    setUnitIds(current=>current.length?current:nextUnits[0]?[nextUnits[0].id]:[])
  },[access])
  useEffect(()=>{
    if(!canManage)return
    let alive=true
    void refresh().catch(cause=>{console.error('Projects load failed',cause);if(alive)setError(copy.error)})
    return()=>{alive=false}
  // Copy strings do not affect Firestore ownership.
  },[refresh,canManage])
  useEffect(()=>{
    if(!canManage||!project){setEnrollments([]);return}
    let alive=true
    void listJourneyProjectEnrollments(access,project.id)
      .then(rows=>{if(alive)setEnrollments(rows)})
      .catch(()=>{if(alive)setError(copy.error)})
    return()=>{alive=false}
  },[access,project?.id,canManage])
  useEffect(()=>{
    if(!canManage||!project){setPeople([]);setSelectedUnit('');return}
    const unit=project.unitIds.includes(selectedUnit)?selectedUnit:project.unitIds[0]
    if(unit!==selectedUnit)setSelectedUnit(unit)
    if(!unit){setPeople([]);return}
    let alive=true
    void listJourneyPeople(access.organizationId,unit)
      .then(rows=>{if(alive){setPeople(rows);setSelectedPerson('')}})
      .catch(()=>{if(alive)setError(copy.error)})
    return()=>{alive=false}
  },[access,project?.id,project?.unitIds.join('|'),selectedUnit,canManage])
  const operate=async(fn:()=>Promise<unknown>)=>{
    setBusy(true);setError('');setMessage('')
    try{
      await fn();await refresh()
      if(project) setEnrollments(await listJourneyProjectEnrollments(access,project.id))
      setMessage(copy.saved)
    }catch(cause){console.error('Project update failed',cause);setError(copy.error)}
    finally{setBusy(false)}
  }
  if(!canManage)return null
  const statusText=(status:'draft'|'active'|'archived')=>status==='draft'?copy.draft:status==='active'?copy.active:copy.archived
  return <section className="optional-projects-panel">
    <header><BookOpenCheck size={23}/><div><h2>{copy.title}</h2><p>{copy.intro}</p></div></header>
    {error?<p className="optional-projects-error" role="alert">{error}</p>:null}
    {message?<p className="optional-projects-success" role="status">{message}</p>:null}
    <button type="button" className="optional-projects-button" onClick={()=>setShowCreate(v=>!v)} aria-expanded={showCreate}><PlusCircle size={16}/>{showCreate?copy.cancel:copy.new}</button>
    {showCreate?<form onSubmit={e=>{e.preventDefault();void operate(async()=>{
      const id=await createJourneyOptionalProject({access,name,description,unitIds})
      setName('');setDescription('');setShowCreate(false);setSelectedProject(id)
    })}} className="optional-projects-fields">
      <label>{copy.name}<input minLength={2} maxLength={80} required value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>{copy.description}<input maxLength={280} value={description} onChange={e=>setDescription(e.target.value)}/></label>
      <fieldset><legend>{copy.unit}</legend>{units.map(unit=><label key={unit.id}><input type="checkbox" checked={unitIds.includes(unit.id)} onChange={e=>setUnitIds(list=>e.target.checked?[...list,unit.id]:list.filter(id=>id!==unit.id))}/>{unit.name}</label>)}</fieldset>
      <button className="optional-projects-primary" type="submit" disabled={busy||name.trim().length<2||!unitIds.length}>{copy.create}</button>
    </form>:null}
    {!projects.length?<p className="optional-projects-muted">{copy.empty}</p>:<>
      <label className="optional-projects-select">{copy.chosen}<select value={selectedProject} disabled={busy} onChange={e=>setSelectedProject(e.target.value)}>{projects.map(item=><option key={item.id} value={item.id}>{item.name} · {statusText(item.status)}</option>)}</select></label>
      {project?<article className="optional-projects-detail"><div><strong>{project.name}</strong><span>{copy.status}: {statusText(project.status)} · {copy.version}: {project.version}</span><p>{project.description}</p></div>
        {project.status==='draft'?<button className="optional-projects-primary" type="button" disabled={busy} onClick={()=>{if(window.confirm(copy.confirm))void operate(()=>changeJourneyProjectStatus({access,project,status:'active'}))}}>{copy.activate}</button>:null}
        {project.status==='active'?<button className="optional-projects-button" type="button" disabled={busy} onClick={()=>{if(window.confirm(copy.confirm))void operate(()=>changeJourneyProjectStatus({access,project,status:'archived'}))}}>{copy.archive}</button>:null}
        {project.status==='active'?<div className="optional-projects-enroll">
          <div><UsersRound size={16}/><b>{copy.enroll}</b></div>
          <label>{copy.unit}<select value={selectedUnit} onChange={e=>setSelectedUnit(e.target.value)}>{units.filter(item=>project.unitIds.includes(item.id)).map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
          <label>{copy.pick}<select value={selectedPerson} onChange={e=>setSelectedPerson(e.target.value)}><option value="">—</option>{available.map(person=><option key={person.id} value={person.id}>{person.preferredName||person.name}</option>)}</select></label>
          <button className="optional-projects-primary" disabled={busy||!selectedPerson} onClick={()=>{const person=people.find(p=>p.id===selectedPerson);if(person)void operate(()=>enrollJourneyPersonInProject({access,project,person}))}}>{copy.add}</button>
        </div>:null}
        <p className="optional-projects-count">{copy.members}: {enrollments.length}</p>
      </article>:null}
    </>}
    <p className="optional-projects-muted"><ShieldCheck size={15}/>{copy.privacy}</p>
  </section>
}
