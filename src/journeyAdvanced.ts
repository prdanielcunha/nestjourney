import { evaluateCarePromise, type PresenceCheck } from './intelligence'
import type {
  CareRequestRecord,
  JourneyDiscipleshipRecord,
  JourneyExitFeedback,
  JourneyGroupRecord,
  JourneyMemberSignal,
  JourneyPersonRecord,
  JourneyPulseCheckin,
  JourneySafeVoiceCase,
  JourneyWorkflowAction,
  JourneyWorkflowCondition,
  JourneyWorkflowRecord,
  PresenceSessionRecord,
} from './journeyRepository'

export interface JourneyBelongingSignal {
  personId:string
  personName:string
  presentSessions:number
  evidenceRefs:string[]
}

export interface JourneyIntelligenceSnapshot {
  careOverdue:number
  careUnassigned:number
  groupsNearCapacity:number
  discipleshipWithoutNextMeeting:number
  pulseHelpRequested:number
  safeVoiceOpen:number
  exitFeedbackRecent:number
  belongingWithoutRelationship:number
  memberSignalsOpen:number
}

export interface JourneyInsight {
  id:string
  kind:'care'|'belonging'|'groups'|'discipleship'|'pulse'|'safe_voice'|'exit'|'member_signal'
  severity:'attention'|'watch'|'clear'
  count:number
  evidenceRefs:string[]
  actionHref:string
}

const DAY=24*60*60*1000

export function buildBelongingSignals(input:{
  people:JourneyPersonRecord[]
  careRequests:CareRequestRecord[]
  discipleships:JourneyDiscipleshipRecord[]
  sessions:PresenceSessionRecord[]
  checks:PresenceCheck[]
  now?:Date
  minimumPresentSessions?:number
}):JourneyBelongingSignal[]{
  const now=(input.now??new Date()).getTime()
  const minimum=Math.max(2,input.minimumPresentSessions??3)
  const recentSessions=new Map(
    input.sessions
      .filter(session=>session.status==='closed'&&Date.parse(session.openedAt)>=now-90*DAY)
      .map(session=>[session.id,session]),
  )
  const presentByPerson=new Map<string,Set<string>>()
  for(const check of input.checks){
    if(check.state!=='present_confirmed'||!recentSessions.has(check.sessionId))continue
    const set=presentByPerson.get(check.personId)??new Set<string>()
    set.add(check.sessionId)
    presentByPerson.set(check.personId,set)
  }
  const activeDiscipleship=new Set(input.discipleships.filter(item=>item.status==='active').map(item=>item.personId))
  const ownedCare=new Set(input.careRequests.filter(item=>item.status==='open'&&Boolean(item.ownerRef)).map(item=>item.personId))

  return input.people.flatMap(person=>{
    const sessions=presentByPerson.get(person.id)
    const presentCount=sessions?.size??0
    const hasRelationship=Boolean(person.groupId||person.bondHostRef||activeDiscipleship.has(person.id)||ownedCare.has(person.id))
    if(presentCount<minimum||hasRelationship)return[]
    return [{
      personId:person.id,
      personName:person.name,
      presentSessions:presentCount,
      evidenceRefs:[
        `person:${person.id}`,
        ...Array.from(sessions??[]).map(id=>`presenceSession:${id}`),
      ],
    }]
  }).sort((a,b)=>b.presentSessions-a.presentSessions||a.personName.localeCompare(b.personName))
}

export function buildJourneyIntelligenceSnapshot(input:{
  careRequests:CareRequestRecord[]
  groups:JourneyGroupRecord[]
  discipleships:JourneyDiscipleshipRecord[]
  pulse:JourneyPulseCheckin[]
  safeVoice:JourneySafeVoiceCase[]
  exitFeedback:JourneyExitFeedback[]
  belonging:JourneyBelongingSignal[]
  memberSignals:JourneyMemberSignal[]
  now?:Date
}):JourneyIntelligenceSnapshot{
  const now=(input.now??new Date()).getTime()
  const recentPulse=input.pulse.filter(item=>Date.parse(item.createdAt)>=now-30*DAY)
  const recentExit=input.exitFeedback.filter(item=>Date.parse(item.createdAt)>=now-90*DAY)
  return{
    careOverdue:input.careRequests.filter(item=>item.status==='open'&&evaluateCarePromise({
      id:item.id,organizationId:item.organizationId,subjectRef:`person:${item.personId}`,
      careType:item.careType,createdAt:item.requestedAt,dueAt:item.dueAt,ownerRef:item.ownerRef,status:item.status,
    }).state==='debt').length,
    careUnassigned:input.careRequests.filter(item=>item.status==='open'&&!item.ownerRef).length,
    groupsNearCapacity:input.groups.filter(item=>(item.capacity??0)>0&&(item.participants??0)/(item.capacity??1)>=.85).length,
    discipleshipWithoutNextMeeting:input.discipleships.filter(item=>item.status==='active'&&!item.nextMeeting).length,
    pulseHelpRequested:recentPulse.filter(item=>['prayer','talk','help'].includes(item.state)).length,
    safeVoiceOpen:input.safeVoice.filter(item=>item.status==='open').length,
    exitFeedbackRecent:recentExit.length,
    belongingWithoutRelationship:input.belonging.length,
    memberSignalsOpen:input.memberSignals.filter(item=>item.status==='open').length,
  }
}

