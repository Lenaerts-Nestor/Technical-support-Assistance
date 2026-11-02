# Rebuild documentation (Support Hub → new repository)

Purpose: capture **what** the app does, **why**, and the **rules** behind it, so it can be recreated cleanly. UI design is deferred and will be added as `ui/` later.

## Reading order
1. `01-inventory.md` – every page/module at a glance, with a first keep/rework proposal.
2. `features/lunch-scheduler.md` – the automatic scheduler: planning, database, sharing, reminders, workflow diagrams, rules `LS-R*`.
3. `features/device-api-and-terminal.md` – device tools (desktop only), rules `DA-R*`, `TM-R*`.
4. `features/game.md` – the game as an optional plugin, rules `GM-R*`.
5. `02-data-and-persistence.md` – current stores and the target data layer.
6. `03-proposed-decisions.md` – ADR drafts to accept/reject.
7. `04-roadmap.md` – phases and the pre-rebuild checklist.
8. `05-lessons-and-debt.md` – debt, gaps, what worked.
9. `templates/` – feature spec, automation spec, business rule, ADR.

## Still to document (same templates)
Cases, Voice Call, RMA, Guides, Links, Calendar, Sync/backup, Dashboard/timers, App shell, Desktop shell + release pipeline.
Suggested order: Cases → Guides → Links → Calendar → Voice Call/RMA → Sync → shell.

## Decisions already made
Lunch rule set is complete as documented · backend/database stays · no real accounts (honor-system identity) · one chat tool. Details: `features/lunch-scheduler.md` §10 and `03-proposed-decisions.md`.

## Conventions
- Rule IDs: `<AREA>-R<n>`; never reuse an ID; link each to a test in the new repo.
- "Why" is mandatory on every rule and every feature.
- Mark guesses *(verify)*; mark decisions by ADR number.
- **Confidentiality:** no real names, addresses, keys, webhook URLs, customer data or company-internal wording. Use placeholders ("Agent A", "Publisher A", "Example Corp"). Vendor product names appear only inside device-profile/adapter docs.
- Secrets are listed by **name and purpose only**.

## Maintenance
Update the spec in the same change as the behaviour. If doc and code disagree, record it in `05-lessons-and-debt.md` as drift.
