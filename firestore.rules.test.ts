import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let environment: RulesTestEnvironment
beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'raiz-e-mesa-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(async () => environment.cleanup())
beforeEach(async () => environment.clearFirestore())

async function seedMembership(uid: string, orgId: string, role: string, congregationIds = ['unit-a']) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, `organizations/${orgId}`), {
      ownerUid: 'owner',
      status: 'active',
      apps: { raiz_e_mesa: { status: 'active', plan: 'pilot' } },
    })
    await setDoc(doc(db, `organizations/${orgId}/members/${uid}`), { status: 'active', organizationRole: role, congregationIds })
  })
}

describe('Firestore tenant and pastoral isolation', () => {
  it('denies unauthenticated access', async () => {
    await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), 'organizations/org-a')))
  })
  it('prevents cross-tenant reads', async () => {
    await seedMembership('user-a', 'org-a', 'pastor')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-b'), {
        ownerUid: 'other-owner',
        status: 'active',
        apps: { raiz_e_mesa: { status: 'active' } },
      })
      await setDoc(doc(context.firestore(), 'organizations/org-b/products/raiz_e_mesa/people/person-b'), { organizationId: 'org-b', congregationId: 'unit-b', name: 'Example' })
    })
    await assertFails(getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'organizations/org-b/products/raiz_e_mesa/people/person-b')))
  })
  it('denies product data when the organization has no entitlement', async () => {
    await seedMembership('owner', 'org-a', 'owner')
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a'), {
        ownerUid: 'owner',
        status: 'active',
        apps: { raiz_e_mesa: { status: 'inactive' } },
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Example',
      })
    })
    await assertFails(getDoc(doc(
      environment.authenticatedContext('owner').firestore(),
      'organizations/org-a/products/raiz_e_mesa/people/person-a',
    )))
  })
  it('accepts the canonical migration membership document', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a'), {
        ownerUid: 'another-owner',
        status: 'active',
        apps: { raiz_e_mesa: { status: 'active' } },
      })
      await setDoc(doc(db, 'organization_members/user-a_org-a'), {
        uid: 'user-a', organizationId: 'org-a', status: 'active', role: 'care', congregationIds: ['unit-a'],
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Example',
      })
    })
    await assertSucceeds(getDoc(doc(
      environment.authenticatedContext('user-a').firestore(),
      'organizations/org-a/products/raiz_e_mesa/people/person-a',
    )))
  })
  it('limits operational members to assigned congregations', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/people/person-b'), { organizationId: 'org-a', congregationId: 'unit-b', name: 'Example' })
    })
    await assertFails(getDoc(doc(environment.authenticatedContext('care-a').firestore(), 'organizations/org-a/products/raiz_e_mesa/people/person-b')))
  })
  it('allows pastors and denies care workers on pastoral notes', async () => {
    await seedMembership('pastor-a', 'org-a', 'pastor')
    await seedMembership('care-a', 'org-a', 'care')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/pastoral/note-a'), { organizationId: 'org-a', congregationId: 'unit-a', note: 'Restricted' })
    })
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('pastor-a').firestore(), 'organizations/org-a/products/raiz_e_mesa/pastoral/note-a')))
    await assertFails(getDoc(doc(environment.authenticatedContext('care-a').firestore(), 'organizations/org-a/products/raiz_e_mesa/pastoral/note-a')))
  })
  it('prevents tenant reassignment and hard deletion', async () => {
    await seedMembership('owner', 'org-a', 'owner')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/people/person-a'), { organizationId: 'org-a', congregationId: 'unit-a', name: 'Example' })
    })
    const ref = doc(environment.authenticatedContext('owner').firestore(), 'organizations/org-a/products/raiz_e_mesa/people/person-a')
    await assertFails(updateDoc(ref, { organizationId: 'org-b' }))
    await assertFails(deleteDoc(ref))
  })
  it('keeps audit entries append-only and bound to the actor', async () => {
    await seedMembership('owner', 'org-a', 'owner')
    const db = environment.authenticatedContext('owner').firestore()
    const ref = doc(db, 'organizations/org-a/products/raiz_e_mesa/audit/event-a')
    await assertSucceeds(setDoc(ref, { organizationId: 'org-a', actorId: 'owner', action: 'person.created', createdAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { action: 'tampered' }))
  })
  it('allows product settings only for organization administrators', async () => {
    await seedMembership('owner', 'org-a', 'owner')
    await seedMembership('care-a', 'org-a', 'care')
    const ownerRef = doc(environment.authenticatedContext('owner').firestore(), 'organizations/org-a/products/raiz_e_mesa/settings/labels')
    const careRef = doc(environment.authenticatedContext('care-a').firestore(), 'organizations/org-a/products/raiz_e_mesa/settings/labels')
    await assertSucceeds(setDoc(ownerRef, { organizationId: 'org-a', value: { care: 'Conexão' } }))
    await assertFails(setDoc(careRef, { organizationId: 'org-a', value: { care: 'Alterado' } }))
  })
  it('allows presence in assigned units and rejects another unit', async () => {
    await seedMembership('coordinator-a', 'org-a', 'coordinator', ['unit-a'])
    const db = environment.authenticatedContext('coordinator-a').firestore()
    await assertSucceeds(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/presence/event-a'), {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a', date: '2026-09-02',
    }))
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/presence/event-b'), {
      organizationId: 'org-a', congregationId: 'unit-b', personId: 'person-b', date: '2026-09-02',
    }))
  })
  it('allows a data administrator to complete but not rewrite a retention request', async () => {
    await seedMembership('data-a', 'org-a', 'data_admin')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/retentionRequests/request-a'), {
        organizationId: 'org-a', requestedBy: 'person-a', status: 'open', personName: 'Example',
      })
    })
    const ref = doc(environment.authenticatedContext('data-a').firestore(), 'organizations/org-a/products/raiz_e_mesa/retentionRequests/request-a')
    await assertSucceeds(updateDoc(ref, { status: 'completed' }))
    await assertFails(updateDoc(ref, { personName: 'Rewritten' }))
  })
})
