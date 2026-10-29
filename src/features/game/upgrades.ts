/**
 * The upgrades offered between rounds. Each one is a small change to a set of multipliers
 * (`Mods`) the rules read, so adding one is a matter of adding a row here. Picks last for
 * the run only: a new game starts from the base values again.
 */

export type UpgradeId =
  | 'whetstone'
  | 'hardened'
  | 'executioner'
  | 'skullcracker'
  | 'ironSkin'
  | 'bulwark'
  | 'keenEye'
  | 'riposte'
  | 'lungs'
  | 'recovery'
  | 'lightFeet'
  | 'fleet'
  | 'reaper'
  | 'momentum'
  | 'phoenix'

export type Category = 'offense' | 'defense' | 'stamina' | 'utility'

/** Everything an upgrade can change. The base values are the game as it plays with none. */
export type Mods = {
  /** Multiplies all damage dealt. */
  damage: number
  /** Extra multiplier for the last hit of a combo. */
  finisher: number
  /** Multiplies poise damage dealt. */
  poise: number
  maxHp: number
  maxStamina: number
  staminaRegen: number
  dashCooldown: number
  dashCost: number
  /** Seconds added to the parry window. */
  parryWindow: number
  parryHeal: number
  parryStamina: number
  /** Multiplies what blocking costs in stamina. */
  blockCost: number
  healOnKill: number
  moveSpeed: number
  /** Multiplies damage taken. */
  damageTaken: number
  /** Extra seconds the kill streak stays alive. */
  streakTime: number
  /** Fatal blows survived (once each). */
  revive: number
}

export const BASE_MODS: Readonly<Mods> = {
  damage: 1,
  finisher: 1,
  poise: 1,
  maxHp: 0,
  maxStamina: 0,
  staminaRegen: 1,
  dashCooldown: 1,
  dashCost: 1,
  parryWindow: 0,
  parryHeal: 0,
  parryStamina: 0,
  blockCost: 1,
  healOnKill: 0,
  moveSpeed: 1,
  damageTaken: 1,
  streakTime: 0,
  revive: 0,
}

export type Upgrade = {
  id: UpgradeId
  name: string
  category: Category
  /** What one level does, in a short sentence. */
  text: string
  /** How many times it can be taken. */
  max: number
  /** How likely it is to be offered, relative to the others. */
  weight: number
  apply: (mods: Mods) => void
}

export const UPGRADES: readonly Upgrade[] = [
  { id: 'whetstone', name: 'Whetstone', category: 'offense', text: '+15% damage', max: 5, weight: 10, apply: (m) => void (m.damage += 0.15) },
  { id: 'executioner', name: 'Executioner', category: 'offense', text: 'Combo finishers hit 35% harder', max: 3, weight: 8, apply: (m) => void (m.finisher += 0.35) },
  { id: 'skullcracker', name: 'Skullcracker', category: 'offense', text: '+30% poise damage: staggers big foes sooner', max: 3, weight: 8, apply: (m) => void (m.poise += 0.3) },
  { id: 'hardened', name: 'Battle Hardened', category: 'defense', text: '+20 maximum health, and heal 20', max: 5, weight: 10, apply: (m) => void (m.maxHp += 20) },
  { id: 'ironSkin', name: 'Iron Skin', category: 'defense', text: 'Take 10% less damage', max: 4, weight: 8, apply: (m) => void (m.damageTaken -= 0.1) },
  { id: 'bulwark', name: 'Bulwark', category: 'defense', text: 'Blocking costs 20% less stamina', max: 3, weight: 8, apply: (m) => void (m.blockCost -= 0.2) },
  { id: 'keenEye', name: 'Keen Eye', category: 'defense', text: 'The parry window is 0.05s longer', max: 3, weight: 8, apply: (m) => void (m.parryWindow += 0.05) },
  { id: 'riposte', name: 'Riposte', category: 'defense', text: 'A parry heals 6 and refunds 8 more stamina', max: 3, weight: 7, apply: (m) => void ((m.parryHeal += 6), (m.parryStamina += 8)) },
  { id: 'lungs', name: 'Deep Lungs', category: 'stamina', text: '+20 maximum stamina', max: 4, weight: 9, apply: (m) => void (m.maxStamina += 20) },
  { id: 'recovery', name: 'Second Wind', category: 'stamina', text: 'Stamina comes back 25% faster', max: 4, weight: 9, apply: (m) => void (m.staminaRegen += 0.25) },
  { id: 'lightFeet', name: 'Light Feet', category: 'stamina', text: 'Dashing costs 20% less and recovers 20% faster', max: 3, weight: 8, apply: (m) => void ((m.dashCost -= 0.2), (m.dashCooldown -= 0.2)) },
  { id: 'fleet', name: 'Fleet Boots', category: 'utility', text: 'Walk 8% faster', max: 3, weight: 7, apply: (m) => void (m.moveSpeed += 0.08) },
  { id: 'reaper', name: 'Reaper', category: 'utility', text: 'Heal 3 health for every kill', max: 4, weight: 8, apply: (m) => void (m.healOnKill += 3) },
  { id: 'momentum', name: 'Momentum', category: 'utility', text: 'The kill streak lasts 1.5s longer', max: 3, weight: 7, apply: (m) => void (m.streakTime += 1.5) },
  { id: 'phoenix', name: 'Phoenix Feather', category: 'utility', text: 'Survive one fatal blow, with a third of your health', max: 1, weight: 3, apply: (m) => void (m.revive += 1) },
]

export type Picks = Partial<Record<UpgradeId, number>>

export const upgradeById = (id: UpgradeId) => UPGRADES.find((u) => u.id === id) as Upgrade

/** The multipliers that result from a set of picks. */
export function computeMods(picks: Picks): Mods {
  const mods = { ...BASE_MODS }
  for (const upgrade of UPGRADES) {
    for (let i = 0; i < (picks[upgrade.id] ?? 0); i++) upgrade.apply(mods)
  }
  return mods
}

/** `count` different upgrades that are not yet maxed, chosen by weight. */
const SHIELD_UPGRADES: readonly UpgradeId[] = ['bulwark', 'keenEye', 'riposte']

/** `canBlock`: whether the hero has a shield; the shield upgrades are left out when not. */
export function offerUpgrades(picks: Picks, rng: () => number, count = 3, canBlock = true): UpgradeId[] {
  const pool = UPGRADES.filter((u) => (picks[u.id] ?? 0) < u.max && (canBlock || !SHIELD_UPGRADES.includes(u.id)))
  const offer: UpgradeId[] = []
  while (offer.length < count && pool.length > 0) {
    let roll = rng() * pool.reduce((sum, u) => sum + u.weight, 0)
    let index = pool.findIndex((u) => (roll -= u.weight) < 0)
    if (index < 0) index = pool.length - 1
    offer.push(pool[index].id)
    pool.splice(index, 1)
  }
  return offer
}
