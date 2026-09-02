import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from './firebase'
import { parseEcosystemHandoff } from './handoff'
import type { Role } from './types'
import { EcosystemContext, type EcosystemContextValue, type SessionStatus } from './ecosystem-context'

interface EcosystemOrganization {
  id: string
  name: string
  slug?: string
  apps?: Record<string, { status?: string; access?: boolean; plan?: string }>
  [key: string]: unknown
}

const privilegedRoles = new Set(['ceo', 'global_admin', 'ecosystem_owner', 'founder'])

function uniqueIds(values: unknown[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]
}

function resolveRole(member: Record<string, unknown> | null, systemRole?: unknown): Role {
  if (privilegedRoles.has(String(systemRole))) return 'owner'
  const appAccess = member?.appAccess as Record<string, unknown> | undefined
  const product = (appAccess?.raiz_e_mesa || appAccess?.['raiz-e-mesa']) as Record<string, unknown> | undefined
  const roles = Array.isArray(product?.roles) ? product.roles : []
  const candidate = String(roles[0] || member?.organizationRole || member?.role || 'coordinator')
  const aliases: Record<string, Role> = {
    admin: 'owner', owner: 'owner', pastor: 'pastor', coordinator: 'coordinator',
    reception: 'coordinator', care: 'care', group_leader: 'group_leader',
    leader: 'group_leader', discipler: 'discipler', data_admin: 'data_admin',
  }
  return aliases[candidate] || 'coordinator'
}

function hasEntitlement(organization: EcosystemOrganization, systemRole?: unknown) {
  if (privilegedRoles.has(String(systemRole))) return true
  const entitlement = organization.apps?.raiz_e_mesa || organization.apps?.['raiz-e-mesa']
  return Boolean(entitlement?.access === true || ['active', 'trialing'].includes(String(entitlement?.status)))
}

