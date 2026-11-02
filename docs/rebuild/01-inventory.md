# 01 – Feature inventory (current app)

Sizes are lines of TypeScript under `src/features/<name>` (tests included). "Keep / Rework / Optional" is a first proposal to challenge, not a decision.
Rows marked *(verify)* were inferred from file names and the README, not from reading every file.

| # | Page / module | ~Lines | What it does (one line) | Data lives in | External | Platform | Proposal |
|---|---|---:|---|---|---|---|---|
| 1 | Dashboard | 375 | Read-only "today": own lunch shift, favourite colleagues' shifts, next day off, lunch-time alert | `localStorage` (favourites) | reads shared shift + calendar | web+desktop | Keep → becomes the widget host |
| 2 | Voice Call | 733 | Structured call-note form (sections, text/bullet modes, product entries: model/firmware/serial), copy out | app profile drafts *(verify)* | – | both | Keep, merge with Cases into a "Case workspace" |
| 3 | RMA | 715 | Returned-unit form: units (serial+product), issue category/sub-issue, shipping contact, copy-out | app profile drafts *(verify)* | – | both | Keep, make categories configurable data |
| 4 | Cases | 3 239 | Email/case editor: templates, language toggle, placeholders, flags, snippets ("My texts"), pasted images (IndexedDB, 700 px, ≤8), rich copy | drafts + IndexedDB + `cases-snippets.json` | – | both | Keep (core) |
| 5 | Step-by-Step Guides | 13 113 | Block editor (chapters, sections, steps, sub-items, callouts, tables, terms, device panels with ports/cabling/units), folder-per-guide, images, project zips, import/export | linked folder (`guides.json`, `guides/<name>/…`) | File System Access API | web (Chromium) + desktop | Keep, **rework** (largest, most complex; split into model / editor / viewer / storage) |
| 6 | Links | 1 297 | Quick-launch board: sections of links, folders (no nesting), search | `links.json` | – | both | Keep |
| 7 | Device API | 3 844 | Safe REST client for network devices (see feature doc) | `nvx.json` | device HTTPS | **desktop** (prepare-only on web) | Keep → device-profile plugin |
| 8 | Terminal | 1 098 | Multi-SSH consoles with line editing, unit cards | memory only (+ saved units from Device API) | SSH | **desktop** | Keep (was removed once and re-added – decide for good) |
| 9 | Calendar | 1 256 | Mark PTO / Other days; month + year grid; upcoming list | `calendar.json` + DB per person | Postgres RPC | both | Keep |
| 10 | Lunch Planner | 3 388 | Roster, generate/adjust schedule, history, copy for chat | `localStorage` snapshot | – | both | Keep (core; see feature doc) |
| 11 | Shared shift (sidebar) | 430 | "I am", YOU ARE ON SHIFT N, publish, chat post | DB `lunch_shift` | Postgres RPC, chat webhook | both | Keep (see feature doc) |
| 12 | Sync | 3 166 | Pick linked folder, export/import links/snippets/guides, full backup/restore, organize guide folders, app update | folder + zip | GitHub releases (update) | both | **Rework** into a "Data & backup" module on a proper data layer |
| 13 | Game (Last Stand) | 6 683 | Break-time brawler | `localStorage` (hero) | – | both | Keep as lazy optional plugin |
| – | App shell | – | Sidebar, clock, identity, shift, timers (Break 10 min, Lunch), focus mode, error boundary, theme switcher | `localStorage` | – | both | Keep |
| – | Desktop shell | – | Electron main/preload, auto-update, installer + portable, CI release on merge | – | GitHub | desktop | Keep (Windows first) |

## Cross-cutting concepts present in the app
- **Linked folder** as the "database" for most content (user picks a folder once; JSON + assets inside).
- **Revive/normalize** functions for every stored shape (defensive reading).
- **Merge-by-id** import/export packages (merge | replace | keep both | skip).
- **"I am" identity** without accounts (name picked in the sidebar).
- **Copy-out** as a first-class action (rich HTML + plain text) – the product's real output is text pasted into other tools.
- **Safety by default** (Read-only start, review before send, confirm risky swap, preview before Organize).
- **Desktop-only capability flag** (`isDesktopApp`) that hides pages on the web.
- **Focus mode / timers** (Break, Lunch) in the sidebar.

## Not found in the repo
- A **"Launch Scheduler"** under that name – interpreted as the **Lunch Scheduler** (confirmed in conversation). If a separate launcher exists elsewhere, add it here.
- Automated tests for UI components (all 37 test files cover logic/data/desktop helpers).
- Any `docs/` folder or architecture/ADR files before this one.
