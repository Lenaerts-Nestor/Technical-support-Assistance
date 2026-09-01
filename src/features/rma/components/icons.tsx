type IconProps = { className?: string }

const Icon = ({ className, d }: IconProps & { d: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
)

export const CopyIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M9 2h8a3 3 0 0 1 3 3v10h-2V5a1 1 0 0 0-1-1H9V2Zm-4 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 2v12h8V8H5Z"
  />
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p} d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
)

export const TrashIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M9 3h6l1 2h4v2H4V5h4l1-2ZM6 9h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9Z"
  />
)

export const ExternalLinkIcon = (p: IconProps) => (
  <Icon
    {...p}
    d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h5v2H6v11h11v-4h2v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
  />
)
