import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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

async function seedMembership(uid: string, orgId: string, role: string, congregationIds = ['unit-a'], permissions: Record<string, boolean> = {}) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, `organizations/${orgId}`), {
      ownerUid: 'owner',
      status: 'active',
      apps: { raiz_e_mesa: { status: 'active', plan: 'pilot' } },
    })
    await setDoc(doc(db, `organizations/${orgId}/members/${uid}`), { status: 'active', organizationRole: role, congregationIds, permissions })
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
    await assertSucceeds(setDoc(ref, { organizationId: 'org-a', congregationId: 'unit-a', actorId: 'owner', action: 'person.created', createdAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { action: 'tampered' }))
  })
})

describe('Presence Assist and canonical evidence', () => {
  it('allows a scoped coordinator to create a session and its evidence fact atomically', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'])
    const db = environment.authenticatedContext('coord-a').firestore()
    const session = doc(db, 'organizations/org-a/products/raiz_e_mesa/presenceSessions/session-a')
    const fact = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/fact-session-a')
    const batch = writeBatch(db)
    batch.set(session, {
      organizationId: 'org-a', congregationId: 'unit-a', eventRef: 'event:session-a', eventName: 'Sunday',
      openedAt: serverTimestamp(), closedAt: null, status: 'open', expectedPeopleCount: 10,
      minimumCoveragePercent: 90, createdBy: 'coord-a',
    })
    batch.set(fact, {
      eventId: 'fact-session-a', eventType: 'PRESENCE_SESSION_OPENED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
      organizationId: 'org-a', actorId: 'coord-a', subjectRef: 'presenceSession:session-a', sourceApp: 'nestjourney',
      scope: 'congregation:unit-a', evidenceRef: 'presenceSession:session-a', sensitivity: 'internal', version: 1,
      payload: { sessionId: 'session-a' },
    })
    await assertSucceeds(batch.commit())
  })

  it('denies presence management to an unrelated operational role and across assigned scope', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'])
    const careDb = environment.authenticatedContext('care-a').firestore()
    const coordDb = environment.authenticatedContext('coord-a').firestore()
    const base = { organizationId: 'org-a', eventRef: 'event:x', eventName: 'Sunday', openedAt: serverTimestamp(), closedAt: null, status: 'open', expectedPeopleCount: 10, minimumCoveragePercent: 90 }
    await assertFails(setDoc(doc(careDb, 'organizations/org-a/products/raiz_e_mesa/presenceSessions/session-care'), { ...base, congregationId: 'unit-a', createdBy: 'care-a' }))
    await assertFails(setDoc(doc(coordDb, 'organizations/org-a/products/raiz_e_mesa/presenceSessions/session-wrong-unit'), { ...base, congregationId: 'unit-b', createdBy: 'coord-a' }))
  })

  it('keeps checks append-only and only accepts canonical facts backed by a scoped person and check', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore()
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/presenceSessions/session-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', eventRef: 'event:session-a', openedAt: new Date(),
        status: 'open', expectedPeopleCount: 10, minimumCoveragePercent: 90, createdBy: 'coord-a',
      })
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/people/person-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Person A',
      })
    })
    const db = environment.authenticatedContext('coord-a').firestore()
    const check = doc(db, 'organizations/org-a/products/raiz_e_mesa/presenceChecks/check-a')
    const fact = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/fact-check-a')
    const batch = writeBatch(db)
    batch.set(check, {
      organizationId: 'org-a', congregationId: 'unit-a', sessionId: 'session-a', personId: 'person-a',
      state: 'present_confirmed', source: 'human_check', actorId: 'coord-a', recordedAt: serverTimestamp(),
    })
    batch.set(fact, {
      eventId: 'fact-check-a', eventType: 'PRESENCE_CONFIRMED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
      organizationId: 'org-a', actorId: 'coord-a', subjectRef: 'person:person-a', sourceApp: 'nestjourney',
      scope: 'congregation:unit-a', evidenceRef: 'presenceCheck:check-a', sensitivity: 'confidential', version: 1,
      payload: { checkId: 'check-a', sessionId: 'session-a', state: 'present_confirmed', source: 'human_check' },
    })
    await assertSucceeds(batch.commit())
    await assertFails(updateDoc(check, { state: 'absent_confirmed' }))

    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/fake'), {
      eventId: 'fake', eventType: 'PRESENCE_CONFIRMED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
      organizationId: 'org-a', actorId: 'coord-a', subjectRef: 'person:missing', sourceApp: 'nestjourney',
      scope: 'congregation:unit-a', evidenceRef: 'presenceCheck:missing', sensitivity: 'confidential', version: 1,
      payload: { checkId: 'missing' },
    }))
  })

  it('accepts an append-only correction while the session is open and requires a matching corrected fact', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore()
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/presenceSessions/session-correction'), {
        organizationId: 'org-a', congregationId: 'unit-a', eventRef: 'event:session-correction', openedAt: new Date(),
        status: 'open', expectedPeopleCount: 1, minimumCoveragePercent: 90, createdBy: 'coord-a',
      })
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/people/person-correction'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Person Correction',
      })
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/presenceChecks/original-correction'), {
        organizationId: 'org-a', congregationId: 'unit-a', sessionId: 'session-correction', personId: 'person-correction',
        state: 'present_confirmed', source: 'human_check', actorId: 'coord-a', recordedAt: new Date(),
      })
    })

    const db = environment.authenticatedContext('coord-a').firestore()
    const check = doc(db, 'organizations/org-a/products/raiz_e_mesa/presenceChecks/correction-open')
    const fact = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/presence-correction-open')
    const batch = writeBatch(db)
    batch.set(check, {
      organizationId: 'org-a', congregationId: 'unit-a', sessionId: 'session-correction', personId: 'person-correction',
      state: 'absent_confirmed', source: 'retroactive_human_correction', actorId: 'coord-a',
      recordedAt: serverTimestamp(), correctedFromCheckId: 'original-correction',
    })
    batch.set(fact, {
      eventId: 'presence-correction-open', eventType: 'PRESENCE_CORRECTED',
      occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
      organizationId: 'org-a', actorId: 'coord-a', subjectRef: 'person:person-correction', sourceApp: 'nestjourney',
      scope: 'congregation:unit-a', evidenceRef: 'presenceCheck:correction-open', sensitivity: 'confidential', version: 1,
      payload: {
        checkId: 'correction-open', sessionId: 'session-correction', state: 'absent_confirmed',
        source: 'retroactive_human_correction', correctedFromCheckId: 'original-correction',
      },
    })
    await assertSucceeds(batch.commit())

    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/presenceChecks/invalid-same-state'), {
      organizationId: 'org-a', congregationId: 'unit-a', sessionId: 'session-correction', personId: 'person-correction',
      state: 'present_confirmed', source: 'retroactive_human_correction', actorId: 'coord-a',
      recordedAt: serverTimestamp(), correctedFromCheckId: 'original-correction',
    }))
  })

  it('blocks browser retroactive correction after a session closes', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore()
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/presenceSessions/session-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', eventRef: 'event:session-a', openedAt: new Date(),
        status: 'closed', expectedPeopleCount: 10, minimumCoveragePercent: 90, createdBy: 'coord-a',
      })
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/people/person-a'), { organizationId: 'org-a', congregationId: 'unit-a', name: 'Person A' })
      await setDoc(doc(adminDb, 'organizations/org-a/products/raiz_e_mesa/presenceChecks/original'), {
        organizationId: 'org-a', congregationId: 'unit-a', sessionId: 'session-a', personId: 'person-a',
        state: 'absent_confirmed', source: 'human_check', actorId: 'coord-a', recordedAt: new Date(),
      })
    })
    const db = environment.authenticatedContext('coord-a').firestore()
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/presenceChecks/correction-a'), {
      organizationId: 'org-a', congregationId: 'unit-a', sessionId: 'session-a', personId: 'person-a',
      state: 'present_confirmed', source: 'retroactive_human_correction', actorId: 'coord-a', recordedAt: serverTimestamp(), correctedFromCheckId: 'original',
    }))
  })

  it('does not expose raw canonical facts directly to a coordinator lens', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/facts/fact-private'), {
        organizationId: 'org-a', eventType: 'PRESENCE_CONFIRMED', evidenceRef: 'presenceCheck:x', sensitivity: 'confidential',
      })
    })
    await assertFails(getDoc(doc(environment.authenticatedContext('coord-a').firestore(), 'organizations/org-a/products/raiz_e_mesa/facts/fact-private')))
  })

  it('allows a privileged user to register a visitor with a fact that points to the created person', async () => {
    await seedMembership('owner', 'org-a', 'owner', ['unit-a'])
    const db = environment.authenticatedContext('owner').firestore()
    const person = doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-new')
    const fact = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/fact-visitor')
    const batch = writeBatch(db)
    batch.set(person, { organizationId: 'org-a', congregationId: 'unit-a', name: 'Visitor', consent: false, deletedAt: null })
    batch.set(fact, {
      eventId: 'fact-visitor', eventType: 'VISITOR_REGISTERED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
      organizationId: 'org-a', actorId: 'owner', subjectRef: 'person:person-new', sourceApp: 'nestjourney',
      scope: 'congregation:unit-a', evidenceRef: 'person:person-new', sensitivity: 'confidential', version: 1,
      payload: { personId: 'person-new', consent: false },
    })
    await assertSucceeds(batch.commit())
  })
})


