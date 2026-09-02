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
    await setDoc(doc(db, `organizations/${orgId}`), { ownerId: 'owner', status: 'active' })
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
      await setDoc(doc(context.firestore(), 'organizations/org-b/people/person-b'), { organizationId: 'org-b', congregationId: 'unit-b', name: 'Example' })
    })
    await assertFails(getDoc(doc(environment.authenticatedContext('user-a').firestore(), 'organizations/org-b/people/person-b')))
  })
  it('limits operational members to assigned congregations', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/people/person-b'), { organizationId: 'org-a', congregationId: 'unit-b', name: 'Example' })
    })
    await assertFails(getDoc(doc(environment.authenticatedContext('care-a').firestore(), 'organizations/org-a/people/person-b')))
  })
  it('allows pastors and denies care workers on pastoral notes', async () => {
    await seedMembership('pastor-a', 'org-a', 'pastor')
    await seedMembership('care-a', 'org-a', 'care')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/pastoral/note-a'), { organizationId: 'org-a', congregationId: 'unit-a', note: 'Restricted' })
    })
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('pastor-a').firestore(), 'organizations/org-a/pastoral/note-a')))
    await assertFails(getDoc(doc(environment.authenticatedContext('care-a').firestore(), 'organizations/org-a/pastoral/note-a')))
  })
  it('prevents tenant reassignment and hard deletion', async () => {
    await seedMembership('owner', 'org-a', 'owner')
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/people/person-a'), { organizationId: 'org-a', congregationId: 'unit-a', name: 'Example' })
    })
    const ref = doc(environment.authenticatedContext('owner').firestore(), 'organizations/org-a/people/person-a')
    await assertFails(updateDoc(ref, { organizationId: 'org-b' }))
    await assertFails(deleteDoc(ref))
  })
  it('keeps audit entries append-only and bound to the actor', async () => {
    await seedMembership('owner', 'org-a', 'owner')
    const db = environment.authenticatedContext('owner').firestore()
    const ref = doc(db, 'organizations/org-a/audit/event-a')
    await assertSucceeds(setDoc(ref, { organizationId: 'org-a', actorId: 'owner', action: 'person.created', createdAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { action: 'tampered' }))
  })
})
