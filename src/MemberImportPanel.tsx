import {useMemo,useState} from 'react'
import {ClipboardPaste,FileText,ShieldCheck,UsersRound} from 'lucide-react'
import type {AppLocale} from './i18n'
import type {JourneyAccessContext,JourneyPersonRecord} from './journeyRepository'
import {previewMemberImport,prepareApprovedMemberImport,type MemberImportRow} from './memberBulkImport'
import {canImportJourneyMembers,importApprovedJourneyMembers} from './memberBulkImportRepository'
import './MemberImportPanel.css'

export function MemberImportPanel({access,congregationId,people,locale,onCompleted}:{
  access:JourneyAccessContext
  congregationId:string
  people:JourneyPersonRecord[]
  locale:AppLocale
  onCompleted:()=>Promise<void>
}){
  const [open,setOpen]=useState(false)
  const [source,setSource]=useState('')
  const [rows,setRows]=useState<MemberImportRow[]>([])
  const [selected,setSelected]=useState<number[]>([])
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const [busy,setBusy]=useState(false)
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID())
  const permitted=canImportJourneyMembers(access)
  const ready=useMemo(()=>rows.filter(row=>row.status==='ready'||row.status==='review'),[rows])
  const copy=locale==='en'?{
    title:'Import church members',hint:'Paste a list or upload a CSV with Name;Preferred name. Review each row before saving. No contact or attendance is assumed.',
    toggle:'Open member import',close:'Close',input:'Names (one per line, or CSV with two columns)',file:'Choose CSV/TXT',
    preview:'Preview and validate',ready:'Ready',review:'Check name',duplicate:'Possible duplicate — not imported',invalid:'Invalid row — not imported',
    choose:'Approve',all:'Select reviewed valid entries',none:'Clear selections',save:'Import selected members',
    empty:'Paste a list to preview it.',done:'Members imported:',confirm:'Confirm creating these people as members without automatically authorizing messages?',
    fail:'Import could not be completed. Check duplicates, permissions or file content.',count:'Selected records',blocked:'Rows requiring correction are never saved.',
  }:locale==='es'?{
    title:'Importar miembros',hint:'Pegue una lista o importe CSV con Nombre;Nombre preferido. Revise cada fila. No se presume contacto ni asistencia.',
    toggle:'Abrir importación',close:'Cerrar',input:'Nombres (uno por línea o CSV de dos columnas)',file:'Seleccionar CSV/TXT',
    preview:'Revisar y validar',ready:'Listo',review:'Revisar nombre',duplicate:'Posible duplicado — no se importa',invalid:'Fila inválida — no se importa',
    choose:'Aprobar',all:'Seleccionar entradas revisadas',none:'Desmarcar todas',save:'Importar miembros seleccionados',
    empty:'Pegue una lista para revisarla.',done:'Miembros importados:',confirm:'¿Confirma crear estos miembros sin autorización automática de mensajes?',
    fail:'No se pudo importar. Revise duplicados, permisos o contenido.',count:'Registros seleccionados',blocked:'Nunca se guardan filas que requieren corrección.',
  }:{
    title:'Importar membros',hint:'Cole uma lista ou envie CSV com Nome;Nome preferido. Revise as linhas antes de salvar. Contato e presença não são presumidos.',
    toggle:'Abrir importação de membros',close:'Fechar',input:'Nomes (um por linha ou CSV com duas colunas)',file:'Escolher CSV/TXT',
    preview:'Pré-visualizar e validar',ready:'Pronto',review:'Conferir nome',duplicate:'Possível duplicado — não importar',invalid:'Linha inválida — não importar',
    choose:'Aprovar',all:'Selecionar registros revisados',none:'Limpar seleção',save:'Importar membros selecionados',
    empty:'Cole uma lista para conferir.',done:'Membros importados:',confirm:'Confirma cadastrar essas pessoas como membros, sem autorizar mensagens automaticamente?',
    fail:'Não foi possível importar. Confira nomes duplicados, permissões e os dados.',count:'Registros selecionados',blocked:'Linhas inválidas ou duplicadas nunca são gravadas.',
  }
  if(!permitted)return null
  const preview=()=>{
    try {
      const parsed=previewMemberImport(source,people)
      setRows(parsed);setSelected([]);setError('');setFeedback('')
    }catch(cause){
      console.error('Member import parser failed',cause)
      setRows([]);setSelected([]);setError(copy.fail)
    }
  }
  const importRows=async()=>{
    if(!selected.length || busy)return
    let approved:Array<{name:string;preferredName:string}>
    try{approved=prepareApprovedMemberImport(rows,selected)}catch{setError(copy.fail);return}
    if(!window.confirm(copy.confirm))return
    setBusy(true);setError('');setFeedback('')
    try{
      const result=await importApprovedJourneyMembers({access,congregationId,approved,requestId})
      setRequestId(crypto.randomUUID())
      setRows([]);setSource('');setSelected([])
      await onCompleted()
      setFeedback(copy.done+' '+result.created)
    }catch(cause){
      console.error('Member import commit rejected',cause)
      setError(copy.fail)
    }finally{setBusy(false)}
  }
  return <section className="member-import-panel">
    <div className="member-import-title"><UsersRound size={20}/><div><h2>{copy.title}</h2><p>{copy.hint}</p></div></div>
    <button type="button" className="member-import-toggle" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?copy.close:copy.toggle}</button>
    {feedback?<p role="status" className="member-import-success">{feedback}</p>:null}
    {open?<div className="member-import-body">
      <label>{copy.input}<textarea value={source} disabled={busy} onChange={e=>{setSource(e.target.value);setRows([]);setSelected([])}} rows={5} placeholder={'Nome;Nome preferido\nMaria da Silva;Maria\nJoão Pereira;João'}/></label>
      <label className="member-import-file"><FileText size={16}/>{copy.file}<input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={busy} onChange={async e=>{
        const file=e.target.files?.[0]
        if(!file)return
        if(file.size>50_000){setError(copy.fail);return}
        const text=await file.text()
        setSource(text);setRows([]);setSelected([]);setError('')
      }}/></label>
      <button className="member-import-toggle" type="button" disabled={busy||!source.trim()} onClick={preview}><ClipboardPaste size={16}/>{copy.preview}</button>
      {error?<p className="member-import-error" role="alert">{error}</p>:null}
      {rows.length?<div className="member-import-review">
        <p><ShieldCheck size={15}/>{copy.blocked}</p>
        <div className="member-import-choices"><button type="button" disabled={busy} onClick={()=>setSelected(ready.map(row=>row.rowNumber))}>{copy.all}</button><button type="button" disabled={busy} onClick={()=>setSelected([])}>{copy.none}</button></div>
        <div className="member-import-rows">{rows.map(row=>{
          const blocked=row.status==='invalid'||row.status==='duplicate'
          return <label key={row.rowNumber} className={blocked?'member-import-blocked':''}>
            <input type="checkbox" disabled={busy||blocked} checked={selected.includes(row.rowNumber)} aria-label={copy.choose+' '+row.name} onChange={e=>setSelected(existing=>e.target.checked?[...existing,row.rowNumber]:existing.filter(id=>id!==row.rowNumber))}/>
            <span className="member-import-name"><strong>{row.name||'—'}</strong><small>{row.preferredName||'—'}</small></span>
            <span className="member-import-state">{row.status==='ready'?copy.ready:row.status==='review'?copy.review:row.status==='duplicate'?copy.duplicate:copy.invalid}</span>
          </label>
        })}</div>
        <p>{copy.count}: {selected.length}</p>
        <button type="button" className="member-import-save" disabled={busy||selected.length===0} onClick={()=>void importRows()}>{busy?'…':copy.save}</button>
      </div>:<p className="member-import-help">{copy.empty}</p>}
    </div>:null}
  </section>
}
