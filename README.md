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

## Sharing

The **Sync** page (bottom of the sidebar) moves one part at a time:

| Card | File | Notes |
|---|---|---|
| Links | `.zip` with `links.json` (a bare `links.json` also works) | merge or replace |
| Case snippets | `.zip` with `cases-snippets.json` | merge or replace |
| Guides | `.zip` with the guide's folder | **Export guide** here or in the guide view; **Import guide package** merges by guide id (replace / keep both / skip). A guide folder zipped by hand works too. |
| Full backup | `.zip` of the whole folder | restores into a folder that holds no other files yet |

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
