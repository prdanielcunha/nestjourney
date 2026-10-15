import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Link2, ShieldCheck, UsersRound, X } from 'lucide-react'
import type { AppLocale } from './i18n'
import type { JourneyAccessContext, JourneyPersonRecord } from './journeyRepository'
import {
  FAMILY_RELATIONS, canManageJourneyFamilies, createJourneyFamily, loadJourneyFamilies,
  recordJourneyFamilyEvent, type FamilyRelation, type JourneyFamily, type JourneyFamilyEvent,
} from './journeyFamilies'
import './FamilyPanel.css'

const labels: Record<AppLocale, Record<FamilyRelation, string>> = {
  'pt-BR': { parent: 'Pai/mãe', child: 'Filho(a)', spouse: 'Cônjuge', sibling: 'Irmão/irmã', relative: 'Familiar', guardian: 'Responsável', other: 'Outro vínculo' },
  en: { parent: 'Parent', child: 'Child', spouse: 'Spouse', sibling: 'Sibling', relative: 'Relative', guardian: 'Guardian', other: 'Other relationship' },
  es: { parent: 'Padre/madre', child: 'Hijo(a)', spouse: 'Cónyuge', sibling: 'Hermano(a)', relative: 'Familiar', guardian: 'Responsable', other: 'Otro vínculo' },
}

