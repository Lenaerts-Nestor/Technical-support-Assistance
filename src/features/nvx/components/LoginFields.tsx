import { INPUT } from '../../../shared/ui/styles'

type LoginFieldsProps = {
  username: string
  password: string
  onUsername: (username: string) => void
  onPassword: (password: string) => void
}

/** An input that says it is needed: an amber outline and "Required" until something is typed. */
function Field({ id, label, note, empty, ...input }: { id: string; label: string; note?: string; empty: boolean } & React.ComponentProps<'input'>) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2" title={note}>
        <span className="text-ink-soft text-xs font-bold">{label}</span>
        {empty ? <span className="text-xs font-semibold text-amber-300">Required</span> : note && <span className="text-ink-faint truncate text-xs">{note}</span>}
      </label>
      <input
        id={id}
        {...input}
        required
        aria-invalid={empty}
        autoComplete="off"
        className={`${INPUT} ${empty ? '!border-amber-400/80 ring-2 ring-amber-400/25' : ''}`}
      />
    </div>
  )
}

/**
 * The login for every unit of the group. The username is remembered; the password lives
 * only until the app closes. Both are needed for every request, so an empty one is marked.
 * The ids are what the page's "Take me there" button focuses.
 */
export function LoginFields({ username, password, onUsername, onPassword }: LoginFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Login">
      <Field id="nvx-username" label="Username" note="Remembered" empty={username === ''} value={username} spellCheck={false} onChange={(e) => onUsername(e.target.value)} />
      <Field id="nvx-password" label="Password" note="Memory only" empty={password === ''} type="password" value={password} onChange={(e) => onPassword(e.target.value)} />
    </div>
  )
}
