/**
 * Static content for the Kevin guide page. Data only, the page and its
 * components own how this renders. `imageKey` values are filenames under
 * `src/features/kevinGuide/images/`; see `guideImages.ts` for the actual
 * imports and `ImageSlot` for what happens when one isn't there yet.
 */

export type ToolId =
  | 'git'
  | 'typescript'
  | 'vite'
  | 'tailwind'
  | 'vercel'
  | 'eslint'
  | 'node'
  | 'vscode'

/** One colour per tool, shared between the "tools" and "install" sections. */
export const TOOL_TONES: Record<ToolId, string> = {
  git: 'bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30',
  typescript: 'bg-blue-400/15 text-blue-300 ring-1 ring-blue-400/30',
  vite: 'bg-violet-400/15 text-violet-300 ring-1 ring-violet-400/30',
  tailwind: 'bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30',
  vercel: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
  eslint: 'bg-indigo-400/15 text-indigo-300 ring-1 ring-indigo-400/30',
  node: 'bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30',
  vscode: 'bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30',
}

export const TOOLS: { id: ToolId; name: string; blurb: string }[] = [
  {
    id: 'git',
    name: 'Git',
    blurb:
      'It\'s basically a save history for your code. Every time you "commit," Git remembers what your project looked like at that exact moment, so you can always go back if something breaks.',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    blurb:
      'Regular JavaScript, but it double-checks your work as you type and points out mistakes before you even run the code. Kind of like spell-check, for code.',
  },
  {
    id: 'vite',
    name: 'Vite',
    blurb:
      'The thing that scaffolds a brand-new project for you and runs it locally while you build, so every change shows up in the browser almost instantly.',
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    blurb:
      'A way to style your page using small ready-made classes right in your code, instead of writing a separate CSS file for everything.',
  },
  {
    id: 'eslint',
    name: 'ESLint',
    blurb:
      'A little watchdog that reads your code and flags things that look off, like typos, unused variables, or sloppy style, before they turn into real bugs.',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    blurb:
      'The service that takes your finished project and puts it online for real, so anyone can open it with a link. You don\'t have to set up a server yourself.',
  },
]

export const INSTALLS: { id: ToolId; name: string; blurb: string; url: string }[] = [
  {
    id: 'node',
    name: 'Node.js',
    blurb:
      'Lets your computer actually run JavaScript/TypeScript projects outside the browser. Grab the LTS version, it installs npm for you too.',
    url: 'https://nodejs.org',
  },
  {
    id: 'git',
    name: 'Git',
    blurb: 'On Windows this also installs Git Bash, which is the terminal we\'ll be using below.',
    url: 'https://git-scm.com',
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    blurb:
      'The code editor we\'ll write everything in. Don\'t mix it up with plain "Visual Studio," that\'s a heavier, different program. VS Code is the lighter one we actually want.',
    url: 'https://code.visualstudio.com',
  },
]

export type GuideStep = {
  id: string
  title: string
  body: string
  code?: string[]
  imageKey: string
}

export const STEPS: GuideStep[] = [
  {
    id: 'open-vscode',
    title: 'Open Visual Studio Code',
    body: 'Fire up VS Code. An empty window with no folder open yet is totally fine to start from.',
    imageKey: 'step-1-open-vscode.png',
  },
  {
    id: 'open-terminal',
    title: 'Open a Git Bash terminal inside VS Code',
    body:
      'Hit Ctrl + ` (that\'s the backtick key, top-left of your keyboard) to pop open the terminal panel or just press the terminal option that you know. Then use the little dropdown in the top-right of that panel to switch the shell to Git Bash. That\'s the one we want for the commands below.',
    imageKey: 'step-2-git-bash-terminal.png',
  },
  {
    id: 'create-project',
    title: 'Create the project',
    body:
      'In that terminal, run the command below. It\'ll ask you a couple of quick questions. For "Which linter to use?" just pick ESLint (that\'s the little watchdog from the tools list above), and say yes to installing and starting now.',
    code: ['npm create vite@latest my-project -- --template react-ts'],
    imageKey: 'step-3-create-project.png',
  },
  {
    id: 'install-deps',
    title: 'Move into the project & install dependencies',
    body:
      'Step into your new project folder and pull down everything it needs to actually run:',
    code: ['cd my-project', 'npm install'],
    imageKey: 'step-4-npm-install.png',
  },
  {
    id: 'run-dev',
    title: 'Start it up',
    body: 'Fire up the local dev server:',
    code: ['npm run dev'],
    imageKey: 'step-5-npm-run-dev.png',
  },
  {
    id: 'open-browser',
    title: 'Open it in your browser',
    body:
      'The terminal prints a link, usually http://localhost:5173. Open that in your browser and you should see your project running live.',
    imageKey: 'step-6-browser.png',
  },
]

