export type PreferredContactChannel = 'whatsapp' | 'phone'

export interface ContactReadiness {
  ok: boolean
  phoneDigits: string
  preferredContactChannel?: PreferredContactChannel
  reason?: 'missing_phone' | 'missing_channel'
}

export function evaluateAuthorizedContact(input: {
  consent: boolean
  phone?: string
  preferredContactChannel?: PreferredContactChannel
}): ContactReadiness {
  const phoneDigits = String(input.phone ?? '').replace(/\D/g, '')
  if (!input.consent) return { ok: true, phoneDigits: '' }
  if (phoneDigits.length < 8) return { ok: false, phoneDigits, preferredContactChannel: input.preferredContactChannel, reason: 'missing_phone' }
  if (!input.preferredContactChannel) return { ok: false, phoneDigits, reason: 'missing_channel' }
  return { ok: true, phoneDigits, preferredContactChannel: input.preferredContactChannel }
}

export interface GroupCapacityPolicy {
  minimum: number
  idealMin: number
  idealMax: number
  maximum: number
}

export const RAIZ_E_MESA_GROUP_CAPACITY: GroupCapacityPolicy = {
  minimum: 4,
  idealMin: 6,
  idealMax: 10,
  maximum: 12,
}

export function normalizeGroupCapacity(value: number, policy: GroupCapacityPolicy = RAIZ_E_MESA_GROUP_CAPACITY) {
  const min = Math.max(1, Math.floor(policy.minimum))
  const max = Math.max(min, Math.floor(policy.maximum))
  const rounded = Number.isFinite(value) ? Math.floor(value) : max
  return Math.min(max, Math.max(min, rounded))
}

export function groupCapacityState(participants: number, capacity: number, policy: GroupCapacityPolicy = RAIZ_E_MESA_GROUP_CAPACITY) {
  const safeCapacity = normalizeGroupCapacity(capacity, policy)
  const safeParticipants = Math.max(0, Math.floor(participants || 0))
  if (safeParticipants > safeCapacity) return 'over_capacity' as const
  if (safeParticipants >= Math.max(policy.idealMax, Math.ceil(safeCapacity * 0.85))) return 'attention' as const
  if (safeParticipants >= policy.idealMin) return 'healthy' as const
  return 'forming' as const
}

export function implementationExpectedWeek(startedAt: string | undefined, now = Date.now()) {
  if (!startedAt || Number.isNaN(Date.parse(startedAt))) return 1
  const elapsedDays = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 86400000))
  return Math.min(7, Math.floor(elapsedDays / 7) + 1)
}

export function isImplementationWeekOverdue(week: number, completedKeys: string[], startedAt?: string, now = Date.now()) {
  if (week < 1 || week > 7) return false
  const expectedWeek = implementationExpectedWeek(startedAt, now)
  const weekKeys = completedKeys.filter((key) => key.startsWith(`week.${week}.`))
  return expectedWeek > week && weekKeys.length === 0
}

export interface ContinuityPerson {
  id: string
  firstVisit?: string
  visits?: number
  groupId?: string
}

export function buildContinuityCohorts(input: {
  people: ContinuityPerson[]
  activeDiscipleshipPersonIds: Set<string>
  now?: number
}) {
  const now = input.now ?? Date.now()
  const thresholds = [30, 60, 90] as const
  return thresholds.map((days) => {
    const eligible = input.people.filter((person) => {
      if (!person.firstVisit || Number.isNaN(Date.parse(person.firstVisit))) return false
      return now - Date.parse(person.firstVisit) >= days * 86400000
    })
    const continued = eligible.filter((person) =>
      (person.visits ?? 0) > 1 || Boolean(person.groupId) || input.activeDiscipleshipPersonIds.has(person.id),
    )
    return { days, eligible: eligible.length, continued: continued.length }
  })
}
