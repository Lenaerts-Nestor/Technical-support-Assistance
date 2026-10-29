import { circle, rect } from './rig'
import type { Part } from './rig'

const SKIN = '#86a24f'
const SKIN_DARK = '#5f7a36'
const SKIN_LIGHT = '#a3bd6c'
const LEATHER = '#6b4a2f'
const LEATHER_DARK = '#46301e'

export const GOBLIN = {
  backLeg: {
    pivot: [-2, -34],
    pieces: [{ d: 'M-6,-34 L2,-34 L-2,-16 L4,-6 L14,-4 L14,0 L-10,0 L-8,-6 L-12,-18 Z', fill: SKIN_DARK }],
  },
  frontLeg: {
    pivot: [11, -35],
    pieces: [{ d: 'M6,-36 L16,-34 L20,-18 L18,-8 L32,-4 L32,0 L8,0 L10,-8 L4,-20 Z', fill: SKIN }],
  },
  body: {
    pivot: [4, -40],
    pieces: [
      { d: 'M-10,-42 L16,-42 L18,-22 L10,-28 L4,-18 L-2,-28 L-10,-20 Z', fill: LEATHER },
      { d: 'M-14,-62 C-4,-70 14,-66 20,-58 L18,-40 L-8,-38 C-14,-44 -16,-54 -14,-62 Z', fill: SKIN },
      { d: 'M-12,-60 C-4,-66 12,-64 18,-56 L16,-42 L-8,-40 Z', fill: LEATHER },
      { d: 'M-8,-62 L14,-42', stroke: LEATHER_DARK, width: 3 },
      { d: circle(-2, -56, 2), fill: '#c9d1de' },
      { d: circle(6, -48, 2), fill: '#c9d1de' },
      { d: rect(-9, -44, 26, 4), fill: LEATHER_DARK },
    ],
  },
  backArm: {
    pivot: [-10, -60],
    pieces: [
      { d: 'M-10,-60 L-24,-48 L-22,-42 L-8,-52 Z', fill: SKIN_DARK },
      { d: circle(-26, -46, 12), fill: '#5d6676' },
      { d: circle(-26, -46, 8), fill: '#9aa3b2' },
      { d: circle(-26, -46, 3), fill: LEATHER_DARK },
    ],
  },
  ears: {
    pivot: [6, -72],
    pieces: [
      { d: 'M6,-78 L-40,-102 L-30,-76 L2,-68 Z', fill: SKIN_DARK },
      { d: 'M10,-72 L-34,-70 L-28,-58 L8,-62 Z', fill: SKIN },
      { d: 'M-34,-98 L-12,-82', stroke: SKIN_LIGHT, width: 2 },
      { d: circle(-22, -82, 2.5), fill: '#f5a93a' },
    ],
  },
  head: {
    pivot: [12, -62],
    pieces: [
      { d: 'M2,-84 C10,-96 32,-94 36,-80 C40,-70 34,-60 24,-58 C12,-56 2,-62 0,-72 Z', fill: SKIN_LIGHT },
      { d: 'M2,-84 C10,-96 32,-94 36,-80 C28,-86 14,-84 2,-84 Z', fill: SKIN },
      { d: 'M30,-76 C42,-76 50,-70 46,-62 C44,-66 38,-68 32,-66 Z', fill: SKIN },
      { d: 'M14,-80 L32,-76 L32,-82 Z', fill: LEATHER_DARK },
      { d: 'M20,-74 A5,4.5 0 1,0 30,-74 A5,4.5 0 1,0 20,-74 Z', fill: '#ffd24a' },
      { d: circle(26, -74, 2), fill: '#0f1013' },
      { d: 'M10,-64 L16,-62 L20,-66 L24,-61 L28,-65 L32,-61 L34,-64', stroke: '#2e3a18', width: 2.4 },
      { d: 'M20,-66 L21,-62 L23,-66 Z', fill: '#e6dcc3' },
      { d: 'M28,-65 L29,-62 L31,-65 Z', fill: '#e6dcc3' },
    ],
  },
  frontArm: {
    pivot: [10, -58],
    pieces: [
      { d: 'M10,-60 L28,-50 L44,-52 L44,-46 L26,-42 L8,-52 Z', fill: SKIN },
      { d: 'M44,-52 C52,-50 50,-46 44,-46 Z', fill: SKIN_LIGHT },
      { d: rect(42, -58, 6, 14), fill: LEATHER_DARK },
      { d: 'M46,-52 L60,-64 C74,-76 84,-62 78,-46 C76,-56 70,-62 62,-56 L48,-46 Z', fill: '#c9d1de' },
      { d: 'M46,-52 L60,-64 C74,-76 84,-62 78,-46 L76,-50 C76,-62 70,-66 62,-60 Z', fill: '#e3e8f0' },
    ],
  },
} satisfies Record<string, Part>
