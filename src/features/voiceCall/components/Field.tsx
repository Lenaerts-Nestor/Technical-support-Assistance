type FieldProps = React.InputHTMLAttributes<HTMLInputElement>

/** Shared single-line text input used by the product rows and signal-path nodes. */
export function Field({ className, ...props }: FieldProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 ${className ?? ''}`}
    />
  )
}
