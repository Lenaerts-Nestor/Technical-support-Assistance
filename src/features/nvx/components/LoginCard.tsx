import { CARD, CARD_HEADER, INPUT, SECTION_LABEL } from '../../../shared/ui/styles'

type LoginCardProps = {
  username: string
  password: string
  onUsername: (username: string) => void
  onPassword: (password: string) => void
}

/** The login for every unit of the group. The username is remembered; the password lives only until the app closes. */
export function LoginCard({ username, password, onUsername, onPassword }: LoginCardProps) {
  return (
    <section className={CARD} aria-label="Login">
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Login for this group</h3>
      </header>
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">Username</span>
          <input className={INPUT} value={username} autoComplete="off" spellCheck={false} onChange={(e) => onUsername(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-ink-muted mb-1 block text-xs font-medium">Password</span>
          <input className={INPUT} type="password" value={password} autoComplete="off" onChange={(e) => onPassword(e.target.value)} />
        </label>
        <p className="text-ink-faint text-xs">The password is kept in memory only and is gone when the app closes.</p>
      </div>
    </section>
  )
}
