import { THEMES } from './themes'
import { useTheme } from './useTheme'
import { ICON_BASE } from '../ui/iconBase'
import type { ThemeId } from './themes'

/** The icon names the theme it switches TO: a sun leads to the light theme, a moon to the dark one. */
const TARGET_ICON: Record<ThemeId, React.ReactElement> = {
  parchment: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  dark: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
}

/**
 * Switches between the colour themes with one icon button: it shows the theme you would switch
 * to and says so in its tooltip and label. With two themes it is a plain toggle; with more it steps
 * to the next one.
 */
export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme()
  const index = Math.max(0, THEMES.findIndex((t) => t.id === theme))
  const current = THEMES[index]
  const next = THEMES[(index + 1) % THEMES.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next.id)}
      title={`Theme: ${current.label}. Switch to ${next.label}`}
      aria-label={`Colour theme: ${current.label}. Switch to ${next.label}`}
      className={`border-line-strong bg-surface-hi text-ink-soft hover:border-brand-line hover:bg-subtle hover:text-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${className}`}
    >
      <svg {...ICON_BASE} strokeWidth={1.9} className="h-[18px] w-[18px]" aria-hidden="true">
        {TARGET_ICON[next.id]}
      </svg>
    </button>
  )
}
