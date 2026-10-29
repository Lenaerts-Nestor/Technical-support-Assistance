import { circle, rect } from './rig'
import type { Part } from './rig'

const STEEL = '#9aa3b2'
const STEEL_DARK = '#5d6676'
const STEEL_LIGHT = '#c9d1de'
const LEATHER = '#46301e'
const GOLD = '#f5a93a'
const GOLD_DARK = '#b9741c'

export const KNIGHT = {
  cape: {
    pivot: [-12, -120],
    pieces: [
      { d: 'M-12,-122 C-44,-112 -58,-72 -66,-30 C-54,-40 -44,-34 -36,-44 C-30,-28 -22,-22 -12,-20 Z', fill: GOLD_DARK },
      { d: 'M-12,-122 C-34,-110 -44,-80 -48,-52 C-34,-70 -22,-92 -12,-122 Z', fill: '#8f5712' },
    ],
  },
  backLeg: {
    pivot: [-5, -68],
    pieces: [{ d: 'M-14,-68 L4,-68 L2,-34 L6,-10 L18,-6 L20,0 L-10,0 L-6,-10 L-8,-34 Z', fill: STEEL_DARK }],
  },
  frontLeg: {
    pivot: [14, -68],
    pieces: [
      { d: 'M4,-68 L24,-68 L24,-34 L18,-10 L32,-6 L34,0 L4,0 L8,-10 L6,-34 Z', fill: STEEL },
      { d: circle(16, -38, 8), fill: STEEL_LIGHT },
      { d: rect(6, -15, 18, 2), fill: STEEL_DARK },
    ],
  },
  /** Torso, skirt, head and helmet: everything that leans together. */
  body: {
    pivot: [0, -70],
    pieces: [
      { d: 'M-18,-78 L28,-78 L34,-46 C20,-40 -6,-40 -22,-46 Z', fill: GOLD },
      { d: 'M-18,-78 L28,-78 L30,-66 L-20,-66 Z', fill: '#b9741c8c' },
      { d: 'M-22,-124 C-4,-132 18,-132 30,-124 L26,-76 L-18,-76 Z', fill: STEEL },
      { d: 'M-22,-124 L-14,-124 L-12,-76 L-18,-76 Z', fill: STEEL_DARK },
      { d: 'M0,-118 L16,-118 L14,-82 L2,-82 Z', fill: STEEL_LIGHT },
      { d: rect(-20, -82, 48, 8), fill: LEATHER },
      { d: rect(2, -83, 10, 10), fill: GOLD },
      { d: 'M-30,-122 C-28,-136 -10,-138 -6,-124 C-14,-118 -24,-116 -30,-122 Z', fill: STEEL_DARK },
      { d: rect(0, -132, 14, 10), fill: LEATHER },
      { d: 'M-11,-136 A17,17 0 0 1 23,-136 L23,-124 C23,-120 -11,-120 -11,-124 Z', fill: STEEL_LIGHT },
      { d: 'M-11,-136 A17,17 0 0 1 3,-152 L3,-124 L-11,-124 Z', fill: STEEL },
      { d: rect(6, -139, 19, 4), fill: '#0f1013' },
      { d: rect(7, -131, 2, 9), fill: STEEL_DARK },
      { d: rect(13, -131, 2, 9), fill: STEEL_DARK },
    ],
  },
  plume: {
    pivot: [0, -150],
    pieces: [
      { d: 'M2,-152 C-6,-176 -34,-170 -42,-148 C-28,-156 -16,-152 -6,-148 Z', fill: GOLD },
      { d: 'M2,-152 C-4,-166 -20,-168 -30,-160 C-18,-160 -8,-156 -6,-148 Z', fill: '#ffd27a99' },
    ],
  },
  shield: {
    pivot: [30, -100],
    pieces: [
      { d: 'M14,-114 L52,-114 L52,-88 C52,-66 38,-56 33,-50 C28,-56 14,-66 14,-88 Z', fill: STEEL_DARK },
      { d: 'M18,-110 L48,-110 L48,-88 C48,-70 38,-62 33,-57 C28,-62 18,-70 18,-88 Z', fill: LEATHER },
      { d: rect(30.5, -108, 5, 46), fill: GOLD },
      { d: rect(20, -94.5, 26, 5), fill: GOLD },
      { d: 'M14,-114 L52,-114 L52,-88 C52,-66 38,-56 33,-50 C28,-56 14,-66 14,-88 Z', stroke: STEEL_LIGHT, width: 3 },
    ],
  },
  swordArm: {
    pivot: [20, -116],
    pieces: [
      { d: 'M18,-122 L34,-114 L56,-108 L54,-100 L30,-104 L16,-110 Z', fill: STEEL_DARK },
      { d: rect(52, -114, 12, 14), fill: STEEL_LIGHT },
      { d: 'M58,-122 L62,-96', stroke: GOLD, width: 6 },
      { d: 'M66,-110 L140,-136 L146,-132 L70,-102 Z', fill: '#e3e8f0' },
      { d: 'M66,-106 L142,-134 L146,-132 L70,-102 Z', fill: STEEL },
      { d: 'M142,-136 L152,-136 L146,-131 Z', fill: '#e3e8f0' },
    ],
  },
} satisfies Record<string, Part>

/** Where the sword arm turns, and the angle its blade points at rest. */
export const SWORD_PIVOT = KNIGHT.swordArm.pivot
export const SWORD_REST_ANGLE = Math.atan2(-132 + 116, 146 - 20)
export const SWORD_LENGTH = 126
