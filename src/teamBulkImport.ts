export const TEAM_INTEREST_AREAS = ['presence', 'table', 'care', 'house', 'discipleship', 'support'] as const

export type TeamInterestArea = typeof TEAM_INTEREST_AREAS[number]

export interface TeamImportCandidate {
  id: string
  name: string
  areas: TeamInterestArea[]
  needsReview: boolean
  warnings: string[]
  sourceLine: number
  raw: string
}

export interface TeamImportParseResult {
  rows: TeamImportCandidate[]
  ignoredLines: number
  headerDetected: boolean
}

const AREA_ALIASES: Record<TeamInterestArea, string[]> = {
  presence: ['presenca', 'equipe presenca', 'recepcao', 'anfitriao', 'anfitrioes', 'acolhimento'],
  table: ['mesa aberta', 'mesa', 'cafe da familia', 'cafe', 'hospitalidade'],
  care: ['cuidado e conexao', 'cuidado', 'conexao', 'cuidador', 'cuidadores'],
  house: ['casa de paz', 'casa', 'pequeno grupo', 'pg', 'grupo'],
  discipleship: ['raiz', 'discipulado', 'discipulador', 'discipuladores'],
  support: ['apoio', 'suporte', 'ajuda geral', 'onde precisar', 'ajudar em'],
}

const NAME_HEADERS = new Set(['nome', 'nome completo', 'name', 'full name', 'persona', 'nombre', 'nombre completo'])
const CHOICE_HEADERS = new Set([
  'area', 'areas', 'opcao', 'opcoes', 'escolha', 'escolhas', 'frente', 'frentes',
  'ministerio', 'ministerios', 'quero ajudar', 'quero servir', 'interesse', 'interesses',
])

export const TEAM_INTEREST_AREA_LABELS: Record<TeamInterestArea, { 'pt-BR': string; en: string; es: string }> = {
  presence: { 'pt-BR': 'Presença', en: 'Presence', es: 'Presencia' },
  table: { 'pt-BR': 'Mesa Aberta', en: 'Open Table', es: 'Mesa Abierta' },
  care: { 'pt-BR': 'Cuidado & Conexão', en: 'Care & Connection', es: 'Cuidado & Conexión' },
  house: { 'pt-BR': 'Casa de Paz', en: 'Peace House', es: 'Casa de Paz' },
  discipleship: { 'pt-BR': 'Raiz', en: 'Root', es: 'Raíz' },
  support: { 'pt-BR': 'Apoio', en: 'Support', es: 'Apoyo' },
}

export function normalizeTeamImportToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeTeamInterestName(value: string) {
  return normalizeTeamImportToken(value)
}

function uniqueAreas(areas: TeamInterestArea[]) {
  return TEAM_INTEREST_AREAS.filter((area) => areas.includes(area))
}

function isChecked(value: string) {
  const normalized = normalizeTeamImportToken(value)
  return ['x', 'sim', 'yes', 'si', '1', 'ok', 'v', 'marcado', 'quero', 'interesse'].includes(normalized)
    || /[✓✔☑]/.test(value)
}

export function detectTeamInterestAreas(value: string): TeamInterestArea[] {
  const normalized = ` ${normalizeTeamImportToken(value)} `
  const found: TeamInterestArea[] = []

  for (const area of TEAM_INTEREST_AREAS) {
    if (AREA_ALIASES[area].some((alias) => normalized.includes(` ${alias} `))) found.push(area)
  }

  return uniqueAreas(found)
}

function splitDelimitedLine(line: string, delimiter: string) {
  const result: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === delimiter && !quoted) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  result.push(current.trim())
  return result
}

function chooseDelimiter(lines: string[]) {
  const sample = lines.slice(0, 6)
  const candidates = ['\t', ';', '|']

  for (const delimiter of candidates) {
    if (sample.some((line) => line.split(delimiter).length >= 2)) return delimiter
  }

  const first = sample[0] ?? ''
  const normalized = normalizeTeamImportToken(first)
  if (first.includes(',') && [...NAME_HEADERS].some((header) => normalized.includes(header))) return ','

  return ''
}

function looksLikeHeader(cells: string[]) {
  const normalized = cells.map(normalizeTeamImportToken)
  return normalized.some((value) => NAME_HEADERS.has(value))
    || (normalized.some((value) => CHOICE_HEADERS.has(value)) && normalized.some((value) => detectTeamInterestAreas(value).length > 0))
}

