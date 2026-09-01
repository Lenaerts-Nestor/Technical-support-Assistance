import { LANGUAGES } from '../casesData'
import type { CaseLanguage } from '../types'

type LanguageToggleProps = {
  language: CaseLanguage
  onChange: (language: CaseLanguage) => void
}

/** Segmented EN / NL / ES switch controlling which template language is inserted. */
export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="border-line bg-canvas flex rounded-lg border p-0.5 text-xs font-semibold">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => onChange(lang.id)}
          className={`flex-1 rounded-md px-2 py-1.5 transition-colors ${
            language === lang.id
              ? 'bg-brand text-on-brand'
              : 'text-ink-muted hover:bg-subtle hover:text-ink'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