export function buildJourneyInsights(snapshot:JourneyIntelligenceSnapshot):JourneyInsight[]{
  const insights:JourneyInsight[]=[]
  if(snapshot.careOverdue>0)insights.push({id:'care-overdue',kind:'care',severity:'attention',count:snapshot.careOverdue,evidenceRefs:['careRequests:overdue'],actionHref:'/care-integrity'})
  if(snapshot.careUnassigned>0)insights.push({id:'care-unassigned',kind:'care',severity:'attention',count:snapshot.careUnassigned,evidenceRefs:['careRequests:unassigned'],actionHref:'/care-integrity'})
  if(snapshot.memberSignalsOpen>0)insights.push({id:'member-signals',kind:'member_signal',severity:'attention',count:snapshot.memberSignalsOpen,evidenceRefs:['memberSignals:open'],actionHref:'/intelligence#signals'})
  if(snapshot.safeVoiceOpen>0)insights.push({id:'safe-voice',kind:'safe_voice',severity:'attention',count:snapshot.safeVoiceOpen,evidenceRefs:['safeVoiceCases:open'],actionHref:'/intelligence#safe-voice'})
  if(snapshot.belongingWithoutRelationship>0)insights.push({id:'belonging',kind:'belonging',severity:'watch',count:snapshot.belongingWithoutRelationship,evidenceRefs:['presenceChecks:90d','people:relationships'],actionHref:'/intelligence#belonging'})
  if(snapshot.groupsNearCapacity>0)insights.push({id:'groups-capacity',kind:'groups',severity:'watch',count:snapshot.groupsNearCapacity,evidenceRefs:['groups:capacity'],actionHref:'/groups-runtime'})
  if(snapshot.discipleshipWithoutNextMeeting>0)insights.push({id:'root-next',kind:'discipleship',severity:'watch',count:snapshot.discipleshipWithoutNextMeeting,evidenceRefs:['discipleships:nextMeeting'],actionHref:'/discipleship-runtime'})
  if(snapshot.pulseHelpRequested>0)insights.push({id:'pulse-help',kind:'pulse',severity:'watch',count:snapshot.pulseHelpRequested,evidenceRefs:['pulseCheckins:30d'],actionHref:'/intelligence#pulse'})
  if(snapshot.exitFeedbackRecent>0)insights.push({id:'exit-feedback',kind:'exit',severity:'watch',count:snapshot.exitFeedbackRecent,evidenceRefs:['exitFeedback:90d'],actionHref:'/intelligence#exit'})
  return insights
}

export function workflowMetric(condition:JourneyWorkflowCondition,snapshot:JourneyIntelligenceSnapshot){
  if(condition==='care_overdue')return snapshot.careOverdue
  if(condition==='care_unassigned')return snapshot.careUnassigned
  if(condition==='group_near_capacity')return snapshot.groupsNearCapacity
  if(condition==='discipleship_no_next_meeting')return snapshot.discipleshipWithoutNextMeeting
  if(condition==='pulse_help_requested')return snapshot.pulseHelpRequested
  return snapshot.exitFeedbackRecent
}

export function evaluateJourneyWorkflow(workflow:JourneyWorkflowRecord,snapshot:JourneyIntelligenceSnapshot){
  return workflow.enabled&&workflowMetric(workflow.condition,snapshot)>=Math.max(1,workflow.threshold)
}

export interface JourneyWorkflowDraft{
  label:string
  condition:JourneyWorkflowCondition
  action:JourneyWorkflowAction
  threshold:number
}

export function parseJourneyWorkflowDraft(text:string):JourneyWorkflowDraft|null{
  const value=text.trim().toLowerCase()
  if(!value)return null
  let condition:JourneyWorkflowCondition|null=null
  if(/atrasad|overdue|vencid/.test(value))condition='care_overdue'
  else if(/sem respons|unassigned|sin respons/.test(value))condition='care_unassigned'
  else if(/capacidade|capacity|capacidad/.test(value))condition='group_near_capacity'
  else if(/pr[oó]ximo encontro|next meeting|pr[oó]ximo encuentro/.test(value))condition='discipleship_no_next_meeting'
  else if(/pedido.*ajuda|help request|pide.*ayuda|ora[cç][aã]o|prayer/.test(value))condition='pulse_help_requested'
  else if(/sa[ií]da|exit|salida/.test(value))condition='exit_feedback_spike'
  if(!condition)return null

  const number=value.match(/\b(\d{1,2})\b/)
  const threshold=number?Math.max(1,Math.min(99,Number(number[1]))):1
  const action:JourneyWorkflowAction=/connect|mensagem|message|mensaje/.test(value)
    ?'suggest_connect'
    :/tarefa|task|tarea/.test(value)
      ?'create_review_task'
      :'surface_attention'
  return{
    label:text.trim().slice(0,80),
    condition,
    action,
    threshold,
  }
}