describe('Care Integrity persistence and scope', () => {
  async function seedPerson(id = 'person-a', congregationId = 'unit-a') {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `organizations/org-a/products/raiz_e_mesa/people/${id}`), {
        organizationId: 'org-a', congregationId, name: 'Person', consent: true, phone: '43999999999',
      })
    })
  }

  function careFact(
    factId: string,
    eventType: 'CARE_REQUESTED' | 'CARE_ASSIGNED' | 'CARE_RESOLVED',
    uid: string,
    payload: Record<string, string>,
    congregationId = 'unit-a',
  ) {
    return {
      eventId: factId,
      eventType,
      occurredAt: serverTimestamp(),
      recordedAt: serverTimestamp(),
      organizationId: 'org-a',
      actorId: uid,
      subjectRef: `person:${payload.personId}`,
      sourceApp: 'nestjourney',
      scope: `congregation:${congregationId}`,
      evidenceRef: `careRequest:${payload.careRequestId}`,
      sensitivity: 'confidential',
      version: 1,
      payload,
    }
  }

  it('accepts evidence-backed canonical requested/assigned/resolved facts with care writes', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await seedPerson()
    const db = environment.authenticatedContext('care-a').firestore()

    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-a')
    const requestedFactRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-requested-care-a')
    const assignedFactRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-assigned-care-a')
    const create = writeBatch(db)
    create.set(requestRef, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
      careType: 'first_contact', source: 'manual', summary: 'Primeiro contato autorizado',
      status: 'open', requestedAt: serverTimestamp(), requestedBy: 'care-a', promiseHours: 48,
      dueAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), ownerRef: 'care-a',
      assignedAt: serverTimestamp(), assignedBy: 'care-a', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    })
    create.set(requestedFactRef, careFact('care-requested-care-a', 'CARE_REQUESTED', 'care-a', {
      careRequestId: 'care-a', personId: 'person-a', careType: 'first_contact', source: 'manual',
    }))
    create.set(assignedFactRef, careFact('care-assigned-care-a', 'CARE_ASSIGNED', 'care-a', {
      careRequestId: 'care-a', personId: 'person-a', careType: 'first_contact', ownerRef: 'care-a',
    }))
    await assertSucceeds(create.commit())

    await assertFails(updateDoc(requestRef, { dueAt: Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000) }))
    const resolve = writeBatch(db)
    resolve.update(requestRef, {
      status: 'resolved', resolvedAt: serverTimestamp(), resolvedBy: 'care-a',
      resolutionCode: 'contact_completed', resolutionNote: 'Contato concluído.',
    })
    resolve.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-resolved-care-a'),
      careFact('care-resolved-care-a', 'CARE_RESOLVED', 'care-a', {
        careRequestId: 'care-a', personId: 'person-a', careType: 'first_contact', resolutionCode: 'contact_completed',
      }),
    )
    await assertSucceeds(resolve.commit())
  })

  it('allows visitor registration to open an unassigned first-contact promise with source evidence, but not to claim it without care capability', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'], { canManagePeople: true })
    await seedPerson()
    const db = environment.authenticatedContext('coord-a').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/visitor-care')
    const create = writeBatch(db)
    create.set(requestRef, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
      careType: 'first_contact', source: 'visitor_registration', summary: '',
      status: 'open', requestedAt: serverTimestamp(), requestedBy: 'coord-a', promiseHours: 48,
      dueAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), ownerRef: '',
      assignedAt: null, assignedBy: '', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    })
    create.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-requested-visitor-care'),
      careFact('care-requested-visitor-care', 'CARE_REQUESTED', 'coord-a', {
        careRequestId: 'visitor-care', personId: 'person-a', careType: 'first_contact', source: 'visitor_registration',
      }),
    )
    await assertSucceeds(create.commit())
    await assertFails(updateDoc(requestRef, { ownerRef: 'coord-a', assignedAt: serverTimestamp(), assignedBy: 'coord-a' }))
  })

  it('lets a scoped care worker claim an unassigned request and persist its assignment fact atomically', async () => {
    await seedMembership('care-claim', 'org-a', 'care', ['unit-a'])
    await seedPerson()
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/careRequests/claim-care'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
        careType: 'prayer', source: 'visitor_registration', summary: '', status: 'open',
        requestedAt: new Date(), requestedBy: 'source-user', promiseHours: 48,
        dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000), ownerRef: '',
        assignedAt: null, assignedBy: '', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
      })
    })
    const db = environment.authenticatedContext('care-claim').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/claim-care')
    const claim = writeBatch(db)
    claim.update(requestRef, { ownerRef: 'care-claim', assignedAt: serverTimestamp(), assignedBy: 'care-claim' })
    claim.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-assigned-claim-care'),
      careFact('care-assigned-claim-care', 'CARE_ASSIGNED', 'care-claim', {
        careRequestId: 'claim-care', personId: 'person-a', careType: 'prayer', ownerRef: 'care-claim',
      }),
    )
    await assertSucceeds(claim.commit())
  })

  it('ordinary scoped member cannot create a manual Care Request through the generic tenant scope', async () => {
    await seedMembership('member-a', 'org-a', 'member', ['unit-a'])
    await seedPerson()
    const db = environment.authenticatedContext('member-a').firestore()
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/member-care'), {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
      careType: 'prayer', source: 'manual', summary: '', status: 'open',
      requestedAt: serverTimestamp(), requestedBy: 'member-a', promiseHours: 24,
      dueAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), ownerRef: 'member-a',
      assignedAt: serverTimestamp(), assignedBy: 'member-a', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    }))
  })

  it('keeps care requests and facts inside the assigned congregation', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await seedPerson('person-b', 'unit-b')
    const db = environment.authenticatedContext('care-a').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-b')
    const create = writeBatch(db)
    create.set(requestRef, {
      organizationId: 'org-a', congregationId: 'unit-b', personId: 'person-b',
      careType: 'prayer', source: 'manual', summary: '', status: 'open',
      requestedAt: serverTimestamp(), requestedBy: 'care-a', promiseHours: 24,
      dueAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), ownerRef: 'care-a',
      assignedAt: serverTimestamp(), assignedBy: 'care-a', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    })
    create.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-requested-care-b'),
      careFact('care-requested-care-b', 'CARE_REQUESTED', 'care-a', {
        careRequestId: 'care-b', personId: 'person-b', careType: 'prayer', source: 'manual',
      }, 'unit-b'),
    )
    create.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-assigned-care-b'),
      careFact('care-assigned-care-b', 'CARE_ASSIGNED', 'care-a', {
        careRequestId: 'care-b', personId: 'person-b', careType: 'prayer', ownerRef: 'care-a',
      }, 'unit-b'),
    )
    await assertFails(create.commit())
  })

  it('first-contact follow-up is evidence-backed and resolves its Care Promise atomically', async () => {
    await seedMembership('care-followup', 'org-a', 'care', ['unit-a'])
    const due = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-followup'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Follow-up',
        consent: true, phone: '43999999999',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-followup'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-followup',
        careType: 'first_contact', source: 'visitor_registration', summary: '', status: 'open',
        requestedAt: new Date(), requestedBy: 'source-user', promiseHours: 48, dueAt: due,
        ownerRef: 'care-followup', assignedAt: new Date(), assignedBy: 'care-followup',
        resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
      })
    })

    const db = environment.authenticatedContext('care-followup').firestore()
    const followupRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/followups/first-contact-care-followup')
    const createFactRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/followup-created-first-contact-care-followup')
    const create = writeBatch(db)
    create.set(followupRef, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-followup',
      careRequestId: 'care-followup', kind: 'first_contact', status: 'pending',
      ownerRef: 'care-followup', dueAt: due, createdAt: serverTimestamp(), createdBy: 'care-followup',
      completedAt: null, completedBy: '', outcomeCode: '', nextActionCode: '',
    })
    create.set(createFactRef, {
      eventId: 'followup-created-first-contact-care-followup',
      eventType: 'FOLLOWUP_CREATED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
      organizationId: 'org-a', actorId: 'care-followup', subjectRef: 'person:person-followup',
      sourceApp: 'nestjourney', scope: 'congregation:unit-a',
      evidenceRef: 'followup:first-contact-care-followup', sensitivity: 'confidential', version: 1,
      payload: {
        followupId: 'first-contact-care-followup', careRequestId: 'care-followup',
        personId: 'person-followup', kind: 'first_contact',
      },
    })
    await assertSucceeds(create.commit())

    const careRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-followup')
    await assertFails(updateDoc(followupRef, {
      status: 'completed', completedAt: serverTimestamp(), completedBy: 'care-followup',
      outcomeCode: 'group_interest', nextActionCode: 'group_entry',
    }))

    const complete = writeBatch(db)
    complete.update(followupRef, {
      status: 'completed', completedAt: serverTimestamp(), completedBy: 'care-followup',
      outcomeCode: 'group_interest', nextActionCode: 'group_entry',
    })
    complete.update(careRef, {
      status: 'resolved', resolvedAt: serverTimestamp(), resolvedBy: 'care-followup',
      resolutionCode: 'contact_completed', resolutionNote: '',
    })
    complete.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/followup-completed-first-contact-care-followup'),
      {
        eventId: 'followup-completed-first-contact-care-followup',
        eventType: 'FOLLOWUP_COMPLETED', occurredAt: serverTimestamp(), recordedAt: serverTimestamp(),
        organizationId: 'org-a', actorId: 'care-followup', subjectRef: 'person:person-followup',
        sourceApp: 'nestjourney', scope: 'congregation:unit-a',
        evidenceRef: 'followup:first-contact-care-followup', sensitivity: 'confidential', version: 1,
        payload: {
          followupId: 'first-contact-care-followup', careRequestId: 'care-followup',
          personId: 'person-followup', outcomeCode: 'group_interest', nextActionCode: 'group_entry',
        },
      },
    )
    complete.set(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/facts/care-resolved-care-followup'),
      careFact('care-resolved-care-followup', 'CARE_RESOLVED', 'care-followup', {
        careRequestId: 'care-followup', personId: 'person-followup',
        careType: 'first_contact', resolutionCode: 'contact_completed',
      }),
    )
    await assertSucceeds(complete.commit())
    await assertFails(deleteDoc(followupRef))
  })

  it('follow-up creation requires the assigned owner and contact authorization', async () => {
    await seedMembership('care-owner', 'org-a', 'care', ['unit-a'])
    await seedMembership('care-other', 'org-a', 'care', ['unit-a'])
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-no-consent'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Sem Consentimento',
        consent: false, phone: '',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-no-consent'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-no-consent',
        careType: 'first_contact', source: 'visitor_registration', summary: '', status: 'open',
        requestedAt: new Date(), requestedBy: 'source-user', promiseHours: 24, dueAt: due,
        ownerRef: 'care-owner', assignedAt: new Date(), assignedBy: 'care-owner',
        resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
      })
    })

    const ownerDb = environment.authenticatedContext('care-owner').firestore()
    await assertFails(setDoc(
      doc(ownerDb, 'organizations/org-a/products/raiz_e_mesa/followups/first-contact-care-no-consent'),
      {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-no-consent',
        careRequestId: 'care-no-consent', kind: 'first_contact', status: 'pending',
        ownerRef: 'care-owner', dueAt: due, createdAt: serverTimestamp(), createdBy: 'care-owner',
        completedAt: null, completedBy: '', outcomeCode: '', nextActionCode: '',
      },
    ))

    const otherDb = environment.authenticatedContext('care-other').firestore()
    await assertFails(setDoc(
      doc(otherDb, 'organizations/org-a/products/raiz_e_mesa/followups/first-contact-care-no-consent'),
      {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-no-consent',
        careRequestId: 'care-no-consent', kind: 'first_contact', status: 'pending',
        ownerRef: 'care-other', dueAt: due, createdAt: serverTimestamp(), createdBy: 'care-other',
        completedAt: null, completedBy: '', outcomeCode: '', nextActionCode: '',
      },
    ))
  })

})


