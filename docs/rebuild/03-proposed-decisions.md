# 03 – Proposed architecture decisions (ADR drafts)

Status values: **Proposed** (my recommendation, needs your yes/no) · **Open** (needs your input). Change to Accepted/Rejected as you decide.

| ID | Decision | Status | Short rationale |
|---|---|---|---|
| ADR-001 | One data layer with typed repositories + a collection registry (see doc 02) | Proposed | Removes per-feature persistence code; makes backup/export automatic |
| ADR-002 | Feature registry: each feature exports `{id, route, nav, platforms, collections, widgets, settings}`; shell has no feature imports | Proposed | Add/remove features (game, device tools) without touching the shell; replaces the 9-deep provider nest |
| ADR-003 | Layering: `domain` (pure) → `data` (repositories) → `ui`; lint rule forbids upward imports | Proposed | Preserves the best habit of the current code (pure, tested logic) |
| ADR-004 | Game and Device tools are **optional lazy plugins** with their own folder/package | Proposed | Core stays small; game assets and device code never block the work pages |
| ADR-005 | Desktop capabilities via typed IPC contract, validated again in main | Proposed | Safety rules (private IPs, read-only default) cannot be bypassed from UI |
| ADR-006 | Scheduled automation = **outbox + worker + job log**, not fire-and-forget | Proposed | Fixes "claimed but never delivered" (see lunch doc §7) |
| ADR-007 | Settings (times, tz, publishers, webhook ref) as data with an admin screen | Proposed | Today they need SQL edits and code edits in two places |
| ADR-008 | Identity: **no real accounts**; keep the "I am" list and named publishers; publisher list in one settings table; optional shared team code | **Accepted** (owner, answer 3; confirm reading) | Small trusted team; avoids building auth |
| ADR-016 | Backend stays: hosted Postgres with functions + scheduler, same scope as today (+ outbox, job log, settings) | **Accepted** (owner, answer 2) | Shared days, calendar and automation need it |
| ADR-017 | One chat adapter (current tool) behind a thin interface | **Accepted** (owner, answer 4) | No multi-provider work |
| ADR-009 | Database changes only via versioned migrations applied in CI to an empty DB | Proposed | "Paste SQL into the editor once" is not reproducible |
| ADR-010 | Schema validation library at every boundary + `schemaVersion` migrations | Proposed | Replaces ad-hoc `revive*` functions (keep their test cases) |
| ADR-011 | Component library + design tokens before pages (UI talk is scheduled for later) | Proposed | Replaces repeated style constants |
| ADR-012 | Distribution: Windows installer + portable + web; auto-update kept; code signing evaluated | **Open** | Unsigned installers trigger warnings; managed laptops may block |
| ADR-013 | Repo hygiene: no generated output (graph reports), no secrets, assets via manifest, conventional commits, CI gate (types, lint, tests, size) | Proposed | The old repo mixed all of these |
| ADR-014 | Confidentiality: neutral names, sample data only, secret scanning pre-commit and in CI | Proposed | Personal project must stay free of company data |
| ADR-015 | Testing: logic unit tests (port old ones), SQL tests for functions, a fake device server, a few end-to-end flows | Proposed | Old tests covered logic only |

## ADR template (copy for each decision)
See `templates/adr.md`.
