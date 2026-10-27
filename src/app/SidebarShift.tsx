import { useSharedShift } from '../features/shift/sharedShiftContext'

/** "YOU ARE ON SHIFT 1", under the clock, once today's shifts are published and the user has said who they are. */
export function SidebarShift({ compact }: { compact: boolean }) {
  const { myShift } = useSharedShift()
  if (!myShift) return null
  const text = `You are on Shift ${myShift}`
  return compact ? (
    <p
      role="status"
      title={text}
      aria-label={text}
      className="bg-brand-soft text-brand-strong ring-brand/30 mb-3 rounded-md px-1.5 py-1 text-center text-xs leading-none font-extrabold ring-1"
    >
      S{myShift}
    </p>
  ) : (
    <p
      role="status"
      className="bg-brand-soft text-brand-strong ring-brand/30 mx-3 -mt-2 mb-4 rounded-lg px-3 py-2 text-sm leading-tight font-extrabold tracking-wide uppercase ring-1"
    >
      {text}
    </p>
  )
}
