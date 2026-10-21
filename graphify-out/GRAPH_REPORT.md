# Graph Report - Technical-support-Assistance  (2026-10-21)

## Corpus Check
- 280 files · ~171,884 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 1914 nodes · 6211 edges · 76 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Links Page & Shared UI
- Calendar Feature
- Voice Call Feature
- Device Panel Scene
- README & Release Workflow
- NVX Dialogs & Confirm
- Guide Block Editors
- Storage Tests & Memory FS
- Guide Folder Organize & Adopt
- Editor Icons & Sortable
- Guide View Rendering
- Terminal Card & xterm
- RMA Feature
- NVX Data & Hook
- Zip Reader & Writer
- Guides Folder FS Ops
- Cases Bullets & Formatting
- NVX Results & Compare
- Sync Backup Cards
- Guide Types & Draft
- Cases Templates & Flags
- Electron Main Process
- Panel Editor & Inspectors
- Sync Package Classification
- Guide Editor Chrome
- Kevin Guide Page
- Cases Editor & Page
- NVX Client (Electron)
- Case Images
- Guides Library & Merge
- Device Catalog
- package.json & ESLint
- Dev Dependencies
- Guides Screen & Context
- Panel Cabling & Connect
- NVX Request Bodies
- SSH Terminal Manager
- App Data Context
- Folder Sync Cards
- NVX Editable Values
- Desktop Terminal & Updater Tests
- Callout & Step Styles
- Kevin Guide Icons
- Panel Flow & Templates
- tsconfig App Options
- Vite Toolchain & Repo Shot
- Mascots & Persistent State
- Backup Restore
- Guide Cards & Groups
- normalizeGuide Import
- NVX Units Catalog
- App Shell & Error Boundary
- Snippets File & Merge
- File System Access Types
- NVX Request Builder
- tsconfig Node Options
- Folder Handle Store
- Vite Project Explorer Shot
- App.tsx Component Shot
- App Auto-Update
- Public SVG Icons
- Sidebar Navigation
- Kevin Guide Step Images
- Vercel Dashboard Shot
- NVX Client Tests
- Guide Asset Mapping
- Step 1: Open VS Code
- Step 3: Create Vite Project
- Step 6: Browser Preview
- npm Scripts
- Folder Zip & Backup Export
- Step 4: npm Install
- Template Placeholders
- Step 2: Git Bash Terminal
- HTML Entry & Mount Point
- Hero Illustration

## God Nodes (most connected - your core abstractions)
1. `react` - 98 edges
2. `PlusIcon()` - 45 edges
3. `PanelEdit()` - 36 edges
4. `GHOST_BTN` - 36 edges
5. `TrashIcon()` - 31 edges
6. `NvxPage()` - 30 edges
7. `CARD` - 30 edges
8. `useCases()` - 27 edges
9. `unitPortSpecs()` - 26 edges
10. `parsePoint()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Release files table (setup.exe, portable.exe, latest.yml)` --semantically_similar_to--> `latest.yml (update manifest)`  [INFERRED] [semantically similar]
  README.md → .github/workflows/desktop.yml
- `Release files table (setup.exe, portable.exe, latest.yml)` --semantically_similar_to--> `SupportHub-<version>-setup.exe installer`  [INFERRED] [semantically similar]
  README.md → .github/workflows/desktop.yml
- `favicon.svg (purple Vite bolt favicon, 48x46)` --semantically_similar_to--> `vite.svg (Vite wordmark-style logo: purple bolt between parentheses, 77x47)`  [INFERRED] [semantically similar]
  public/favicon.svg → src/assets/vite.svg
- `NSIS installer target (one-click, per-user)` --shares_data_with--> `SupportHub-<version>-setup.exe installer`  [INFERRED]
  desktop/electron-builder.yml → .github/workflows/desktop.yml
- `Portable target (SupportHub-<version>-portable.exe)` --shares_data_with--> `Release files table (setup.exe, portable.exe, latest.yml)`  [INFERRED]
  desktop/electron-builder.yml → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Windows release pipeline (version, pack, verify, publish)** — _github_workflows_desktop_version_step, _github_workflows_desktop_desktop_pack_step, _github_workflows_desktop_check_update_files_step, _github_workflows_desktop_publish_release_step [EXTRACTED 1.00]