/** Cycled per step so each numbered badge reads as its own colour while scrolling. */
export const STEP_ACCENTS = [
  'border-sky-400/40 bg-sky-400/15 text-sky-300',
  'border-violet-400/40 bg-violet-400/15 text-violet-300',
  'border-emerald-400/40 bg-emerald-400/15 text-emerald-300',
  'border-amber-400/40 bg-amber-400/15 text-amber-300',
  'border-rose-400/40 bg-rose-400/15 text-rose-300',
  'border-cyan-400/40 bg-cyan-400/15 text-cyan-300',
] as const

export const accentForStep = (i: number) => STEP_ACCENTS[i % STEP_ACCENTS.length]

export type ProjectFileGroup = 'code' | 'config' | 'generated'

export const GROUP_LABEL: Record<ProjectFileGroup, string> = {
  code: 'Your code',
  config: 'Configuration',
  generated: 'Generated, leave it alone',
}

export const GROUP_TONES: Record<ProjectFileGroup, string> = {
  code: 'bg-blue-400/15 text-blue-300 ring-1 ring-blue-400/30',
  config: 'bg-violet-400/15 text-violet-300 ring-1 ring-violet-400/30',
  generated: 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30',
}

export const PROJECT_FILES: { path: string; group: ProjectFileGroup; blurb: string }[] = [
  {
    path: 'src/App.tsx',
    group: 'code',
    blurb: 'The main component, basically the root of your page. This is where you\'ll build and nest most of the UI.',
  },
  {
    path: 'src/main.tsx',
    group: 'code',
    blurb: 'The entry point. Its whole job is to mount <App /> into the empty <div id="root"> from index.html.',
  },
  {
    path: 'src/index.css',
    group: 'code',
    blurb: 'Global styles. This is where Tailwind gets pulled in.',
  },
  {
    path: 'index.html',
    group: 'config',
    blurb: 'The actual HTML page the browser loads first. Has that empty root div React takes over.',
  },
  {
    path: 'vite.config.ts',
    group: 'config',
    blurb: 'Vite\'s own settings: plugins, dev server options, that kind of thing. You\'ll rarely need to touch it.',
  },
  {
    path: 'eslint.config.js',
    group: 'config',
    blurb: 'Settings for ESLint: which rules it enforces and which files it checks.',
  },
  {
    path: 'tsconfig.json',
    group: 'config',
    blurb: 'TypeScript\'s settings: how strict it is, which files it should check.',
  },
  {
    path: 'package.json',
    group: 'config',
    blurb: 'Lists your project\'s dependencies and the scripts you can run (npm run dev, npm run build, and so on).',
  },
  {
    path: 'package-lock.json',
    group: 'generated',
    blurb: 'Auto-generated. It records the exact dependency versions that got installed, so don\'t edit this by hand.',
  },
  {
    path: 'node_modules/',
    group: 'generated',
    blurb: 'The actual downloaded code for every dependency. It\'s a huge folder, and you\'ll never edit it or commit it to Git.',
  },
  {
    path: '.gitignore',
    group: 'config',
    blurb: 'Tells Git which files and folders to just ignore, like node_modules.',
  },
]

export type GitCommand = { command: string; explain: string }

export const GIT_COMMANDS: GitCommand[] = [
  {
    command: 'git pull',
    explain:
      'Grabs the newest changes from GitHub and pulls them down to your computer. Good habit to run this before you start working, so you’re never missing anything.',
  },
  {
    command: 'git add .',
    explain:
      'Stages everything you\'ve changed, basically telling Git "these are the changes I want in my next snapshot." The dot just means "everything in this folder."',
  },
  {
    command: 'git commit -m "your message"',
    explain:
      'Takes everything staged and saves it as one snapshot in your project’s history, with a short message describing what you did.',
  },
  {
    command: 'git push',
    explain: 'Uploads your commits to GitHub, so they actually show up online for others (and for Vercel) to see.',
  },
]

