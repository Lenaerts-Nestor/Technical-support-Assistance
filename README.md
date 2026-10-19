# Support Hub

A dashboard for support work: voice-call notes, RMA, cases, step-by-step guides and
quick links, and a personal calendar of days off. Guides, links, case snippets and the calendar are saved into one folder on your
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

## Device API (desktop app only)

Reads settings from Crestron devices (DM NVX and others that use the same REST API) over
HTTPS. A web page cannot do the device login — it has to set `Cookie`, `Origin` and `Referer`
headers and keep HttpOnly cookies — so the desktop app does it (`desktop/nvx.cjs`), following
*Authentication* in the DM NVX API manual. On the website the page only lets you prepare
groups, units and calls.

- **Groups** (NVX API, NAX API, …) along the top. Each has its own units, saved calls and username.
- **Units & login** in a panel at the top that folds down to one line. A unit is a name and the
  device's IPv4 address; tick one or several, and calls run on every ticked unit.
- **Saved calls**: a title and a path such as `/Device/DeviceInfo`. One click runs it on the ticked
  units; **Run all** gathers every call into one report, with **Copy report** for a case note.
- **Explorer**: try any path (`GET` only for now), then **Save as call**.
- **Results**: a section per unit with a card per call (as a table or as JSON), or — with several
  units — **Compare**, one table with the units side by side and the properties that differ
  highlighted (**Only differences** hides the rest). A unit that could not be reached is left out
  of the comparison and marked.
- **Login**: the username is remembered per group; the password is kept in memory only and is
  gone when the app closes. The app logs in by itself, again when a session expires, and logs out
  of every device when it quits.

Safety: only private network addresses (10.x, 172.16–31.x, 192.168.x, 169.254.x) are accepted,
so the app can never be pointed at the internet; the self-signed certificate is accepted for
those requests only; a failed login stops the run for that unit instead of retrying, so a wrong
password cannot lock an account; and a device that does not answer is given up on after 10 seconds. Units and calls are saved in `nvx.json` in the linked folder (and in
your full backup); passwords never are.

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
every page works as on the web, and nothing is sent anywhere: data stays on the computer.

```
npm run desktop        # build, then open the app on this computer
npm run desktop:pack   # build the Windows files into release/ (run it on Windows)
```

The **Desktop app** workflow (Actions tab → *Run workflow*, or push a tag like `desktop-v0.1.0`)
builds on a Windows runner and attaches two files to the run, under *Artifacts*:

| File | What it is |
|---|---|
| `SupportHub-<version>-portable.exe` | Runs from anywhere with no install. Starts a few seconds slower. |
| `SupportHub-<version>-setup.exe` | Per-user installer (no administrator rights). |

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
