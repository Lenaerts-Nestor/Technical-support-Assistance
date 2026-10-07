/**
 * Rear-panel templates for the interactive panel block. Hardware layouts live
 * here, in code, so every guide that picks a device shares one drawing and a
 * layout fix lands everywhere. A guide only stores the device id, which card
 * sits in each slot, and its own notes and troubleshooting checks
 * (see `PanelPart`).
 *
 * Coordinates are SVG user units. Chassis units (DM-MD16X16) are modular: each
 * input / output slot holds a swappable card whose connectors are generated
 * from the card type, so a port id is `<slot>:<connector>`, e.g.
 * `in-3:hdmi-out`. The topology follows a photographed unit; spacing is
 * schematic, not to scale.
 */

export type PortKind = 'input' | 'output' | 'audio' | 'network' | 'control' | 'power'

export type PortDef = {
  id: string
  /** Full name, shown in the detail panel and pickers. */
  label: string
  /** Short text drawn on the port itself. */
  short: string
  kind: PortKind
  /** Picker group, e.g. "Input 3 · DMC-4K-C-DSP". */
  group: string
  x: number
  y: number
  w: number
  h: number
}

export type ZoneDef = { label: string; x: number; y: number; w: number; h: number }
export type FrameDef = { x: number; y: number; w: number; h: number; title?: string; titleY?: number; titleAnchor?: 'end' | 'middle' }
export type TextDef = { text: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end'; size?: number }

/** A device with its cards resolved: everything `DevicePanel` needs to draw. */
export type DeviceDef = {
  id: string
  name: string
  summary: string
  width: number
  height: number
  zones: ZoneDef[]
  frames: FrameDef[]
  texts: TextDef[]
  ports: PortDef[]
  note: string
}

export const PORT_KIND_LABEL: Record<PortKind, string> = {
  input: 'Input',
  output: 'Output',
  audio: 'Audio',
  network: 'Network',
  control: 'Control',
  power: 'Power',
}

/** Legend swatch per port kind. */
export const KIND_DOT: Record<PortKind, string> = {
  input: 'bg-sky-400',
  output: 'bg-emerald-400',
  audio: 'bg-lime-400',
  network: 'bg-violet-400',
  control: 'bg-amber-400',
  power: 'bg-rose-400',
}

/* --------------------------------------------------------------------------- *
 * Cards
 * --------------------------------------------------------------------------- */

export type CardFamily = 'input' | 'output'

export type SlotDef = {
  id: string
  label: string
  n: number
  family: CardFamily
  defaultCard: string
  x: number
  y: number
  w: number
  h: number
  /** Where the slot number is printed on the chassis, when outside the card. */
  numberAt?: { x: number }
}

type Conn = Omit<PortDef, 'group'>

type CardType = {
  id: string
  name: string
  family: CardFamily
  build: (slot: SlotDef) => { conns: Conn[]; texts?: TextDef[] }
}

type Spec = { key: string; label: string; short: string; kind: PortKind; x: number; w: number }

/** An input card: a row of connectors across the slot. */
function inputCard(id: string, name: string, specs: Spec[]): CardType {
  return {
    id,
    name,
    family: 'input',
    build: (slot) => ({
      conns: specs.map((s) => ({
        id: `${slot.id}:${s.key}`,
        label: `${slot.label}: ${s.label}`,
        short: s.short,
        kind: s.kind,
        x: slot.x + s.x,
        y: slot.y + 14,
        w: s.w,
        h: 30,
      })),
    }),
  }
}

const AUDIO_OUT: Spec[] = [
  { key: 'audio-l', label: 'Audio out L', short: 'AUD L', kind: 'audio', x: 206, w: 32 },
  { key: 'audio-r', label: 'Audio out R', short: 'AUD R', kind: 'audio', x: 242, w: 32 },
]

const HD_PORTS: Spec[] = [
  { key: 'hdmi-out', label: 'HDMI OUT', short: 'HDMI OUT', kind: 'output', x: 30, w: 58 },
  { key: 'hdmi-in', label: 'HDMI IN', short: 'HDMI IN', kind: 'input', x: 94, w: 52 },
  { key: 'usb', label: 'USB HID', short: 'USB', kind: 'control', x: 152, w: 38 },
  ...AUDIO_OUT,
]

const C_PORTS: Spec[] = [
  { key: 'dm-in', label: 'DM IN', short: 'DM IN', kind: 'input', x: 26, w: 54 },
  { key: 'poe-in', label: 'PoE IN', short: 'PoE IN', kind: 'power', x: 84, w: 54 },
  { key: 'hdmi-out', label: 'HDMI OUT', short: 'HDMI OUT', kind: 'output', x: 142, w: 58 },
  ...AUDIO_OUT,
]

/** One DM output card = two outputs (DM OUT + PoE IN each) around a shared HDMI. */
const outputCard = (id: string, name: string): CardType => ({
  id,
  name,
  family: 'output',
  build: (slot) => {
    const a = 2 * (slot.n - 1) + 1
    const b = a + 1
    const port = (
      key: string,
      label: string,
      short: string,
      kind: PortKind,
      x: number,
      w: number,
      owner: string,
    ): Conn => ({ id: `${owner}:${key}`, label, short, kind, x: slot.x + x, y: slot.y + 12, w, h: 24 })
    return {
      conns: [
        port('dm-out', `Output ${a}: DM OUT`, 'DM OUT', 'output', 10, 60, `out-${a}`),
        port('poe-in', `Output ${a}: PoE IN`, 'PoE IN', 'power', 74, 56, `out-${a}`),
        port('hdmi', `Outputs ${a}–${b}: HDMI`, 'HDMI', 'output', 150, 104, `outcard-${slot.n}`),
        port('dm-out', `Output ${b}: DM OUT`, 'DM OUT', 'output', 274, 60, `out-${b}`),
        port('poe-in', `Output ${b}: PoE IN`, 'PoE IN', 'power', 338, 56, `out-${b}`),
      ],
      texts: [
        { text: `OUT ${a}`, x: slot.x + 10, y: slot.y + 8, size: 7.5 },
        { text: `OUT ${b}`, x: slot.x + 274, y: slot.y + 8, size: 7.5 },
      ],
    }
  },
})

const CARDS: CardType[] = [
  inputCard('dmc-4k-hd', 'DMC-4K-HD', HD_PORTS),
  inputCard('dmc-4k-hd-dsp', 'DMC-4K-HD-DSP', HD_PORTS),
  inputCard('dmc-4k-c', 'DMC-4K-C', C_PORTS),
  inputCard('dmc-4k-c-dsp', 'DMC-4K-C-DSP', C_PORTS),
  inputCard('dmc-str', 'DMC-STR', [
    { key: 'hdmi-out', label: 'HDMI OUT', short: 'HDMI OUT', kind: 'output', x: 30, w: 58 },
    { key: 'content-lan', label: 'Content LAN', short: 'CONTENT LAN', kind: 'network', x: 96, w: 76 },
    ...AUDIO_OUT,
  ]),
  inputCard('dmc-vid-rca-a', 'DMC-VID-RCA-A', [
    { key: 'hdmi-out', label: 'HDMI OUT', short: 'HDMI OUT', kind: 'output', x: 30, w: 58 },
    { key: 'y', label: 'Component Y', short: 'Y', kind: 'input', x: 96, w: 28 },
    { key: 'pb', label: 'Component Pb', short: 'Pb', kind: 'input', x: 128, w: 32 },
    { key: 'pr', label: 'Component Pr / composite', short: 'Pr/C', kind: 'input', x: 164, w: 40 },
    { key: 'audio-in-l', label: 'Audio in L', short: 'AUD L', kind: 'audio', x: 212, w: 32 },
    { key: 'audio-in-r', label: 'Audio in R', short: 'AUD R', kind: 'audio', x: 248, w: 32 },
  ]),
  outputCard('dmc-4k-co-hd', 'DMC-4K-CO-HD'),
  {
    id: 'dmc-stro',
    name: 'DMC-STRO',
    family: 'output',
    build: (slot) => {
      const a = 2 * (slot.n - 1) + 1
      return {
        conns: [
          {
            id: `outcard-${slot.n}:content-lan`,
            label: `Outputs ${a}–${a + 1}: Content LAN`,
            short: 'CONTENT LAN',
            kind: 'network',
            x: slot.x + 14,
            y: slot.y + 12,
            w: 76,
            h: 24,
          },
        ],
        texts: [{ text: `OUT ${a}–${a + 1}`, x: slot.x + 14, y: slot.y + 8, size: 7.5 }],
      }
    },
  },
]

export const getCard = (id: string): CardType | undefined => CARDS.find((c) => c.id === id)

export const cardsFor = (family: CardFamily): { id: string; name: string }[] =>
  CARDS.filter((c) => c.family === family).map(({ id, name }) => ({ id, name }))

/* --------------------------------------------------------------------------- *
 * Device templates
 * --------------------------------------------------------------------------- */

export type DeviceTemplate = {
  id: string
  name: string
  summary: string
  width: number
  height: number
  zones: ZoneDef[]
  frames: FrameDef[]
  texts: TextDef[]
  fixedPorts: PortDef[]
  slots: SlotDef[]
  note: string
}

const NOTE_CHASSIS =
  'Layout follows a photographed unit; spacing is schematic. Each slot can hold a different card, so check the card names against the unit in front of you.'
const NOTE_FIXED =
  'Schematic layout for orientation, not to scale. Confirm exact port positions against the unit\'s rear panel.'

const MD_INPUT_DEFAULTS = [
  'dmc-4k-hd', 'dmc-4k-hd', 'dmc-4k-c-dsp', 'dmc-4k-hd-dsp',
  'dmc-4k-hd', 'dmc-4k-hd', 'dmc-4k-c-dsp', 'dmc-4k-hd-dsp',
  'dmc-4k-hd-dsp', 'dmc-4k-c', 'dmc-str', 'dmc-vid-rca-a',
  'dmc-4k-hd-dsp', 'dmc-4k-c', 'dmc-str', 'dmc-vid-rca-a',
]
const MD_OUTPUT_DEFAULTS = [
  'dmc-4k-co-hd', 'dmc-4k-co-hd', 'dmc-4k-co-hd', 'dmc-4k-co-hd',
  'dmc-4k-co-hd', 'dmc-stro', 'dmc-4k-co-hd', 'dmc-stro',
]

function mdSlots(): SlotDef[] {
  const inputs = Array.from({ length: 16 }, (_, i): SlotDef => {
    const n = i + 1
    const right = n > 8
    return {
      id: `in-${n}`,
      label: `Input ${n}`,
      n,
      family: 'input',
      defaultCard: MD_INPUT_DEFAULTS[i],
      x: right ? 766 : 34,
      y: 40 + (i % 8) * 80,
      w: 300,
      h: 72,
      numberAt: { x: right ? 1084 : 14 },
    }
  })
  const outputs = Array.from({ length: 8 }, (_, i): SlotDef => {
    const n = i + 1
    return {
      id: `outcard-${n}`,
      label: `Outputs ${2 * i + 1}–${2 * i + 2}`,
      n,
      family: 'output',
      defaultCard: MD_OUTPUT_DEFAULTS[i],
      x: 348,
      y: i < 4 ? 56 + i * 54 : 532 + (i - 4) * 54,
      w: 404,
      h: 50,
    }
  })
  return [...inputs, ...outputs]
}

function mdFixedPorts(): PortDef[] {
  const power: PortDef[] = Array.from({ length: 16 }, (_, i) => {
    const n = i + 1
    const row = Math.floor(i / 2)
    return {
      id: `pwr-${n}`,
      label: `Output ${n}: 24 VDC power`,
      short: `PWR ${n}`,
      kind: 'power',
      group: 'Output power (24 VDC, 40 W max per port)',
      x: n % 2 === 1 ? 358 : 572,
      y: 294 + row * 24,
      w: 170,
      h: 20,
    }
  })
  return [
    ...power,
    { id: 'lan', label: 'LAN', short: 'LAN', kind: 'network', group: 'Control & power', x: 48, y: 696, w: 70, h: 32 },
    { id: 'ac-power', label: 'AC power inlet', short: 'AC POWER', kind: 'power', group: 'Control & power', x: 790, y: 692, w: 120, h: 40 },
    { id: 'ground', label: 'Ground lug', short: 'GND', kind: 'power', group: 'Control & power', x: 930, y: 696, w: 44, h: 32 },
  ]
}

const DM_MD16X16: DeviceTemplate = {
  id: 'dm-md16x16',
  name: 'DM-MD16X16',
  summary: '16×16 DigitalMedia switcher: 16 input cards, 8 output cards (two outputs each), output power terminals.',
  width: 1100,
  height: 770,
  zones: [],
  frames: [
    { x: 34, y: 680, w: 300, h: 72, title: 'LAN', titleY: 744, titleAnchor: 'end' },
    { x: 766, y: 680, w: 300 , h: 72 },
  ],
  texts: [
    { text: 'DM OUTPUTS', x: 550, y: 48, anchor: 'middle', size: 10 },
    { text: '24 VDC · 40 W MAX PER PORT · CLASS 2', x: 550, y: 284, anchor: 'middle', size: 10 },
    { text: 'TOTAL NET POWER 110 W', x: 550, y: 506, anchor: 'middle', size: 10 },
    { text: 'DM OUTPUTS', x: 550, y: 524, anchor: 'middle', size: 10 },
  ],
  fixedPorts: mdFixedPorts(),
  slots: mdSlots(),
  note: NOTE_CHASSIS,
}

const nvxPort = (
  id: string,
  label: string,
  short: string,
  kind: PortKind,
  group: string,
  x: number,
  y: number,
  w: number,
  h: number,
): PortDef => ({ id, label, short, kind, group, x, y, w, h })

const NVX: DeviceTemplate = {
  id: 'nvx',
  name: 'DM NVX (encoder / decoder)',
  summary: 'Single-port NVX endpoint: video and audio in/out, control, and network with PoE.',
  width: 640,
  height: 270,
  zones: [
    { label: 'Video', x: 24, y: 44, w: 300, h: 100 },
    { label: 'Audio', x: 340, y: 44, w: 276, h: 100 },
    { label: 'Control', x: 24, y: 160, w: 380, h: 84 },
    { label: 'Network & power', x: 420, y: 160, w: 196, h: 84 },
  ],
  frames: [],
  texts: [],
  fixedPorts: [
    nvxPort('hdmi-in', 'HDMI in', 'HDMI IN', 'input', 'Video', 40, 78, 120, 50),
    nvxPort('hdmi-out', 'HDMI out', 'HDMI OUT', 'output', 'Video', 188, 78, 120, 50),
    nvxPort('audio-in', 'Audio in', 'AUDIO IN', 'audio', 'Audio', 356, 78, 120, 50),
    nvxPort('audio-out', 'Audio out', 'AUDIO OUT', 'audio', 'Audio', 488, 78, 112, 50),
    nvxPort('rs232', 'RS-232', 'RS-232', 'control', 'Control', 40, 190, 100, 44),
    nvxPort('ir', 'IR out', 'IR', 'control', 'Control', 156, 190, 100, 44),
    nvxPort('usb', 'USB', 'USB', 'control', 'Control', 272, 190, 116, 44),
    nvxPort('lan', 'LAN (PoE+)', 'LAN PoE+', 'network', 'Network & power', 436, 190, 90, 44),
    nvxPort('power', 'DC power', 'POWER', 'power', 'Network & power', 536, 190, 64, 44),
  ],
  slots: [],
  note: NOTE_FIXED,
}

export const TEMPLATES: DeviceTemplate[] = [DM_MD16X16, NVX]

export const DEFAULT_DEVICE_ID = DM_MD16X16.id

export const getTemplate = (id: string): DeviceTemplate | undefined =>
  TEMPLATES.find((t) => t.id === id)

/** The card in a slot: the guide's override if it is valid for that slot, else the default. */
export function cardIdFor(slot: SlotDef, cards: Record<string, string> = {}): string {
  const picked = cards[slot.id]
  const card = picked ? getCard(picked) : undefined
  return card && card.family === slot.family ? card.id : slot.defaultCard
}

/** Lay a template out with the given cards installed. */
export function getDevice(id: string, cards: Record<string, string> = {}): DeviceDef | undefined {
  const t = getTemplate(id)
  if (!t) return undefined

  const frames: FrameDef[] = [...t.frames]
  const texts: TextDef[] = [...t.texts]
  const ports: PortDef[] = [...t.fixedPorts]

  for (const slot of t.slots) {
    const card = getCard(cardIdFor(slot, cards))
    if (!card) continue
    const built = card.build(slot)
    frames.push({
      x: slot.x,
      y: slot.y,
      w: slot.w,
      h: slot.h,
      title: card.name,
      titleY: slot.y + (slot.family === 'input' ? 64 : 46),
      titleAnchor: slot.family === 'input' ? 'end' : 'middle',
    })
    if (slot.numberAt) {
      texts.push({
        text: String(slot.n),
        x: slot.numberAt.x,
        y: slot.y + slot.h / 2 + 5,
        anchor: 'middle',
        size: 13,
      })
    }
    texts.push(...(built.texts ?? []))
    for (const c of built.conns) ports.push({ ...c, group: `${slot.label} · ${card.name}` })
  }

  return {
    id: t.id,
    name: t.name,
    summary: t.summary,
    width: t.width,
    height: t.height,
    zones: t.zones,
    frames,
    texts,
    ports,
    note: t.note,
  }
}

export const portCenter = (p: PortDef) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 })
