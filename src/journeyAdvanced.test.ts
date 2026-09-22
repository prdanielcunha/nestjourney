import { describe, expect, it } from 'vitest'
import { buildBelongingSignals, buildJourneyIntelligenceSnapshot, evaluateJourneyWorkflow, parseJourneyWorkflowDraft } from './journeyAdvanced'
import type { CareRequestRecord, JourneyWorkflowRecord } from './journeyRepository'

describe('advanced NestJourney intelligence',()=>{
  it('flags repeated presence without a recorded relationship without diagnosing the person',()=>{
    const sessions=[1,2,3].map(day=>({
      id:'s'+day,organizationId:'o',congregationId:'c',eventRef:'e',openedAt:`2026-09-0${day}T10:00:00Z`,
      status:'closed' as const,createdBy:'u',expectedPeopleCount:1,minimumCoveragePercent:90,
    }))
    const checks=sessions.map((session,index)=>({
      id:'p'+index,organizationId:'o',congregationId:'c',sessionId:session.id,personId:'person',
      state:'present_confirmed' as const,source:'human_check' as const,actorId:'u',recordedAt:session.openedAt,
    }))
    const result=buildBelongingSignals({
      people:[{id:'person',organizationId:'o',congregationId:'c',name:'Pessoa'}],
      careRequests:[],discipleships:[],sessions,checks,now:new Date('2026-09-20T00:00:00Z'),
    })
    expect(result).toHaveLength(1)
    expect(result[0].personId).toBe('person')
    expect(result[0].presentSessions).toBe(3)
  })

  it('does not flag belonging when a real relationship exists',()=>{
    const sessions=[1,2,3].map(day=>({
      id:'s'+day,organizationId:'o',congregationId:'c',eventRef:'e',openedAt:`2026-09-0${day}T10:00:00Z`,
      status:'closed' as const,createdBy:'u',expectedPeopleCount:1,minimumCoveragePercent:90,
    }))
    const checks=sessions.map((session,index)=>({
      id:'p'+index,organizationId:'o',congregationId:'c',sessionId:session.id,personId:'person',
      state:'present_confirmed' as const,source:'human_check' as const,actorId:'u',recordedAt:session.openedAt,
    }))
    expect(buildBelongingSignals({
      people:[{id:'person',organizationId:'o',congregationId:'c',name:'Pessoa',groupId:'g1'}],
      careRequests:[],discipleships:[],sessions,checks,now:new Date('2026-09-20T00:00:00Z'),
    })).toHaveLength(0)
  })

  it('builds objective workflow metrics from recorded facts',()=>{
    const care:CareRequestRecord={
      id:'care',organizationId:'o',congregationId:'c',personId:'p',careType:'first_contact',source:'manual',
      status:'open',requestedAt:'2026-09-01T00:00:00Z',requestedBy:'u',promiseHours:24,dueAt:'2026-09-02T00:00:00Z',
    }
    const snapshot=buildJourneyIntelligenceSnapshot({
      careRequests:[care],groups:[],discipleships:[],pulse:[],safeVoice:[],exitFeedback:[],belonging:[],memberSignals:[],
      now:new Date('2026-09-20T00:00:00Z'),
    })
    const workflow:JourneyWorkflowRecord={
      id:'w',organizationId:'o',congregationId:'c',label:'Cuidado atrasado',condition:'care_overdue',
      action:'surface_attention',threshold:1,enabled:true,createdAt:'2026-09-01T00:00:00Z',createdBy:'u',
    }
    expect(snapshot.careOverdue).toBe(1)
    expect(evaluateJourneyWorkflow(workflow,snapshot)).toBe(true)
  })

  it('parses only supported safe workflow intents',()=>{
    expect(parseJourneyWorkflowDraft('Quando houver 2 cuidados atrasados, criar tarefa')?.condition).toBe('care_overdue')
    expect(parseJourneyWorkflowDraft('Quando houver 2 cuidados atrasados, criar tarefa')?.action).toBe('create_review_task')
    expect(parseJourneyWorkflowDraft('diagnostique quem está triste')).toBeNull()
  })
})
