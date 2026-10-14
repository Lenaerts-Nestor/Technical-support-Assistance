import { useRef } from 'react'
import type { ReactNode } from 'react'
import { GHOST_BTN_MD } from '../../../shared/ui/styles'

type FileButtonProps = {
  accept: string
  onFile: (file: File) => void
  disabled?: boolean
  title?: string
  children: ReactNode
}

/** A button that opens the file picker; the chosen file is handed to `onFile` and the input is reset. */
export function FileButton({ accept, onFile, disabled, title, children }: FileButtonProps) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={title}
        onClick={() => ref.current?.click()}
        className={GHOST_BTN_MD}
      >
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </>
  )
}
