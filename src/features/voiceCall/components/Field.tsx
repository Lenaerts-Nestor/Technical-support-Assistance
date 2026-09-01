import { INPUT_LG } from '../../../shared/ui/styles'

type FieldProps = React.InputHTMLAttributes<HTMLInputElement>

/** Shared single-line text input used by the product rows and signal-path nodes. */
export function Field({ className, ...props }: FieldProps) {
  return <input {...props} className={`${INPUT_LG} ${className ?? ''}`} />
}
