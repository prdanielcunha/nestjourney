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
    await assertSucceeds(setDoc(ref, { organizationId: 'org-a', actorId: 'owner', action: 'person.created', createdAt: serverTimestamp() }))
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

  it('lets a care worker create an assigned promise with facts and resolve only with an outcome', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await seedPerson()
    const db = environment.authenticatedContext('care-a').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-a')
    await assertSucceeds(setDoc(requestRef, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
      careType: 'first_contact', source: 'manual', summary: 'Primeiro contato autorizado',
      status: 'open', requestedAt: serverTimestamp(), requestedBy: 'care-a', promiseHours: 48,
      dueAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), ownerRef: 'care-a',
      assignedAt: serverTimestamp(), assignedBy: 'care-a', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    }))
    await assertFails(updateDoc(requestRef, { dueAt: Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000) }))

    await assertSucceeds(updateDoc(requestRef, {
      status: 'resolved', resolvedAt: serverTimestamp(), resolvedBy: 'care-a',
      resolutionCode: 'contact_completed', resolutionNote: 'Contato concluído.',
    }))
  })

  it('allows visitor registration to open an unassigned first-contact promise, but not to claim it without care capability', async () => {
    await seedMembership('coord-a', 'org-a', 'coordinator', ['unit-a'], { canManagePeople: true })
    await seedPerson()
    const db = environment.authenticatedContext('coord-a').firestore()
    const requestRef = doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/visitor-care')
    await assertSucceeds(setDoc(requestRef, {
      organizationId: 'org-a', congregationId: 'unit-a', personId: 'person-a',
      careType: 'first_contact', source: 'visitor_registration', summary: '',
      status: 'open', requestedAt: serverTimestamp(), requestedBy: 'coord-a', promiseHours: 48,
      dueAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), ownerRef: '',
      assignedAt: null, assignedBy: '', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    }))
    await assertFails(updateDoc(requestRef, { ownerRef: 'coord-a', assignedAt: serverTimestamp(), assignedBy: 'coord-a' }))
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

  it('keeps care requests inside the assigned congregation', async () => {
    await seedMembership('care-a', 'org-a', 'care', ['unit-a'])
    await seedPerson('person-b', 'unit-b')
    const db = environment.authenticatedContext('care-a').firestore()
    await assertFails(setDoc(doc(db, 'organizations/org-a/products/raiz_e_mesa/careRequests/care-b'), {
      organizationId: 'org-a', congregationId: 'unit-b', personId: 'person-b',
      careType: 'prayer', source: 'manual', summary: '', status: 'open',
      requestedAt: serverTimestamp(), requestedBy: 'care-a', promiseHours: 24,
      dueAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), ownerRef: 'care-a',
      assignedAt: serverTimestamp(), assignedBy: 'care-a', resolvedAt: null, resolvedBy: '', resolutionCode: '', resolutionNote: '',
    }))
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
  const firstKey = 'prep.1'
  function cycle(uid: string, congregationId = 'unit-a') {
    return {
      organizationId:'org-a', congregationId, playbookId:'raiz_e_mesa_2026', status:'active',
      completedKeys:[], startedAt:serverTimestamp(), createdAt:serverTimestamp(), createdBy:uid,
      updatedAt:serverTimestamp(), updatedBy:uid, completedAt:null,
    }
  }

  it('allows a scoped coordinator to start the playbook and append one canonical step', async () => {
    await seedMembership('coord-impl','org-a','coordinator',['unit-a'])
    const db=environment.authenticatedContext('coord-impl').firestore()
    const ref=doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-a')
    await assertSucceeds(setDoc(ref,cycle('coord-impl')))
    await assertSucceeds(updateDoc(ref,{completedKeys:[firstKey],lastCompletedKey:firstKey,status:'active',completedAt:null,updatedAt:serverTimestamp(),updatedBy:'coord-impl'}))
  })

  it('rejects arbitrary keys, removal, premature completion and cross-scope start', async () => {
    await seedMembership('coord-impl','org-a','coordinator',['unit-a'])
    const db=environment.authenticatedContext('coord-impl').firestore()
    const ref=doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-a')
    await assertSucceeds(setDoc(ref,cycle('coord-impl')))
    await assertFails(updateDoc(ref,{completedKeys:['invented.step'],lastCompletedKey:'invented.step',updatedAt:serverTimestamp(),updatedBy:'coord-impl'}))
    await assertSucceeds(updateDoc(ref,{completedKeys:[firstKey],lastCompletedKey:firstKey,updatedAt:serverTimestamp(),updatedBy:'coord-impl'}))
    await assertFails(updateDoc(ref,{completedKeys:[],lastCompletedKey:firstKey,updatedAt:serverTimestamp(),updatedBy:'coord-impl'}))
    await assertFails(updateDoc(ref,{status:'completed',completedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:'coord-impl'}))
    await assertFails(setDoc(doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/cycle-b'),cycle('coord-impl','unit-b')))
  })

  it('keeps implementation management away from an ordinary scoped member', async () => {
    await seedMembership('member-impl','org-a','member',['unit-a'])
    const db=environment.authenticatedContext('member-impl').firestore()
    await assertFails(setDoc(doc(db,'organizations/org-a/products/raiz_e_mesa/implementationCycles/member-cycle'),cycle('member-impl')))
  })
})
