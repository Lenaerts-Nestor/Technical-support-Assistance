import { COLORS } from '../appearance'
import type { Appearance, ArmorId } from '../appearance'
import { circle, rect } from './rig'
import type { Part, Piece } from './rig'

const STEEL = '#9aa3b2'
const STEEL_DARK = '#5d6676'
const STEEL_LIGHT = '#c9d1de'
const LEATHER = '#46301e'
const SKIN = '#d8a883'

/** The colours of one kind of armour: its main, shaded and lit faces, and what the legs and arms wear. */
type Metal = { main: string; dark: string; light: string; legFront: string; legBack: string; boot: string }

const METALS: Record<ArmorId, Metal> = {
  plate: { main: STEEL, dark: STEEL_DARK, light: STEEL_LIGHT, legFront: STEEL, legBack: STEEL_DARK, boot: STEEL_LIGHT },
  mail: { main: '#7d8797', dark: '#555d6b', light: '#a9b2c0', legFront: '#6c7585', legBack: '#4a5260', boot: '#3e4651' },
  leather: { main: '#7a5634', dark: '#5b3f26', light: '#a07a4e', legFront: '#6b4a2f', legBack: '#4d3320', boot: '#3a2616' },
}

/** Where the weapon arm turns, and the way its blade points at rest. */
export const SWORD_PIVOT: readonly [number, number] = [20, -116]
export const SWORD_REST_ANGLE = Math.atan2(-132 + 116, 146 - 20)

export type KnightRig = {
  cape: Part
  backLeg: Part
  frontLeg: Part
  body: Part
  plume: Part
  shield: Part
  swordArm: Part
}

function bodyPieces(look: Appearance): Piece[] {
  const c = COLORS[look.color]
  const m = METALS[look.armor]
  const pieces: Piece[] = [
    // Tabard skirt.
    { d: 'M-18,-78 L28,-78 L34,-46 C20,-40 -6,-40 -22,-46 Z', fill: c.main },
    { d: 'M-18,-78 L28,-78 L30,-66 L-20,-66 Z', fill: `${c.dark}8c` },
    // Torso.
    { d: 'M-22,-124 C-4,-132 18,-132 30,-124 L26,-76 L-18,-76 Z', fill: m.main },
    { d: 'M-22,-124 L-14,-124 L-12,-76 L-18,-76 Z', fill: m.dark },
  ]
  if (look.armor === 'plate') {
    pieces.push({ d: 'M0,-118 L16,-118 L14,-82 L2,-82 Z', fill: m.light })
  } else if (look.armor === 'mail') {
    // Rows of rings.
    for (let y = -118; y < -80; y += 6) pieces.push({ d: `M-16,${y} L24,${y}`, stroke: m.light, width: 1.6, dash: [2.4, 2.6] })
    pieces.push({ d: 'M-4,-124 L6,-124 L6,-118 L-4,-118 Z', fill: m.dark })
  } else {
    // Leather: a stitched front panel and two straps across.
    pieces.push({ d: 'M0,-118 L16,-118 L14,-82 L2,-82 Z', fill: m.light })
    pieces.push({ d: 'M-18,-120 L26,-88', stroke: LEATHER, width: 3 })
    pieces.push({ d: 'M26,-120 L-16,-88', stroke: LEATHER, width: 3 })
    pieces.push({ d: 'M8,-116 L8,-84', stroke: LEATHER, width: 1.4, dash: [2, 2.4] })
  }
  pieces.push({ d: rect(-20, -82, 48, 8), fill: LEATHER }, { d: rect(2, -83, 10, 10), fill: c.main })
  // The shoulder on the far side: a plate, a mail cowl, or a leather pad.
  pieces.push({ d: 'M-30,-122 C-28,-136 -10,-138 -6,-124 C-14,-118 -24,-116 -30,-122 Z', fill: look.armor === 'plate' ? STEEL_DARK : m.dark })
  pieces.push({ d: rect(0, -132, 14, 10), fill: look.armor === 'leather' ? '#5b3f26' : LEATHER })
  return pieces
}

