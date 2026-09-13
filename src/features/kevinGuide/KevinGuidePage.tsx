import { CARD, CARD_HEADER, PAGE_SUBTITLE, SECTION_LABEL } from '../../shared/ui/styles'
import { AlertIcon, ExternalLinkIcon, FileIcon, GitIcon, VercelIcon } from './components/icons'
import { ImageSlot } from './components/ImageSlot'
import { TOOL_ICONS } from './components/toolIconMap'
import { appTsxStructureImg, githubProjectImg, STEP_IMAGES, whatIsVercelImg } from './guideImages'
import {
  CODE_TOUR,
  GIT_COMMANDS,
  GIT_COMMANDS_LINK,
  GROUP_LABEL,
  GROUP_TONES,
  INSTALLS,
  PROJECT_FILES,
  STEPS,
  TOOLS,
  TOOL_TONES,
  accentForStep,
  type ProjectFileGroup,
} from './kevinGuideData'

/**
 * Static, one-off walkthrough page. Not tied to the usual feature shape
 * (no hook, no persistence) because there's nothing here that needs to
 * survive a reload or be edited. Content only.
 */

function CodeLine({ children }: { children: string }) {
  return (
    <code className="border-line bg-canvas text-ink block rounded-md border px-3 py-2 font-mono text-xs">
      {children}
    </code>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="border-line bg-canvas text-ink overflow-x-auto rounded-md border px-3 py-2.5 font-mono text-[11px] leading-relaxed">
      <code>{code}</code>
    </pre>
  )
}

function Figure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="mt-3">
      <img src={src} alt={alt} className="border-line w-full rounded-lg border object-contain" />
      <figcaption className="text-ink-faint mt-1.5 text-xs leading-relaxed">{caption}</figcaption>
    </figure>
  )
}

const FILE_GROUPS: ProjectFileGroup[] = ['code', 'config', 'generated']

