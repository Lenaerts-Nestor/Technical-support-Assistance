/**
 * The four heroes, one for each character in the sprite packs. A hero is a body (how much
 * health, how fast, how big) and two attack buttons: `light` is a short chain, `heavy` one
 * slower blow that costs stamina and breaks poise. Every blow is tied to one of the character's
 * own attack animations, and the timings are chosen so the slash effect drawn into the sprite
 * appears at the moment the blow lands.
 */
import type { AttackStep, ComboKind } from './config'
import { SPRITES } from './spriteData'
import type { SpriteId } from './spriteData'

export type HeroId = SpriteId

export type HeroDef = {
  id: HeroId
  name: string
  tagline: string
  /** Short facts for the menu. */
  traits: readonly string[]
  /** Arena pixels per pixel of the sprite. */
  scale: number
  hp: number
  speed: number
  /** The size of the body that enemies can hit. */
  halfWidth: number
  height: number
  /** Multiplies what a dash costs in stamina. */
  dashCost: number
  /** Only the soldier can raise a shield and parry. */
  canBlock: boolean
  /** With no direction held, a swing turns towards an enemy this close. */
  aimRange: number
  /** What the two attack buttons are called, for the menu and the controls list. */
  moves: { light: string; heavy: string }
  combos: Record<ComboKind, readonly AttackStep[]>
}

