/** The weapons shown in the loadout menu. Only the sword and shield is in the game so far. */
export type WeaponId = 'swordShield' | 'longSword' | 'mace' | 'bow'

export type WeaponInfo = {
  id: WeaponId
  name: string
  tagline: string
  /** Whether it can be picked yet. */
  available: boolean
}

export const WEAPONS: readonly WeaponInfo[] = [
  { id: 'swordShield', name: 'Sword & Shield', tagline: 'Balanced. The only one that can block and parry.', available: true },
  { id: 'longSword', name: 'Long Sword', tagline: 'Long reach. Its spin cuts both sides at once.', available: false },
  { id: 'mace', name: 'Spiked Mace', tagline: 'Slow and crushing. Staggers the biggest foes.', available: false },
  { id: 'bow', name: 'Bow', tagline: 'Keep your distance. Hold to draw a piercing shot.', available: false },
]
