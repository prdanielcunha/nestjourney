import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Check, ChevronLeft, ClipboardPaste, FileImage, LoaderCircle,
  Pencil, Save, ShieldCheck, Sparkles, Upload, UserRoundCheck, UsersRound, X,
} from 'lucide-react'
import { auth } from './firebase'
import {
  getActiveJourneyOrganizationId,
  importJourneyTeamInterests,
  listJourneyCongregations,
  listJourneyTeamInterests,
  loadJourneyAccess,
  resolveActiveJourneyCongregationId,
  setActiveJourneyCongregationId,
  updateJourneyTeamInterest,
  type JourneyAccessContext,
  type JourneyCongregation,
  type JourneyTeamInterestRecord,
} from './journeyRepository'
import {
  TEAM_INTEREST_AREAS,
  TEAM_INTEREST_AREA_LABELS,
  parseTeamBulkImport,
  type TeamImportCandidate,
  type TeamInterestArea,
} from './teamBulkImport'
import { getInitialLocale, localeLabels, persistLocale, type AppLocale } from './i18n'
import { AccessDeniedState } from './AccessDeniedState'
import './TeamBulkImportPage.css'

const OCR_MODULE_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js'

const copy = {
  'pt-BR': {
    title: 'Importar lista em massa',
    subtitle: 'Cole uma planilha, texto organizado ou uma imagem. O NestJourney identifica nomes e escolhas, mostra tudo para revisão e distribui cada pessoa nas áreas marcadas.',
    loading: 'Preparando importação…', back: 'Gestão', noAccessTitle: 'Importação não disponível',
    noAccess: 'Somente quem gerencia a implantação pode importar e organizar inscrições da equipe.',
    retry: 'Tentar novamente', congregation: 'Unidade', sourceTitle: '1. Traga a lista', sourceHint: 'Cole diretamente do Excel/Google Sheets, cole texto ou envie uma imagem da lista.',
    paste: 'Texto / planilha', image: 'Imagem', placeholder: 'Exemplo:\nNome\tPresença\tMesa Aberta\tCuidado\tCasa de Paz\tRaiz\tApoio\nBeatriz\t\tx\tx\t\t\t\nLucas\t\t\t\t\t\tx',
    analyze: 'Analisar lista', upload: 'Selecionar imagem', pasteImage: 'Você também pode colar uma imagem aqui com Ctrl+V.',
    ocrReading: 'Lendo imagem…', ocrProgress: 'Reconhecimento', ocrFailed: 'Não consegui ler essa imagem automaticamente. Você ainda pode colar o texto na caixa acima.',
    previewTitle: '2. Revise antes de gravar', previewHint: 'Corrija nomes e marque/desmarque áreas. Nada é salvo até você confirmar.',
    people: 'pessoas', review: 'revisar', ignored: 'linhas ignoradas', remove: 'Remover', import: 'Importar e distribuir',
    importing: 'Importando…', imported: 'Importação concluída', created: 'novos', updated: 'atualizados/mesclados',
    distribution: 'Distribuição atual', distributionHint: 'Uma mesma pessoa pode aparecer em mais de uma área quando escolheu mais de uma frente.',
    unassigned: 'Revisar / sem área', edit: 'Editar', editTitle: 'Editar inscrição', cancel: 'Cancelar', save: 'Salvar alterações',
    archive: 'Arquivar da lista', saving: 'Salvando…', privacyTitle: 'Importação segura',
    privacy: 'Este recurso registra somente nome, unidade e áreas de interesse. Não cria login, convite, escala, permissão ou prontuário pastoral. Registros repetidos são mesclados em vez de duplicados.',
    imagePrivacy: 'A imagem é lida no navegador para extrair texto e sempre passa por revisão antes de qualquer gravação.',
    empty: 'Ainda não há inscrições importadas nesta unidade.', error: 'Não foi possível concluir a operação.',
    noRows: 'Não encontrei pessoas nessa lista. Confira o formato e tente novamente.',
    headerDetected: 'Cabeçalho de planilha reconhecido.', needsReview: 'Confira este registro antes de importar.',
  },
  en: {
    title: 'Bulk import list',
    subtitle: 'Paste a spreadsheet, organized text, or an image. NestJourney identifies names and choices, shows a review, and distributes each person to the selected areas.',
    loading: 'Preparing import…', back: 'Management', noAccessTitle: 'Import unavailable',
    noAccess: 'Only people who manage implementation can import and organize team sign-ups.',
    retry: 'Try again', congregation: 'Campus', sourceTitle: '1. Bring the list', sourceHint: 'Paste directly from Excel/Google Sheets, paste text, or upload an image of the list.',
    paste: 'Text / spreadsheet', image: 'Image', placeholder: 'Example:\nName\tPresence\tOpen Table\tCare\tPeace House\tRoot\tSupport\nBeatriz\t\tx\tx\t\t\t\nLucas\t\t\t\t\t\tx',
    analyze: 'Analyze list', upload: 'Select image', pasteImage: 'You can also paste an image here with Ctrl+V.',
    ocrReading: 'Reading image…', ocrProgress: 'Recognition', ocrFailed: 'I could not read this image automatically. You can still paste the text above.',
    previewTitle: '2. Review before saving', previewHint: 'Correct names and toggle areas. Nothing is saved until you confirm.',
    people: 'people', review: 'review', ignored: 'ignored lines', remove: 'Remove', import: 'Import and distribute',
    importing: 'Importing…', imported: 'Import complete', created: 'new', updated: 'updated/merged',
    distribution: 'Current distribution', distributionHint: 'The same person can appear in more than one area when they selected multiple fronts.',
    unassigned: 'Review / no area', edit: 'Edit', editTitle: 'Edit sign-up', cancel: 'Cancel', save: 'Save changes',
    archive: 'Archive from list', saving: 'Saving…', privacyTitle: 'Safe import',
    privacy: 'This feature stores only name, campus, and areas of interest. It does not create logins, invitations, schedules, permissions, or pastoral case files. Repeated records are merged instead of duplicated.',
    imagePrivacy: 'The image is read in the browser to extract text and always goes through review before anything is saved.',
    empty: 'There are no imported sign-ups for this campus yet.', error: 'The operation could not be completed.',
    noRows: 'I could not find people in this list. Check the format and try again.',
    headerDetected: 'Spreadsheet header recognized.', needsReview: 'Review this record before importing.',
  },
  es: {
    title: 'Importar lista en masa',
    subtitle: 'Pega una hoja, texto organizado o una imagen. NestJourney identifica nombres y opciones, muestra una revisión y distribuye cada persona en las áreas marcadas.',
    loading: 'Preparando importación…', back: 'Gestión', noAccessTitle: 'Importación no disponible',
    noAccess: 'Solo quien gestiona la implementación puede importar y organizar inscripciones del equipo.',
    retry: 'Intentar de nuevo', congregation: 'Sede', sourceTitle: '1. Trae la lista', sourceHint: 'Pega directamente desde Excel/Google Sheets, pega texto o sube una imagen de la lista.',
    paste: 'Texto / hoja', image: 'Imagen', placeholder: 'Ejemplo:\nNombre\tPresencia\tMesa Abierta\tCuidado\tCasa de Paz\tRaíz\tApoyo\nBeatriz\t\tx\tx\t\t\t\nLucas\t\t\t\t\t\tx',
    analyze: 'Analizar lista', upload: 'Seleccionar imagen', pasteImage: 'También puedes pegar una imagen aquí con Ctrl+V.',
    ocrReading: 'Leyendo imagen…', ocrProgress: 'Reconocimiento', ocrFailed: 'No pude leer esta imagen automáticamente. Todavía puedes pegar el texto arriba.',
    previewTitle: '2. Revisa antes de guardar', previewHint: 'Corrige nombres y marca/desmarca áreas. Nada se guarda hasta confirmar.',
    people: 'personas', review: 'revisar', ignored: 'líneas ignoradas', remove: 'Quitar', import: 'Importar y distribuir',
    importing: 'Importando…', imported: 'Importación concluida', created: 'nuevos', updated: 'actualizados/mezclados',
    distribution: 'Distribución actual', distributionHint: 'Una misma persona puede aparecer en más de un área cuando eligió varias frentes.',
    unassigned: 'Revisar / sin área', edit: 'Editar', editTitle: 'Editar inscripción', cancel: 'Cancelar', save: 'Guardar cambios',
    archive: 'Archivar de la lista', saving: 'Guardando…', privacyTitle: 'Importación segura',
    privacy: 'Este recurso guarda solo nombre, sede y áreas de interés. No crea login, invitación, escala, permiso ni expediente pastoral. Los registros repetidos se mezclan en lugar de duplicarse.',
    imagePrivacy: 'La imagen se lee en el navegador para extraer texto y siempre pasa por revisión antes de guardar.',
    empty: 'Todavía no hay inscripciones importadas en esta sede.', error: 'No se pudo completar la operación.',
    noRows: 'No encontré personas en esta lista. Revisa el formato e inténtalo de nuevo.',
    headerDetected: 'Encabezado de hoja reconocido.', needsReview: 'Revisa este registro antes de importar.',
  },
} as const