- **Self-update chain (release, latest.yml, publish config, update token, App updates card)** — _github_workflows_desktop_github_release, _github_workflows_desktop_latest_yml, desktop_electron_builder_github_publish, readme_update_token, readme_updates [INFERRED 0.85]
- **JSON data files kept in the linked folder** — readme_guides_json, readme_links_json, readme_cases_snippets_json, readme_calendar_json, readme_nvx_json [EXTRACTED 1.00]
- **Vite + React starter branding assets (favicon, Vite logo, React logo)** — public_favicon, src_assets_vite, src_assets_react [INFERRED 0.85]
- **Filled dark brand-mark symbols in the icons.svg sprite (Bluesky, Discord, GitHub, X)** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_github_icon, public_icons_x_icon [EXTRACTED 1.00]
- **Purple (#aa3bff) stroked outline symbols in the icons.svg sprite (documentation, social)** — public_icons_documentation_icon, public_icons_social_icon, public_favicon_bolt_mark [INFERRED 0.75]
- **Isometric two-layer stack composition** — src_assets_hero_top_outline_layer, src_assets_hero_bottom_purple_layer, src_assets_hero_dotted_connectors [EXTRACTED 1.00]
- **Vite React TypeScript project scaffold files** — src_features_kevinguide_images_apptsxstructure_index_html, src_main, src_features_kevinguide_images_apptsxstructure_app_tsx, vite_config, package, tsconfig_app [INFERRED 0.85]
- **Counter demo: useState, button handler, and displayed count in App()** — src_features_kevinguide_images_apptsxstructure_app_component, src_features_kevinguide_images_apptsxstructure_usestate_counter, src_features_kevinguide_images_apptsxstructure_counter_button [INFERRED 0.85]
- **Vite + TypeScript + ESLint project config files at repo root** — package, vite_config, tsconfig, tsconfig_app, tsconfig_node, eslint_config [INFERRED 0.85]
- **Ways to begin work from the VS Code Welcome page** — src_features_kevinguide_images_step_1_open_vscode_start_actions, src_features_kevinguide_images_step_1_open_vscode_recent_projects, src_features_kevinguide_images_step_1_open_vscode_walkthroughs [INFERRED 0.75]
- **Switching VS Code terminal from PowerShell to Git Bash** — src_features_kevinguide_images_step_2_git_bash_terminal_powershell_prompt, src_features_kevinguide_images_step_2_git_bash_terminal_new_terminal_dropdown, src_features_kevinguide_images_step_2_git_bash_terminal_git_bash_option [INFERRED 0.85]
- **Vite project scaffolding flow (command, prompts, scaffold, install)** — src_features_kevinguide_images_step_3_create_project_npm_create_vite_command, src_features_kevinguide_images_step_3_create_project_eslint_linter_prompt, src_features_kevinguide_images_step_3_create_project_install_and_start_prompt, src_features_kevinguide_images_step_3_create_project_scaffolding_my_project, src_features_kevinguide_images_step_3_create_project_npm_dependency_install [EXTRACTED 1.00]
- **npm install step: package.json, npm i in terminal, node_modules and success output** — package, src_features_kevinguide_images_step_4_npm_install_npm_i_command, src_features_kevinguide_images_step_4_npm_install_node_modules_folder, src_features_kevinguide_images_step_4_npm_install_npm_install_result [INFERRED 0.85]
- **Starting the local dev server: command, Vite server, localhost URL** — src_features_kevinguide_images_step_5_npm_run_dev_npm_run_dev_command, src_features_kevinguide_images_step_5_npm_run_dev_vite_dev_server, src_features_kevinguide_images_step_5_npm_run_dev_localhost_5173 [EXTRACTED 1.00]
- **Move into project and install dependencies flow** — src_features_kevinguide_images_step_6_browser_cd_my_project_command, src_features_kevinguide_images_step_6_browser_npm_install_command, src_features_kevinguide_images_step_6_browser_npm_install_result [EXTRACTED 1.00]
- **Vercel overview page main panels (Usage, Alerts, Projects, Recent Previews)** — src_features_kevinguide_images_whatisvercel_usage_panel, src_features_kevinguide_images_whatisvercel_alerts_panel, src_features_kevinguide_images_whatisvercel_projects_list, src_features_kevinguide_images_whatisvercel_recent_previews [EXTRACTED 1.00]

## Communities (76 total, 0 thin omitted)

### Community 0 - "Links Page & Shared UI"
Cohesion: 0.06
Nodes (69): GuidesHeaderProps, FolderModal(), FolderModalProps, FolderRow(), FolderRowProps, ArrowLeftIcon(), ArrowRightIcon(), CheckIcon() (+61 more)

### Community 1 - "Calendar Feature"
Cohesion: 0.09
Nodes (54): addDays(), countDays(), datesBetween(), daysInMonth(), formatLong(), formatShort(), fromUtc(), groupRuns() (+46 more)

### Community 2 - "Voice Call Feature"
Cohesion: 0.07
Nodes (46): useFocusMode(), CallHeader(), CallHeaderProps, Field(), FieldProps, AlertIcon(), CloseIcon(), HelpIcon() (+38 more)

### Community 3 - "Device Panel Scene"
Cohesion: 0.08
Nodes (45): Resolution, clip(), DevicePanel(), DevicePanelProps, EMPTY_SET, KIND_CLASS, linkPath(), NO_CABLES (+37 more)

### Community 4 - "README & Release Workflow"
Cohesion: 0.07
Nodes (46): Desktop app workflow (desktop.yml), Check the files an update needs step, npm run desktop:pack step, GitHub Release vX.Y.Z (Support Hub), latest.yml (update manifest), npm run lint and npm test gate steps, npm version step (build-only version, not committed), Publish the release step (gh release create) (+38 more)

### Community 5 - "NVX Dialogs & Confirm"
Cohesion: 0.09
Nodes (41): AllowChanges(), AllowChangesProps, ConfirmChangeDialog(), ConfirmChangeDialogProps, OUTCOME_STYLE, PendingRequest, showBody(), CallDialog() (+33 more)

### Community 6 - "Guide Block Editors"
Cohesion: 0.16
Nodes (36): BlockEditProps, BlockFrame(), Reorder, CalloutEdit(), ChapterEdit(), ChapterEditProps, SECTION_KIND, SectionRow() (+28 more)

### Community 7 - "Storage Tests & Memory FS"
Cohesion: 0.11
Nodes (27): withImage(), PATH_BUDGET, Hooks, legacyGuides(), legacyLibrary(), png(), libraryWithFolderGuide(), open() (+19 more)

### Community 8 - "Guide Folder Organize & Adopt"
Cohesion: 0.10
Nodes (39): findUnindexedGuideFolders(), FolderScan, FoundGuideFolder, readGuide(), collectGuideAssets(), folderRelativePath(), mapGuideAssets(), normalizeRef() (+31 more)

### Community 9 - "Editor Icons & Sortable"
Cohesion: 0.15
Nodes (35): ArrowDownIcon(), ArrowUpIcon(), GripIcon(), XIcon(), BlockFrameProps, SELECT, GripHandle(), LinkEdit() (+27 more)

### Community 10 - "Guide View Rendering"
Cohesion: 0.11
Nodes (33): ColumnsIcon(), RowsIcon(), accentFor(), CalloutView(), ChapterBlock(), ChapterView(), ChapterViewProps, plural() (+25 more)

### Community 11 - "Terminal Card & xterm"
Cohesion: 0.09
Nodes (23): @xterm/addon-fit, @xterm/xterm, Detail(), Info, Status, TerminalCard(), TerminalCardProps, THEME (+15 more)

### Community 12 - "RMA Feature"
Cohesion: 0.12
Nodes (33): ActionDeterminator(), CopyIcon(), ExternalLinkIcon(), Icon(), IconProps, PlusIcon(), TrashIcon(), RmaDetailsCard() (+25 more)

### Community 13 - "NVX Data & Hook"
Cohesion: 0.12
Nodes (35): asId(), asText(), defaultGroups(), FlatValue, newGroup(), newId(), reviveCall(), reviveFolder() (+27 more)

### Community 14 - "Zip Reader & Writer"
Cohesion: 0.10
Nodes (24): vitest, hasControlChars(), isJunkFileName(), rawZip(), CP437_HIGH, decodeName(), DEFAULT_LIMITS, isJunkPath() (+16 more)

### Community 15 - "Guides Folder FS Ops"
Cohesion: 0.12
Nodes (33): isIgnoredName(), isSafeSegment(), isTransientName(), JUNK_FILES, Body, ensureDir(), findDir(), isNotFoundError() (+25 more)

### Community 16 - "Cases Bullets & Formatting"
Cohesion: 0.12
Nodes (34): BLOCK_TAGS, blockLines(), Bullet, escapeHtml(), formatBullet(), htmlToText(), levelOf(), listLines() (+26 more)

### Community 17 - "NVX Results & Compare"
Cohesion: 0.11
Nodes (32): ChangesCard(), ChangesCardProps, OUTCOME_STYLE, CompareTable(), CompareTableProps, ResultsCard(), ResultsCardProps, Toggle() (+24 more)

### Community 18 - "Sync Backup Cards"
Cohesion: 0.17
Nodes (27): DownloadIcon(), BackupCard(), FileButton(), FileButtonProps, CONFLICT_MODES, describeOutcome(), GuidesCard(), JsonFound (+19 more)

### Community 19 - "Guide Types & Draft"
Cohesion: 0.14
Nodes (31): blankBlock(), blankLink(), blankPart(), blankSection(), blankStep(), blankSubItem(), CHAPTER_ACCENTS, MONTHS (+23 more)

### Community 20 - "Cases Templates & Flags"
Cohesion: 0.13
Nodes (25): ALL_TEMPLATE_BUTTONS, FLAGGED_PHRASES, GROUP_TONES, isTemplateMenu(), LANGUAGES, TEMPLATE_GROUPS, TEMPLATE_BODIES, ChevronDownIcon() (+17 more)

### Community 21 - "Electron Main Process"
Cohesion: 0.08
Nodes (24): Packaged files list (dist plus desktop main, preload, nvx, terminal, updater), ALLOWED_PERMISSIONS, { app, BrowserWindow, Menu, ipcMain, net, protocol, safeStorage, session, shell }, { autoUpdater }, { createNvxClient, registerNvxIpc }, { createTerminalManager, registerTerminalIpc }, { createUpdater, registerUpdaterIpc }, createWindow() (+16 more)

### Community 22 - "Panel Editor & Inspectors"
Cohesion: 0.20
Nodes (27): CableInspector(), Common, uid(), UnitInspector(), PanelEdit(), pruneTo(), Tab, TAB_HELP (+19 more)

### Community 23 - "Sync Package Classification"
Cohesion: 0.17
Nodes (26): textSource(), inspectGuidePackage(), readPackagedGuide(), classifyArchive(), classifyJson(), describeZipError(), entryText(), isGuideEntry() (+18 more)

### Community 24 - "Guide Editor Chrome"
Cohesion: 0.13
Nodes (22): CalloutIcon(), ChevronLeftIcon(), PanelIcon(), TableIcon(), TermIcon(), DEFAULT_UI, EditorUi, EditorUiContext (+14 more)

### Community 25 - "Kevin Guide Page"
Cohesion: 0.12
Nodes (24): AlertIcon(), ExternalLinkIcon(), FileIcon(), accentForStep(), CODE_TOUR, CodeExplainer, GIT_COMMANDS, GIT_COMMANDS_LINK (+16 more)

### Community 26 - "Cases Editor & Page"
Cohesion: 0.16
Nodes (21): CasesPage(), ComposerHeader(), Editor(), EditorProps, highlight(), FlaggedBar(), FlaggedBarProps, phraseList() (+13 more)

### Community 27 - "NVX Client (Electron)"
Cohesion: 0.13
Nodes (24): BLOCKED_HEADERS, buildMultipart(), checkHeaders(), cookieHeader(), createNvxClient(), build(), exchange(), login() (+16 more)

### Community 28 - "Case Images"
Cohesion: 0.18
Nodes (21): CaseImage, findImageMarkers(), imageIdOfLine(), ImageMarker, MAX_IMAGE_WIDTH, MAX_IMAGES, nextImageId(), referencedImageIds() (+13 more)

### Community 29 - "Guides Library & Merge"
Cohesion: 0.15
Nodes (21): DEFAULT_GUIDE_ORDER, TEMPLATE_FILE, ConflictMode, GuidesMergeResult, mergeGuides(), parseGuidesFile(), toGuidesFile(), toPortableGuide() (+13 more)

### Community 30 - "Device Catalog"
Cohesion: 0.08
Nodes (19): AUDIO_OUT, C_PORTS, CardFamily, CARDS, CardType, Conn, DEFAULT_DEVICE_ID, DeviceTemplate (+11 more)

### Community 31 - "package.json & ESLint"
Cohesion: 0.10
Nodes (22): author, dependencies, electron-updater, ssh2, description, main, name, private (+14 more)

### Community 32 - "Dev Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, electron, electron-builder, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+15 more)

### Community 33 - "Guides Screen & Context"
Cohesion: 0.19
Nodes (17): react, useFolder(), useReportEditingGuide(), FolderStatusStrip(), GuidesHeader(), blankGuide(), GuidesPage(), countGuidesToOrganize() (+9 more)

### Community 34 - "Panel Cabling & Connect"
Cohesion: 0.22
Nodes (22): PortOptions(), autoPort(), cableCount(), cableToNewUnit(), CHASSIS_KEYS, Check, checkConnection(), dirWord (+14 more)

### Community 35 - "NVX Request Bodies"
Cohesion: 0.17
Nodes (18): bodyWarnings(), buildChangeBody(), buildChangesBody(), changeLine(), describeForm(), describeStatus(), getAtPath(), parseChangeStatuses() (+10 more)

### Community 36 - "SSH Terminal Manager"
Cohesion: 0.14
Nodes (21): ANSI, { Client }, createKnownHosts(), createTerminalManager(), end(), open(), resize(), write() (+13 more)

### Community 37 - "App Data Context"
Cohesion: 0.23
Nodes (19): AppUpdateContext, CalendarContext, EditingContext, EditingState, FolderContext, GuidesContext, LinksContext, NvxContext (+11 more)

### Community 38 - "Folder Sync Cards"
Cohesion: 0.22
Nodes (17): useIsEditingGuide(), FolderIcon(), SyncIcon(), isShared(), describeContent(), clockTime(), FolderBody(), FolderCard() (+9 more)

### Community 39 - "NVX Editable Values"
Cohesion: 0.19
Nodes (15): EditableValue(), EditableValueProps, GroupBar(), GroupBarProps, ChevronIcon(), FolderIcon(), PencilIcon(), PlayIcon() (+7 more)

### Community 40 - "Desktop Terminal & Updater Tests"
Cohesion: 0.12
Nodes (12): consoles, { createTerminalManager, parseUnitInfo, parseCommandList, fingerprint, stripAnsi }, creds, HELP_ALL, mockConsole(), require, { Server }, startConsole() (+4 more)

### Community 41 - "Callout & Step Styles"
Cohesion: 0.18
Nodes (15): react-dom, ImageIcon(), WarningIcon(), CalloutPart, CalloutVariant, CALLOUT_BOX, CALLOUT_ICON, CALLOUT_LABEL (+7 more)

### Community 42 - "Kevin Guide Icons"
Cohesion: 0.20
Nodes (14): EslintIcon(), GitIcon(), ImageIcon(), NodeIcon(), TailwindIcon(), TypeScriptIcon(), VercelIcon(), ViteIcon() (+6 more)

### Community 43 - "Panel Flow & Templates"
Cohesion: 0.24
Nodes (15): cardIdFor(), getCard(), getDevice(), getTemplate(), FlowState, nextStep(), stateAfter(), stepMoves() (+7 more)

### Community 44 - "tsconfig App Options"
Cohesion: 0.11
Nodes (18): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+10 more)

