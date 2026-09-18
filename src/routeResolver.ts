export type JourneyRoute =
  | 'overview'
  | 'today'
  | 'presence'
  | 'care'
  | 'profile'
  | 'groups'
  | 'discipleship'
  | 'implementation'
  | 'governance'
  | 'legacy'

function normalizePathname(pathname: string) {
  const clean = pathname.trim().split('?')[0].split('#')[0]
  if (!clean || clean === '/') return '/'
  return clean.endsWith('/') ? clean.slice(0, -1) : clean
}

export function resolveJourneyRoute(pathname: string): JourneyRoute {
  switch (normalizePathname(pathname)) {
    case '/presence-assist':
      return 'presence'
    case '/care-integrity':
      return 'care'
    case '/journey-profile':
      return 'profile'
    case '/my-today':
      return 'today'
    case '/groups-runtime':
      return 'groups'
    case '/discipleship-runtime':
      return 'discipleship'
    case '/implementation-runtime':
      return 'implementation'
    case '/governance-runtime':
      return 'governance'
    case '/legacy':
      return 'legacy'
    case '/journey-overview':
    case '/':
    default:
      return 'overview'
  }
}
