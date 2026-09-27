import { describe, expect, it } from 'vitest'
import {
  createRaizEMesaPlaybook,
  implementationKeysForPhases,
  normalizeJourneyPlaybook,
  playbookCanStartImplementation,
} from './playbookEngine'

describe('Journey playbook engine', () => {
  it('materializes Raiz e Mesa as a normal active playbook instead of hard-coding the product identity', () => {
    const playbook = createRaizEMesaPlaybook('org-a')
    expect(playbook.id).toBe('raiz_e_mesa_2026')
    expect(playbook.organizationId).toBe('org-a')
    expect(playbook.status).toBe('active')
    expect(playbook.stages.map((stage) => stage.id)).toEqual([
      'service','table','care','group','discipleship','life_service','multiplication',
    ])
    expect(playbook.implementationKeys.length).toBeGreaterThan(40)
    expect(playbookCanStartImplementation(playbook)).toBe(true)
  })

  it('normalizes a different church journey without code or rules changes', () => {
    const playbook = normalizeJourneyPlaybook({
      id: 'caminho-da-familia',
      organizationId: 'org-b',
      name: 'Caminho da Família',
      description: 'Uma jornada própria.',
      status: 'active',
      carePromiseHours: 36,
      discipleshipMeetingCount: 10,
      areaLabels: {
        presence: 'Boas-vindas',
        table: 'Café da Família',
        care: 'Cuidado',
        groups: 'PG',
        discipleship: 'Caminho',
      },
      stages: [
        {
          id: 'welcome',
          label: 'Chegada',
          kind: 'presence',
          entryCriteria: 'Chegou',
          completionCriteria: 'Foi acolhido',
          responsibleRoles: ['presence_host'],
          requiredFields: ['name'],
        },
        {
          id: 'community',
          label: 'Comunidade',
          kind: 'groups',
          entryCriteria: 'Desejou conhecer',
          completionCriteria: 'Entrou em um PG',
          responsibleRoles: ['group_leader'],
          requiredFields: ['name'],
        },
      ],
      indicators: ['care_debt'],
      routingRules: ['visitor_to_first_contact'],
      implementationPhases: [
        { id: 'prepare', title: 'Preparar', objective: 'Preparar equipe', items: ['Definir responsáveis','Treinar acolhimento'] },
        { id: 'launch', title: 'Lançar', objective: 'Começar', items: ['Abrir a jornada'] },
      ],
      implementationKeys: [],
    })
    expect(playbook.areaLabels.table).toBe('Café da Família')
    expect(playbook.discipleshipMeetingCount).toBe(10)
    expect(playbook.stages).toHaveLength(2)
    expect(playbook.implementationKeys).toEqual([
      'phase.prepare.item.1',
      'phase.prepare.item.2',
      'phase.launch.item.1',
    ])
    expect(playbookCanStartImplementation(playbook)).toBe(true)
  })

  it('bounds free-form configuration and rejects invalid tenant identity', () => {
    const keys = implementationKeysForPhases([{ id: 'A B', title: 'A', objective: '', items: ['1','2'] }])
    expect(keys).toEqual(['phase.a-b.item.1','phase.a-b.item.2'])
    expect(() => normalizeJourneyPlaybook({ organizationId: '../other' })).toThrow('invalid_organization_id')
  })
})
