import { INPUT } from '../../../shared/ui/styles'

type LoginFieldsProps = {
  username: string
  password: string
  onUsername: (username: string) => void
  onPassword: (password: string) => void
}

/** The login for every unit of the group, in one line. The username is remembered; the password lives only until the app closes. */
export function LoginFields({ username, password, onUsername, onPassword }: LoginFieldsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" role="group" aria-label="Login">
      <label className="flex items-center gap-2">
        <span className="text-ink-muted text-xs font-medium">Username</span>
        <input className={`${INPUT} w-36`} value={username} autoComplete="off" spellCheck={false} onChange={(e) => onUsername(e.target.value)} />
      </label>
      <label className="flex items-center gap-2" title="Kept in memory only. It is gone when the app closes.">
        <span className="text-ink-muted text-xs font-medium">Password</span>
        <input className={`${INPUT} w-40`} type="password" value={password} autoComplete="off" onChange={(e) => onPassword(e.target.value)} />
      </label>
    </div>
  )
}
