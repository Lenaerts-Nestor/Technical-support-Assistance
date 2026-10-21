import { THEMES } from './themes'
import { useTheme } from './useTheme'
import type { ThemeInfo } from './themes'

function Swatch({ theme, className = '' }: { theme: ThemeInfo; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 rounded-full ring-1 ring-line-strong ${className}`}
      style={{ background: `linear-gradient(135deg, ${theme.swatch[0]} 50%, ${theme.swatch[1]} 50%)` }}
    />
  )
}

/**
 * Switches between the colour themes. Expanded, it is a small segmented control with
 * a swatch and name per theme; in the icons-only sidebar it is one swatch that steps
 * to the next theme.
 */
export function ThemeSwitcher({ compact }: { compact: boolean }) {
  const [theme, setTheme] = useTheme()
  const index = Math.max(0, THEMES.findIndex((t) => t.id === theme))
  const current = THEMES[index]

  if (compact) {
    const next = THEMES[(index + 1) % THEMES.length]
    return (
      <button
        type="button"
        onClick={() => setTheme(next.id)}
        title={`Theme: ${current.label}. Click for ${next.label}`}
        aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
        className="hover:bg-hover mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      >
        <Swatch theme={current} className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div role="group" aria-label="Colour theme" className="px-3">
      <div className="text-ink-muted mb-2 text-[11px] font-bold tracking-[0.1em] uppercase">Theme</div>
      <div className="border-sidebar-line flex rounded-lg border bg-black/10 p-0.5">
        {THEMES.map((t) => {
          const active = t.id === theme
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={active}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-surface-hi text-ink shadow-btn-soft ring-line-strong ring-1' : 'text-ink-soft hover:bg-hover hover:text-ink'
              }`}
            >
              <Swatch theme={t} className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