### Community 45 - "Vite Toolchain & Repo Shot"
Cohesion: 0.13
Nodes (16): @tailwindcss/vite, vite, @vitejs/plugin-react, .gitignore, index.html, Initial project structure with cases, voice call and guides pages (commit message), Latest commit a54d58d: Implement error boundaries and persistent state management (8 commits total), Lenaerts-Nestor (commit author) (+8 more)

### Community 46 - "Mascots & Persistent State"
Cohesion: 0.24
Nodes (11): App(), dailyIndex(), Mascot, MASCOTS, pickMascot(), stepMascot(), SidebarMascots(), ConnectCard() (+3 more)

### Community 47 - "Backup Restore"
Cohesion: 0.17
Nodes (14): CALENDAR_FILENAME, SNIPPETS_FILENAME, LINKS_FILENAME, countLinks(), isStarterCall(), NVX_FILENAME, Pending, MANIFEST_NAME (+6 more)

### Community 48 - "Guide Cards & Groups"
Cohesion: 0.22
Nodes (13): GuideCard(), GuideCardProps, GuideGroup(), GuideGroupProps, ChevronDownIcon(), ExternalLinkIcon(), LayersIcon(), LinkIcon() (+5 more)

### Community 49 - "normalizeGuide Import"
Cohesion: 0.51
Nodes (15): asArr(), asObj(), asStr(), normalizeBlocks(), normalizeGuide(), normalizeLink(), normalizePanel(), normalizePart() (+7 more)