export const HEROES: Record<HeroId, HeroDef> = {
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    tagline: 'Balanced and safe. The only hero with a shield: block, and parry for a free counter.',
    traits: ['Three-hit sword chain ending in a thrust', 'Shield blocks and parries', 'Heavy: a piercing thrust'],
    scale: 6,
    hp: 100,
    speed: 250,
    halfWidth: 22,
    height: 126,
    dashCost: 1,
    canBlock: true,
    aimRange: 170,
    moves: { light: 'sword chain: sweep, rising slash, thrust', heavy: 'piercing thrust' },
    combos: {
      light: [
        { duration: 0.32, hitStart: 0.09, hitEnd: 0.19, cancelAt: 0.22, damage: 10, poise: 8, stamina: 0, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, clip: 'attack01' },
        { duration: 0.32, hitStart: 0.09, hitEnd: 0.19, cancelAt: 0.22, damage: 10, poise: 8, stamina: 0, reach: 116, knockback: 190, lunge: 140, hitStop: 0.045, shake: 2, clip: 'attack02' },
        { duration: 0.46, hitStart: 0.2, hitEnd: 0.3, cancelAt: 0.46, damage: 16, poise: 14, stamina: 0, reach: 150, knockback: 430, lunge: 280, hitStop: 0.1, shake: 6, clip: 'attack03' },
      ],
      heavy: [{ duration: 0.7, hitStart: 0.36, hitEnd: 0.48, cancelAt: 0.7, damage: 28, poise: 55, stamina: 22, reach: 190, knockback: 480, lunge: 360, hitStop: 0.12, shake: 8, clip: 'attack03' }],
    },
  },

  orc: {
    id: 'orc',
    name: 'Orc',
    tagline: 'A slow, heavy axe. Tougher than the rest, and its slam sends a shockwave along the ground.',
    traits: ['The most health', 'Axe chop and overhead slam', 'Heavy: a slam with a shockwave'],
    scale: 8,
    hp: 130,
    speed: 215,
    halfWidth: 30,
    height: 120,
    dashCost: 1,
    canBlock: false,
    aimRange: 150,
    moves: { light: 'axe chop, then overhead slam', heavy: 'slam that sends a shockwave' },
    combos: {
      light: [
        { duration: 0.46, hitStart: 0.17, hitEnd: 0.3, cancelAt: 0.3, damage: 14, poise: 16, stamina: 0, reach: 112, knockback: 280, lunge: 90, hitStop: 0.07, shake: 4, clip: 'attack01' },
        { duration: 0.52, hitStart: 0.2, hitEnd: 0.33, cancelAt: 0.52, damage: 18, poise: 22, stamina: 0, reach: 116, knockback: 360, lunge: 100, hitStop: 0.09, shake: 6, clip: 'attack02' },
      ],
      heavy: [
        {
          duration: 0.86, hitStart: 0.44, hitEnd: 0.56, cancelAt: 0.86, damage: 38, poise: 75, stamina: 28, reach: 120, knockback: 460, lunge: 100, hitStop: 0.13, shake: 11, clip: 'attack02',
          wave: { speed: 420, life: 0.5, damage: 20, height: 44, halfWidth: 26, poise: 40, knockback: 360 },
        },
      ],
    },
  },

  demon: {
    id: 'demon',
    name: 'Demon',
    tagline: 'Fast, with a long blade. Lunges across the arena, and its heavy rush cannot be touched.',
    traits: ['Quickest on its feet', 'Long-reach lunges', 'Heavy: a rush you cannot be hit during'],
    scale: 6,
    hp: 90,
    speed: 280,
    halfWidth: 24,
    height: 120,
    dashCost: 0.75,
    canBlock: false,
    aimRange: 200,
    moves: { light: 'lunging thrust, then a sweep', heavy: 'rush through enemies' },
    combos: {
      light: [
        { duration: 0.34, hitStart: 0.1, hitEnd: 0.22, cancelAt: 0.22, damage: 9, poise: 8, stamina: 0, reach: 140, knockback: 170, lunge: 330, hitStop: 0.04, shake: 2, clip: 'attack01' },
        { duration: 0.32, hitStart: 0.09, hitEnd: 0.2, cancelAt: 0.2, damage: 11, poise: 10, stamina: 0, reach: 120, knockback: 200, lunge: 160, hitStop: 0.045, shake: 2, clip: 'attack02' },
      ],
      heavy: [{ duration: 0.62, hitStart: 0.22, hitEnd: 0.42, cancelAt: 0.62, damage: 24, poise: 45, stamina: 22, reach: 150, knockback: 380, lunge: 700, hitStop: 0.1, shake: 7, clip: 'attack01', rush: true }],
    },
  },

  monster: {
    id: 'monster',
    name: 'Blood Monster',
    tagline: 'Low and wide, so harder to hit. Claws up close and pounces on whatever is further away.',
    traits: ['A small target', 'Claw swipe, then a pounce', 'Heavy: a long leaping pounce'],
    scale: 7,
    hp: 100,
    speed: 245,
    halfWidth: 36,
    height: 105,
    dashCost: 1,
    canBlock: false,
    aimRange: 190,
    moves: { light: 'claw swipe, then a pounce', heavy: 'long leaping pounce' },
    combos: {
      light: [
        { duration: 0.38, hitStart: 0.14, hitEnd: 0.26, cancelAt: 0.26, damage: 10, poise: 8, stamina: 0, reach: 112, knockback: 200, lunge: 120, hitStop: 0.05, shake: 3, clip: 'attack01' },
        { duration: 0.44, hitStart: 0.2, hitEnd: 0.32, cancelAt: 0.44, damage: 13, poise: 12, stamina: 0, reach: 124, knockback: 260, lunge: 330, hitStop: 0.06, shake: 4, clip: 'attack02', hop: 380 },
      ],
      heavy: [{ duration: 0.7, hitStart: 0.3, hitEnd: 0.5, cancelAt: 0.7, damage: 30, poise: 60, stamina: 24, reach: 132, knockback: 460, lunge: 430, hitStop: 0.11, shake: 8, clip: 'attack02', hop: 560 }],
    },
  },
}

export const HERO_LIST: readonly HeroDef[] = [HEROES.soldier, HEROES.orc, HEROES.demon, HEROES.monster]

export const DEFAULT_HERO: HeroId = 'soldier'

export const isHeroId = (value: unknown): value is HeroId => typeof value === 'string' && value in HEROES

/** Whether the hero's sprite has this attack animation (the soldier alone has three). */
export const hasClip = (hero: HeroId, clip: string) => clip in SPRITES[hero].phases