function sanitizeName(value: string) {
  return value
    .replace(/^\s*(?:[-•*]|\d+[.)-])\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function candidateWarnings(name: string, areas: TeamInterestArea[]) {
  const warnings: string[] = []
  if (areas.length === 0) warnings.push('no_area')
  if (name.length < 2 || /\d/.test(name)) warnings.push('check_name')
  return warnings
}

function buildCandidate(name: string, areas: TeamInterestArea[], raw: string, sourceLine: number): TeamImportCandidate | null {
  const cleanName = sanitizeName(name)
  if (!cleanName || normalizeTeamImportToken(cleanName).length < 2) return null
  const unique = uniqueAreas(areas)
  const warnings = candidateWarnings(cleanName, unique)

  return {
    id: `line-${sourceLine}-${normalizeTeamImportToken(cleanName).replace(/\s+/g, '-')}`,
    name: cleanName,
    areas: unique,
    needsReview: warnings.length > 0,
    warnings,
    sourceLine,
    raw,
  }
}

function parseDelimited(lines: string[], delimiter: string): TeamImportParseResult {
  const rows = lines.map((line) => splitDelimitedLine(line, delimiter))
  const headerDetected = looksLikeHeader(rows[0] ?? [])
  const header = headerDetected ? rows[0].map(normalizeTeamImportToken) : []
  const startIndex = headerDetected ? 1 : 0
  const nameIndex = headerDetected
    ? Math.max(0, header.findIndex((value) => NAME_HEADERS.has(value)))
    : 0
  const explicitAreaColumns = new Map<number, TeamInterestArea>()

  if (headerDetected) {
    header.forEach((value, index) => {
      const matches = detectTeamInterestAreas(value)
      if (matches.length === 1) explicitAreaColumns.set(index, matches[0])
    })
  }

  const choiceIndex = headerDetected
    ? header.findIndex((value) => CHOICE_HEADERS.has(value))
    : -1

  const parsed: TeamImportCandidate[] = []
  let ignoredLines = 0

  for (let index = startIndex; index < rows.length; index += 1) {
    const cells = rows[index]
    const raw = lines[index]
    const name = cells[nameIndex] ?? ''
    const areas: TeamInterestArea[] = []

    if (explicitAreaColumns.size > 0) {
      explicitAreaColumns.forEach((area, column) => {
        if (isChecked(cells[column] ?? '') || detectTeamInterestAreas(cells[column] ?? '').includes(area)) areas.push(area)
      })
    }

    if (choiceIndex >= 0) areas.push(...detectTeamInterestAreas(cells[choiceIndex] ?? ''))

    if (explicitAreaColumns.size === 0 && choiceIndex < 0) {
      for (let column = 0; column < cells.length; column += 1) {
        if (column === nameIndex) continue
        areas.push(...detectTeamInterestAreas(cells[column] ?? ''))
      }
    }

    const candidate = buildCandidate(name, areas, raw, index + 1)
    if (candidate) parsed.push(candidate)
    else ignoredLines += 1
  }

  return { rows: mergeDuplicateCandidates(parsed), ignoredLines, headerDetected }
}

function earliestAreaPosition(line: string) {
  const normalizedLine = normalizeTeamImportToken(line)
  let earliest = Number.POSITIVE_INFINITY

  for (const aliases of Object.values(AREA_ALIASES)) {
    for (const alias of aliases) {
      const index = normalizedLine.indexOf(alias)
      if (index >= 0) earliest = Math.min(earliest, index)
    }
  }

  return Number.isFinite(earliest) ? earliest : -1
}

function parseFreeLine(line: string, sourceLine: number) {
  const raw = line
  const clean = sanitizeName(line)
  if (!clean) return null

  const separatorMatch = clean.match(/\s(?:-|–|—|:)\s/)
  if (separatorMatch?.index !== undefined) {
    const left = clean.slice(0, separatorMatch.index)
    const right = clean.slice(separatorMatch.index + separatorMatch[0].length)
    return buildCandidate(left, detectTeamInterestAreas(right), raw, sourceLine)
  }

  const commaParts = splitDelimitedLine(clean, ',')
  if (commaParts.length > 1) {
    const areas = detectTeamInterestAreas(commaParts.slice(1).join(' '))
    if (areas.length > 0) return buildCandidate(commaParts[0], areas, raw, sourceLine)
  }

  const areas = detectTeamInterestAreas(clean)
  if (areas.length > 0) {
    const normalized = normalizeTeamImportToken(clean)
    const position = earliestAreaPosition(clean)
    if (position > 0) {
      const normalizedName = normalized.slice(0, position).trim()
      if (normalizedName) {
        const wordsNeeded = normalizedName.split(' ').length
        const originalWords = clean.split(/\s+/)
        return buildCandidate(originalWords.slice(0, wordsNeeded).join(' '), areas, raw, sourceLine)
      }
    }
  }

  const normalized = normalizeTeamImportToken(clean)
  const headerLike = NAME_HEADERS.has(normalized)
    || CHOICE_HEADERS.has(normalized)
    || TEAM_INTEREST_AREAS.some((area) => AREA_ALIASES[area].includes(normalized))
  if (headerLike) return null

  return buildCandidate(clean, [], raw, sourceLine)
}

export function mergeDuplicateCandidates(rows: TeamImportCandidate[]) {
  const merged = new Map<string, TeamImportCandidate>()

  for (const row of rows) {
    const key = normalizeTeamInterestName(row.name)
    const current = merged.get(key)
    if (!current) {
      merged.set(key, row)
      continue
    }

    const areas = uniqueAreas([...current.areas, ...row.areas])
    const warnings = [...new Set([...current.warnings, ...row.warnings])]
    merged.set(key, {
      ...current,
      areas,
      warnings,
      needsReview: warnings.length > 0,
      raw: [current.raw, row.raw].filter(Boolean).join(' | '),
    })
  }

  return [...merged.values()]
}

export function parseTeamBulkImport(text: string): TeamImportParseResult {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { rows: [], ignoredLines: 0, headerDetected: false }

  const delimiter = chooseDelimiter(lines)
  if (delimiter) return parseDelimited(lines, delimiter)

  const parsed = lines
    .map((line, index) => parseFreeLine(line, index + 1))
    .filter((candidate): candidate is TeamImportCandidate => Boolean(candidate))

  return {
    rows: mergeDuplicateCandidates(parsed),
    ignoredLines: lines.length - parsed.length,
    headerDetected: false,
  }
}