describe('Groups and Discipleship runtime rules', () => {
  it('allows an assigned group leader to create and update a valid group, but not cross-scope', async () => {
    await seedMembership('leader-a', 'org-a', 'group_leader', ['unit-a'])
    const db = environment.authenticatedContext('leader-a').firestore()
    const ref = doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-a')
    await assertSucceeds(setDoc(ref, {
      organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa Norte',
      capacity: 12, participants: 0, createdAt: serverTimestamp(), createdBy: 'leader-a',
    }))
    await assertSucceeds(updateDoc(ref, { participants: 7 }))
    await assertFails(updateDoc(ref, { participants: 13 }))
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-b'), {
      organizationId: 'org-a', congregationId: 'unit-b', name: 'Casa Fora',
      capacity: 12, participants: 0, createdAt: serverTimestamp(), createdBy: 'leader-a',
    }))
  })

  it('ordinary member cannot manage groups', async () => {
    await seedMembership('member-a', 'org-a', 'member', ['unit-a'])
    const db = environment.authenticatedContext('member-a').firestore()
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/member-group'), {
      organizationId: 'org-a', congregationId: 'unit-a', name: 'No',
      capacity: 12, participants: 0,
    }))
  })


  it('group leader manages only their own explicit roster with atomic participant projection', async () => {
    await seedMembership('leader-a', 'org-a', 'group_leader', ['unit-a'])
    await seedMembership('leader-b', 'org-a', 'group_leader', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Ana',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa A',
        leaderId: 'leader-a', capacity: 12, participants: 0, createdBy: 'leader-a',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-b'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa B',
        leaderId: 'leader-b', capacity: 12, participants: 0, createdBy: 'leader-b',
      })
    })

    const db = environment.authenticatedContext('leader-a').firestore()
    const groupRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-a')
    const membershipRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/groupMemberships/group-a__person-a')

    const add = writeBatch(db)
    add.set(membershipRef, {
      organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-a', personId: 'person-a',
      personName: 'Ana', status: 'active', joinedAt: serverTimestamp(), joinedBy: 'leader-a',
      leftAt: null, leftBy: '',
    })
    add.update(groupRef, { participants: 1 })
    await assertSucceeds(add.commit())
    await assertSucceeds(getDoc(membershipRef))

    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groupMemberships/group-b__person-a'), {
      organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-b', personId: 'person-a',
      personName: 'Ana', status: 'active', joinedAt: serverTimestamp(), joinedBy: 'leader-a',
      leftAt: null, leftBy: '',
    }))
    await assertFails(updateDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-b'), { participants: 1 }))

    const leave = writeBatch(db)
    leave.update(membershipRef, { status: 'left', leftAt: serverTimestamp(), leftBy: 'leader-a' })
    leave.update(groupRef, { participants: 0 })
    await assertSucceeds(leave.commit())
    await assertFails(deleteDoc(membershipRef))
  })

  it('pastor can read a group roster while a different group leader cannot', async () => {
    await seedMembership('leader-a', 'org-a', 'group_leader', ['unit-a'])
    await seedMembership('leader-b', 'org-a', 'group_leader', ['unit-a'])
    await seedMembership('pastor-a', 'org-a', 'pastor', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa A',
        leaderId: 'leader-a', capacity: 12, participants: 1, createdBy: 'leader-a',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groupMemberships/group-a__person-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-a', personId: 'person-a',
        personName: 'Ana', status: 'active', joinedAt: new Date(), joinedBy: 'leader-a',
        leftAt: null, leftBy: '',
      })
    })
    const path = 'organizations/org-a/products/raiz_e_mesa/groupMemberships/group-a__person-a'
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('pastor-a').firestore(), path)))
    await assertFails(getDoc(doc(environment.authenticatedContext('leader-b').firestore(), path)))
  })

  it('pastor can route a Casa entry request and only that Casa leader can see it', async () => {
    await seedMembership('leader-a', 'org-a', 'group_leader', ['unit-a'])
    await seedMembership('leader-b', 'org-a', 'group_leader', ['unit-a'])
    await seedMembership('pastor-a', 'org-a', 'pastor', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-entry'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Entrada',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-entry-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa A',
        leaderId: 'leader-a', capacity: 12, participants: 0, createdBy: 'leader-a',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-entry-b'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa B',
        leaderId: 'leader-b', capacity: 12, participants: 0, createdBy: 'leader-b',
      })
    })

    const pastorDb = environment.authenticatedContext('pastor-a').firestore()
    const requestRef = doc(pastorDb, 'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-entry-a')
    await assertSucceeds(setDoc(requestRef, {
      organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-entry-a',
      personId: 'person-entry', personName: 'Pessoa Entrada', status: 'pending',
      requestedAt: serverTimestamp(), requestedBy: 'pastor-a', resolvedAt: null, resolvedBy: '',
    }))

    await assertSucceeds(getDoc(doc(
      environment.authenticatedContext('leader-a').firestore(),
      'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-entry-a',
    )))
    await assertFails(getDoc(doc(
      environment.authenticatedContext('leader-b').firestore(),
      'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-entry-a',
    )))

    const leaderDb = environment.authenticatedContext('leader-a').firestore()
    await assertFails(setDoc(doc(leaderDb, 'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/leader-created'), {
      organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-entry-a',
      personId: 'person-entry', personName: 'Pessoa Entrada', status: 'pending',
      requestedAt: serverTimestamp(), requestedBy: 'leader-a', resolvedAt: null, resolvedBy: '',
    }))
  })

  it('accepting a Casa entry request requires the active membership in the same write', async () => {
    await seedMembership('leader-a', 'org-a', 'group_leader', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/people/person-entry'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Pessoa Entrada',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-entry-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa A',
        leaderId: 'leader-a', capacity: 12, participants: 0, createdBy: 'leader-a',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-entry-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-entry-a',
        personId: 'person-entry', personName: 'Pessoa Entrada', status: 'pending',
        requestedAt: new Date(), requestedBy: 'pastor-a', resolvedAt: null, resolvedBy: '',
      })
    })

    const db = environment.authenticatedContext('leader-a').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-entry-a')
    await assertFails(updateDoc(requestRef, {
      status: 'accepted', resolvedAt: serverTimestamp(), resolvedBy: 'leader-a',
    }))

    const membershipRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/groupMemberships/group-entry-a__person-entry')
    const groupRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-entry-a')
    const accept = writeBatch(db)
    accept.set(membershipRef, {
      organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-entry-a',
      personId: 'person-entry', personName: 'Pessoa Entrada', status: 'active',
      joinedAt: serverTimestamp(), joinedBy: 'leader-a', leftAt: null, leftBy: '',
    })
    accept.update(groupRef, { participants: 1 })
    accept.update(requestRef, {
      status: 'accepted', resolvedAt: serverTimestamp(), resolvedBy: 'leader-a',
    })
    await assertSucceeds(accept.commit())
    await assertSucceeds(getDoc(membershipRef))
    await assertFails(deleteDoc(requestRef))
  })

  it('a Casa leader can decline a routed entry request without storing a reason', async () => {
    await seedMembership('leader-a', 'org-a', 'group_leader', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groups/group-entry-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Casa A',
        leaderId: 'leader-a', capacity: 12, participants: 0, createdBy: 'leader-a',
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-decline'), {
        organizationId: 'org-a', congregationId: 'unit-a', groupId: 'group-entry-a',
        personId: 'person-entry', personName: 'Pessoa Entrada', status: 'pending',
        requestedAt: new Date(), requestedBy: 'pastor-a', resolvedAt: null, resolvedBy: '',
      })
    })
    const db = environment.authenticatedContext('leader-a').firestore()
    const ref = doc(db, 'organizations/org-a/products/raiz_e_mesa/groupEntryRequests/request-decline')
    await assertSucceeds(updateDoc(ref, {
      status: 'declined', resolvedAt: serverTimestamp(), resolvedBy: 'leader-a',
    }))
    await assertFails(updateDoc(ref, { status: 'pending', resolvedAt: null, resolvedBy: '' }))
  })

  it('discipler can create and advance only their own relation without changing person or regressing meetings', async () => {
    await seedMembership('discipler-a', 'org-a', 'discipler', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/people/person-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Person',
      })
    })
    const db = environment.authenticatedContext('discipler-a').firestore()
    const ref = doc(db, 'organizations/org-a/products/raiz_e_mesa/discipleships/d-a')
    await assertSucceeds(setDoc(ref, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a', personName: 'Person',
      disciplerId: 'discipler-a', meeting: 1, status: 'active', nextMeeting: 'Agendar encontro 1',
    }))
    await assertSucceeds(updateDoc(ref, { meeting: 2, nextMeeting: 'Agendar encontro 2' }))
    await assertFails(updateDoc(ref, { personId: 'person-b' }))
    await assertFails(updateDoc(ref, { meeting: 1 }))
    await assertFails(updateDoc(ref, { meeting: 7, status: 'completed' }))
  })

  it('discipler cannot create a relationship assigned to another user', async () => {
    await seedMembership('discipler-a', 'org-a', 'discipler', ['unit-a'])
    const db = environment.authenticatedContext('discipler-a').firestore()
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/discipleships/d-other'), {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
      disciplerId: 'someone-else', meeting: 1, status: 'active',
    }))
  })
})


