import { collection, doc, getDoc, getDocs, limit, query, where, type DocumentData, type Firestore } from 'firebase/firestore'
import type { User } from 'firebase/auth'

const GLOBAL_ROLES = new Set(['ceo', 'global_admin', 'ecosystem_owner', 'founder'])
const ACTIVE_PRODUCT_STATUSES = new Set(['active', 'trialing'])
const ACTIVE_MEMBERSHIP_STATUSES = new Set(['active', 'ativo', ''])

export type JourneyEntryOrganization = {
  id: string
  name: string
  slug?: string
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function safeOrgId(value: unknown) {
  const id = clean(value)
  return id && id.length <= 256 && !id.includes('/') && !id.includes('\\') ? id : ''
}

function inactive(data: DocumentData | undefined) {
  if (!data) return true
  if (data.disabled === true || data.archived === true || data.enabled === false) return true
  return ['inactive', 'suspended', 'disabled', 'removed', 'revoked', 'archived'].includes(clean(data.status).toLowerCase())
}

function productEnabled(org: DocumentData, global: boolean) {
  if (global) return true
  const apps = org.apps || {}
  const current = apps.nestjourney || apps.raiz_e_mesa || {}
  return ACTIVE_PRODUCT_STATUSES.has(clean(current.status).toLowerCase())
}

function collectProfileCandidates(data: DocumentData) {
  const ids = new Set<string>()
  const add = (value: unknown) => {
    const id = safeOrgId(value)
    if (id) ids.add(id)
  }

  add(data.activeOrganizationId)
  add(data.primaryOrganizationId)
  add(data.defaultOrganizationId)
  add(data.organizationId)
  for (const id of Array.isArray(data.organizationIds) ? data.organizationIds : []) add(id)
  for (const item of Array.isArray(data.organizations) ? data.organizations : []) {
    if (typeof item === 'string') add(item)
    else if (item && typeof item === 'object') add((item as Record<string, unknown>).id || (item as Record<string, unknown>).organizationId)
  }
  for (const item of Array.isArray(data.memberships) ? data.memberships : []) {
    if (typeof item === 'string') add(item)
    else if (item && typeof item === 'object') add((item as Record<string, unknown>).organizationId)
  }
  return ids
}

async function legacyMembershipCandidates(db: Firestore, uid: string) {
  const ids = new Set<string>()
  try {
    const snapshot = await getDocs(query(collection(db, 'organization_members'), where('uid', '==', uid), limit(50)))
    snapshot.forEach((membership) => {
      const id = safeOrgId(membership.data().organizationId)
      if (id) ids.add(id)
    })
  } catch {
    // Legacy discovery is a compatibility aid only. Canonical nested membership is checked below.
  }
  return ids
}

async function candidateIsEligible(db: Firestore, uid: string, orgId: string, isGlobal: boolean) {
  try {
    const [orgSnap, memberSnap] = await Promise.all([
      getDoc(doc(db, 'organizations', orgId)),
      getDoc(doc(db, 'organizations', orgId, 'members', uid)),
    ])

    if (!orgSnap.exists() || inactive(orgSnap.data())) return null
    const org = orgSnap.data()
    if (!productEnabled(org, isGlobal)) return null

    const ownerUid = clean(org.ownerUid || org.ownerId)
    if (!isGlobal && ownerUid !== uid) {
      if (!memberSnap.exists() || inactive(memberSnap.data())) return null
      const status = clean(memberSnap.data().status).toLowerCase()
      if (!ACTIVE_MEMBERSHIP_STATUSES.has(status)) return null
    }

    return {
      id: orgId,
      name: clean(org.name) || orgId,
      slug: clean(org.slug) || undefined,
    } satisfies JourneyEntryOrganization
  } catch {
    return null
  }
}

export async function resolveJourneyDirectEntry(db: Firestore, user: User): Promise<JourneyEntryOrganization[]> {
  const userSnap = await getDoc(doc(db, 'users', user.uid))
  if (!userSnap.exists() || inactive(userSnap.data())) return []

  const userData = userSnap.data()
  const isGlobal = GLOBAL_ROLES.has(clean(userData.systemRole))
  const candidates = collectProfileCandidates(userData)

  const legacy = await legacyMembershipCandidates(db, user.uid)
  legacy.forEach((id) => candidates.add(id))

  if (isGlobal) {
    try {
      const snapshot = await getDocs(query(collection(db, 'organizations'), limit(50)))
      snapshot.forEach((organization) => {
        const id = safeOrgId(organization.id)
        if (id) candidates.add(id)
      })
    } catch {
      // The active/profile organizations remain available even if broad discovery is not permitted.
    }
  }

  const resolved = await Promise.all(
    Array.from(candidates).slice(0, 50).map((orgId) => candidateIsEligible(db, user.uid, orgId, isGlobal)),
  )

  const eligible = resolved.filter((item): item is NonNullable<typeof item> => item !== null)
  return eligible.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}
