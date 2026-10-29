/**
 * What each kind of enemy looks like. The same four characters that can be played are the
 * enemies too, at different sizes, so each kind has a few looks to be told apart by, and an
 * enemy wears one of them. The boss wears a different one in every biome.
 */
import type { AttackClip, EnemyKind } from './config'
import type { SpriteId } from './spriteData'

export type EnemyLook = {
  name: string
  sprite: SpriteId
  /** Arena pixels per pixel of the sprite. */
  scale: number
  /** The animation a leap, chop or slam plays. */
  melee: AttackClip
  /** For a boss: the animation of each move, and the frame of the roar. */
  boss?: { slam: AttackClip; charge: AttackClip; roar: AttackClip; roarFrame: number }
}

export const ENEMY_LOOKS: Record<EnemyKind, readonly EnemyLook[]> = {
  goblin: [
    { name: 'Goblin', sprite: 'orc', scale: 5, melee: 'attack01' },
    { name: 'Imp', sprite: 'demon', scale: 4, melee: 'attack02' },
  ],
  orc: [
    { name: 'Raider', sprite: 'soldier', scale: 7, melee: 'attack01' },
    { name: 'Fiend', sprite: 'demon', scale: 7, melee: 'attack02' },
  ],
  ogre: [
    { name: 'Crawler', sprite: 'monster', scale: 9, melee: 'attack01' },
    { name: 'Brute', sprite: 'orc', scale: 10, melee: 'attack02' },
  ],
  warlord: [
    { name: 'Demon Lord', sprite: 'demon', scale: 10, melee: 'attack02', boss: { slam: 'attack02', charge: 'attack01', roar: 'attack02', roarFrame: 1 } },
    { name: 'Blood Colossus', sprite: 'monster', scale: 13, melee: 'attack01', boss: { slam: 'attack01', charge: 'attack02', roar: 'attack01', roarFrame: 3 } },
    { name: 'Orc Warchief', sprite: 'orc', scale: 13, melee: 'attack02', boss: { slam: 'attack02', charge: 'attack01', roar: 'attack02', roarFrame: 1 } },
  ],
}

/** Which of the boss's looks a boss round gets: a different one for each biome in turn. */
export const bossVariantFor = (round: number, bossEvery = 5) => Math.max(0, Math.floor(round / bossEvery) - 1) % ENEMY_LOOKS.warlord.length

export const lookOf = (kind: EnemyKind, variant: number): EnemyLook => ENEMY_LOOKS[kind][variant % ENEMY_LOOKS[kind].length]