function areaLabel(area: TeamInterestArea, locale: AppLocale) {
  return TEAM_INTEREST_AREA_LABELS[area][locale]
}

function toggleArea(list: TeamInterestArea[], area: TeamInterestArea) {
  return list.includes(area) ? list.filter((item) => item !== area) : [...list, area]
}

export default function TeamBulkImportPage() {
  const [locale, setLocale] = useState<AppLocale>(getInitialLocale)
  const t = copy[locale]
  const [access, setAccess] = useState<JourneyAccessContext | null>(null)
  const [congregations, setCongregations] = useState<JourneyCongregation[]>([])
  const [congregationId, setCongregationId] = useState('')
  const [records, setRecords] = useState<JourneyTeamInterestRecord[]>([])
  const [sourceText, setSourceText] = useState('')
  const [sourceKind, setSourceKind] = useState<'paste' | 'image'>('paste')
  const [preview, setPreview] = useState<TeamImportCandidate[]>([])
  const [ignoredLines, setIgnoredLines] = useState(0)
  const [headerDetected, setHeaderDetected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<JourneyTeamInterestRecord | null>(null)
  const [editName, setEditName] = useState('')
  const [editAreas, setEditAreas] = useState<TeamInterestArea[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const canManage = Boolean(access?.canManageImplementation)

  const refreshRecords = useCallback(async (nextAccess: JourneyAccessContext, unitId: string) => {
    if (!unitId || !nextAccess.canManageImplementation) {
      setRecords([])
      return
    }
    setRecords((await listJourneyTeamInterests(nextAccess, unitId)).filter((record) => record.active))
  }, [])

  const bootstrap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const user = auth?.currentUser
      const organizationId = getActiveJourneyOrganizationId()
      if (!user || !organizationId) throw new Error('missing_ecosystem_context')
      const nextAccess = await loadJourneyAccess(user.uid, organizationId)
      setAccess(nextAccess)
      if (!nextAccess.canManageImplementation) return
      const units = await listJourneyCongregations(nextAccess)
      setCongregations(units)
      const unitId = resolveActiveJourneyCongregationId(nextAccess.organizationId, units)
      setCongregationId(unitId)
      if (unitId) await refreshRecords(nextAccess, unitId)
    } catch (cause) {
      console.error('Bulk team import bootstrap failed', cause)
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }, [refreshRecords, t.error])

  useEffect(() => { void bootstrap() }, [bootstrap])

  async function changeCongregation(nextId: string) {
    if (!access) return
    setCongregationId(nextId)
    setActiveJourneyCongregationId(access.organizationId, nextId)
    setBusy(true)
    setError('')
    try { await refreshRecords(access, nextId) }
    catch (cause) { console.error(cause); setError(t.error) }
    finally { setBusy(false) }
  }

  function analyze(text = sourceText, kind: 'paste' | 'image' = sourceKind) {
    setError('')
    setNotice('')
    setSourceKind(kind)
    const result = parseTeamBulkImport(text)
    setPreview(result.rows)
    setIgnoredLines(result.ignoredLines)
    setHeaderDetected(result.headerDetected)
    if (!result.rows.length) setError(t.noRows)
  }

  async function readImage(file: File) {
    if (!file.type.startsWith('image/')) return
    setOcrBusy(true)
    setOcrProgress(0)
    setError('')
    setNotice('')
    try {
      const module = await import(/* @vite-ignore */ OCR_MODULE_URL) as {
        recognize: (
          image: File,
          language: string,
          options?: { logger?: (message: { status?: string; progress?: number }) => void },
        ) => Promise<{ data: { text: string } }>
      }
      const result = await module.recognize(file, 'por', {
        logger: (message) => {
          if (typeof message.progress === 'number') setOcrProgress(Math.round(message.progress * 100))
        },
      })
      const text = result.data.text.trim()
      setSourceText(text)
      analyze(text, 'image')
    } catch (cause) {
      console.error('Image OCR failed', cause)
      setError(t.ocrFailed)
    } finally {
      setOcrBusy(false)
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLElement>) {
    const imageItem = [...event.clipboardData.items].find((item) => item.type.startsWith('image/'))
    if (!imageItem) return
    const file = imageItem.getAsFile()
    if (!file) return
    event.preventDefault()
    void readImage(file)
  }

  function patchPreview(id: string, patch: Partial<TeamImportCandidate>) {
    setPreview((current) => current.map((row) => {
      if (row.id !== id) return row
      const next = { ...row, ...patch }
      return { ...next, needsReview: next.areas.length === 0 || next.warnings.includes('check_name') }
    }))
  }

  async function commitImport() {
    if (!access || !congregationId || !preview.length) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await importJourneyTeamInterests({
        access,
        congregationId,
        source: sourceKind,
        rows: preview.map((row) => ({ name: row.name, areas: row.areas, needsReview: row.needsReview })),
      })
      setNotice(`${t.imported}: ${result.created} ${t.created}, ${result.updated} ${t.updated}.`)
      setPreview([])
      setSourceText('')
      setIgnoredLines(0)
      await refreshRecords(access, congregationId)
    } catch (cause) {
      console.error('Bulk team import failed', cause)
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  function beginEdit(record: JourneyTeamInterestRecord) {
    setEditing(record)
    setEditName(record.name)
    setEditAreas(record.areas)
  }

  async function saveEdit(active = true) {
    if (!access || !editing) return
    setBusy(true)
    setError('')
    try {
      await updateJourneyTeamInterest({
        access,
        record: editing,
        name: editName,
        areas: editAreas,
        active,
        needsReview: editAreas.length === 0,
      })
      setEditing(null)
      await refreshRecords(access, congregationId)
    } catch (cause) {
      console.error('Team interest update failed', cause)
      setError(t.error)
    } finally {
      setBusy(false)
    }
  }

  const reviewCount = preview.filter((row) => row.needsReview).length
  const grouped = useMemo(() => {
    const map = new Map<TeamInterestArea | 'unassigned', JourneyTeamInterestRecord[]>()
    TEAM_INTEREST_AREAS.forEach((area) => map.set(area, []))
    map.set('unassigned', [])
    records.forEach((record) => {
      if (!record.areas.length) map.get('unassigned')?.push(record)
      record.areas.forEach((area) => map.get(area)?.push(record))
    })
    return map
  }, [records])

  if (loading) return <main className="team-import-page"><div className="journey-loading">{t.loading}</div></main>
  if (!canManage) return <main className="team-import-page"><AccessDeniedState locale={locale} title={t.noAccessTitle} body={t.noAccess} retryLabel={t.retry} onRetry={() => void bootstrap()} /></main>

  return <main className="team-import-page" onPaste={handlePaste}>
    <div className="team-import-shell">
      <header className="team-import-header">
        <div>
          <span className="team-import-kicker">NestJourney / Team Intake</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="team-import-header-actions">
          <a href="/more"><ChevronLeft size={16}/>{t.back}</a>
          <select value={locale} onChange={(event) => { const next = event.target.value as AppLocale; setLocale(next); persistLocale(next) }}>
            {(Object.keys(localeLabels) as AppLocale[]).map((id) => <option key={id} value={id}>{localeLabels[id]}</option>)}
          </select>
        </div>
      </header>

      {error ? <div className="team-import-alert error" role="alert"><AlertTriangle size={17}/><span>{error}</span></div> : null}
      {notice ? <div className="team-import-alert success" role="status"><Check size={17}/><span>{notice}</span></div> : null}

      <section className="team-import-privacy">
        <ShieldCheck size={20}/>
        <div><strong>{t.privacyTitle}</strong><p>{t.privacy}</p></div>
      </section>

      <section className="team-import-panel">
        <div className="team-import-panel-head">
          <div><span className="team-import-kicker">{t.sourceTitle}</span><p>{t.sourceHint}</p></div>
          {congregations.length > 1 ? <label className="team-import-unit"><span>{t.congregation}</span><select value={congregationId} disabled={busy} onChange={(event) => void changeCongregation(event.target.value)}>{congregations.map((unit) => <option value={unit.id} key={unit.id}>{unit.name}{unit.city ? ` · ${unit.city}` : ''}</option>)}</select></label> : null}
        </div>

        <div className="team-import-source-grid">
          <div className="team-import-text-source">
            <div className="team-import-source-title"><ClipboardPaste size={17}/><strong>{t.paste}</strong></div>
            <textarea value={sourceText} onChange={(event) => { setSourceText(event.target.value); setSourceKind('paste') }} placeholder={t.placeholder}/>
            <button className="team-import-primary" disabled={!sourceText.trim() || busy || ocrBusy} onClick={() => analyze()}>
              <Sparkles size={16}/>{t.analyze}
            </button>
          </div>

          <div className={'team-import-image-source' + (ocrBusy ? ' busy' : '')} onClick={() => !ocrBusy && fileRef.current?.click()}>
            {ocrBusy ? <LoaderCircle className="spin" size={28}/> : <FileImage size={28}/>}
            <strong>{ocrBusy ? t.ocrReading : t.upload}</strong>
            <p>{ocrBusy ? `${t.ocrProgress}: ${ocrProgress}%` : t.pasteImage}</p>
            {ocrBusy ? <div className="team-import-progress"><span style={{ width: `${ocrProgress}%` }}/></div> : <Upload size={16}/>}
            <small>{t.imagePrivacy}</small>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImage(file); event.currentTarget.value = '' }}/>
          </div>
        </div>
      </section>

      {preview.length ? <section className="team-import-panel">
        <div className="team-import-panel-head">
          <div><span className="team-import-kicker">{t.previewTitle}</span><p>{t.previewHint}</p></div>
          <div className="team-import-summary">
            <span><b>{preview.length}</b>{t.people}</span>
            <span className={reviewCount ? 'attention' : ''}><b>{reviewCount}</b>{t.review}</span>
            <span><b>{ignoredLines}</b>{t.ignored}</span>
          </div>
        </div>
        {headerDetected ? <div className="team-import-header-detected"><Check size={14}/>{t.headerDetected}</div> : null}
        <div className="team-import-preview-list">
          {preview.map((row) => <article className={row.needsReview ? 'needs-review' : ''} key={row.id}>
            <div className="team-import-row-main">
              <span className="team-import-row-number">{row.sourceLine}</span>
              <input value={row.name} aria-label="Name" onChange={(event) => patchPreview(row.id, { name: event.target.value })}/>
              <button className="team-import-remove" title={t.remove} onClick={() => setPreview((current) => current.filter((item) => item.id !== row.id))}><X size={15}/></button>
            </div>
            <div className="team-import-area-pills">
              {TEAM_INTEREST_AREAS.map((area) => <button className={row.areas.includes(area) ? 'active' : ''} key={area} onClick={() => patchPreview(row.id, { areas: toggleArea(row.areas, area) })}>{areaLabel(area, locale)}</button>)}
            </div>
            {row.needsReview ? <small className="team-import-review-note"><AlertTriangle size={13}/>{t.needsReview}</small> : null}
          </article>)}
        </div>
        <div className="team-import-commit">
          <span>{reviewCount ? `${reviewCount} · ${t.review}` : ''}</span>
          <button className="team-import-primary" disabled={busy} onClick={() => void commitImport()}>
            {busy ? <LoaderCircle className="spin" size={16}/> : <UserRoundCheck size={16}/>}
            {busy ? t.importing : `${t.import} · ${preview.length}`}
          </button>
        </div>
      </section> : null}

      {editing ? <section className="team-import-panel team-import-editor">
        <div className="team-import-panel-head"><div><span className="team-import-kicker">{t.editTitle}</span><h2>{editing.name}</h2></div><button className="team-import-ghost" onClick={() => setEditing(null)}><X size={15}/>{t.cancel}</button></div>
        <label><span>{t.people}</span><input value={editName} onChange={(event) => setEditName(event.target.value)}/></label>
        <div className="team-import-area-pills large">
          {TEAM_INTEREST_AREAS.map((area) => <button className={editAreas.includes(area) ? 'active' : ''} key={area} onClick={() => setEditAreas((current) => toggleArea(current, area))}>{areaLabel(area, locale)}</button>)}
        </div>
        <div className="team-import-editor-actions">
          <button className="team-import-danger" disabled={busy} onClick={() => void saveEdit(false)}>{t.archive}</button>
          <button className="team-import-primary" disabled={busy || !editName.trim()} onClick={() => void saveEdit(true)}><Save size={15}/>{busy ? t.saving : t.save}</button>
        </div>
      </section> : null}

      <section className="team-import-panel">
        <div className="team-import-panel-head">
          <div><span className="team-import-kicker">{t.distribution}</span><p>{t.distributionHint}</p></div>
          <span className="team-import-record-count"><UsersRound size={15}/>{records.length}</span>
        </div>
        {!records.length ? <div className="team-import-empty">{t.empty}</div> : <div className="team-import-distribution">
          {[...TEAM_INTEREST_AREAS, 'unassigned' as const].map((area) => {
            const members = grouped.get(area) ?? []
            if (!members.length && area === 'unassigned') return null
            return <article key={area}>
              <div className="team-import-distribution-head"><strong>{area === 'unassigned' ? t.unassigned : areaLabel(area, locale)}</strong><b>{members.length}</b></div>
              <div className="team-import-name-list">
                {members.map((record) => <button key={record.id} onClick={() => beginEdit(record)}><span>{record.name}</span>{record.needsReview ? <AlertTriangle size={13}/> : <Pencil size={13}/>}</button>)}
                {!members.length ? <small>—</small> : null}
              </div>
            </article>
          })}
        </div>}
      </section>
    </div>
  </main>
}