export function FamilyPanel({ access, person, people, locale }: {
  access: JourneyAccessContext
  person: JourneyPersonRecord
  people: JourneyPersonRecord[]
  locale: AppLocale
}) {
  const [families, setFamilies] = useState<JourneyFamily[]>([])
  const [links, setLinks] = useState<JourneyFamilyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [familyLabel, setFamilyLabel] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [relation, setRelation] = useState<FamilyRelation>('relative')
  const [guardian, setGuardian] = useState(false)

  const canManage = canManageJourneyFamilies(access)
  const refresh = useCallback(async () => {
    if (!canManage) return
    const result = await loadJourneyFamilies(access, person.congregationId)
    setFamilies(result.families)
    setLinks(result.activeLinks)
  }, [access, person.congregationId, canManage])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    if (!canManage) { setLoading(false); return }
    void loadJourneyFamilies(access, person.congregationId)
      .then(result => { if (alive) { setFamilies(result.families); setLinks(result.activeLinks) } })
      .catch(() => { if (alive) setError(locale === 'en' ? 'Could not load family links.' : locale === 'es' ? 'No fue posible cargar las familias.' : 'Não foi possível carregar os vínculos familiares.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [access, person.congregationId, canManage, locale])

  const current = useMemo(() => links.filter(link => link.personId === person.id), [links, person.id])
  const available = useMemo(() => families.filter(family => !current.some(link => link.familyId === family.id)), [families, current])
  const names = new Map(people.map(item => [item.id, item.preferredName || item.name]))
  const copy = locale === 'en'
    ? { title: 'Family links', description: 'Only explicit, confirmed relationships. This is not inferred from names, addresses or attendance.',
      existing: 'Link to an existing family', create: 'Create family', family: 'Family name', relation: 'Declared relationship',
      guardian: 'Legal guardian confirmed by the operator', add: 'Save relationship', newFamily: 'Create and link',
      cancel: 'Cancel', remove: 'Unlink', empty: 'No family relationship registered.',
      reason: 'Reason for unlinking (required, at least 3 characters):', success: 'Family relationship saved.',
      link: 'Link', members: 'People explicitly linked', notice: 'Do not register a guardian without appropriate confirmation.' }
    : locale === 'es'
      ? { title: 'Vínculos familiares', description: 'Solo relaciones declaradas y confirmadas. No se infieren por apellido, dirección ni asistencia.',
        existing: 'Vincular a una familia existente', create: 'Crear familia', family: 'Nombre de la familia', relation: 'Relación declarada',
        guardian: 'Responsable legal confirmado por el operador', add: 'Guardar relación', newFamily: 'Crear y vincular',
        cancel: 'Cancelar', remove: 'Desvincular', empty: 'Sin vínculos familiares registrados.',
        reason: 'Motivo para desvincular (obligatorio, mínimo 3 caracteres):', success: 'Vínculo familiar guardado.',
        link: 'Vínculo', members: 'Personas vinculadas explícitamente', notice: 'No marque un responsable legal sin confirmación adecuada.' }
      : { title: 'Vínculos familiares', description: 'Somente relações declaradas e confirmadas. Não deduzimos por sobrenome, endereço ou frequência.',
        existing: 'Vincular a família existente', create: 'Criar família', family: 'Nome da família', relation: 'Vínculo declarado',
        guardian: 'Responsável legal confirmado pelo operador', add: 'Salvar vínculo', newFamily: 'Criar e vincular',
        cancel: 'Cancelar', remove: 'Desvincular', empty: 'Nenhum vínculo familiar registrado.',
        reason: 'Motivo para desvincular (obrigatório, mínimo 3 caracteres):', success: 'Vínculo familiar registrado.',
        link: 'Vínculo', members: 'Pessoas vinculadas explicitamente', notice: 'Não marque responsável legal sem confirmação adequada.' }

  const save = async (mode: 'create' | 'link') => {
    setBusy(true); setError(''); setSuccess('')
    try {
      if (mode === 'create') {
        await createJourneyFamily({ access, person, label: familyLabel, relationshipType: relation, guardianFlag: guardian })
        setFamilyLabel(''); setCreateOpen(false)
      } else {
        const family = families.find(item => item.id === familyId)
        if (!family) throw new Error('family_not_selected')
        if (current.some(link => link.familyId === family.id)) throw new Error('family_already_linked')
        await recordJourneyFamilyEvent({ access, family, person, action: 'link', relationshipType: relation, guardianFlag: guardian })
        setFamilyId('')
      }
      await refresh()
      setSuccess(copy.success)
    } catch (cause) {
      console.error('Family relationship save failed', cause)
      setError(locale === 'en' ? 'Could not save the family link. Check your permission and fields.' : locale === 'es' ? 'No se pudo guardar el vínculo. Revise el permiso y los campos.' : 'Não foi possível salvar o vínculo. Confira suas permissões e os campos.')
    } finally { setBusy(false) }
  }

  const unlink = async (link: JourneyFamilyEvent) => {
    const family = families.find(item => item.id === link.familyId)
    if (!family) return
    const reason = window.prompt(copy.reason)?.trim()
    if (!reason || reason.length < 3 || reason.length > 200) return
    setBusy(true); setError(''); setSuccess('')
    try {
      await recordJourneyFamilyEvent({
        access, person, family, action: 'unlink',
        relationshipType: link.relationshipType, guardianFlag: false, reason,
      })
      await refresh()
      setSuccess(copy.success)
    } catch (cause) {
      console.error('Family unlink failed', cause)
      setError(locale === 'en' ? 'Could not unlink this family.' : locale === 'es' ? 'No se pudo desvincular.' : 'Não foi possível desvincular esta família.')
    } finally { setBusy(false) }
  }

  if (!canManage) return null
  return <section className="journey-family-panel" aria-label={copy.title}>
    <header className="journey-family-head"><span className="journey-family-icon"><UsersRound size={20}/></span><div><h2>{copy.title}</h2><p>{copy.description}</p></div></header>
    {loading ? <p className="journey-family-muted">…</p> : <>
      {error ? <p className="journey-family-error" role="alert">{error}</p> : null}
      {success ? <p className="journey-family-success" role="status"><Check size={15}/>{success}</p> : null}
      <div className="journey-family-current">
        {current.length ? current.map(link => {
          const family = families.find(item => item.id === link.familyId)
          const members = links.filter(item => item.familyId === link.familyId && item.personId !== person.id)
          return <article key={link.familyId} className="journey-family-linked">
            <div><strong>{family?.label || copy.title}</strong><span>{labels[locale][link.relationshipType]}{link.guardianFlag ? ' · '+copy.guardian : ''}</span>
              {members.length ? <small>{copy.members}: {members.map(item => names.get(item.personId) || '—').join(', ')}</small> : null}
            </div>
            <button type="button" disabled={busy} onClick={() => void unlink(link)} aria-label={copy.remove}><X size={15}/>{copy.remove}</button>
          </article>
        }) : <p className="journey-family-muted">{copy.empty}</p>}
      </div>
      <div className="journey-family-fields">
        <label>{copy.relation}<select disabled={busy} value={relation} onChange={e => {setRelation(e.target.value as FamilyRelation);setGuardian(false)}}>
          {FAMILY_RELATIONS.map(value => <option key={value} value={value}>{labels[locale][value]}</option>)}
        </select></label>
        {relation === 'guardian' || relation === 'parent' ? <label className="journey-family-check"><input type="checkbox" checked={guardian} disabled={busy} onChange={e => setGuardian(e.target.checked)}/>{copy.guardian}</label> : null}
        {available.length ? <label>{copy.existing}<select disabled={busy} value={familyId} onChange={e=>setFamilyId(e.target.value)}>
          <option value="">—</option>{available.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
        </select></label> : null}
        {available.length ? <button type="button" className="journey-family-action" disabled={busy||!familyId} onClick={()=>void save('link')}><Link2 size={16}/>{copy.add}</button>:null}
        <button type="button" className="journey-family-create-toggle" onClick={()=>setCreateOpen(v=>!v)} aria-expanded={createOpen} disabled={busy}>{createOpen?copy.cancel:copy.create}</button>
        {createOpen ? <form onSubmit={e=>{e.preventDefault();void save('create')}} className="journey-family-new">
          <label>{copy.family}<input required minLength={2} maxLength={80} value={familyLabel} onChange={e=>setFamilyLabel(e.target.value)} disabled={busy}/></label>
          <button className="journey-family-action" type="submit" disabled={busy||familyLabel.trim().length<2}>{copy.newFamily}</button>
        </form> : null}
      </div>
      <p className="journey-family-note"><ShieldCheck size={15}/>{copy.notice}</p>
    </>}
  </section>
}
