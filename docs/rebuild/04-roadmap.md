# 04 – Roadmap to recreate the app in a new repository

Part-time estimate: **16–20 weeks**. UI design is deliberately left until you decide (phase 2 can start without it by using a neutral token set).
Each phase ends with something runnable and a short retro note in `05-lessons-and-debt.md`.

| Phase | Weeks | Goal | Exit criteria |
|---|---|---|---|
| **0 Prepare** (now → rebuild start) | – | Documentation complete and sanitized | Every feature has a spec; rules have IDs; open questions answered; secrets list written (no values) |
| **1 Foundations** | 1–2 | Repo, tooling, CI, registry, data-layer skeleton | CI green on empty app; ADR-001/002/003 accepted; lint blocks layer violations; secret scan on |
| **2 Shell + design tokens** | 1–2 | Shell, navigation from the feature registry, theme, error boundary, notification pattern | Two stub features register and appear; keyboard navigation works |
| **3 Vertical slice: Links** | 1 | Smallest real feature through every layer, incl. export/import | Round-trip test passes; used daily by you |
| **4 Lunch Scheduler – planner** | 2–3 | Port scheduler, coverage, history, roster, copy-out with tests | All LS-R1…R35 tests green; behaviour matches old app on recorded fixtures |
| **5 Lunch Scheduler – sharing + automation** | 2–3 | Migrations, members/roles, publish, outbox, worker, reminders, job log, admin screen | SQL tests green; DST + holiday + double-press + webhook-failure cases covered; health view shows last runs |
| **6 Cases + Voice Call + RMA** | 3 | Case workspace, templates, snippets, images, copy-out | Daily-use parity checklist signed off |
| **7 Guides** | 4–5 | Model → viewer → editor → import/export → folder organization | Old guide folders import losslessly; editor can create each block type |
| **8 Calendar + Dashboard + timers** | 1–2 | Personal calendar, dashboard widgets | Widgets provided by features, not hard-coded |
| **9 Data & backup + migration tool** | 1–2 | Full backup/restore, importer for *old* app formats | Old backup zip imports; dry-run diff shown |
| **10 Desktop packaging** | 1–2 | Electron shell, typed IPC, installer, auto-update, release pipeline | Install → update → rollback tested |
| **11 Device tools plugin** | 2–3 | Device API (profile-based) + Terminal | Fake device server in CI; all DA/TM rules tested |
| **12 Game plugin** | 2 | Sim tests ported, lazy-loaded, licence-clean assets | Core bundle unchanged with/without game |
| **13 Polish** | 1–2 | Accessibility pass, mobile decisions, performance, docs | Checklist in the UI spec (later) passes |

## Parity checklist (use to decide "done")
For every old feature: (a) spec written, (b) rules have tests, (c) old data imports, (d) copy-out output is identical, (e) you used it for a week.

## Things to do before the rebuild starts (cheap, high value)
1. Record **golden fixtures** from the old app: a roster + history + the schedule generated with a seeded RNG; a guide folder; a links.json; a calendar.json; a device `nvx.json` (sanitized).
2. Write down the **manual test script** for each page (10 steps each) – it becomes the end-to-end test later.
3. List every **secret/config** the app needs (names only) – see lunch doc §6.
4. Screenshot every page and state (empty, error, filled) for the UI discussion.
5. Decide the confidentiality rules (ADR-014) and the new repo name before the first commit.
6. Verify licences of game art and fonts/icons; decide keep/replace.