### Community 50 - "NVX Units Catalog"
Cohesion: 0.14
Nodes (14): defaultGroup(), nvx360Ports(), NVX_DECODER_PORTS, NVX_ENCODER_PORTS, nvxModels(), p(), PortDir, PortSpec (+6 more)

### Community 51 - "App Shell & Error Boundary"
Cohesion: 0.20
Nodes (8): PAGES, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, FocusModeContext, NAV_ITEMS, NavigationContext, PageId

### Community 52 - "Snippets File & Merge"
Cohesion: 0.27
Nodes (12): readSnippetsFile(), reviveSnippets(), writeSnippetsFile(), mergeSnippets(), normalizeText(), sameLabel(), SnippetsMergeResult, CaseLanguage (+4 more)

### Community 53 - "File System Access Types"
Cohesion: 0.13
Nodes (8): DirectoryPickerOptions, FileSystemDirectoryHandle, FileSystemHandle, FileSystemHandlePermissionDescriptor, FileSystemPermissionMode, OpenFilePickerOptions, WellKnownDirectory, Window

### Community 54 - "NVX Request Builder"
Cohesion: 0.20
Nodes (14): Draft, FormEditor(), RequestBuilder(), RequestBuilderProps, Tab, formatBytes(), FormRow, formSize() (+6 more)

