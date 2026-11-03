# Attendance UI

Exports: `AttendanceRoster`, `AttendanceAvatar` from `AttendanceRoster.tsx`, and pure projection/search/types from `roster.ts`.

The host provides organization/unit/event-scoped data and authoritative mutations. This package does not authenticate, load Firestore, save data, infer permissions, grant contact consent or turn unknown into absence. Use the canonical MillionsNest organization directory for identity. React 19, lucide-react and the host's `--nj-*` CSS tokens are required.

Pass `editable=false` until the event's checks loaded, on errors and after closure. Keep `online=false` when offline. Mount with an organization/unit/event key to reset local search/filter state when scope changes. See `docs/MEMBERS_AND_ATTENDANCE_2026-11-03.md` in the Journey repository for the integration contract.
