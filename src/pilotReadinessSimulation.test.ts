import { describe, expect, it } from 'vitest'
import { parseTeamBulkImport, validateTeamImportPreview } from './teamBulkImport'
import { implementationPlaybooks, implementationProgress, IMPLEMENTATION_REQUIRED_KEYS, implementationWeekForProgress } from './implementationPlaybook'
import { planFollowupOutcome } from './followup'
import { groupCapacityState } from './roadmapReadiness'

const names = [
  'Alfa Silva','Beta Silva','Gama Silva','Delta Silva','Épsilon Silva',
  'Zeta Silva','Eta Silva','Teta Silva','Iota Silva','Capa Silva',
  'Lambda Silva','Mi Silva','Ni Silva','Xi Silva','Ômicron Silva',
  'Pi Silva','Rô Silva',
]

// All records are synthetic. Do not commit names from pastoral enrollment forms.
describe('Raiz e Mesa simulated operational rollout - synthetic records only', () => {
  it('imports 17 simulated volunteers with 24 choices without creating profiles or consent', () => {
    const columns = ['Nome','Presença','Mesa Aberta','Cuidado','Casa de Paz','Raiz','Apoio']
    const flags = [
      ['x','','','','',''],['','x','x','','',''],['','x','','','',''],
      ['x','','x','','',''],['x','','x','','',''],['','','','','','x'],
      ['','','','','','x'],['','','','','','x'],['x','','','','','x'],
      ['','','','','','x'],['','','','','x',''],['x','','','','x','x'],
      ['','','','','','x'],['x','','','','',''],['x','','x','','',''],
      ['','','','','','x'],['x','','','','',''],
    ]
    const input = [columns.join('\t'), ...names.map((name,i)=>[name,...flags[i]].join('\t'))].join('\n')
    const result = parseTeamBulkImport(input)
    expect(result.headerDetected).toBe(true)
    expect(result.ignoredLines).toBe(0)
    expect(result.rows).toHaveLength(17)
    expect(result.rows.reduce((sum,row)=>sum+row.areas.length,0)).toBe(24)
    expect(result.rows.every(row=>!row.needsReview)).toBe(true)
    expect(validateTeamImportPreview(result.rows)).toEqual({
      invalidNameIds:[],duplicateNameIds:[],tooMany:false,
    })
  })

  it('models seven weeks and 24–48h care without automatic messages or invented attendance', () => {
    expect(implementationPlaybooks['pt-BR'].weeks).toHaveLength(7)
    expect(implementationWeekForProgress([])).toBe(1)
    expect(implementationProgress(IMPLEMENTATION_REQUIRED_KEYS)).toMatchObject({percent:100})
    expect(planFollowupOutcome('group_interest')).toMatchObject({nextActionCode:'group_entry'})
    expect(planFollowupOutcome('consent_revoked')).toMatchObject({nextActionCode:'none',careResolutionCode:'consent_revoked'})
    expect(planFollowupOutcome('declined_contact')).toMatchObject({nextActionCode:'none'})
    expect(groupCapacityState(8,12)).toBe('healthy')
    expect(groupCapacityState(12,12)).toBe('attention')
  })
})