describe('Implementation Runtime rules', () => {
  function cycle(uid: string, congregationId = 'unit-a') {
    return {
      organizationId:'org-a', congregationId, playbookId:'raiz_e_mesa_2026', status:'active',
      startedAt:serverTimestamp(), createdAt:serverTimestamp(), createdBy:uid,
    }
  }
  function step(uid: string, key = 'prep.1', congregationId = 'unit-a') {
    return {
      organizationId:'org-a', congregationId, cycleId:'cycle-a', playbookId:'raiz_e_mesa_2026',
      key, completedAt:serverTimestamp(), completedBy:uid,
    }
  }

  it('allows a scoped coordinator to start the playbook and append a canonical step', async () => {
    await seedMembership('coord-impl','org-a','coordinator',['unit-a'])
    const db=environment.authenticatedContext('coord-impl').firestore()
    const ref=doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-a')
    await assertSucceeds(setDoc(ref,cycle('coord-impl')))
    const stepRef=doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-a/steps/prep.1')
    await assertSucceeds(setDoc(stepRef,step('coord-impl')))
    await assertFails(updateDoc(stepRef,{key:'prep.2'}))
  })

  it('rejects arbitrary step keys and cross-scope cycle creation', async () => {
    await seedMembership('coord-impl','org-a','coordinator',['unit-a'])
    const db=environment.authenticatedContext('coord-impl').firestore()
    const ref=doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-a')
    await assertSucceeds(setDoc(ref,cycle('coord-impl')))
    await assertFails(setDoc(
      doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-a/steps/invented.step'),
      step('coord-impl','invented.step'),
    ))
    await assertFails(setDoc(doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-b'),cycle('coord-impl','unit-b')))
    await assertFails(updateDoc(ref,{status:'completed'}))
  })

  it('keeps implementation management away from an ordinary scoped member', async () => {
    await seedMembership('member-impl','org-a','member',['unit-a'])
    const db=environment.authenticatedContext('member-impl').firestore()
    await assertFails(setDoc(doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/member-cycle'),cycle('member-impl')))
  })
})



describe('Governance Runtime rules', () => {
  async function seedGovernancePerson() {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/people/privacy-person'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Privacy Person', consent: true, phone: '43999999999',
      })
    })
  }

  function request(uid: string, type: 'correction' | 'consent_revocation' | 'deletion_review' | 'retention_review', congregationId = 'unit-a') {
    return {
      organizationId: 'org-a',
      congregationId,
      personId: 'privacy-person',
      personName: 'Privacy Person',
      requestType: type,
      targetField: type === 'correction' ? 'phone' : '',
      proposedValue: type === 'correction' ? '43988888888' : '',
      status: 'open',
      requestedAt: serverTimestamp(),
      requestedBy: uid,
    }
  }

  it('data admin can register a structured privacy request and append an audit event', async () => {
    await seedMembership('data-a', 'org-a', 'data_admin', ['unit-a'])
    await seedGovernancePerson()
    const db = environment.authenticatedContext('data-a').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/retentionRequests/request-a')
    const auditRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/audit/privacy-a')
    const batch = writeBatch(db)
    batch.set(requestRef, request('data-a', 'correction'))
    batch.set(auditRef, {
      organizationId: 'org-a', congregationId: 'unit-a', actorId: 'data-a',
      action: 'privacy.requested', targetRef: 'privacyRequest:request-a',
      subjectRef: 'person:privacy-person', requestType: 'correction', createdAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(requestRef))
    await assertSucceeds(getDoc(auditRef))
    await assertFails(updateDoc(requestRef, { status: 'resolved' }))
    await assertFails(deleteDoc(auditRef))
  })

  it('rejects free-form invalid correction data and cross-scope privacy requests', async () => {
    await seedMembership('data-a', 'org-a', 'data_admin', ['unit-a'])
    await seedGovernancePerson()
    const db = environment.authenticatedContext('data-a').firestore()
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/retentionRequests/invalid'), {
      ...request('data-a', 'correction'),
      targetField: 'private_notes',
      proposedValue: 'sensitive narrative',
    }))
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/retentionRequests/outside'), {
      ...request('data-a', 'retention_review', 'unit-b'),
    }))
  })

  it('pastor may view scoped audit but cannot open the data-governance privacy queue', async () => {
    await seedMembership('pastor-a', 'org-a', 'pastor', ['unit-a'])
    await seedGovernancePerson()
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/audit/event-pastor'), {
        organizationId: 'org-a', congregationId: 'unit-a', actorId: 'data-a', action: 'privacy.requested', createdAt: new Date(),
      })
      await setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/retentionRequests/request-pastor'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'privacy-person',
        requestType: 'retention_review', targetField: '', proposedValue: '', status: 'open',
        requestedAt: new Date(), requestedBy: 'data-a',
      })
    })
    const db = environment.authenticatedContext('pastor-a').firestore()
    await assertSucceeds(getDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/audit/event-pastor')))
    await assertFails(getDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/retentionRequests/request-pastor')))
  })

  it('ordinary operational roles cannot create or read governance requests', async () => {
    await seedMembership('care-gov', 'org-a', 'care', ['unit-a'])
    await seedGovernancePerson()
    const db = environment.authenticatedContext('care-gov').firestore()
    await assertFails(setDoc(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/retentionRequests/request-care'),
      request('care-gov', 'consent_revocation'),
    ))
  })
})


