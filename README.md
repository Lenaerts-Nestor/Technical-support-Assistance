# Support Hub

A dashboard for support work: voice-call notes, RMA, cases, step-by-step guides and
quick links, a personal calendar of days off, and a lunch-shift planner. Guides, links, case snippets and the calendar are saved into one folder on your
computer that you pick once on the **Sync** page (Chrome or Edge on desktop).

## The linked folder

```
<your folder>/
  guides.json                 the list of guides (the source of truth)
  guides/<name>/              one folder per guide — everything it needs
    guide.json                a copy of the guide, so the folder is self-contained
    images/…                  its screenshots
    projects/…                its project zips
  links.json                  the Links page
  cases-snippets.json         "My texts" on the Cases page
  calendar.json               the Calendar page — personal, stays in your own folder
  nvx.json                    the Device API page: groups, unit addresses, saved calls (no passwords)
  legacy-backup/              guides.json as it was before Organize
```

A guide's images and project zips are referenced *relative to its own folder*
(`images/step-1.png`), so a guide can be moved on its own. New guides get their
folder automatically; picking an image or zip from somewhere else copies it into
the guide's folder.

### Guides from before (one shared pool of images)

Guides saved in the old layout keep working untouched: their images are looked up at
the top of the linked folder. **Sync → Folder structure → Organize folders** gives
each of them a folder of its own. It only copies — originals are never moved or
deleted — and shows a preview first. A guide whose files cannot all be copied is left
exactly as it was and can be retried. **Find guide folders** adds guide folders you
dropped into `guides/` by hand.

## Calendar

Mark days as **PTO** (bright green) or **Other** (with a short note). Click a day, or use
**Mark days** for a span (optionally skipping weekends) — any month, past or future. The
card on the right lists the next five events, and **All** shrinks the view to a whole-year
grid. The calendar follows today's date by itself. Entries are plain JSON
(`{ "entries": [{ "date": "2026-10-15", "kind": "pto" | "other", "note": "" }] }`), kept
in `calendar.json` in your own linked folder. It has no Sync card of its own, so it is never
part of a Links or Snippets export — only your full backup carries it.

## Lunch Planner

Keep the agent table (name, languages, chat agent, early shift, available today, yesterday's
shift), press **Generate** for a fair two-shift lunch schedule, then adjust it by hand —
drag an agent onto a card in the other shift to swap, onto the column to move, or use the
**Swap** button from the keyboard. A swap that leaves a language uncovered in a shift asks
for confirmation; warnings update after every change. Everyone is assumed to speak English,
so it is not tracked.

**Generate** always turns the previous working day around: whoever was in Shift 1 goes to
Shift 2 and the other way round, as far as language cover, balance and the early-shift
preference allow. The previous day is read from the history; a schedule you generated but did
not save is filed there automatically on the next day, and Monday reads Friday. **Save today's
schedule** stores the day on purpose. Who is **not available** is remembered from day to day
(use **Everyone available** to clear it). In the Agents card, **Hide table** folds the table away
and **Hide chat column** drops the chat column — both are remembered in this browser.
**Copy for Teams** copies the schedule (bold headings when pasted into Teams, plain text elsewhere). The roster imports from
CSV (Excel, `,` or `;` separated) or JSON and exports to both; the JSON export also carries
the history. The roster and history are stored in this browser only — not in the linked folder. The only
thing that leaves the computer is the shared lunch shift below.

### Shared lunch shift (optional)

When **Kevin C** or **Nestor** presses **Copy for Teams**, today's two shifts are also shared with the
team, and every agent sees **YOU ARE ON SHIFT 1** (or 2) in the sidebar under the clock. There are no
accounts and no passwords: the sidebar has an optional **I am** list (the roster's names, plus the team
list that comes with each published schedule), the choice stays in that browser, and nobody has to pick.
Someone who picks nothing, or is not in today's schedule, sees nothing. Yesterday's schedule is ignored.

- **What is shared:** first names in Shift 1 / Shift 2, the roster's names (for the "I am" list), the
  day, and who published. Nothing else. It is kept 14 days on a Supabase project.
- **Setup, once:** run `supabase/lunch_shift.sql` in the Supabase SQL editor, then paste the project's
  *publishable* key into `key` in `src/features/shift/config.ts`. While `key` is empty the whole feature is
  off and the app makes no requests. Never use the `secret` / `service_role` key.