export function KevinGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-8 py-7">
      <div>
        <h1 className="bg-gradient-to-r from-brand via-violet-400 to-cyan-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          Personal guide for Kevin the boss \(o.o)/
        </h1>
        <p className={PAGE_SUBTITLE}>
          this is your personal guide from me , the one and only  guy with memory loses .
        </p>
      </div>

      {/* -- Tools --------------------------------------------------------- */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className={SECTION_LABEL}>The tools we&apos;re using</span>
        </div>
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const Icon = TOOL_ICONS[tool.id]
            return (
              <div key={tool.id} className="border-line rounded-lg border px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`rounded-md p-1.5 ${TOOL_TONES[tool.id]}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-ink text-sm font-semibold">{tool.name}</span>
                </div>
                <p className="text-ink-muted mt-2 text-xs leading-relaxed">{tool.blurb}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* -- Installs -------------------------------------------------------- */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className={SECTION_LABEL}>What to install first</span>
        </div>
        <div className="space-y-2 px-4 py-4">
          {INSTALLS.map((item) => {
            const Icon = TOOL_ICONS[item.id]
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-line hover:border-line-strong hover:bg-subtle group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors"
              >
                <span className={`rounded-md p-1.5 ${TOOL_TONES[item.id]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink text-sm font-semibold">{item.name}</span>
                    <ExternalLinkIcon className="text-ink-faint group-hover:text-ink-muted h-3.5 w-3.5" />
                  </div>
                  <p className="text-ink-muted mt-0.5 text-xs leading-relaxed">{item.blurb}</p>
                  <p className="text-brand mt-1 text-xs">{item.url.replace('https://', '')}</p>
                </div>
              </a>
            )
          })}
        </div>
      </section>

      {/* -- Steps ------------------------------------------------------------ */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className={SECTION_LABEL}>Opening VS Code &amp; starting a project</span>
        </div>
        <div className="space-y-4 px-4 py-4">
          {STEPS.map((step, i) => (
            <div key={step.id} className="border-line rounded-lg border px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${accentForStep(i)}`}
                >
                  {i + 1}
                </span>
                <h3 className="text-ink text-sm font-semibold">{step.title}</h3>
              </div>
              <p className="text-ink-muted mt-2 ml-8.5 text-sm leading-relaxed">{step.body}</p>
              {step.code && (
                <div className="mt-2 ml-8.5 space-y-1.5">
                  {step.code.map((line) => (
                    <CodeLine key={line}>{line}</CodeLine>
                  ))}
                </div>
              )}
              <div className="mt-3 ml-8.5">
                <ImageSlot name={step.imageKey} alt={step.title} src={STEP_IMAGES[step.imageKey]} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -- npm install troubleshooting --------------------------------------- */}
      <section className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06]">
        <div className="flex items-center gap-2 rounded-t-xl border-b border-amber-400/20 px-4 py-2.5">
          <AlertIcon className="h-4 w-4 text-amber-300" />
          <span className="text-xs font-semibold tracking-[0.08em] text-amber-300 uppercase">
            If <code>npm run dev</code> doesn&apos;t work
          </span>
        </div>
        <div className="text-ink-muted space-y-3 px-4 py-4 text-sm leading-relaxed">
          <p>
            Don&apos;t panic, this happens all the time. It almost always just means the
            project&apos;s dependencies never got downloaded. Maybe the{' '}
            <code className="text-ink">npm install</code> step got skipped, or you copied or
            cloned the project folder without it. (<code className="text-ink">node_modules</code>{' '}
            never gets copied or committed to Git, more on that below.)
          </p>
          <p>
            <span className="text-ink font-medium">How to check:</span> open the project folder
            in VS Code&apos;s file explorer (left sidebar) and look for a{' '}
            <code className="text-ink">node_modules</code> folder. Or from the terminal, while
            you&apos;re inside the project folder:
          </p>
          <CodeLine>ls</CodeLine>
          <p>
            If <code className="text-ink">node_modules</code> isn&apos;t in that list, that&apos;s
            your answer. Install it:
          </p>
          <CodeLine>npm install</CodeLine>
          <p>Then give it another go:</p>
          <CodeLine>npm run dev</CodeLine>
        </div>
      </section>

      {/* -- Project structure --------------------------------------------------- */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className={SECTION_LABEL}>What are all these files? (App.tsx &amp; friends)</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-ink-muted text-sm leading-relaxed">
            Once the project&apos;s created, VS Code&apos;s file explorer suddenly fills up with a
            bunch of files you didn&apos;t write yourself. Don&apos;t worry, here&apos;s what each
            one actually does:
          </p>
          <Figure
            src={appTsxStructureImg}
            alt="VS Code showing the Vite project's file explorer and App.tsx open"
            caption="Your freshly created project, open in VS Code. File tree on the left, App.tsx on the right."
          />
          <div className="mt-4 space-y-4">
            {FILE_GROUPS.map((group) => (
              <div key={group}>
                <span
                  className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase ${GROUP_TONES[group]}`}
                >
                  {GROUP_LABEL[group]}
                </span>
                <div className="mt-2 space-y-2">
                  {PROJECT_FILES.filter((f) => f.group === group).map((file) => (
                    <div key={file.path} className="border-line rounded-lg border px-3 py-2.5">
                      <code className="text-ink text-xs font-semibold">{file.path}</code>
                      <p className="text-ink-muted mt-1 text-xs leading-relaxed">{file.blurb}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- Code tour ------------------------------------------------------------- */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className={SECTION_LABEL}>A peek at this app&apos;s own code</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-ink-muted text-sm leading-relaxed">
            Forget the generic template for a second. These three files are straight out of{' '}
            <span className="text-ink">this</span> app, the actual tool you&apos;re looking at
            right now. Reading real code beats reading about code, so let&apos;s go through them.
          </p>
          <div className="mt-4 space-y-5">
            {CODE_TOUR.map((entry) => (
              <div key={entry.id} className="border-line rounded-lg border px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <FileIcon className="text-ink-faint h-4 w-4" />
                  <code className="text-ink text-sm font-semibold">{entry.file}</code>
                </div>
                <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">{entry.intro}</p>
                <div className="mt-2.5">
                  <CodeBlock code={entry.code} />
                </div>
                <ul className="mt-2.5 space-y-1.5">
                  {entry.points.map((point) => (
                    <li key={point} className="text-ink-muted flex gap-2 text-xs leading-relaxed">
                      <span className="bg-brand mt-1.5 h-1 w-1 shrink-0 rounded-full" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- GitHub -------------------------------------------------------------- */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className="flex items-center gap-1.5">
            <span className={`rounded-md p-1 ${TOOL_TONES.git}`}>
              <GitIcon className="h-3.5 w-3.5" />
            </span>
            <span className={SECTION_LABEL}>Saving your work with GitHub</span>
          </span>
        </div>
        <div className="text-ink-muted space-y-3 px-4 py-4 text-sm leading-relaxed">
          <p>
            Once you&apos;ve got a project going locally, you&apos;ll want it backed up somewhere
            safe. That&apos;s GitHub. You create a <span className="text-ink">repository</span>{' '}
            (or "repo," just a fancy word for "project folder") on GitHub, then push your local
            commits up to it. That gives you a full history of your project online, and it&apos;s
            also what Vercel reads from to put your site live. More on that in a sec.
          </p>
          <Figure
            src={githubProjectImg}
            alt="A GitHub repository page showing its files and README"
            caption="A GitHub repository page: your files, the commit history up top, and usually a README explaining what the project is."
          />
          <p className="text-ink pt-1 text-sm font-medium">
            The four commands you&apos;ll use pretty much every day:
          </p>
          <div className="space-y-2.5">
            {GIT_COMMANDS.map((gitCommand) => (
              <div key={gitCommand.command} className="border-line rounded-lg border px-3 py-2.5">
                <CodeLine>{gitCommand.command}</CodeLine>
                <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">{gitCommand.explain}</p>
              </div>
            ))}
          </div>
          <p>
            Your everyday rhythm is basically: <code className="text-ink">git pull</code> →
            make your changes → <code className="text-ink">git add .</code> →{' '}
            <code className="text-ink">git commit -m "..."</code> →{' '}
            <code className="text-ink">git push</code>.
          </p>
          <a
            href={GIT_COMMANDS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand inline-flex items-center gap-1 text-xs hover:underline"
          >
            Full list of basic Git commands (GeeksforGeeks)
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </section>

      {/* -- Vercel ---------------------------------------------------------------- */}
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <span className="flex items-center gap-1.5">
            <span className={`rounded-md p-1 ${TOOL_TONES.vercel}`}>
              <VercelIcon className="h-3.5 w-3.5" />
            </span>
            <span className={SECTION_LABEL}>Putting it online with Vercel</span>
          </span>
        </div>
        <div className="text-ink-muted space-y-3 px-4 py-4 text-sm leading-relaxed">
          <p>
            Right now your project only runs on your own computer, that{' '}
            <code className="text-ink">localhost:5173</code> link from earlier. Vercel turns it
            into a real website anyone can visit. No server setup, no config on your end, it just
            builds your project and hosts it.
          </p>
          <p>
            <span className="text-ink font-medium">The catch:</span> Vercel needs your project on
            GitHub first. So the order goes push your project to a GitHub repo (see above), sign
            into Vercel with your GitHub account, then "import" that repo. Vercel builds it and
            gives you a live link. After that, every time you{' '}
            <code className="text-ink">git push</code>, Vercel automatically redeploys the new
            version for you.
          </p>
          <Figure
            src={whatIsVercelImg}
            alt="The Vercel dashboard showing a list of deployed projects"
            caption="Vercel's dashboard. Every project here is hooked up to a GitHub repo and redeploys automatically whenever you push."
          />
        </div>
      </section>
    </div>
  )
}
