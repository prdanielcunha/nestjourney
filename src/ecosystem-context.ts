import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { Role } from './types'

export type SessionStatus = 'loading' | 'signed-out' | 'authenticated' | 'denied' | 'demo' | 'error'

export interface EcosystemContextValue {
  status: SessionStatus
  user: User | null
  organizationId: string | null
  organization: Record<string, unknown> | null
  organizationIds: string[]
  member: Record<string, unknown> | null
  role: Role
  congregationIds: string[]
  error: string
  isCloud: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  startDemo: () => void
  leaveDemo: () => void
  switchOrganization: (organizationId: string) => Promise<void>
}

export const EcosystemContext = createContext<EcosystemContextValue | null>(null)
