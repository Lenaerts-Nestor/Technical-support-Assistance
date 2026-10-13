import { useState } from 'react'
import type { FormEvent } from 'react'
import { GHOST_BTN, INPUT, PRIMARY_BTN } from '../../../shared/ui/styles'

type LinkFormProps = {
  /** `false` for a folder / section name, which has no address. */
  withUrl?: boolean
  initialLabel?: string
  initialUrl?: string
  labelPlaceholder: string
  submitLabel: string
  /** Return `false` to keep the form open (an unusable URL). */
  onSubmit: (label: string, url: string) => boolean | void
  onCancel: () => void
}

/** Small inline form shared by "add link", "add folder", "add section" and every rename. */
export function LinkForm({
  withUrl = true,
  initialLabel = '',
  initialUrl = '',
  labelPlaceholder,
  submitLabel,
  onSubmit,
  onCancel,
}: LinkFormProps) {
  const [label, setLabel] = useState(initialLabel)
  const [url, setUrl] = useState(initialUrl)
  const [invalid, setInvalid] = useState(false)

  const ready = withUrl ? url.trim() !== '' : label.trim() !== ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    if (onSubmit(label.trim(), url.trim()) === false) setInvalid(true)
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), onCancel())}
      className="border-line bg-subtle space-y-2 rounded-lg border p-2.5"
    >
      <input
        className={INPUT}
        placeholder={labelPlaceholder}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
      />
      {withUrl && (
        <div>
          <input
            className={INPUT}
            placeholder="https://…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setInvalid(false)
            }}
            aria-invalid={invalid}
            inputMode="url"
          />
          {invalid && (
            <p className="mt-1 text-xs text-rose-300">
              That doesn't look like a web address (http, https or mailto).
            </p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={GHOST_BTN} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${PRIMARY_BTN} !px-3 !py-1 !text-xs`} disabled={!ready}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
