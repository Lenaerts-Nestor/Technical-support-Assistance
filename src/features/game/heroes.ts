/**
 * The three heroes, the characters of the SHADOW Series pack. A hero is a body (how much health,
 * how fast, how big) and its moves: `light` is a short chain, `heavy` one slower blow that costs
 * stamina and breaks poise, and some have blows of their own in the air or out of a dash. Every
 * blow is tied to one of the character's own attack animations, and the timings are chosen so
 * the slash drawn into the sprite appears at the moment the blow lands.
 */
import type { AttackStep, ComboKind } from './config'
import { SPRITES } from './spriteData'

export type HeroId = 'huntress' | 'hallokin' | 'warden'

/** The blows a hero has besides the two chains. */
export type SpecialKind = Exclude<ComboKind, 'light' | 'heavy'>

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
  /** Extra jumps in the air before landing again. */
  airJumps: number
  /** Only the Warden can guard (curled up) and parry. */
  canBlock: boolean
  /** With no direction held, a swing turns towards an enemy this close. */
  aimRange: number
  /** What the moves are called, for the menu and the controls list. */
  moves: { light: string; heavy: string; air?: string; dash?: string }
  combos: { light: readonly AttackStep[]; heavy: readonly AttackStep[] }
  special: Partial<Record<SpecialKind, AttackStep>>
}

