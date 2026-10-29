import { circle } from './rig'
import type { Part } from './rig'

const SKIN = '#a08a6c'
const SKIN_DARK = '#7a6850'
const SKIN_LIGHT = '#c1ad8e'
const HIDE_DARK = '#6b5a44'
const BONE = '#e6dcc3'
const LEATHER = '#6b4a2f'
const LEATHER_DARK = '#46301e'

export const OGRE = {
  backLeg: {
    pivot: [-34, -122],
    pieces: [{ d: 'M-60,-120 L-8,-120 L-6,-60 L-14,-22 L10,-14 L14,0 L-60,0 L-62,-16 L-66,-60 Z', fill: HIDE_DARK }],
  },
  frontLeg: {
    pivot: [18, -124],
    pieces: [
      { d: 'M-12,-124 L48,-124 L50,-60 L42,-22 L76,-16 L80,0 L-14,0 L-10,-20 L-18,-60 Z', fill: SKIN },
      { d: 'M-14,-70 L50,-70 L50,-58 L-14,-58 Z M-12,-46 L48,-46 L48,-36 L-12,-36 Z', fill: LEATHER },
      { d: 'M-14,-70 L50,-70 M-14,-46 L48,-46', stroke: LEATHER_DARK, width: 2 },
      { d: 'M62,-16 L68,0 M52,-18 L56,0', stroke: HIDE_DARK, width: 3 },
    ],
  },
  /** Hump, belly, kilt, collar and necklace: the big mass that leans as one. */
  body: {
    pivot: [0, -125],
    pieces: [
      { d: 'M-86,-210 C-90,-262 -40,-286 10,-270 C46,-262 66,-236 84,-206 C108,-180 108,-140 80,-116 L-50,-116 C-84,-140 -92,-176 -86,-210 Z', fill: SKIN },
      { d: 'M-86,-210 C-90,-262 -40,-286 10,-270 C-30,-262 -64,-240 -70,-200 C-74,-170 -64,-140 -50,-116 C-84,-140 -92,-176 -86,-210 Z', fill: SKIN_DARK },
      { d: 'M52,-190 C84,-176 90,-146 68,-128 C74,-150 66,-172 52,-190 Z', fill: SKIN_LIGHT },
      { d: 'M20,-196 L38,-176 M24,-176 L40,-190 M-8,-160 L10,-146', stroke: SKIN_DARK, width: 3 },
      { d: 'M-62,-134 L72,-134 L80,-84 L56,-92 L46,-76 L28,-94 L10,-72 L-8,-94 L-26,-76 L-44,-92 L-64,-84 Z', fill: LEATHER },
      { d: 'M-40,-132 L-10,-132 L-12,-100 L-38,-100 Z', fill: '#8c3b3b' },
      { d: 'M30,-132 L62,-132 L66,-98 L32,-100 Z', fill: LEATHER_DARK },
      { d: 'M-62,-142 C-30,-130 30,-130 76,-142 L76,-130 C30,-118 -30,-118 -62,-130 Z', fill: '#c9a96a' },
      { d: 'M-62,-136 C-30,-124 30,-124 76,-136', stroke: '#8a6d33', width: 3, dash: [6, 5] },
      { d: 'M-12,-264 C14,-282 52,-274 62,-246 C40,-262 10,-258 -12,-244 Z', fill: '#3a3f4a' },
      { d: 'M-6,-262 L-12,-278 L2,-266 Z M12,-270 L10,-286 L22,-272 Z M32,-270 L36,-286 L44,-266 Z', fill: '#c9d1de' },
      { d: 'M6,-250 C14,-226 40,-218 52,-232', stroke: '#9aa3b2', width: 4, dash: [7, 4] },
      { d: 'M14,-240 L18,-222 L24,-240 M30,-236 L34,-220 L40,-236', fill: BONE, stroke: BONE, width: 2 },
    ],
  },
  head: {
    pivot: [56, -232],
    pieces: [
      { d: 'M30,-262 C36,-286 74,-290 88,-268 C98,-252 94,-234 80,-226 L48,-224 C34,-230 28,-246 30,-262 Z', fill: SKIN },
      { d: 'M30,-262 C36,-286 74,-290 88,-268 C70,-276 48,-272 30,-262 Z', fill: SKIN_DARK },
      { d: 'M56,-246 L98,-250 C108,-248 110,-236 104,-228 L96,-212 C84,-208 62,-212 52,-222 Z', fill: SKIN_DARK },
      { d: 'M68,-240 L72,-258 L78,-240 Z', fill: BONE },
      { d: 'M92,-244 L102,-262 L104,-240 Z', fill: BONE },
      { d: 'M86,-246 L88,-252 M82,-244 L84,-250', stroke: LEATHER_DARK, width: 2 },
      { d: 'M52,-266 L88,-258 L88,-270 Z', fill: LEATHER_DARK },
      { d: circle(72, -258, 4.5), fill: '#ffd24a' },
      { d: circle(73, -258, 2), fill: '#0f1013' },
      { d: 'M44,-232 C38,-236 36,-246 42,-252 C46,-246 48,-238 44,-232 Z', fill: SKIN_DARK },
      { d: 'M44,-286 L40,-300 M54,-290 L54,-306 M64,-290 L70,-304', stroke: LEATHER_DARK, width: 3 },
    ],
  },
  backArm: {
    pivot: [-30, -248],
    pieces: [{ d: 'M-30,-250 C-60,-226 -70,-176 -52,-146 L-30,-150 C-40,-176 -34,-208 -14,-232 Z', fill: HIDE_DARK }],
  },
  /** The arm, fist and club turn together about the shoulder, so the club comes down in one arc. */
  frontArm: {
    pivot: [14, -240],
    pieces: [
      { d: 'M10,-246 C44,-240 70,-210 86,-176 L66,-164 C54,-190 36,-208 12,-216 Z', fill: SKIN },
      { d: 'M62,-190 L96,-166 L84,-148 L52,-172 Z', fill: BONE },
      { d: 'M56,-182 L90,-158 M60,-174 L94,-150', stroke: '#c9b88f', width: 3 },
      { d: circle(106, -150, 20), fill: SKIN },
      { d: circle(106, -150, 20), stroke: SKIN_DARK, width: 3 },
      { d: 'M96,-168 C100,-174 112,-174 116,-168', stroke: SKIN_DARK, width: 3 },
      { d: circle(86, -156, 6), fill: '#3a3f4a' },
      { d: 'M86,-156 L78,-140', stroke: '#9aa3b2', width: 3, dash: [4, 3] },
      { d: 'M96,-160 L140,-330 C148,-340 170,-334 172,-322 L130,-148 Z', fill: LEATHER },
      { d: 'M96,-160 L140,-330 C144,-338 152,-340 156,-338 L112,-156 Z', fill: LEATHER_DARK },
      { d: 'M120,-216 L168,-196 M128,-246 L172,-232', stroke: LEATHER_DARK, width: 3 },
      { d: 'M148,-290 L170,-296 L158,-278 Z M150,-262 L174,-262 L160,-248 Z M142,-310 L156,-326 L160,-306 Z M136,-232 L158,-238 L146,-222 Z', fill: '#c9d1de' },
      { d: circle(164, -300, 5), fill: '#9aa3b2' },
      { d: circle(154, -270, 5), fill: '#9aa3b2' },
      { d: circle(146, -240, 5), fill: '#9aa3b2' },
    ],
  },
} satisfies Record<string, Part>
