import { LANGUAGES } from '../casesData'
import type { CaseLanguage } from '../types'

type LanguageToggleProps = {
  language: CaseLanguage
  onChange: (language: CaseLanguage) => void
}

/** Segmented EN / NL / ES switch controlling which template language is inserted. */
export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="flex rounded-md bg-slate-100 p-0.5 text-xs font-medium ring-1 ring-inset ring-black/5">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.id}
          type="button"
          onClick={() => onChange(lang.id)}
          className={`flex-1 rounded px-2 py-1 transition-colors ${
            language === lang.id
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