### Community 55 - "tsconfig Node Options"
Cohesion: 0.13
Nodes (15): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 56 - "Folder Handle Store"
Cohesion: 0.27
Nodes (12): isFolderSyncSupported(), verifyPermission(), clearFolderHandle(), loadFolderHandle(), openDb(), saveFolderHandle(), tx(), Connection (+4 more)

### Community 57 - "Vite Project Explorer Shot"
Cohesion: 0.19
Nodes (11): App.tsx structure screenshot (Vite React project in VS Code), VS Code Explorer: MY-PROJECT folder tree, index.html, node_modules folder, npm i output (161 packages audited, 0 vulnerabilities), public folder, Integrated terminal panel (Git Bash in my-project), include (+3 more)

### Community 58 - "App.tsx Component Shot"
Cohesion: 0.22
Nodes (13): App() function component, App.css, App.tsx (open file, src/App.tsx), Asset imports (heroImg, reactLogo, viteLogo), src/assets folder (hero.png, react.svg, vite.svg), Counter button (onClick increments count), Get started heading and 'Edit src/App.tsx and save to test HMR' text, section#center with hero div and three logo images (+5 more)

### Community 59 - "App Auto-Update"
Cohesion: 0.27
Nodes (9): AppUpdateState, formatSize(), hasPendingUpdate(), clockTime(), Progress(), TokenHelp(), UpdateCard(), AppUpdateController (+1 more)

