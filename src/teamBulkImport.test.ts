import { describe, expect, it } from 'vitest'
import { detectTeamInterestAreas, normalizeTeamInterestName, parseTeamBulkImport, reviewEditedTeamImportCandidate, validateTeamImportPreview } from './teamBulkImport'

describe('team bulk import parser', () => {
  it('reads a spreadsheet matrix and distributes checked areas', () => {
    const input = [
      'Nome\tPresença\tMesa Aberta\tCuidado\tCasa de Paz\tRaiz\tApoio',
      'Beatriz\t\tx\tx\t\t\t',
      'Lucas\t\t\t\t\t\tx',
      'Dayane\tx\t\t\t\tx\tx',
    ].join('\n')

    const result = parseTeamBulkImport(input)

    expect(result.headerDetected).toBe(true)
    expect(result.rows).toHaveLength(3)
    expect(result.rows.find((row) => row.name === 'Beatriz')?.areas).toEqual(['table', 'care'])
    expect(result.rows.find((row) => row.name === 'Lucas')?.areas).toEqual(['support'])
    expect(result.rows.find((row) => row.name === 'Dayane')?.areas).toEqual(['presence', 'discipleship', 'support'])
  })

  it('reads simple pasted text with multiple aliases', () => {
    const result = parseTeamBulkImport([
      'Bruna Araújo - Raiz',
      'Edson Mukai: Presença, Apoio',
      'Neusa — Mesa Aberta',
    ].join('\n'))

    expect(result.rows.map((row) => [row.name, row.areas])).toEqual([
      ['Bruna Araújo', ['discipleship']],
      ['Edson Mukai', ['presence', 'support']],
      ['Neusa', ['table']],
    ])
  })

  it('merges duplicated names instead of creating duplicate people', () => {
    const result = parseTeamBulkImport([
      'Duda - Presença',
      'Duda - Cuidado',
      'Pessoa sem escolha',
    ].join('\n'))

    expect(result.rows).toHaveLength(2)
    expect(result.rows.find((row) => row.name === 'Duda')?.areas).toEqual(['presence', 'care'])
    expect(result.rows.find((row) => row.name === 'Pessoa sem escolha')?.needsReview).toBe(true)
  })

  it('normalizes accents and recognizes Portuguese area names', () => {
    expect(normalizeTeamInterestName('  Andréa de Oliveira ')).toBe('andrea de oliveira')
    expect(detectTeamInterestAreas('Presença / Cuidado & Conexão / Casa de Paz')).toEqual(['presence', 'care', 'house'])
  })
  it('prevents invalid or duplicated names after manual preview edits', () => {
    const rows = parseTeamBulkImport('Beatriz - Mesa Aberta\\nLucas - Apoio').rows
    const revised = rows.map((row) => row.name === 'Lucas'
      ? reviewEditedTeamImportCandidate({ ...row, name: '  BEATRIZ  ' })
      : row)
    expect(validateTeamImportPreview(revised).duplicateNameIds).toEqual([revised[1].id])
    expect(validateTeamImportPreview(rows)).toEqual({
      invalidNameIds: [], duplicateNameIds: [], tooMany: false,
    })
    const erased = reviewEditedTeamImportCandidate({ ...rows[0], name: ' ' })
    expect(validateTeamImportPreview([erased]).invalidNameIds).toEqual([erased.id])
    expect(validateTeamImportPreview([{ ...rows[0], name: 'A'.repeat(121) }]).invalidNameIds).toEqual([rows[0].id])
  })

  it('updates review warnings when the volunteer corrects a parsed name or chooses an area', () => {
    const row = parseTeamBulkImport('Pessoa 123').rows[0]
    expect(row.needsReview).toBe(true)
    const fixed = reviewEditedTeamImportCandidate({ ...row, name: 'Pessoa Corrigida', areas: ['presence'] })
    expect(fixed.needsReview).toBe(false)
    expect(fixed.warnings).toEqual([])
  })

  it('requires batches of 200 or fewer entries', () => {
    const row = parseTeamBulkImport('Pessoa Única - Apoio').rows[0]
    const many = Array.from({ length: 201 }, (_, i) => ({ ...row, id: String(i), name: `Pessoa ${i}` }))
    expect(validateTeamImportPreview(many).tooMany).toBe(true)
  })

})
