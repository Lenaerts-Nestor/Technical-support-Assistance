/**
 * A little gallery of Giphy and Tenor embeds that fills the empty stretch of the sidebar
 * between the working pages and Sync.
 *
 * The embeds are cross-origin iframes, so their background can't be made
 * transparent from here. Each one is clipped to a rounded tile instead, so the
 * corners sit softly against the sidebar.
 */
const giphy = (id: string) => `https://giphy.com/embed/${id}`
// What Tenor's embed.js builds from the "tenor-gif-embed" snippet, without its script.
const tenor = (id: string) => `https://tenor.com/embed/${id}`

const MASCOTS: { src: string; title: string }[] = [
  { src: giphy('Dhk5v5SodlCjEwezyv'), title: 'Sassy sad frog' },
  { src: giphy('Qfgzfy2NB5inbqFOkC'), title: 'Sad Pepe' },
  { src: giphy('SHqHAMc99Qp9wtEsQP'), title: 'Sadness' },
  { src: giphy('ssZGnMX7oD6lkn4hIN'), title: 'Pepe the frog throwing it back' },
  { src: giphy('oxepJEnraGSaRinMUW'), title: 'Frogs in the rain' },
  { src: tenor('15495250134764203639'), title: "I'm sorry frog" },
]

export function SidebarMascots() {
  return (
    <div
      aria-label="Decorations"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Even square tiles, centred in the free space; an odd last tile sits in the middle. */}
      <div className="my-auto grid grid-cols-2 gap-2">
        {MASCOTS.map(({ src, title }) => (
          <div
            key={src}
            className="bg-subtle aspect-square overflow-hidden rounded-2xl last:odd:col-span-2 last:odd:mx-auto last:odd:w-[calc(50%-0.25rem)]"
          >
            <iframe
              src={src}
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