export const GIT_COMMANDS_LINK = 'https://www.geeksforgeeks.org/git/basic-git-commands-with-examples/'

export type CodeExplainer = {
  id: string
  file: string
  intro: string
  code: string
  points: string[]
}

/**
 * Real snippets from this very app (not the my-project template), so Kevin
 * has one concrete, working example instead of a generic tutorial one. The
 * Sidebar snippet is trimmed (icon paths swapped for a comment) since the raw
 * SVG data doesn't teach anything, everything else here is the actual file.
 */
export const CODE_TOUR: CodeExplainer[] = [
  {
    id: 'navigation',
    file: 'src/app/navigation.ts',
    intro: 'This tiny file is the single source of truth for which pages exist in this app.',
    code: `export type PageId = 'voiceCall' | 'rma' | 'cases' | 'guides' | 'kevinGuide'

export const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'voiceCall', label: 'Voice Call' },
  { id: 'rma', label: 'RMA' },
  { id: 'cases', label: 'Cases' },
  { id: 'guides', label: 'Step-by-Step Guides' },
  { id: 'kevinGuide', label: 'Guide for Kevin' },
]`,
    points: [
      'PageId is a TypeScript union type. It says a page id can only ever be one of these five exact strings, nothing else. Typo one anywhere in the app and TypeScript catches it immediately, before you even run the code.',
      'NAV_ITEMS just pairs each id with the label shown in the sidebar. Add a new page here and it shows up in the sidebar on its own.',
    ],
  },
  {
    id: 'app',
    file: 'src/app/App.tsx',
    intro: 'This is the root of the whole app. Everything else gets rendered from here.',
    code: `const PAGES: Record<PageId, () => React.ReactElement> = {
  voiceCall: VoiceCallPage,
  rma: RmaPage,
  cases: CasesPage,
  guides: GuidesPage,
  kevinGuide: KevinGuidePage,
}

export default function App() {
  const [page, setPage] = useState<PageId>('voiceCall')

  return (
    <div className="bg-canvas text-ink flex h-full">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-hidden">
        {NAV_ITEMS.map(({ id }) => {
          const Page = PAGES[id]
          return (
            <div key={id} hidden={id !== page} className="h-full overflow-y-auto">
              <ErrorBoundary>
                <Page />
              </ErrorBoundary>
            </div>
          )
        })}
      </main>
    </div>
  )
}`,
    points: [
      'PAGES maps each PageId to the component that renders it. It\'s how the app knows "voiceCall" means "render <VoiceCallPage />".',
      'useState<PageId>(\'voiceCall\') just remembers which page is currently showing. Clicking something in the sidebar calls setPage with a new id, and the component re-renders.',
      'The clever bit: every page renders every time, the hidden attribute just hides the inactive ones with CSS instead of unmounting them. That\'s why a half-filled form doesn\'t get wiped when you switch tabs mid-call.',
      'Each page sits inside its own ErrorBoundary, so if one page crashes, the other three keep working fine.',
    ],
  },
  {
    id: 'sidebar',
    file: 'src/app/Sidebar.tsx',
    intro: 'The nav list on the left. It reads NAV_ITEMS from navigation.ts, so it never has to be updated by hand.',
    code: `const ICONS: Record<PageId, React.ReactElement> = {
  voiceCall: <path d="..." />,
  // ...one <path> per page id, same pattern
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="...">
      <nav className="...">
        {NAV_ITEMS.map((item) => {
          const active = item.id === current
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={active ? '/* highlighted look */' : '/* muted look */'}
            >
              <svg className="...">{ICONS[item.id]}</svg>
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}`,
    points: [
      'ICONS is just a lookup table from page id to an SVG path. Sidebar loops over the same NAV_ITEMS array from navigation.ts, so it automatically gets one button per page, in the same order.',
      'active is just item.id === current. Whichever button matches the currently open page gets the highlighted style, everything else gets the muted one. Plain conditional styling, nothing magic.',
      'onNavigate is really setPage from App.tsx, passed down as a prop. Clicking a button in Sidebar (the child) is what changes what App (the parent) renders. That handoff is basically React in one sentence.',
    ],
  },
]
