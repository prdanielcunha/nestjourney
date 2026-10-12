/**
 * Deterministic, non-PII document ID for one attendance intent.
 * A retry of the same current transition cannot create another check/fact.
 * A new correction references the latest prior check and gets a new ID.
 *
 * This is not an offline queue or a substitute for server-side concurrency control.
 */
export interface PresenceIntent {
  organizationId:string
  congregationId:string
  sessionId:string
  personId:string
  actorId:string
  state:'present_confirmed'|'absent_confirmed'|'unverified'
  correctedFromCheckId?:string
  correctionReason?:string
}
export function presenceIntentTuple(input:PresenceIntent):readonly string[] {
  return [
    'nestjourney-presence-intent-v1',
    input.organizationId,input.congregationId,input.sessionId,input.personId,
    input.actorId,input.state,input.correctedFromCheckId||'',
    input.correctionReason?.trim()||'',
  ]
}
export async function presenceIntentCheckId(input:PresenceIntent):Promise<string>{
  if(typeof crypto==='undefined'||!crypto.subtle)
    throw new Error('secure_digest_unavailable')
  const bytes=new TextEncoder().encode(JSON.stringify(presenceIntentTuple(input)))
  const hash=await crypto.subtle.digest('SHA-256',bytes)
  return 'intent_'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')
}