function helmetPieces(look: Appearance): Piece[] {
  const c = COLORS[look.color]
  if (look.helmet === 'open') {
    return [
      // Face, then a dome with a nasal bar and cheek guards.
      { d: 'M-8,-132 C-8,-146 20,-148 22,-134 C23,-124 14,-119 6,-119 C-2,-119 -8,-124 -8,-132 Z', fill: SKIN },
      { d: 'M-10,-134 A16,16 0 0 1 22,-136 L22,-139 C14,-147 -4,-147 -10,-139 Z', fill: STEEL_LIGHT },
      { d: 'M-10,-134 A16,16 0 0 1 3,-150 L3,-138 L-10,-137 Z', fill: STEEL },
      { d: rect(16, -140, 4, 16), fill: STEEL_LIGHT },
      { d: 'M-8,-136 L-2,-136 L-2,-122 L-6,-120 Z', fill: STEEL },
      { d: 'M14,-129 A2.2,2.2 0 1,0 18.4,-129 A2.2,2.2 0 1,0 14,-129 Z', fill: '#2a1f18' },
      { d: 'M9,-125 L16,-123', stroke: '#8a5a45', width: 1.6 },
    ]
  }
  if (look.helmet === 'horned') {
    return [
      { d: 'M-11,-136 A17,17 0 0 1 23,-136 L23,-124 C23,-120 -11,-120 -11,-124 Z', fill: STEEL_LIGHT },
      { d: 'M-11,-136 A17,17 0 0 1 3,-152 L3,-124 L-11,-124 Z', fill: STEEL },
      { d: rect(6, -139, 17, 3.2), fill: '#0f1013' },
      { d: rect(13, -139, 3.2, 17), fill: '#0f1013' },
      { d: 'M-8,-146 C-26,-148 -34,-166 -26,-178 C-24,-166 -14,-158 0,-156 Z', fill: '#e6dcc3' },
      { d: 'M16,-148 C30,-152 38,-166 34,-180 C28,-168 22,-162 12,-158 Z', fill: '#e6dcc3' },
      { d: rect(-11, -137, 34, 3), fill: c.main },
    ]
  }
  return [
    { d: 'M-11,-136 A17,17 0 0 1 23,-136 L23,-124 C23,-120 -11,-120 -11,-124 Z', fill: STEEL_LIGHT },
    { d: 'M-11,-136 A17,17 0 0 1 3,-152 L3,-124 L-11,-124 Z', fill: STEEL },
    { d: rect(6, -139, 19, 4), fill: '#0f1013' },
    { d: rect(7, -131, 2, 9), fill: STEEL_DARK },
    { d: rect(13, -131, 2, 9), fill: STEEL_DARK },
  ]
}

function plumePieces(look: Appearance): Piece[] {
  const c = COLORS[look.color]
  if (look.helmet === 'great') {
    return [
      { d: 'M2,-152 C-6,-176 -34,-170 -42,-148 C-28,-156 -16,-152 -6,-148 Z', fill: c.main },
      { d: 'M2,-152 C-4,-166 -20,-168 -30,-160 C-18,-160 -8,-156 -6,-148 Z', fill: `${c.light}99` },
    ]
  }
  if (look.helmet === 'open') {
    // A short crest running back over the dome.
    return [
      { d: 'M-8,-146 C-4,-160 14,-160 20,-146 C10,-152 2,-152 -8,-146 Z', fill: c.main },
      { d: 'M-8,-146 C-14,-150 -22,-146 -26,-138 C-18,-140 -12,-141 -6,-142 Z', fill: c.dark },
    ]
  }
  return []
}