- **Policies:** the table has row level security; the public key may only **read** the last 14 days. It
  cannot insert, update or delete: writing goes through one function that accepts only the publishers
  listed in `supabase/lunch_shift.sql` and `config.ts` (keep the two lists the same), only for today, with
  short names. Without passwords this is an honor system: someone who picks "Kevin C" can publish, and the
  worst they can do is change today's displayed shifts.
- The sidebar looks for a new schedule every 30 seconds and when the window is brought back.
- **Shift reminders:** on weekdays at **11:45** (Shift 1) and **12:30** (Shift 2), Brussels time, the same Teams
  chat gets "Reminder: Shift N lunch — Remember to take your lunch. Agents: …", using the schedule shared that day
  (so Copy for Teams must be pressed before then; a swap shared before the time is included, and nothing is sent
  if nothing was shared). Each reminder goes out once a day, and one that is more than 30 minutes late is skipped.
  A timer inside Supabase does it (`pg_cron`, waking only at the two reminder times), so no app has to be open. Setup, once: run `supabase/lunch_shift.sql`
  again, switch on **Integrations → Cron**, then run `supabase/lunch_reminders_schedule.sql`. The times are
  settings (see the end of `lunch_shift.sql`), not code.
- **Same schedule for Kevin C and Nestor:** the published day also keeps who is on chat, who is out and the
  language warnings. (1) *Generate builds on it.* Earlier published days count as history on every computer,
  so if Nestor made and shared Monday's schedule and is away on Tuesday, Kevin C's Generate still turns
  Monday around, and whoever Nestor listed as out is marked away. A published day replaces the same day saved
  on that computer. The roster is brought up to date once per new published day; availability you change
  afterwards is left alone. (2) *Load it.* When the other one has shared today's schedule, the schedule card
  offers **Load it** (or **Use the shared schedule** if yours differs). The Agents table follows it: whoever
  is in a shift becomes available and everyone else on your roster becomes not available. Names the roster
  does not have are listed and left out.
- **Teams post (optional, once a day):** the first publish of a day also posts the schedule to a Teams
  chat or channel through a Workflows webhook ("Send webhook alerts to a channel / chat"). Pressing Copy for
  Teams again, by either person, does not post again that day. The webhook address is a secret (whoever has
  it can post to that chat): it is stored in Supabase in `private.settings`, which the public key cannot read,
  and never in the app or the repository. `supabase/lunch_shift.sql` ends with the statement that stores it,
  turns posting off, allows a repost for a retest, and checks whether Teams accepted a post. Without the
  setting nothing is posted.

Where to change things (all under `src/features/lunch/`): `config.ts` holds the language
list and history length; `scheduler.ts` holds the scheduling rules and their weights at the
top; `lunchStorage.ts` is the only file that touches `localStorage` (swap it for a backend
there); `components/rosterColumns.tsx` lists the table's columns.

## Updates

On the **Sync** page, **App updates** shows the version, checks for a newer one, and installs it: **Check
for updates** → *Version X is available* with its release notes → **Download and install** (a progress
bar) → **Restart and install**. Nothing installs without a click, and your drafts and data folder are
kept. The Sync entry in the sidebar shows a pulsing dot while an update is waiting. A quiet check also
runs a few seconds after the app starts.

- **Installed version only.** The setup version replaces itself; the portable file can find out that a
  newer version exists but cannot install it. Install `…-setup.exe` once by hand; every later version
  arrives from inside the app.
- **The repository is private**, so the app reads its releases with a read-only GitHub token that you
  paste once on that card (steps are on the card: *Settings → Developer settings → Fine-grained tokens*,
  this repository only, *Contents: Read-only*). The token is kept on this computer, encrypted by Windows
  (`update-token.bin` in the app's own folder). It is not in the repository, not in the app, and never
  shown again; **Remove token** deletes it, and you can revoke it on GitHub at any time.
- The check is a plain web request to github.com and sends nothing of yours.
- The installers are unsigned, so Windows may warn on the very first install.

## Device API (desktop app only)

A small Postman for Crestron devices (DM NVX and others that use the same REST API). A web page
cannot do the device login — it has to set `Cookie`, `Origin` and `Referer` headers and keep
HttpOnly cookies — so the desktop app does it (`desktop/nvx.cjs`), following *Authentication* in the
DM NVX API manual. On the website the page only lets you prepare groups, units and calls.

- **Groups** (NVX API, NAX API, …) along the top. Each has its own units, saved calls, folders and username.
- **Units**: a name and the device's IPv4 address, as pills in a card that folds down to one line. Tick
  one or several; requests run on every ticked unit.
- **Login**: in the same card's header, so it stays in reach when the units are folded. The username is remembered per group; the password is kept in
  memory only and is gone when the app closes. The app logs in by itself, again when a session
  expires, and logs out of every device when it quits.
- **Request**: pick a method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), type a path (a query string
  is fine), and add **headers** (one `Name: value` per line) and a raw **body** (**Format JSON** tidies
  it). **Send** runs a GET on the ticked units; anything else opens a review first.
