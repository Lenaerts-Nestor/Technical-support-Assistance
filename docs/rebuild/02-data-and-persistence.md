# 02 – Data and persistence map (the #1 thing to redesign)

## Where data lives today

| Store | Used for | Survives | Shared across devices | Backup path |
|---|---|---|---|---|
| `localStorage` (browser or Electron profile) | Lunch snapshot, "I am", favourites, hero, UI toggles, theme, drafts *(verify)* | Browser data clear = lost | No | Lunch JSON export only |
| IndexedDB | Case images | same | No | none (drafts only) |
| Linked folder (File System Access API) | Guides, links, snippets, calendar, device groups | Until folder removed | Only if the folder is synced by the user | Full backup zip |
| Postgres (hosted) | Published lunch days, per-person calendar, secrets/settings | Server | Yes (honor system) | none documented |
| Electron user-data folder | Update token (OS-encrypted), SSH host keys | App uninstall | No | none |
| Memory only | Passwords, SSH history, change log, session cookies | App close | – | by design |

Consequences seen in the code: every feature wrote its own load/save/revive/merge/export; the Sync page grew to 3 k lines to hand-roll
backup, restore, package classification and merge for each store; the calendar had to be bolted on to *two* stores with a "database wins" rule.

## Target: one data layer, many adapters

```
UI  →  feature services (pure domain logic)  →  Repository<T> interface  →  adapters
                                                                              ├─ BrowserStorage (IndexedDB)
                                                                              ├─ FolderStorage (File System Access / Electron fs)
                                                                              └─ RemoteStorage (REST/RPC)
```

Every collection declares, in one registry entry:

```
{ id: 'links', schemaVersion: 3, schema, migrate(from, data), storage: 'folder'|'browser'|'remote',
  scope: 'personal'|'team', export: true, mergeStrategy: 'byId'|'replace', containsSecrets: false }
```
From that one entry the app derives: load/save, validation, migration, export/import, backup/restore, "what is in this backup" screen.

## Rules for the new data model
1. **IDs are UUIDs; display names are data, not keys.** (Today the lunch history stores *names* so old days stay readable – keep a `displayName` snapshot but reference people by id.)
2. **Every document has `schemaVersion`** and a tested `migrate`. No "bump the key instead of migrating".
3. **Personal vs team scope** is explicit on every collection (calendar: personal; lunch roster: team; links: personal or team).
4. **Secrets are a separate class**: never in exports, never in the repo, memory/OS-keychain only.
5. **Soft failure**: unreadable data → keep the raw blob aside, start empty, tell the user (do not silently overwrite).
6. **Export is the contract**: one versioned bundle (zip with `manifest.json`); import dry-run shows a diff before applying.
7. **Dates**: store ISO dates and an explicit time zone for anything scheduled; never rely on the machine's zone for server-side logic.

## Remote data (current tables)

```
lunch_shift(day PK, shift1[], shift2[], team[], chat[], out[], notes[], published_by, updated_at,
            teams_posted_at, shift1_reminded_at, shift2_reminded_at)      -- public read 14 days, write only via RPC
calendar(person PK = lower(name), name, entries jsonb[≤800], updated_at)  -- closed table, get/save via RPC, ≤200 people
private.settings(name PK, value)                                          -- webhook url, reminder times, tz; no public access
functions: publish_lunch_shift(...), send_shift_reminders(now), get_calendar(person), save_calendar(person, entries)
```
Proposed shape for the rebuild: `teams`, `members(role)`, `lunch_days`, `calendars`, `settings`, `outbox`, `job_runs`, all created by **migrations**,
with row-level security keyed to the member identity instead of "anyone with the key who knows a name".
