/** Page title plus a one-line hint. Actions live on the editor toolbar. */
export function ComposerHeader() {
  return (
    <header>
      <h2 className="text-xl font-semibold text-slate-900">Compose</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Write your response and pull in templates from the Utilities panel.
      </p>
    </header>
  )
}
