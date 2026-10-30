/**
 * What each kind of enemy looks like. The demons of the Tiny RPG pack are the main crowd, the
 * Shadeflit of the SHADOW Series is the lancer, and the soldier and orc of the first pack are
 * the archer and the brute. Some kinds have a second look, and the boss wears a different one in
 * every place.
 */
import type { EnemyKind } from './config'
import type { SpriteId } from './spriteData'

export type EnemyLook = {
  name: string
  sprite: SpriteId
  /** Arena pixels per pixel of the sprite. */
  scale: number
  /** A CSS colour filter laid over the sheets, to tell a look apart from another on the same sprite. */
  filter?: string
  /** The move (`SpriteInfo.moves`) its attack plays. */
  melee: string
  /** For a boss: the move of each of its attacks, and the frame held while it roars. */
  boss?: { slam: string; charge: string; roar: string; roarFrame: number }
}

export const ENEMY_LOOKS: Record<EnemyKind, readonly EnemyLook[]> = {
  imp: [
    { name: 'Imp', sprite: 'demon', scale: 3, melee: 'thrust' },
    { name: 'Bloodling', sprite: 'monster', scale: 4, melee: 'pounce' },
  ],
  demon: [
    { name: 'Demon', sprite: 'demon', scale: 4.4, melee: 'slash' },
    { name: 'Ash Demon', sprite: 'demon', scale: 4.4, filter: 'grayscale(0.7) brightness(0.75) contrast(1.2)', melee: 'thrust' },
  ],
  lancer: [{ name: 'Shadeflit', sprite: 'flit', scale: 2.2, melee: 'lance' }],
  archer: [{ name: 'Deserter', sprite: 'soldier', scale: 4, filter: 'brightness(0.72) saturate(0.55)', melee: 'shoot' }],
  brute: [
    { name: 'Orc Brute', sprite: 'orc', scale: 6.5, melee: 'slam' },
    { name: 'Blood Hulk', sprite: 'monster', scale: 7.5, melee: 'claw' },
  ],
  warlord: [
    { name: 'Demon Lord', sprite: 'demon', scale: 6.5, melee: 'slash', boss: { slam: 'slash', charge: 'thrust', roar: 'slash', roarFrame: 1 } },
    { name: 'Blood Colossus', sprite: 'monster', scale: 8.5, melee: 'claw', boss: { slam: 'claw', charge: 'pounce', roar: 'claw', roarFrame: 3 } },
    { name: 'Orc Warchief', sprite: 'orc', scale: 8.5, melee: 'slam', boss: { slam: 'slam', charge: 'chop', roar: 'slam', roarFrame: 1 } },
  ],
}

/** Which of the boss's looks a boss round gets: a different one for each place in turn. */
export const bossVariantFor = (round: number, bossEvery = 5) => Math.max(0, Math.floor(round / bossEvery) - 1) % ENEMY_LOOKS.warlord.length

export const lookOf = (kind: EnemyKind, variant: number): EnemyLook => ENEMY_LOOKS[kind][variant % ENEMY_LOOKS[kind].length]
