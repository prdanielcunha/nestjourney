const CONNECT_LAUNCH_ORIGIN = 'https://www.millionsnest.com'
const FOLLOWUP_ID = /^[A-Za-z0-9._:-]{1,220}$/

export function isSafeFollowupId(value?: string | null) {
  const candidate = String(value ?? '').trim()
  return FOLLOWUP_ID.test(candidate)
}

export function buildConnectFollowupLaunchUrl(followupId: string) {
  if (!isSafeFollowupId(followupId)) throw new Error('invalid_followup_id')
  const returnTo = `/journey-followup/${followupId}`
  const url = new URL('/connect/launch', CONNECT_LAUNCH_ORIGIN)
  url.searchParams.set('returnTo', returnTo)
  return url.toString()
}

export function resolveRequestedFollowupId(search: string) {
  const candidate = new URLSearchParams(search).get('followup')
  return isSafeFollowupId(candidate) ? candidate!.trim() : ''
}