export function EcosystemProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>(firebaseConfigured ? 'loading' : 'demo')
  const [user, setUser] = useState<User | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organization, setOrganization] = useState<EcosystemOrganization | null>(null)
  const [organizationIds, setOrganizationIds] = useState<string[]>([])
  const [member, setMember] = useState<Record<string, unknown> | null>(null)
  const [systemRole, setSystemRole] = useState<string>('')
  const [error, setError] = useState('')

  const loadTenant = useCallback(async (currentUser: User, requestedId?: string) => {
    if (!db) throw new Error('O Firebase do ecossistema não está disponível.')
    const profileSnapshot = await getDoc(doc(db, 'users', currentUser.uid))
    if (!profileSnapshot.exists()) {
      setStatus('denied')
      setError('Sua conta ainda não foi preparada no MillionsNest. Conclua o cadastro no Hub.')
      return
    }
    const profile = profileSnapshot.data()
    const ids = uniqueIds([
      requestedId,
      profile.activeOrganizationId,
      profile.organizationId,
      profile.primaryOrganizationId,
      profile.defaultOrganizationId,
      ...(Array.isArray(profile.organizationIds) ? profile.organizationIds : []),
      ...(Array.isArray(profile.organizations) ? profile.organizations : []),
    ])
    setSystemRole(String(profile.systemRole || ''))
    setOrganizationIds(ids)
    if (!ids.length) {
      setStatus('denied')
      setError('Nenhuma igreja está vinculada a esta conta no MillionsNest.')
      return
    }

    let denial = 'O Raiz e Mesa ainda não está habilitado para as suas igrejas.'
    for (const id of ids) {
      const [orgSnapshot, nestedMember, legacyMember, reverseMember] = await Promise.all([
        getDoc(doc(db, 'organizations', id)),
        getDoc(doc(db, 'organizations', id, 'members', currentUser.uid)),
        getDoc(doc(db, 'organization_members', `${currentUser.uid}_${id}`)),
        getDoc(doc(db, 'organization_members', `${id}_${currentUser.uid}`)),
      ])
      if (!orgSnapshot.exists()) continue
      const membershipSnapshot = nestedMember.exists() ? nestedMember : legacyMember.exists() ? legacyMember : reverseMember
      const isOwner = [orgSnapshot.data().ownerUid, orgSnapshot.data().ownerId, orgSnapshot.data().ownerUserId, orgSnapshot.data().owner_user_id].includes(currentUser.uid)
      if (!membershipSnapshot.exists() && !isOwner && !privilegedRoles.has(String(profile.systemRole))) continue
      const org = { id, ...orgSnapshot.data() } as EcosystemOrganization
      if (!hasEntitlement(org, profile.systemRole)) {
        denial = `${org.name || 'Esta igreja'} ainda não possui acesso ao Raiz e Mesa.`
        continue
      }
      setOrganizationId(id)
      setOrganization(org)
      setMember(membershipSnapshot.exists() ? membershipSnapshot.data() : { role: isOwner ? 'owner' : 'admin' })
      setError('')
      setStatus('authenticated')
      window.localStorage.setItem('mn_active_organization_id', id)
      return
    }
    setStatus('denied')
    setError(denial)
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      return
    }
    setPersistence(auth, browserLocalPersistence).catch(() => undefined)
    const params = new URLSearchParams(window.location.search)
    const encodedContext = params.get('ecosystem_ctx')
    if (encodedContext) {
      const handoff = parseEcosystemHandoff(encodedContext)
      if (handoff) {
          window.localStorage.setItem('mn_active_organization_id', handoff.orgId)
          void signInWithCustomToken(auth, handoff.customToken).finally(() => {
            window.history.replaceState({}, '', window.location.pathname)
          })
      } else {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (!currentUser) {
        setOrganizationId(null)
        setOrganization(null)
        setMember(null)
        setStatus(sessionStorage.getItem('rem:demo') === '1' ? 'demo' : 'signed-out')
        return
      }
      setStatus('loading')
      loadTenant(currentUser, window.localStorage.getItem('mn_active_organization_id') || undefined).catch((reason) => {
        setStatus('error')
        setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o ecossistema.')
      })
    })
  }, [loadTenant])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return
    setError('')
    await signInWithPopup(auth, new GoogleAuthProvider())
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) return
    setError('')
    await signInWithEmailAndPassword(auth, email, password)
  }, [])

  const logout = useCallback(async () => {
    sessionStorage.removeItem('rem:demo')
    if (auth) await signOut(auth)
    setStatus('signed-out')
  }, [])

  const startDemo = useCallback(() => {
    sessionStorage.setItem('rem:demo', '1')
    setStatus('demo')
  }, [])
  const leaveDemo = useCallback(() => {
    sessionStorage.removeItem('rem:demo')
    setStatus(user ? 'loading' : 'signed-out')
    if (user) void loadTenant(user)
  }, [loadTenant, user])
  const switchOrganization = useCallback(async (id: string) => {
    if (!user || !organizationIds.includes(id)) return
    setStatus('loading')
    await loadTenant(user, id)
  }, [loadTenant, organizationIds, user])

  const role = resolveRole(member, systemRole)
  const memberCongregations = Array.isArray(member?.congregationIds) ? member.congregationIds : []
  const memberCampuses = Array.isArray(member?.campusIds) ? member.campusIds : []
  const congregationIds = uniqueIds([
    ...(memberCongregations as unknown[]),
    ...(memberCampuses as unknown[]),
  ])
  const value = useMemo<EcosystemContextValue>(() => ({
    status, user, organizationId, organization, organizationIds, member, role,
    congregationIds, error, isCloud: status === 'authenticated', signInWithGoogle,
    signInWithEmail, logout, startDemo, leaveDemo, switchOrganization,
  }), [status, user, organizationId, organization, organizationIds, member, role, congregationIds, error, signInWithGoogle, signInWithEmail, logout, startDemo, leaveDemo, switchOrganization])

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>
}
