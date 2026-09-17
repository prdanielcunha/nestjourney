export type AppLocale = 'pt-BR' | 'en' | 'es'

const STORAGE_KEY = 'nestjourney_locale'

export function normalizeLocale(value?: string | null): AppLocale {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('es')) return 'es'
  return 'pt-BR'
}

export function getInitialLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return normalizeLocale(stored)
  } catch {}
  return normalizeLocale(typeof navigator !== 'undefined' ? navigator.language : 'pt-BR')
}

export function persistLocale(locale: AppLocale) {
  try { localStorage.setItem(STORAGE_KEY, locale) } catch {}
}

export const localeLabels: Record<AppLocale, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
}

export const presenceAssistCopy = {
  'pt-BR': {
    product: 'NestJourney',
    title: 'Presence Assist',
    subtitle: 'Confirmação humana, cobertura visível e nenhuma ausência presumida.',
    back: 'Voltar ao NestJourney',
    loading: 'Carregando contexto seguro…',
    noAccessTitle: 'Acesso não disponível',
    noAccess: 'Seu perfil atual não possui permissão para operar sessões de presença neste escopo.',
    retry: 'Tentar novamente',
    congregation: 'Unidade',
    session: 'Sessão',
    newSession: 'Abrir sessão',
    sessionName: 'Nome do culto/evento',
    expected: 'Pessoas no escopo de checagem',
    minimumCoverage: 'Cobertura mínima para evidência de ausência',
    open: 'Abrir sessão agora',
    close: 'Encerrar sessão',
    closed: 'Sessão encerrada',
    confirmClose: 'Encerrar esta sessão? A cobertura ficará registrada. Correções posteriores continuam auditáveis.',
    coverage: 'Cobertura',
    verified: 'verificados',
    unverified: 'não verificados',
    qualityReady: 'Cobertura suficiente para usar ausências explicitamente confirmadas como evidência.',
    qualityNotReady: 'Cobertura insuficiente: não use esta sessão para concluir ausência.',
    search: 'Buscar pessoa por nome',
    present: 'Presente confirmado',
    markPresent: 'Confirmar presença',
    correcting: 'Correção auditada',
    notVerified: 'Não verificado',
    people: 'Pessoas',
    newVisitor: 'Novo visitante',
    visitorName: 'Nome',
    phone: 'WhatsApp',
    consent: 'Autorizou contato durante a semana',
    saveVisitor: 'Cadastrar e marcar presente',
    cancel: 'Cancelar',
    sourceRule: 'Não marcado continua como não verificado. O sistema não presume ausência.',
    empty: 'Nenhuma pessoa encontrada neste escopo.',
    noSession: 'Abra uma sessão para começar a checagem.',
    error: 'Não foi possível concluir a operação.',
    todayEvent: 'Culto',
  },
  en: {
    product: 'NestJourney',
    title: 'Presence Assist',
    subtitle: 'Human confirmation, visible coverage, and no assumed absences.',
    back: 'Back to NestJourney',
    loading: 'Loading secure context…',
    noAccessTitle: 'Access unavailable',
    noAccess: 'Your current profile does not have permission to operate presence sessions in this scope.',
    retry: 'Try again',
    congregation: 'Campus',
    session: 'Session',
    newSession: 'Open session',
    sessionName: 'Service/event name',
    expected: 'People in the verification scope',
    minimumCoverage: 'Minimum coverage for absence evidence',
    open: 'Open session now',
    close: 'Close session',
    closed: 'Session closed',
    confirmClose: 'Close this session? Coverage will be recorded. Later corrections remain auditable.',
    coverage: 'Coverage',
    verified: 'verified',
    unverified: 'unverified',
    qualityReady: 'Coverage is sufficient to use explicitly confirmed absences as evidence.',
    qualityNotReady: 'Coverage is insufficient: do not use this session to conclude absence.',
    search: 'Search person by name',
    present: 'Present confirmed',
    markPresent: 'Confirm presence',
    correcting: 'Audited correction',
    notVerified: 'Unverified',
    people: 'People',
    newVisitor: 'New visitor',
    visitorName: 'Name',
    phone: 'WhatsApp',
    consent: 'Authorized contact during the week',
    saveVisitor: 'Create and mark present',
    cancel: 'Cancel',
    sourceRule: 'Unmarked remains unverified. The system never assumes absence.',
    empty: 'No people found in this scope.',
    noSession: 'Open a session to begin verification.',
    error: 'The operation could not be completed.',
    todayEvent: 'Service',
  },
  es: {
    product: 'NestJourney',
    title: 'Presence Assist',
    subtitle: 'Confirmación humana, cobertura visible y ninguna ausencia presumida.',
    back: 'Volver a NestJourney',
    loading: 'Cargando contexto seguro…',
    noAccessTitle: 'Acceso no disponible',
    noAccess: 'Tu perfil actual no tiene permiso para operar sesiones de presencia en este alcance.',
    retry: 'Intentar de nuevo',
    congregation: 'Sede',
    session: 'Sesión',
    newSession: 'Abrir sesión',
    sessionName: 'Nombre del culto/evento',
    expected: 'Personas en el alcance de verificación',
    minimumCoverage: 'Cobertura mínima para evidencia de ausencia',
    open: 'Abrir sesión ahora',
    close: 'Cerrar sesión',
    closed: 'Sesión cerrada',
    confirmClose: '¿Cerrar esta sesión? La cobertura quedará registrada. Las correcciones posteriores seguirán siendo auditables.',
    coverage: 'Cobertura',
    verified: 'verificados',
    unverified: 'no verificados',
    qualityReady: 'La cobertura es suficiente para usar ausencias confirmadas explícitamente como evidencia.',
    qualityNotReady: 'Cobertura insuficiente: no uses esta sesión para concluir ausencia.',
    search: 'Buscar persona por nombre',
    present: 'Presente confirmado',
    markPresent: 'Confirmar presencia',
    correcting: 'Corrección auditada',
    notVerified: 'No verificado',
    people: 'Personas',
    newVisitor: 'Nuevo visitante',
    visitorName: 'Nombre',
    phone: 'WhatsApp',
    consent: 'Autorizó contacto durante la semana',
    saveVisitor: 'Crear y marcar presente',
    cancel: 'Cancelar',
    sourceRule: 'Sin marcar permanece no verificado. El sistema no presume ausencia.',
    empty: 'No se encontraron personas en este alcance.',
    noSession: 'Abre una sesión para comenzar la verificación.',
    error: 'No se pudo completar la operación.',
    todayEvent: 'Culto',
  },
} as const
