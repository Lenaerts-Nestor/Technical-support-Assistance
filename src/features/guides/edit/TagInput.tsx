import { useState } from 'react'
import { XIcon } from '../components/icons'

type TagInputProps = {
  tags: string[]
  onAdd: (value: string) => void
  onRemove: (tag: string) => void
}

/** Chip list + free-text entry. Enter or comma commits; Backspace on empty removes the last. */
export function TagInput({ tags, onAdd, onRemove }: TagInputProps) {
  const [value, setValue] = useState('')

  const commit = () => {
    onAdd(value)
    setValue('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            aria-label={`Remove ${tag}`}
            className="text-slate-400 hover:text-slate-700"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Backspace' && !value && tags.length > 0) {
            onRemove(tags[tags.length - 1])
          }
        }}
        onBlur={() => value.trim() && commit()}
        placeholder="Add tag, press Enter…"
        className="min-w-[140px] flex-1 bg-transparent py-0.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  )
}