- **Saved calls**: a list down the left, beside the request and results (it filters once there are more
  than a few). Save a request with a title, optionally into a **folder**. Click a name to load it
  into the request builder; the play button (shown on hover) runs it (a GET at once, anything else after a review).
  **Run all** and a folder's play button run only the GET calls, so nothing that changes a device
  ever runs without a review. Deleting a folder keeps its calls.
- **Results**: a section per unit with a card per call — status, time, size, a table (or JSON) of
  the answer and its **response headers** (never the session cookies). A picture (PNG, JPEG, GIF,
  WebP, BMP — for example a device's preview image) is shown as a picture. With several units,
  **Compare** is one table with the units side by side and the properties that differ highlighted
  (**Only differences** hides the rest); a unit that did not answer is left out of it and marked.
- **Changes**: switched off at every start (**Read only** ⇄ **Changes allowed**, top right) and
  sent to one unit at a time. The review shows exactly what goes out (method, path, headers, body).
  The manual says the device **deletes** an object it is sent empty (`{"Device":{"DeviceSpecific":{}}}`),
  so an empty object in a body is named in a warning and the button becomes **Send anyway**; nothing
  is blocked. Afterwards it shows the device's own answer (applied / restart needed / the reason it
  was refused). A POST of properties to `/Device` — the manual's way of changing a setting — is also
  read back, and the value on screen follows what the device now reports. With changes allowed, the
  values in the results also get a pencil for editing one in place (the device refuses a read-only
  one and says so). Every change of the session is listed under **Changes this session**, with
  **Copy log** for a case note (not saved).

What the app takes care of: only private network addresses (10.x, 172.16–31.x, 192.168.x, 169.254.x)
are accepted, so it can never be pointed at the internet; the self-signed certificate is accepted for
those requests only; headers the app manages (`Cookie`, `Host`, `Content-Length`, …) cannot be
overridden; a failed login stops the run for that unit instead of retrying, so a wrong password
cannot lock an account; and a device that does not answer is given up on after 10 seconds. Groups,
units, folders and saved calls (including headers and bodies) are saved in `nvx.json` in the linked
folder, and in your full backup; passwords never are, so do not put one in a header or body you save.

## Terminal (desktop app only)

SSH consoles to your units, in the page, like Crestron Toolbox's text console. Each terminal is one
SSH session to one unit (port 22), drawn with xterm.js; the connection is made by the desktop app
(`desktop/terminal.cjs`).

- **Login** (top right, a small card): a username (remembered) and a password (memory only), used for the
  terminals you open next. Below it are your **saved units** (the ones from the Device API page) as
  chips: click one and its terminal opens and connects. **Add terminal** types an IP address by hand instead, optionally saving
  it as a unit, or using a different login for that terminal only.
- **Grid**: three terminals side by side, the rest wrap below (**Per row** 1, 2 or 3 if a wide table
  of commands needs more room). While a terminal is open the sidebar shrinks to icons for more width.
  Terminals keep running while you visit other pages. Closing a terminal's card ends its session.
- **Unit card** above each terminal: host name, firmware and PUF, and a **Web** button that opens
  `https://<ip>/` in your browser. They are read on a second, hidden shell on the same connection, which
  runs `hostname`, `ver -v` and `help all` and closes, so a slow unit never delays what you type: your
  terminal is live from the first moment and shows only the unit's own text.
- **Keys**: while the unit waits at its prompt, the line you type is edited in the page, the way
  Crestron Toolbox does, and the whole line goes to the unit when you press Enter. **Up / Down** bring back
  past commands (kept per unit while the app runs, never saved, since a command can hold a password),
  **Tab** finishes a command name from the unit's own command list (read with `help all`; several
  matches are listed under the terminal), and the arrow keys, Home, End, Delete and Ctrl+A/E/K/U/W edit in
  place. The page redraws the whole line each time, so nothing depends on how the unit echoes an erase
  (some leave old letters behind). While a command is running, keys go straight to the unit. Untick
  **Edit the line here** to pass every key to the unit untouched. Select text and press Ctrl+C to copy
  it (Ctrl+C is the normal interrupt when nothing is selected); Ctrl+V pastes.
