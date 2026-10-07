export const JOURNEY_INVITE_RESPONSIBILITIES = [
  'member',
  'presence_host',
  'mesa_team',
  'caregiver',
  'group_leader',
  'discipler',
  'coordinator',
  'pastor',
] as const

export type JourneyInviteResponsibility = typeof JOURNEY_INVITE_RESPONSIBILITIES[number]
export type JourneyOrganizationInviteRole = 'admin' | 'manager' | 'member' | 'viewer'

const SAFE_ORGANIZATION_ID=/^[A-Za-z0-9_-]{1,128}$/

export function getJourneyInvitationOrganizationId(pathname:string):string|null{
  const clean=pathname.trim().split('?')[0].split('#')[0].replace(/\/+$/,'')
  const match=clean.match(/^\/join\/([^/]+)$/)
  if(!match)return null
  let decoded=''
  try{decoded=decodeURIComponent(match[1])}catch{return null}
  return SAFE_ORGANIZATION_ID.test(decoded)?decoded:null
}

export function isJourneyInvitationPath(pathname:string){
  return getJourneyInvitationOrganizationId(pathname)!==null
}

export function validateJourneyInvitationUrl(value:string,organizationId:string){
  try{
    const url=new URL(value)
    return url.protocol==='https:'&&
      url.hostname==='nestjourney.millionsnest.com'&&
      url.pathname===`/join/${organizationId}`&&
      Boolean(url.searchParams.get('token'))&&
      Array.from(url.searchParams.keys()).length===1
  }catch{return false}
}