describe('Pastoral Handoff Runtime rules', () => {
  async function seedCare(uid = 'care-pastoral') {
    await seedMembership(uid, 'org-a', 'care', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/people/person-pastoral'), {
        organizationId: 'org-a', congregationId: 'unit-a', name: 'Pastoral Person', consent: true,
      })
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/careRequests/care-pastoral'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-pastoral',
        careType: 'pastoral_contact', source: 'manual', summary: '', status: 'open',
        requestedAt: new Date(), requestedBy: uid, promiseHours: 24,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), ownerRef: uid,
        assignedAt: new Date(), assignedBy: uid, resolvedAt: null, resolvedBy: '',
        resolutionCode: '', resolutionNote: '',
      })
    })
  }

  it('care can atomically hand off without gaining access to the restricted pastoral queue', async () => {
    await seedCare()
    const db = environment.authenticatedContext('care-pastoral').firestore()
    const careRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-pastoral')
    const handoffRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/pastoralHandoffs/care-pastoral')
    const batch = writeBatch(db)
    batch.update(careRef, {
      status: 'resolved', resolvedAt: serverTimestamp(), resolvedBy: 'care-pastoral',
      resolutionCode: 'pastoral_handoff', resolutionNote: '',
    })
    batch.set(handoffRef, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-pastoral',
      sourceCareRequestId: 'care-pastoral', status: 'open',
      requestedAt: serverTimestamp(), requestedBy: 'care-pastoral', resolvedAt: null, resolvedBy: '',
    })
    await assertSucceeds(batch.commit())
    await assertFails(getDoc(handoffRef))
  })

  it('rejects arbitrary pastoral markers not backed by an atomic care resolution', async () => {
    await seedCare()
    const db = environment.authenticatedContext('care-pastoral').firestore()
    await assertFails(setDoc(
      doc(db, 'organizations/org-a/products/raiz_e_mesa/pastoralHandoffs/fake'),
      {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-pastoral',
        sourceCareRequestId: 'fake', status: 'open',
        requestedAt: serverTimestamp(), requestedBy: 'care-pastoral', resolvedAt: null, resolvedBy: '',
      },
    ))
  })

  it('pastor can read and resolve the marker without adding narrative fields', async () => {
    await seedMembership('pastor-pastoral', 'org-a', 'pastor', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/pastoralHandoffs/handoff-a'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-pastoral',
        sourceCareRequestId: 'care-pastoral', status: 'open',
        requestedAt: new Date(), requestedBy: 'care-pastoral', resolvedAt: null, resolvedBy: '',
      })
    })
    const db = environment.authenticatedContext('pastor-pastoral').firestore()
    const ref = doc(db, 'organizations/org-a/products/raiz_e_mesa/pastoralHandoffs/handoff-a')
    await assertSucceeds(getDoc(ref))
    await assertSucceeds(updateDoc(ref, { status: 'resolved', resolvedAt: serverTimestamp(), resolvedBy: 'pastor-pastoral' }))
    await assertFails(updateDoc(ref, { note: 'private narrative' }))
    await assertFails(deleteDoc(ref))
  })

  it('ordinary admin does not automatically receive restricted pastoral access', async () => {
    await seedMembership('admin-pastoral', 'org-a', 'admin', ['unit-a'])
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'organizations/org-a/products/raiz_e_mesa/pastoralHandoffs/handoff-admin'), {
        organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-pastoral',
        sourceCareRequestId: 'care-pastoral', status: 'open',
        requestedAt: new Date(), requestedBy: 'care-pastoral', resolvedAt: null, resolvedBy: '',
      })
    })
    await assertFails(getDoc(doc(
      environment.authenticatedContext('admin-pastoral').firestore(),
      'organizations/org-a/products/raiz_e_mesa/pastoralHandoffs/handoff-admin',
    )))
  })
})