### Community 60 - "Public SVG Icons"
Cohesion: 0.20
Nodes (12): favicon.svg (purple Vite bolt favicon, 48x46), Purple lightning-bolt mark with blurred gradient glow (Vite logo glyph), icons.svg (SVG symbol sprite of social and link icons), bluesky-icon symbol (Bluesky butterfly, filled dark), discord-icon symbol (Discord controller mascot, filled dark), documentation-icon symbol (code-brackets document, purple stroke), github-icon symbol (GitHub octocat mark, filled dark), social-icon symbol (person with star, purple stroke) (+4 more)

### Community 61 - "Sidebar Navigation"
Cohesion: 0.26
Nodes (10): useAppUpdateData(), FOLDER_DOT, ICONS, NavButton(), NavButtonProps, Sidebar(), SidebarProps, formatTime() (+2 more)

### Community 62 - "Kevin Guide Step Images"
Cohesion: 0.17
Nodes (11): STEP_IMAGES, GitHub repository page screenshot (Technical-support-Assistance), Step 2 screenshot: open Git Bash terminal in VS Code, Step 5 screenshot: npm run dev terminal output, Vite dependency re-optimization after config change, Git Bash (MINGW64) terminal in project folder, Local URL http://localhost:5173/, Network exposure via --host flag (+3 more)

