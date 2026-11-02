# 05 – Lessons learned, technical debt, known gaps (from the current repo)

Format per item: **ID · what · why it hurts · fixed by (rebuild)**. Add severity and a workaround when you hit one in daily use.

## Technical debt
| ID | What | Why it hurts | Rebuild fix |
|---|---|---|---|
| TD-1 | Persistence differs per feature (localStorage, IndexedDB, folder, DB, Electron files) | Backup/restore/sync code is huge (Sync ≈ 3 k lines); easy to forget a store | ADR-001 data layer |
| TD-2 | Nine nested context providers in `AppDataProvider`; pages import each other's logic (dashboard → lunch, calendar, shift) | Hard to add/remove features; hidden coupling | ADR-002 registry + widgets |
| TD-3 | Publisher list duplicated in SQL and TypeScript, "keep in step" by comment | Silent drift | ADR-007 settings/members table |
| TD-4 | Reminder times/time zone only editable through SQL | Needs a developer for a settings change | Admin screen |
| TD-5 | Fire-and-forget HTTP from the database; "claimed" flag set before delivery | Failed post is never retried or shown | ADR-006 outbox |
| TD-6 | Publish errors swallowed in the client (`return null`) | User cannot tell why sharing failed | Notification pattern with the server reason |
| TD-7 | Documentation drift (e.g. a comment says chat/out/notes are "not stored" but the table stores them; the SQL message says "only for today" but allows ±1 day) | Misleads maintainers | Docs generated from schema; rule IDs linked to tests |
| TD-8 | Database set up by pasting SQL in an editor; re-runnable but not versioned | Not reproducible; no rollback | ADR-009 migrations |
| TD-9 | Generated analysis output (`graphify-out/`) and a Vite template README tail committed | Noise in the repo | ADR-013 |
| TD-10 | Guides feature ≈ 13 k lines in one feature folder (editor, viewer, folder ops, import/export) | Slow to change, hard to test | Split into model / editor / viewer / storage packages |
| TD-11 | Style classes as shared string constants (`CARD`, `GHOST_BTN`, …) | No component contract | ADR-011 component library |
| TD-12 | No UI/component tests | UI regressions found by hand | ADR-015 |
| TD-13 | Honor-system identity; public key in the client; real project URL + key committed | Not acceptable for a public/personal repo | ADR-008, env vars, secret scan |
| TD-14 | Game art licences "not checked" | Legal risk when sharing | Verify / replace |
| TD-15 | Unsigned installers | Warnings, may be blocked on managed machines | ADR-012 |
| TD-16 | Terminal removed once and re-added; Snake added and reverted | Scope churn | Write "what is in/out of scope" in the product brief |
| TD-17 | Version only exists at build time (not committed) | Hard to know what a commit shipped | Tag + changelog per release |

## Known functional gaps (user-visible)
- No indicator when shared data is stale/offline.
- No holiday/non-working-day handling for reminders.
- Terminal is outside the "Changes allowed" safety switch.
- Calendar privacy: anyone with the key who knows a name can read or replace that person's days.
- Case images live only in the browser's storage (not in backups).

## What worked (keep doing)
- Pure, tested logic separated from UI (scheduler, coverage, history, merge, zip).
- Weighted-rule scheduling with documented tiers.
- Safety defaults in dangerous tools (read-only start, review, GET-only batch runs, private IPs only).
- One function powering warnings, chat text and swap checks (no divergence).
- Idempotent day roll-over; injected time (`p_now`) in the reminder function.
- Preview-before-apply and "originals are never moved or deleted" for folder migration.
- Small, frequent PRs with descriptive messages (119 commits in ~3 weeks).

## Version history (reconstructed from git)
- 2026-10-07 → 2026-10-30, ~119 commits, PRs #1–#55. Themes in order: guides + folder sync → links → cases/snippets/images → calendar → lunch planner → shared shift + chat post → reminders → device API → terminal → desktop app + auto-update → dashboard + timers → game (several iterations).
- Keep a proper `CHANGELOG.md` from the first commit of the new repo.
