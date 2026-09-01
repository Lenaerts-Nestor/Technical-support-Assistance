import { PAGE_SUBTITLE, PAGE_TITLE } from '../../../shared/ui/styles'

/** Page title plus a one-line hint. Actions live on the editor toolbar. */
export function ComposerHeader() {
  return (
    <header>
      <h2 className={PAGE_TITLE}>Compose</h2>
      <p className={PAGE_SUBTITLE}>
        Write your response and pull in templates from the Utilities panel.
      </p>
    </header>
  )
}