- **Host keys**: the first time a unit is seen its SSH key is remembered (in the app's own folder, like
  OpenSSH's `accept-new`). A different key later is refused with a message, and **Trust the new key and
  connect** accepts it, for a unit that was reset or replaced.
- Only private network addresses are accepted, at most 12 terminals at once, and every session is
  closed when the app quits. A terminal can do anything the console can, so it is not covered by the
  Device API page's **Changes allowed** switch.

## Pictures in the Cases editor

Paste a screenshot (or a copied picture) into the Cases editor and it is added as a small thumbnail
above the text, with a line `[image 1]` in the draft where it will go. Move or delete that line to move
or drop the picture; click a thumbnail to find its line. Pictures are shrunk to 700 px wide (never
enlarged), at most 8 per draft, and kept in the browser's own storage (IndexedDB) on this computer,
so the draft and its pictures come back after a restart.

- **Copy** puts the pictures into the email: each `[image N]` line becomes the picture, ready to paste
  into the Salesforce email composer. **Plain text** leaves the pictures out.
- Hover a thumbnail for **Copy this picture on its own**, in case a field takes a pasted image directly.
- Text copied together with a picture (for example from a spreadsheet) is pasted as text.

## Sharing

The **Sync** page (bottom of the sidebar) moves one part at a time:

| Card | File | Notes |
|---|---|---|
| Links | `.zip` with `links.json` (a bare `links.json` also works) | merge or replace |
| Case snippets | `.zip` with `cases-snippets.json` | merge or replace |
| Guides | `.zip` with the guide's folder | **Export guide** here or in the guide view; **Import guide package** merges by guide id (replace / keep both / skip). A guide folder zipped by hand works too. |
| Full backup | `.zip` of the whole folder | restores into a folder that holds no other files yet |

## Desktop app (Windows)

The same pages also run as a desktop app (Electron). It is a window around the built site, so
every page works as on the web. Data stays on the computer, apart from the optional shared lunch shift
(see Lunch Planner) and the update check.

```
npm run desktop        # build, then open the app on this computer
npm run desktop:pack   # build the Windows files into release/ (run it on Windows)
```

The **Desktop app** workflow builds on a Windows runner and publishes a **GitHub Release** `v0.1.0`
with these files (also kept as a run artifact for 30 days). It starts three ways:

- **Merging to `main`** publishes the next patch version by itself (the latest release plus one), so the
  installed app offers the update. A merge that only changes Markdown files is skipped, and so is a commit
  with `[skip ci]` in its message. A merge that fails `npm run lint` or `npm test` is not published.
- **Actions tab → *Run workflow*** with a version typed in (for example `0.2.0`) when you want a new
  minor or major version; leave it empty for the next patch version.
- **Pushing a tag** like `desktop-v0.1.0` publishes exactly that version.

| File | What it is |
|---|---|
| `SupportHub-<version>-setup.exe` | Per-user installer (no administrator rights). **This is the one that updates itself.** |
| `SupportHub-<version>-portable.exe` | Runs from anywhere with no install, starts a few seconds slower. It cannot update itself. |
| `latest.yml` | What the app's update check reads. |

The version exists only in the build (it is not committed); it must be higher than the last release, which
the automatic runs guarantee. The first automatic release is `0.1.0` if the repository has none yet.

Good to know:

- The files are **not code-signed**, so Windows SmartScreen may warn ("More info" → "Run anyway"),
  and a managed laptop may block unknown programs.
- Drafts (Voice Call, RMA, Cases) live in the app's own profile, `%APPDATA%\Support Hub`.
  Guides, links, snippets and the calendar live in the linked folder — pick it once on **Sync**.
  Choose a folder outside OneDrive if the data must stay off the cloud.
- Only one window runs at a time; starting it again focuses the open one.
- F12 or Ctrl+Shift+I opens the developer tools.
- Web links open in your normal browser.

## Development

```
npm install
npm run dev       # http://localhost:5173
npm run lint
npm test          # unit tests for the zip, folder and merge logic
npm run build     # type-checks, then builds
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