### Community 63 - "Vercel Dashboard Shot"
Cohesion: 0.25
Nodes (11): Alerts panel (anomaly alerts, Upgrade to Pro), Environment Variables (sidebar entry), GitHub-connected deployments (commit message, repo, date on each project card), Hobby plan account (lenaerts-nestor), Vercel project: technical-support-assistance (this Support Hub app), Vercel project: technical-support-note (basic template), Projects list (card grid with search and Add New), Recent Previews (v0 documentation-navigation-system preview) (+3 more)

### Community 64 - "NVX Client Tests"
Cohesion: 0.24
Nodes (6): { createNvxClient, buildMultipart, isPrivateIPv4, isValidPath, updateJar, checkHeaders }, creds, parseCookies(), startMockDevice(), token(), selfsigned

### Community 65 - "Guide Asset Mapping"
Cohesion: 0.31
Nodes (9): AssetKind, AssetRef, IMAGES_DIR, mapPart(), mapSection(), mapStep(), mapZip(), PROJECTS_DIR_NAME (+1 more)

### Community 66 - "Step 1: Open VS Code"
Cohesion: 0.24
Nodes (10): Step 1 screenshot: VS Code Welcome screen, VS Code activity bar and menu bar (Explorer, Search, Source Control, Run and Debug, Remote Explorer, Extensions), Try out the new Agents window prompt, Kevin guide step 1: open VS Code and pick the project folder, Open Folder... link, Recent projects list (my-project, Technical-support-Assistance, Technical-Support-Note, Technical-support-Assistance [GitHub]), Show welcome page on startup checkbox, Start section: New File, Open File, Open Folder, Clone Git Repository, Connect to, Generate New Workspace (+2 more)

### Community 67 - "Step 3: Create Vite Project"
Cohesion: 0.25
Nodes (9): Step 3 screenshot: create Vite project in terminal, create-vite 9.2.1 package (installed via npx), Interactive prompt: which linter (ESLint selected), Git Bash (MINGW64) terminal on Windows, Interactive prompt: install with npm and start now (Yes), npm create vite@latest my-project -- --template react-ts, npm dependency install (160 packages added in 18s), react-ts Vite template (+1 more)

### Community 68 - "Step 6: Browser Preview"
Cohesion: 0.33
Nodes (9): Screenshot: kevinGuide step rendered in browser (localhost:5173), cd my-project command, my-project folder (node_modules, public, src, package.json, vite.config.js), npm install command, npm install result: up to date, 161 packages, 0 vulnerabilities, Scaffold terminal output (Install with npm and start now? / added 160 packages), Step 4: Move into the project & install dependencies, Vite dev server at localhost:5173 (+1 more)

