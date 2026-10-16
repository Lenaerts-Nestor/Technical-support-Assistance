/**
 * A little gallery of Giphy embeds that fills the empty stretch of the sidebar
 * between the working pages and Sync.
 *
 * The embeds are cross-origin iframes, so their background can't be made
 * transparent from here. Each one is clipped to a rounded tile instead, so the
 * corners sit softly against the sidebar.
 */
const MASCOTS: { id: string; title: string }[] = [
  { id: 'Dhk5v5SodlCjEwezyv', title: 'Sassy sad frog' },
  { id: 'Qfgzfy2NB5inbqFOkC', title: 'Sad Pepe' },
  { id: 'SHqHAMc99Qp9wtEsQP', title: 'Sadness' },
  { id: 'ssZGnMX7oD6lkn4hIN', title: 'Pepe the frog throwing it back' },
  { id: 'oxepJEnraGSaRinMUW', title: 'Frogs in the rain' },
]

export function SidebarMascots() {
  return (
    <div
      aria-label="Decorations"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Even square tiles, centred in the free space; an odd last tile sits in the middle. */}
      <div className="my-auto grid grid-cols-2 gap-2">
        {MASCOTS.map(({ id, title }) => (
          <div
            key={id}
            className="bg-subtle aspect-square overflow-hidden rounded-2xl last:odd:col-span-2 last:odd:mx-auto last:odd:w-[calc(50%-0.25rem)]"
          >
            <iframe
              src={`https://giphy.com/embed/${id}`}
              title={title}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              tabIndex={-1}
              className="pointer-events-none h-full w-full border-0"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
