/**
 * The Ogre Warlord: the ogre's build in a darker, redder hide, with iron plates strapped over
 * it, a horned helm and a war sash. It shares the ogre's parts, so it moves the same way, but
 * it is drawn larger and wears enough metal to be told apart at a glance.
 */
import { OGRE } from './ogre'
import { circle, rect } from './rig'
import type { Part, Piece } from './rig'

/** Ogre hide colours to the Warlord's. */
const HIDE: Record<string, string> = {
  '#a08a6c': '#8c6a60',
  '#7a6850': '#6a4d47',
  '#c1ad8e': '#a98479',
  '#6b5a44': '#56403b',
}

const IRON = '#454b57'
const IRON_LIGHT = '#6b7482'
const IRON_DARK = '#2f333c'
const SASH = '#b83a3a'
const BONE = '#e6dcc3'

const recolor = (pieces: readonly Piece[]): Piece[] =>
  pieces.map((piece) => ({
    ...piece,
    fill: piece.fill ? (HIDE[piece.fill] ?? piece.fill) : piece.fill,
    stroke: piece.stroke ? (HIDE[piece.stroke] ?? piece.stroke) : piece.stroke,
  }))

const dressed = (part: Part, extra: Piece[]): Part => ({ ...part, pieces: [...recolor(part.pieces), ...extra] })

export const WARLORD = {
  backLeg: dressed(OGRE.backLeg, []),
  frontLeg: dressed(OGRE.frontLeg, [
    { d: 'M-14,-104 L50,-104 L48,-70 L-12,-70 Z', fill: IRON },
    { d: rect(-14, -104, 64, 6), fill: IRON_LIGHT },
    { d: circle(-2, -88, 3), fill: IRON_LIGHT },
    { d: circle(34, -88, 3), fill: IRON_LIGHT },
  ]),
  body: dressed(OGRE.body, [
    // Breastplate over the chest and belly, with a sash and a studded belt.
    { d: 'M-52,-244 C-20,-266 52,-264 84,-228 L86,-168 C60,-148 -20,-148 -58,-178 Z', fill: IRON },
    { d: 'M-52,-244 C-20,-266 52,-264 84,-228 C60,-246 -10,-246 -50,-226 Z', fill: IRON_LIGHT },
    { d: 'M-30,-210 L70,-200 M-34,-186 L72,-178', stroke: IRON_DARK, width: 3 },
    { d: 'M-54,-250 L82,-166', stroke: SASH, width: 11 },
    { d: circle(10, -226, 4), fill: IRON_LIGHT },
    { d: circle(50, -216, 4), fill: IRON_LIGHT },
    { d: circle(-24, -224, 4), fill: IRON_LIGHT },
    { d: rect(-62, -148, 140, 14), fill: IRON_DARK },
    { d: circle(8, -141, 9), fill: BONE },
    { d: 'M-40,-148 L-36,-160 L-30,-148 Z M-6,-148 L-2,-160 L4,-148 Z M28,-148 L32,-160 L38,-148 Z M60,-148 L64,-160 L70,-148 Z', fill: IRON_LIGHT },
  ]),
  head: dressed(OGRE.head, [
    // A horned iron helm over the brow, with a guard down the nose.
    { d: 'M30,-266 C34,-304 90,-308 96,-268 L92,-258 L36,-254 Z', fill: IRON },
    { d: 'M30,-266 C34,-304 60,-306 66,-290 C48,-290 38,-280 38,-262 Z', fill: IRON_DARK },
    { d: rect(32, -270, 62, 8), fill: IRON_DARK },
    { d: rect(32, -270, 62, 2), fill: IRON_LIGHT },
    { d: rect(84, -266, 6, 30), fill: IRON },
    { d: 'M38,-292 C16,-298 6,-324 18,-342 C22,-322 36,-310 50,-306 Z', fill: BONE },
    { d: 'M88,-294 C108,-302 118,-322 112,-344 C104,-324 94,-314 80,-308 Z', fill: BONE },
  ]),
  backArm: dressed(OGRE.backArm, [{ d: 'M-46,-262 C-40,-290 -2,-292 6,-262 C-8,-250 -34,-250 -46,-262 Z', fill: IRON }]),
  frontArm: dressed(OGRE.frontArm, [
    { d: 'M-6,-262 C0,-292 44,-294 56,-262 C38,-248 10,-248 -6,-262 Z', fill: IRON },
    { d: 'M-2,-272 L-8,-292 L8,-276 Z M14,-282 L12,-302 L26,-284 Z M32,-282 L38,-300 L44,-278 Z', fill: IRON_LIGHT },
    { d: 'M60,-196 L94,-172 L90,-160 L56,-184 Z', fill: IRON },
  ]),
} satisfies Record<string, Part>