### Community 69 - "npm Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, desktop, desktop:pack, dev, lint, preview, test

### Community 70 - "Folder Zip & Backup Export"
Cohesion: 0.46
Nodes (6): collectFolderSources(), downloadBlob(), zipFolder(), ZipSource, exportFullBackup(), datestamp()

### Community 71 - "Step 4: npm Install"
Cohesion: 0.32
Nodes (8): Step 4 screenshot: npm install in VS Code, node_modules folder, npm i command (install dependencies), npm install result: audited 161 packages, 0 vulnerabilities, package-lock.json, VS Code Explorer panel showing my-project file tree, VS Code integrated terminal (Git Bash, my-project), VS Code Welcome page (Start / Recent)

### Community 72 - "Template Placeholders"
Cohesion: 0.38
Nodes (4): TEMPLATE_PLACEHOLDERS, findPlaceholders(), PLACEHOLDER_RE, texts()

### Community 73 - "Step 2: Git Bash Terminal"
Cohesion: 0.47
Nodes (6): Git Bash menu option (highlighted), New Terminal (+) button with profile dropdown menu, Default PowerShell prompt in my-project folder, Terminal shell profiles (PowerShell, Git Bash, Command Prompt, JS Debug), Terminal settings actions (Select Default Profile, Configure Terminal Settings, Run Task), VS Code bottom panel with Terminal tab active

### Community 74 - "HTML Entry & Mount Point"
Cohesion: 0.50
Nodes (3): index.html (Vite entry page), favicon.svg (tab icon), #root mount point

### Community 75 - "Hero Illustration"
Cohesion: 0.50
Nodes (4): hero.png (isometric layered-stack illustration), Bottom layer: white rounded square slab with purple gradient edge, Dotted vertical guide lines linking the two layers, Top layer: gray-outlined white rounded square slab

## Knowledge Gaps
- **46 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `electron-builder`, `tailwindcss` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 492 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Guides Screen & Context` to `Links Page & Shared UI`, `Calendar Feature`, `Voice Call Feature`, `Device Panel Scene`, `NVX Dialogs & Confirm`, `Guide Block Editors`, `Guide Folder Organize & Adopt`, `Editor Icons & Sortable`, `Guide View Rendering`, `Terminal Card & xterm`, `RMA Feature`, `NVX Data & Hook`, `Cases Bullets & Formatting`, `NVX Results & Compare`, `Sync Backup Cards`, `Guide Types & Draft`, `Cases Templates & Flags`, `Panel Editor & Inspectors`, `Guide Editor Chrome`, `Cases Editor & Page`, `Case Images`, `Guides Library & Merge`, `package.json & ESLint`, `NVX Request Bodies`, `App Data Context`, `Folder Sync Cards`, `NVX Editable Values`, `Callout & Step Styles`, `Panel Flow & Templates`, `Mascots & Persistent State`, `Backup Restore`, `Guide Cards & Groups`, `App Shell & Error Boundary`, `Snippets File & Merge`, `NVX Request Builder`, `Folder Handle Store`, `App Auto-Update`, `Sidebar Navigation`, `HTML Entry & Mount Point`?**
  _High betweenness centrality (0.347) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PlusIcon()` (e.g. with `GuideEditor.tsx` and `InsertBar.tsx`) actually correct?**
  _`PlusIcon()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Links Page & Shared UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06398046398046398 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Zip Reader & Writer` to `NVX Client Tests`, `Calendar Feature`, `Links Page & Shared UI`, `NVX Request Bodies`, `Storage Tests & Memory FS`, `Desktop Terminal & Updater Tests`, `Template Placeholders`, `Guide Folder Organize & Adopt`, `Terminal Card & xterm`, `Mascots & Persistent State`, `Sync Package Classification`, `Case Images`, `Guides Library & Merge`, `package.json & ESLint`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `Calendar Feature` be split into smaller, more focused modules?**
  _Cohesion score 0.09482001755926252 - nodes in this community are weakly interconnected._
- **Why does `ssh2` connect `SSH Terminal Manager` to `Desktop Terminal & Updater Tests`, `package.json & ESLint`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._