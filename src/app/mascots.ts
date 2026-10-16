/** The sidebar's pool of embedded GIFs. `src` doubles as the stable id. */
export type Mascot = { src: string; title: string }

const giphy = (id: string) => `https://giphy.com/embed/${id}`
// What Tenor's embed.js builds from the "tenor-gif-embed" snippet, without its script.
const tenor = (id: string) => `https://tenor.com/embed/${id}`

export const MASCOTS: readonly Mascot[] = [
  { src: giphy('Dhk5v5SodlCjEwezyv'), title: 'Sassy sad frog' },
  { src: giphy('Qfgzfy2NB5inbqFOkC'), title: 'Sad Pepe' },
  { src: giphy('SHqHAMc99Qp9wtEsQP'), title: 'Sadness' },
  { src: giphy('ssZGnMX7oD6lkn4hIN'), title: 'Pepe the frog throwing it back' },
  { src: giphy('oxepJEnraGSaRinMUW'), title: 'Frogs in the rain' },
  { src: tenor('15495250134764203639'), title: "I'm sorry frog" },
  { src: tenor('27279924'), title: 'Worry him frog' },
  { src: tenor('2619942249443391928'), title: 'Worried froge' },
  { src: tenor('15424500876455105492'), title: 'Concerned froge' },
  { src: tenor('8435336107615142483'), title: 'Worried froge in a hoodie' },
]

/**
 * Which of `count` mascots a given day gets. Hashing the date (rather than
 * calling `Math.random`) keeps the pick stable all day and across reloads, yet
 * it looks random from one day to the next.
 */
export function dailyIndex(iso: string, count: number): number {
  let hash = 2166136261
  for (let i = 0; i < iso.length; i++) {
    hash = Math.imul(hash ^ iso.charCodeAt(i), 16777619)
  }
  return (hash >>> 0) % count
}

/** The mascot to show: the user's choice if it still exists, else today's pick. */
export function pickMascot(pool: readonly Mascot[], choice: string | null, today: string): Mascot {
  return pool.find((m) => m.src === choice) ?? pool[dailyIndex(today, pool.length)]
}

/** The mascot `step` places along from `current`, wrapping at either end. */
export function stepMascot(pool: readonly Mascot[], current: Mascot, step: number): Mascot {
  const at = pool.indexOf(current)
  return pool[(at + step + pool.length) % pool.length]
}
