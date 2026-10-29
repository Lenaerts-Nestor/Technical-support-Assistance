import { circle, ellipse, rect, shift } from './rig'
import type { Part, Piece } from './rig'

const SKIN = '#6b8f5e'
const SKIN_DARK = '#4c6b43'
const IRON = '#3a3f4a'
const IRON_LIGHT = '#596070'
const BONE = '#e6dcc3'
const LEATHER = '#6b4a2f'
const LEATHER_DARK = '#46301e'
const CLOTH = '#8c3b3b'

/** The cleaver, drawn where the artwork holds it and then moved into the hand. */
const AXE: Piece[] = [
  { d: 'M56,-114 L78,-104 L74,-92 L52,-100 Z', fill: IRON },
  { d: 'M52,-100 L74,-92 L66,-80 L48,-88 Z', fill: IRON_LIGHT },
  { d: 'M70,-96 L96,-176', stroke: LEATHER_DARK, width: 9 },
  { d: 'M92,-170 C70,-190 52,-176 56,-148 C62,-160 74,-160 90,-160 Z', fill: '#9aa3b2' },
  { d: 'M92,-170 C70,-190 52,-176 56,-148 C58,-162 66,-176 84,-176 Z', fill: '#c9d1de' },
  { d: 'M94,-170 C112,-180 128,-166 120,-146 C116,-156 106,-158 92,-158 Z', fill: IRON_LIGHT },
  { d: 'M60,-168 L54,-170 M58,-160 L52,-160', stroke: IRON, width: 3 },
]
const AXE_SHIFT = [26, 6] as const

export const ORC = {
  backLeg: {
    pivot: [-16, -82],
    pieces: [{ d: 'M-26,-80 L-4,-80 L-4,-40 L-8,-14 L8,-10 L10,0 L-30,0 L-26,-12 L-30,-40 Z', fill: '#3e5a37' }],
  },
  frontLeg: {
    pivot: [14, -82],
    pieces: [
      { d: 'M-2,-82 L28,-82 L30,-40 L26,-14 L46,-10 L48,0 L0,0 L4,-12 L0,-40 Z', fill: SKIN },
      { d: rect(-1, -30, 31, 9), fill: IRON },
      { d: rect(-1, -46, 30, 5), fill: IRON },
      { d: 'M0,-14 L28,-14 L46,-10 L48,0 L0,0 L4,-12 Z', fill: IRON },
    ],
  },
  body: {
    pivot: [0, -90],
    pieces: [
      { d: 'M-20,-92 L34,-92 L38,-52 L28,-60 L22,-46 L12,-60 L4,-44 L-6,-58 L-14,-46 L-22,-56 Z', fill: CLOTH },
      { d: 'M-20,-92 L34,-92 L35,-78 L-21,-78 Z', fill: '#6b2a2a' },
      { d: 'M-34,-150 C-10,-166 30,-166 48,-148 C48,-130 40,-100 34,-86 L-24,-86 C-34,-110 -38,-130 -34,-150 Z', fill: SKIN },
      { d: 'M-34,-150 C-38,-130 -34,-110 -24,-86 L-14,-86 C-26,-110 -28,-132 -26,-152 Z', fill: SKIN_DARK },
      { d: 'M-30,-150 L-12,-152 L36,-92 L22,-90 Z', fill: LEATHER_DARK },
      { d: 'M20,-152 L40,-148 L-8,-90 L-22,-92 Z', fill: LEATHER },
      { d: circle(6, -122, 4), fill: '#c9d1de' },
      { d: circle(-8, -108, 3), fill: '#c9d1de' },
      { d: circle(22, -108, 3), fill: '#c9d1de' },
      { d: rect(-24, -96, 62, 12), fill: IRON },
      { d: rect(-24, -96, 62, 3), fill: IRON_LIGHT },
      { d: ellipse(8, -90, 9, 8), fill: BONE },
      { d: rect(3, -92, 4, 4), fill: IRON },
      { d: rect(9, -92, 4, 4), fill: IRON },
      { d: rect(10, -156, 30, 16), fill: SKIN_DARK },
    ],
  },
  backArm: {
    pivot: [-30, -146],
    pieces: [{ d: 'M-30,-146 L-52,-118 L-46,-96 L-32,-100 L-34,-122 L-22,-140 Z', fill: SKIN_DARK }],
  },
  pauldron: {
    pivot: [-18, -150],
    pieces: [
      { d: 'M-42,-144 C-40,-168 -10,-174 6,-154 C-4,-140 -28,-136 -42,-144 Z', fill: IRON_LIGHT },
      { d: 'M-42,-144 C-40,-168 -10,-174 6,-154 C-8,-156 -26,-152 -42,-144 Z', fill: IRON },
      { d: 'M-36,-158 L-46,-170 L-28,-164 Z M-22,-166 L-26,-182 L-12,-168 Z M-8,-168 L-6,-182 L2,-164 Z', fill: '#c9d1de' },
    ],
  },
  head: {
    pivot: [24, -152],
    pieces: [
      { d: 'M4,-172 C4,-190 40,-194 48,-178 C54,-168 52,-156 44,-150 L16,-148 C8,-152 4,-162 4,-172 Z', fill: SKIN },
      { d: 'M4,-172 C4,-184 14,-190 22,-190 L22,-150 L16,-148 C8,-152 4,-162 4,-172 Z', fill: '#4c6b4399' },
      { d: 'M18,-160 L54,-160 C60,-158 60,-150 54,-146 L24,-146 Z', fill: SKIN_DARK },
      { d: 'M24,-159 L54,-159', stroke: '#26331f', width: 2 },
      { d: 'M38,-159 L42,-180 L47,-159 Z', fill: BONE },
      { d: 'M50,-158 L60,-178 L58,-155 Z', fill: BONE },
      { d: 'M48,-172 L58,-168 L48,-163 Z', fill: SKIN },
      { d: 'M24,-184 L46,-176 L46,-183 Z', fill: '#26331f' },
      { d: ellipse(36, -175, 4.5, 3.2), fill: '#ffd24a' },
      { d: circle(37, -175, 1.7), fill: '#0f1013' },
      { d: 'M0,-176 C-2,-206 46,-210 52,-182 L42,-186 L10,-186 Z', fill: IRON_LIGHT },
      { d: 'M0,-176 C-2,-206 22,-209 26,-196 C12,-196 6,-188 8,-180 Z', fill: IRON },
      { d: rect(2, -187, 48, 7), fill: IRON },
      { d: rect(2, -187, 48, 2), fill: IRON_LIGHT },
      { d: rect(38, -184, 5, 18), fill: IRON },
      { d: 'M6,-196 C-14,-198 -24,-218 -14,-232 C-12,-218 0,-210 12,-208 Z', fill: BONE },
      { d: 'M40,-198 C56,-202 68,-216 64,-234 C58,-220 50,-213 38,-211 Z', fill: BONE },
    ],
  },
  /** The arm and the cleaver, which turn together about the shoulder. */
  frontArm: {
    pivot: [34, -142],
    pieces: [
      { d: 'M30,-146 L58,-134 L92,-110 L82,-98 L50,-114 L24,-124 Z', fill: SKIN },
      ...AXE.map((piece) => ({ ...piece, d: shift(piece.d, AXE_SHIFT[0], AXE_SHIFT[1]) })),
    ],
  },
} satisfies Record<string, Part>
