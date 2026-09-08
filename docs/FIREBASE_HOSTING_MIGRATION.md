# Firebase Hosting migration

NestJourney is a React/Vite SPA and does not require a server runtime for its current published behavior. Its migration target is **Firebase Hosting**.

## Target

- Firebase project: `millionsnest`
- Hosting target/site: `mn-nestjourney-555464791734`
- Public domain after cutover: `nestjourney.millionsnest.com`

## Current Firebase configuration behavior

The application reads Firebase Web configuration from `VITE_FIREBASE_*`. The currently published Vercel JavaScript bundle does not contain an initialized Firebase Web configuration, so the migration must not silently invent one. Hosting can be migrated independently; enabling the NestJourney cloud integration remains a separate, explicitly certified step.

## Safety

- Existing security headers are preserved.
- SPA routing remains unchanged.
- Vercel remains available as a manual rollback until Firebase is smoke-tested.
- Firestore Rules are not changed by this migration.