function legPieces(look: Appearance, front: boolean): Piece[] {
  const m = METALS[look.armor]
  if (front) {
    return [
      { d: 'M4,-68 L24,-68 L24,-34 L18,-10 L32,-6 L34,0 L4,0 L8,-10 L6,-34 Z', fill: m.legFront },
      { d: circle(16, -38, 8), fill: look.armor === 'leather' ? m.light : STEEL_LIGHT },
      { d: rect(6, -15, 18, 2), fill: m.dark },
      { d: 'M6,-10 L18,-10 L32,-6 L34,0 L4,0 L8,-10 Z', fill: m.boot },
    ]
  }
  return [
    { d: 'M-14,-68 L4,-68 L2,-34 L6,-10 L18,-6 L20,0 L-10,0 L-6,-10 L-8,-34 Z', fill: m.legBack },
    { d: 'M-6,-10 L6,-10 L18,-6 L20,0 L-10,0 Z', fill: look.armor === 'leather' ? '#2e1d10' : m.dark },
  ]
}

/** Build the hero's parts for a look. */
export function buildKnight(look: Appearance): KnightRig {
  const c = COLORS[look.color]
  const m = METALS[look.armor]
  const armPiece: Piece = { d: 'M18,-122 L34,-114 L56,-108 L54,-100 L30,-104 L16,-110 Z', fill: look.armor === 'leather' ? '#5b3f26' : STEEL_DARK }
  return {
    cape: {
      pivot: [-12, -120],
      pieces: [
        { d: 'M-12,-122 C-44,-112 -58,-72 -66,-30 C-54,-40 -44,-34 -36,-44 C-30,-28 -22,-22 -12,-20 Z', fill: c.dark },
        { d: 'M-12,-122 C-34,-110 -44,-80 -48,-52 C-34,-70 -22,-92 -12,-122 Z', fill: c.deep },
      ],
    },
    backLeg: { pivot: [-5, -68], pieces: legPieces(look, false) },
    frontLeg: { pivot: [14, -68], pieces: legPieces(look, true) },
    body: { pivot: [0, -70], pieces: [...bodyPieces(look), ...helmetPieces(look)] },
    plume: { pivot: [0, -150], pieces: plumePieces(look) },
    shield: {
      pivot: [30, -100],
      pieces: [
        { d: 'M14,-114 L52,-114 L52,-88 C52,-66 38,-56 33,-50 C28,-56 14,-66 14,-88 Z', fill: STEEL_DARK },
        { d: 'M18,-110 L48,-110 L48,-88 C48,-70 38,-62 33,-57 C28,-62 18,-70 18,-88 Z', fill: LEATHER },
        { d: rect(30.5, -108, 5, 46), fill: c.main },
        { d: rect(20, -94.5, 26, 5), fill: c.main },
        { d: 'M14,-114 L52,-114 L52,-88 C52,-66 38,-56 33,-50 C28,-56 14,-66 14,-88 Z', stroke: STEEL_LIGHT, width: 3 },
      ],
    },
    swordArm: {
      pivot: SWORD_PIVOT,
      pieces: [
        armPiece,
        { d: rect(52, -114, 12, 14), fill: look.armor === 'leather' ? m.light : STEEL_LIGHT },
        { d: 'M58,-122 L62,-96', stroke: c.main, width: 6 },
        { d: 'M66,-110 L140,-136 L146,-132 L70,-102 Z', fill: '#e3e8f0' },
        { d: 'M66,-106 L142,-134 L146,-132 L70,-102 Z', fill: STEEL },
        { d: 'M142,-136 L152,-136 L146,-131 Z', fill: '#e3e8f0' },
      ],
    },
  }
}

const cache = new Map<string, KnightRig>()

/** The parts for a look, built once and kept. */
export function knightRig(look: Appearance): KnightRig {
  const key = `${look.helmet}/${look.armor}/${look.color}`
  let rig = cache.get(key)
  if (!rig) {
    rig = buildKnight(look)
    cache.set(key, rig)
  }
  return rig
}
