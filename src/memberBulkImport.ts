/** Preview-first member import. Intentionally excludes phone, age, notes and consent.
 * Every accepted row requires human approval before any Firestore write. */
export interface MemberImportRow {
  rowNumber: number
  name: string
  preferredName: string
  status: 'ready' | 'duplicate' | 'review' | 'invalid'
  warning: string
}
const MAX_IMPORT_ROWS = 75
export function normalizePersonName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}
function parseCsvRows(source: string, delimiter: string): string[][] {
  const result: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '"') {
      if (quoted && source[i+1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && ch === delimiter) { row.push(cell); cell = '' }
    else if (!quoted && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && source[i+1] === '\n') i++
      row.push(cell); result.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (quoted) throw new Error('member_csv_unterminated_quote')
  if (row.length || cell.length) { row.push(cell); result.push(row) }
  return result
}
export function previewMemberImport(source: string, knownPeople: Array<{name: string}>): MemberImportRow[] {
  if (source.length > 50_000) throw new Error('member_import_file_too_large')
  const first = source.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || ''
  const delimiter = first.includes('\t') ? '\t' : (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ','
  const rows = parseCsvRows(source.replace(/^\uFEFF/, ''), delimiter)
    .map((columns, index) => ({columns: columns.map(value=>value.trim()), rowNumber:index+1}))
    .filter(row=>row.columns.some(Boolean))
  if (!rows.length) return []
  const firstName = normalizePersonName(rows[0].columns[0])
  const hasHeader = ['nome','nome completo','name','full name','nombre','nombre completo'].includes(firstName)
  const data = hasHeader ? rows.slice(1) : rows
  if (data.length > MAX_IMPORT_ROWS) throw new Error('member_import_too_many_rows')
  const known = new Set(knownPeople.map(item=>normalizePersonName(item.name)).filter(Boolean))
  const seen = new Set<string>()
  return data.map(({columns,rowNumber}):MemberImportRow=>{
    const [name='', preferredName='', ...extra] = columns
    const key=normalizePersonName(name)
    const duplicate=known.has(key) || seen.has(key)
    if (key) seen.add(key)
    const invalid=extra.some(Boolean) || name.length < 2 || name.length > 160 ||
      preferredName.length > 120 || /[\x00-\x1f<>]/.test(name+preferredName)
    const sparse=key.split(' ').length < 2
    return {rowNumber,name,preferredName,
      status:invalid?'invalid':duplicate?'duplicate':sparse?'review':'ready',
      warning:invalid?'invalid_columns_or_name':duplicate?'possible_duplicate':sparse?'short_name_review':'',
    }
  })
}
export function prepareApprovedMemberImport(rows: MemberImportRow[], selected: number[]) {
  const allowed = new Set(selected)
  const approved = rows.filter(row=>allowed.has(row.rowNumber))
  if (!approved.length || approved.length>75 || approved.some(row=>row.status!=='ready' && row.status!=='review')) throw new Error('member_import_approval_invalid')
  const names=new Set<string>()
  for(const row of approved){
    const name=normalizePersonName(row.name)
    if(names.has(name))throw new Error('member_import_duplicate_in_approval')
    names.add(name)
  }
  return approved.map(row=>({name:row.name.trim().replace(/\s+/g,' '),preferredName:row.preferredName.trim().replace(/\s+/g,' ')}))
}