export const HEROES: Record<HeroId, HeroDef> = {
  huntress: {
    id: 'huntress',
    name: 'Blind Huntress',
    tagline: 'Quick and far-reaching. Strikes out of her dash, cuts upward in a jump and dives blade-first onto what is below.',
    traits: ['Long, fast blade', 'Dash into a cutting lunge', 'Dive attack bounces off enemies'],
    scale: 2.25,
    hp: 95,
    speed: 300,
    halfWidth: 18,
    height: 82,
    dashCost: 0.85,
    airJumps: 0,
    canBlock: false,
    aimRange: 200,
    moves: { light: 'cut, then a reaping slash', heavy: 'phantom dash: cuts through and cannot be hit', air: 'rising cut, or hold S to dive', dash: 'dash cut' },
    combos: {
      light: [
        { duration: 0.3, hitStart: 0.05, hitEnd: 0.14, cancelAt: 0.18, damage: 11, poise: 9, stamina: 0, reach: 165, knockback: 180, lunge: 120, hitStop: 0.045, shake: 2, move: 'cut' },
        { duration: 0.44, hitStart: 0.12, hitEnd: 0.26, cancelAt: 0.44, damage: 15, poise: 14, stamina: 0, reach: 120, back: 30, rise: 30, knockback: 360, lunge: 220, hitStop: 0.08, shake: 5, move: 'reap' },
      ],
      heavy: [{ duration: 0.62, hitStart: 0.12, hitEnd: 0.4, cancelAt: 0.62, damage: 26, poise: 50, stamina: 24, reach: 190, knockback: 420, lunge: 760, hitStop: 0.1, shake: 7, move: 'phantom', rush: true }],
    },
    special: {
      dashAttack: { duration: 0.36, hitStart: 0.04, hitEnd: 0.16, cancelAt: 0.3, damage: 14, poise: 14, stamina: 0, reach: 180, knockback: 280, lunge: 520, hitStop: 0.06, shake: 3, move: 'dashCut' },
      airUp: { duration: 0.4, hitStart: 0.07, hitEnd: 0.22, cancelAt: 0.32, damage: 12, poise: 12, stamina: 0, reach: 70, back: 30, rise: 110, knockback: 220, lunge: 0, hitStop: 0.05, shake: 3, move: 'rising', hop: 260 },
      airDown: { duration: 0.6, hitStart: 0.06, hitEnd: 0.6, cancelAt: 0.6, damage: 16, poise: 18, stamina: 0, reach: 40, back: 40, below: 70, knockback: 160, lunge: 0, hitStop: 0.06, shake: 4, move: 'plunge', plunge: 1100, bounce: 720 },
    },
  },

  hallokin: {
    id: 'hallokin',
    name: 'Hallokin',
    tagline: 'A small, nimble ember. Jumps twice, slashes fire ahead of it and raises a pillar of flame that reaches the ledge above.',
    traits: ['Small target, double jump', 'Fiery forward slashes', 'Heavy: a flame pillar that hits high'],
    scale: 3.25,
    hp: 80,
    speed: 290,
    halfWidth: 16,
    height: 64,
    dashCost: 0.75,
    airJumps: 1,
    canBlock: false,
    aimRange: 170,
    moves: { light: 'ember slash, twice', heavy: 'flame pillar straight up', air: 'comet strike ahead' },
    combos: {
      light: [
        { duration: 0.34, hitStart: 0.1, hitEnd: 0.2, cancelAt: 0.22, damage: 9, poise: 8, stamina: 0, reach: 112, knockback: 180, lunge: 220, hitStop: 0.04, shake: 2, move: 'ember' },
        { duration: 0.4, hitStart: 0.1, hitEnd: 0.22, cancelAt: 0.4, damage: 13, poise: 13, stamina: 0, reach: 118, knockback: 320, lunge: 320, hitStop: 0.07, shake: 4, move: 'ember' },
      ],
      heavy: [{ duration: 0.6, hitStart: 0.2, hitEnd: 0.42, cancelAt: 0.6, damage: 24, poise: 45, stamina: 20, reach: 56, back: 40, rise: 130, knockback: 260, lunge: 0, hitStop: 0.1, shake: 7, move: 'pillar' }],
    },
    special: {
      airForward: { duration: 0.42, hitStart: 0.06, hitEnd: 0.24, cancelAt: 0.34, damage: 12, poise: 12, stamina: 0, reach: 116, below: 20, knockback: 260, lunge: 380, hitStop: 0.05, shake: 3, move: 'comet', hop: 180 },
    },
  },

  warden: {
    id: 'warden',
    name: 'Wetlands Warden',
    tagline: 'Big, slow and hard to put down. Sweeps wide, cuts up at the ledge above, whips its tail behind it, and curls up to guard and parry.',
    traits: ['The most health, and a guard', 'Wide sweep, uppercut, tail whip', 'Heavy: a rolling charge that bursts'],
    scale: 1.75,
    hp: 140,
    speed: 225,
    halfWidth: 30,
    height: 92,
    dashCost: 1.1,
    airJumps: 0,
    canBlock: true,
    aimRange: 190,
    moves: { light: 'sweep, uppercut, tail whip behind', heavy: 'roll through enemies and burst' },
    combos: {
      light: [
        { duration: 0.46, hitStart: 0.14, hitEnd: 0.24, cancelAt: 0.28, damage: 13, poise: 12, stamina: 0, reach: 190, knockback: 220, lunge: 120, hitStop: 0.06, shake: 3, move: 'sweep' },
        { duration: 0.44, hitStart: 0.1, hitEnd: 0.24, cancelAt: 0.28, damage: 14, poise: 14, stamina: 0, reach: 90, rise: 150, knockback: 220, lunge: 60, hitStop: 0.06, shake: 4, move: 'uppercut' },
        { duration: 0.56, hitStart: 0.14, hitEnd: 0.3, cancelAt: 0.56, damage: 18, poise: 22, stamina: 0, reach: 50, back: 150, knockback: 420, lunge: 0, hitStop: 0.1, shake: 6, move: 'tail' },
      ],
      heavy: [{ duration: 1, hitStart: 0.24, hitEnd: 0.72, cancelAt: 1, damage: 30, poise: 70, stamina: 28, reach: 120, back: 100, rise: 40, knockback: 460, lunge: 560, hitStop: 0.12, shake: 10, move: 'roll', rush: true }],
    },
    special: {},
  },
}

export const HERO_LIST: readonly HeroDef[] = [HEROES.huntress, HEROES.hallokin, HEROES.warden]

export const DEFAULT_HERO: HeroId = 'huntress'

export const isHeroId = (value: unknown): value is HeroId => typeof value === 'string' && value in HEROES

/** The blows of a chain, or the one blow of a special. */
export const stepsOf = (hero: HeroDef, kind: ComboKind): readonly AttackStep[] => {
  if (kind === 'light' || kind === 'heavy') return hero.combos[kind]
  const step = hero.special[kind]
  return step ? [step] : []
}

/** Whether the hero's sprite has this move. */
export const hasMove = (hero: HeroId, move: string) => move in SPRITES[hero].moves
