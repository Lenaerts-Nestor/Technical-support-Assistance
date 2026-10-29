/**
 * The four weapons: what each button does with them, and how they feel. A weapon is a handful
 * of attack steps per button (`light`, `heavy`, and `close` for the bow's boot), plus whether
 * it can raise a shield. Everything the rules need to know about a weapon is in here.
 */
import type { AttackStep, ComboKind } from './config'

export type WeaponId = 'swordShield' | 'longSword' | 'mace' | 'bow'

export type WeaponDef = {
  id: WeaponId
  name: string
  tagline: string
  /** Short facts for the menu. */
  traits: readonly string[]
  /** Only the sword and shield can raise the shield and parry. */
  canBlock: boolean
  /** With no direction held, a swing turns towards an enemy this close. */
  aimRange: number
  /** The bow's boot: a light press this close to an enemy kicks instead of shooting. */
  closeRange: number
  combos: Record<ComboKind, readonly AttackStep[]>
}

const NONE: readonly AttackStep[] = []

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  swordShield: {
    id: 'swordShield',
    name: 'Sword & Shield',
    tagline: 'Balanced and safe. The only weapon that blocks and parries.',
    traits: ['Quick three-hit combo', 'Raises a shield', 'Parry for a free counter'],
    canBlock: true,
    aimRange: 170,
    closeRange: 0,
    combos: {
      light: [
        { duration: 0.3, hitStart: 0.07, hitEnd: 0.15, cancelAt: 0.2, damage: 10, poise: 8, stamina: 0, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, swing: { from: -1.35, to: 0.95 } },
        { duration: 0.3, hitStart: 0.07, hitEnd: 0.15, cancelAt: 0.2, damage: 10, poise: 8, stamina: 0, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, swing: { from: 1.05, to: -1.25 } },
        { duration: 0.52, hitStart: 0.17, hitEnd: 0.27, cancelAt: 0.52, damage: 16, poise: 14, stamina: 0, reach: 132, knockback: 430, lunge: 270, hitStop: 0.1, shake: 6, swing: { from: -2.3, to: 1.3 } },
      ],
      heavy: [
        { duration: 0.64, hitStart: 0.26, hitEnd: 0.36, cancelAt: 0.46, damage: 26, poise: 40, stamina: 22, reach: 128, knockback: 300, lunge: 190, hitStop: 0.09, shake: 5, swing: { from: -2.45, to: 1.25 } },
        { duration: 0.72, hitStart: 0.24, hitEnd: 0.34, cancelAt: 0.72, damage: 34, poise: 55, stamina: 26, reach: 142, knockback: 540, lunge: 250, hitStop: 0.13, shake: 8, swing: { from: 1.5, to: -2.1 } },
      ],
      close: NONE,
    },
  },

  longSword: {
    id: 'longSword',
    name: 'Long Sword',
    tagline: 'Long reach. Its heavy spin cuts both sides at once.',
    traits: ['Longest melee reach', 'Spin slash hits front and back', 'No shield'],
    canBlock: false,
    aimRange: 200,
    closeRange: 0,
    combos: {
      light: [
        { duration: 0.36, hitStart: 0.1, hitEnd: 0.19, cancelAt: 0.24, damage: 11, poise: 10, stamina: 0, reach: 150, knockback: 200, lunge: 130, hitStop: 0.05, shake: 2, swing: { from: -1.5, to: 1.0 } },
        { duration: 0.36, hitStart: 0.1, hitEnd: 0.19, cancelAt: 0.24, damage: 11, poise: 10, stamina: 0, reach: 150, knockback: 200, lunge: 130, hitStop: 0.05, shake: 2, swing: { from: 1.1, to: -1.3 } },
        { duration: 0.6, hitStart: 0.22, hitEnd: 0.33, cancelAt: 0.6, damage: 19, poise: 18, stamina: 0, reach: 168, knockback: 440, lunge: 280, hitStop: 0.1, shake: 6, swing: { from: -2.4, to: 1.35 } },
      ],
      heavy: [
        { duration: 0.74, hitStart: 0.18, hitEnd: 0.42, cancelAt: 0.5, damage: 24, poise: 38, stamina: 24, reach: 128, knockback: 360, lunge: 0, hitStop: 0.09, shake: 6, swing: { from: -0.4, to: -0.4 }, bothSides: true, motion: 'spin' },
        { duration: 0.62, hitStart: 0.2, hitEnd: 0.3, cancelAt: 0.62, damage: 32, poise: 45, stamina: 22, reach: 220, knockback: 520, lunge: 340, hitStop: 0.12, shake: 7, swing: { from: -0.1, to: -0.1 }, motion: 'thrust' },
      ],
      close: NONE,
    },
  },

  mace: {
    id: 'mace',
    name: 'Spiked Mace',
    tagline: 'Slow and crushing. Breaks the poise of the biggest foes.',
    traits: ['Staggers orcs and ogres fast', 'Heavy slam sends a shockwave', 'Short reach, slow swings'],
    canBlock: false,
    aimRange: 150,
    closeRange: 0,
    combos: {
      light: [
        { duration: 0.44, hitStart: 0.16, hitEnd: 0.26, cancelAt: 0.3, damage: 15, poise: 18, stamina: 0, reach: 105, knockback: 300, lunge: 100, hitStop: 0.07, shake: 4, swing: { from: -1.5, to: 1.1 } },
        { duration: 0.44, hitStart: 0.16, hitEnd: 0.26, cancelAt: 0.3, damage: 15, poise: 18, stamina: 0, reach: 105, knockback: 300, lunge: 100, hitStop: 0.07, shake: 4, swing: { from: 1.2, to: -1.2 } },
        { duration: 0.72, hitStart: 0.28, hitEnd: 0.38, cancelAt: 0.72, damage: 28, poise: 36, stamina: 0, reach: 118, knockback: 560, lunge: 200, hitStop: 0.13, shake: 8, swing: { from: -2.5, to: 1.4 } },
      ],
      heavy: [
        {
          duration: 0.9, hitStart: 0.36, hitEnd: 0.46, cancelAt: 0.6, damage: 36, poise: 70, stamina: 28, reach: 122, knockback: 420, lunge: 120, hitStop: 0.13, shake: 11, swing: { from: -2.7, to: 1.4 },
          wave: { speed: 420, life: 0.5, damage: 20, height: 44, halfWidth: 26, poise: 40, knockback: 360 },
        },
        { duration: 1.0, hitStart: 0.44, hitEnd: 0.54, cancelAt: 1.0, damage: 46, poise: 90, stamina: 34, reach: 135, knockback: 680, lunge: 160, hitStop: 0.17, shake: 12, swing: { from: 1.6, to: -2.3 } },
      ],
      close: NONE,
    },
  },

  bow: {
    id: 'bow',
    name: 'Bow',
    tagline: 'Fight from a distance. Hold heavy to draw a piercing shot.',
    traits: ['Quick arrows from afar', 'Held shot pierces a whole line', 'Kicks enemies that get close'],
    canBlock: false,
    aimRange: 520,
    closeRange: 80,
    combos: {
      light: [
        { duration: 0.42, hitStart: 0.15, hitEnd: 0.15, cancelAt: 0.42, damage: 11, poise: 7, stamina: 0, reach: 0, knockback: 160, lunge: 0, hitStop: 0.02, shake: 0, swing: { from: 0, to: 0 }, projectile: { speed: 950, pierce: 0, life: 1.2 } },
      ],
      heavy: [
        {
          duration: 0.5, hitStart: 0.12, hitEnd: 0.12, cancelAt: 0.5, damage: 52, poise: 60, stamina: 18, reach: 0, knockback: 420, lunge: 0, hitStop: 0.06, shake: 4, swing: { from: 0, to: 0 },
          projectile: { speed: 1250, pierce: 4, life: 1.2 },
          charge: { min: 0.22, max: 0.8, minPower: 0.3 },
        },
      ],
      close: [
        { duration: 0.34, hitStart: 0.08, hitEnd: 0.17, cancelAt: 0.26, damage: 6, poise: 12, stamina: 0, reach: 78, knockback: 440, lunge: 0, hitStop: 0.05, shake: 2, swing: { from: 0, to: 0 }, motion: 'kick' },
      ],
    },
  },
}

export const WEAPON_LIST: readonly WeaponDef[] = [WEAPONS.swordShield, WEAPONS.longSword, WEAPONS.mace, WEAPONS.bow]

/** Which two weapons a new run starts with. */
export const DEFAULT_LOADOUT: readonly [WeaponId, WeaponId] = ['swordShield', 'longSword']
