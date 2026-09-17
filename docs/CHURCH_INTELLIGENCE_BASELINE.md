# NestJourney — Church Intelligence OS baseline

Date: 2026-09-17

## Project identity

This repository is **NestJourney**, the Journey & Care Engine of the MillionsNest ecosystem.

## Baseline

- Integration branch: `main`.
- Production branch: `production`.
- Firebase project: shared MillionsNest project, with NestJourney Hosting target already configured.
- Production contains the MillionsNest ecosystem session handoff (`EcosystemSessionGate`). The integration branch had diverged and did not contain that critical entry gate; the first implementation batch restores it in the integration line before new product work.
- Current product already has people, consent, care, Presence/Mesa records, groups, discipleship, governance, audit/retention concepts, multi-congregation scoping and Firebase Rules with organization/membership checks.
- Current UI data flow still relies primarily on local persisted demo state. Firestore Rules already define guarded product collections, but UI persistence must be migrated incrementally rather than rewritten in one step.

## First vertical slice

**Presence evidence + Care Integrity foundation**.

The first slice establishes deterministic contracts before any AI signal:

1. Presence session quality and coverage.
2. Explicit states: `present_confirmed`, `absent_confirmed`, `unverified`.
3. `unverified` never becomes absence implicitly.
4. Absence evidence is usable only after session closure and minimum coverage.
5. Care Promise evaluation is deterministic (`open`, `due_soon`, `debt`, `resolved`).
6. Resolution requires an evidence reference.
7. Canonical fact events carry tenant, actor, source, scope, evidence, sensitivity and schema version.
8. `NO SOURCE -> NO CLAIM` is enforced by code and tests.

## Next implementation checkpoint

After this foundation passes CI, the next safe step is to persist Presence sessions/checks and canonical facts behind existing tenant/RBAC controls, then surface a mobile-first Presence Assist experience without removing the current hospitality/Mesa flow.
