export type JourneyRoute =
  | 'today'
  | 'areas'
  | 'mesa'
  | 'vision'
  | 'more'
  | 'reports'
  | 'help'
  | 'whats-new'
  | 'presence'
  | 'care'
  | 'followup'
  | 'profile'
  | 'groups'
  | 'discipleship'
  | 'implementation'
  | 'playbook-studio'
  | 'team'
  | 'settings'
  | 'governance'
  | 'pastoral'

function normalizePathname(pathname: string) {
  const clean = pathname.trim().split('?')[0].split('#')[0]
  if (!clean || clean === '/') return '/'
  return clean.endsWith('/') ? clean.slice(0, -1) : clean
}

export function resolveJourneyRoute(pathname: string): JourneyRoute {
  switch (normalizePathname(pathname)) {
    case '/areas':
      return 'areas'
    case '/mesa-runtime':
      return 'mesa'
    case '/vision':
      return 'vision'
    case '/more':
      return 'more'
    case '/reports':
      return 'reports'
    case '/help':
      return 'help'
    case '/whats-new':
      return 'whats-new'
    case '/presence-assist':
      return 'presence'
    case '/care-integrity':
      return 'care'
    case '/followup-runtime':
      return 'followup'
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
    case '/playbook-studio':
      return 'playbook-studio'
    case '/team-runtime':
      return 'team'
    case '/settings-runtime':
      return 'settings'
    case '/governance-runtime':
      return 'governance'
    case '/pastoral-handoff':
      return 'pastoral'
    case '/journey-overview':
      return 'vision'
    case '/':
      return 'today'
    default:
      return 'today'
  }
}
