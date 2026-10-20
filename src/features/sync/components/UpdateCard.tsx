import { useState } from 'react'
import { useAppUpdateData } from '../../../app/appDataContext'
import { CARD, CARD_HEADER, CHIP, DANGER_BTN, GHOST_BTN_MD, INPUT, PRIMARY_BTN } from '../../../shared/ui/styles'
import { formatSize, hasPendingUpdate } from '../appUpdate'
import type { AppUpdateState } from '../appUpdate'
import { SyncIcon } from './icons'

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function Progress({ progress }: { progress: NonNullable<AppUpdateState['progress']> }) {
  const { percent, transferred, total, bytesPerSecond } = progress
  return (
    <div className="space-y-1.5">
      <div
        className="bg-canvas border-line h-2.5 overflow-hidden rounded-full border"
        role="progressbar"
        aria-label="Downloading the update"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="bg-brand h-full rounded-full transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-ink-muted text-xs">
        {percent}%{total > 0 && ` · ${formatSize(transferred)} of ${formatSize(total)}`}
        {bytesPerSecond > 0 && ` · ${formatSize(bytesPerSecond)}/s`}
      </p>
    </div>
  )
}

/** How to make the token, for the person who has never done it. */
function TokenHelp() {
  return (
    <details className="text-ink-muted text-sm">
      <summary className="cursor-pointer">How to create the token (once)</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 leading-relaxed">
        <li>On github.com open your profile menu → <strong>Settings</strong> → <strong>Developer settings</strong> → <strong>Personal access tokens</strong> → <strong>Fine-grained tokens</strong> → <strong>Generate new token</strong>.</li>
        <li>Name it “Support Hub updates” and choose the longest expiry offered.</li>
        <li><strong>Repository access</strong>: <em>Only select repositories</em> → this repository.</li>
        <li><strong>Permissions</strong> → <strong>Repository permissions</strong> → <strong>Contents: Read-only</strong>. Nothing else.</li>
        <li>Generate it, copy the token (it starts with <code>github_pat_</code>) and paste it here. GitHub shows it only once.</li>
      </ol>
      <p className="mt-2">The token is kept on this computer, encrypted by Windows. It can only read this repository, and you can revoke it on GitHub at any time.</p>
    </details>
  )
}

/** The app's own updates: the version, a check, and when a newer one exists, download and install. */
export function UpdateCard() {
  const { state, check, download, install, saveToken, removeToken } = useAppUpdateData()
  const [token, setToken] = useState('')
  const [tokenError, setTokenError] = useState<string | null>(null)

  if (!state) {
    return (
      <section className={CARD}>
        <div className={CARD_HEADER}>
          <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
            <SyncIcon className="text-brand-strong h-4 w-4" />
            App updates
          </h3>
        </div>
        <p className="text-ink-muted p-4 text-sm">Updates are part of the Support Hub desktop app.</p>
      </section>
    )
  }

  const { status, mode, available, progress, error, checkedAt } = state
  const pending = hasPendingUpdate(state)
  const busy = status === 'checking' || status === 'downloading'

  const submitToken = async () => {
    const problem = await saveToken(token)
    setTokenError(problem)
    if (!problem) setToken('')
  }

  return (
    <section className={`${CARD} ${pending ? 'border-brand' : ''}`} aria-label="App updates">
      <div className={CARD_HEADER}>
        <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <SyncIcon className="text-brand-strong h-4 w-4" />
          App updates
        </h3>
        <div className="flex items-center gap-2">
          <span className={CHIP}>{mode === 'installed' ? 'Installed' : mode === 'portable' ? 'Portable' : 'Development'}</span>
          <span className="text-ink-muted font-mono text-xs">v{state.version}</span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {pending && (
          <div className="border-brand-line bg-brand-soft space-y-2 rounded-lg border p-4" role="status">
            <p className="text-ink text-base font-semibold">
              {status === 'ready' ? `Version ${available?.version} is ready to install` : `Version ${available?.version} is available`}
            </p>
            {available?.notes && <p className="text-ink-muted max-h-40 overflow-y-auto text-sm leading-relaxed whitespace-pre-line">{available.notes}</p>}
            {mode === 'portable' && (
              <p className="text-ink-muted text-sm">
                You are using the portable version, which cannot update itself. Use the setup version (<code>SupportHub-…-setup.exe</code>) to update from here.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {status === 'available' && mode === 'installed' && (
                <button type="button" className={PRIMARY_BTN} onClick={download}>
                  Download and install
                </button>
              )}
              {status === 'ready' && (
                <button type="button" className={PRIMARY_BTN} onClick={install}>
                  Restart and install
                </button>
              )}
            </div>
            {status === 'ready' && <p className="text-ink-muted text-xs">Your drafts and your data folder are kept. The app closes, updates and opens again.</p>}
          </div>
        )}

        {status === 'downloading' && progress && <Progress progress={progress} />}
        {status === 'checking' && <p className="text-ink-muted text-sm">Checking GitHub…</p>}
        {status === 'uptodate' && (
          <p className="text-sm text-emerald-300">
            You have the latest version.{checkedAt && <span className="text-ink-muted"> Checked at {clockTime(checkedAt)}.</span>}
          </p>
        )}
        {status === 'idle' && mode !== 'dev' && state.hasToken && <p className="text-ink-muted text-sm">Not checked yet in this session.</p>}
        {mode === 'dev' && <p className="text-ink-muted text-sm">This is a development build. Updates are checked in the installed app.</p>}
        {error && (
          <p role="alert" className="rounded-md border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        {mode !== 'dev' && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={GHOST_BTN_MD} disabled={busy || status === 'ready'} onClick={check}>
              Check for updates
            </button>
          </div>
        )}

        {mode !== 'dev' &&
          (state.hasToken ? (
            <div className="border-line-soft flex flex-wrap items-center gap-3 border-t pt-3">
              <p className="text-ink-muted text-sm">GitHub token saved on this computer, encrypted.</p>
              <button type="button" className={`${DANGER_BTN} ml-auto`} onClick={removeToken}>
                Remove token
              </button>
            </div>
          ) : (
            <form
              className="border-line-soft space-y-3 border-t pt-3"
              onSubmit={(e) => {
                e.preventDefault()
                void submitToken()
              }}
            >
              <p className="text-ink text-sm">
                The repository is private, so the app needs a read-only GitHub token to see new versions. Paste it once.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  className={`${INPUT} max-w-md flex-1 font-mono`}
                  type="password"
                  value={token}
                  placeholder="github_pat_…"
                  aria-label="GitHub token"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button type="submit" className={PRIMARY_BTN} disabled={!token.trim()}>
                  Save token
                </button>
              </div>
              {tokenError && <p className="text-sm text-rose-300">{tokenError}</p>}
              <TokenHelp />
            </form>
          ))}
      </div>
    </section>
  )
}
