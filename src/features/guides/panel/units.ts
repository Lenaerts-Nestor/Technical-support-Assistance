/**
 * Catalog of unit types that can be placed on a panel: what the picker offers,
 * how a box is drawn, which models exist and which ports each model has.
 * Generic hardware classes only; names, rooms and addresses live in the guide
 * file.
 *
 * Ports carry a signal type and a direction, which is what lets the editor
 * refuse an HDMI cable in a LAN port and pick the right port by itself when a
 * cable is dropped on a unit.
 */

export type Signal = 'hdmi' | 'dm' | 'lan' | 'usb' | 'audio' | 'serial' | 'ir' | 'poe' | 'power'

/** `in` receives, `out` sends, `io` goes both ways (LAN, USB, serial). */
export type PortDir = 'in' | 'out' | 'io'

/** `side` is the column a port is drawn in (`L` left edge, `R` right); by default inputs go left, outputs right. */
export type PortSpec = { key: string; label: string; signal: Signal; dir: PortDir; side?: 'L' | 'R' }

export type UnitModel = {
  id: string
  name: string
  /**
   * False while the port list is a generic stand-in for the family rather than
   * checked against the unit's rear panel. Shown to the user next to the model.
   */
  verified: boolean
  ports: PortSpec[]
}

export type UnitKind = {
  id: string
  label: string
  /** Which side of a chassis it belongs on by default; null = same side as what it hangs off. */
  side: 'source' | 'display' | null
  color: string
  /** 24×24 stroke icon path(s). */
  icon: string
  /** Detail lines offered as one-click chips. */
  suggest: string[]
  /** Selectable models, first is the default. Empty = a plain box without ports. */
  models: UnitModel[]
  /** Kept so old guides still draw, but not offered in the picker. */
  legacy?: boolean
}

export const SIGNAL_LABEL: Record<Signal, string> = {
  hdmi: 'HDMI',
  dm: 'DM',
  lan: 'LAN',
  usb: 'USB',
  audio: 'audio',
  serial: 'RS-232',
  ir: 'IR',
  poe: 'PoE',
  power: 'power',
}

export const SIGNAL_COLOR: Record<Signal, string> = {
  hdmi: '#38bdf8',
  dm: '#2dd4bf',
  lan: '#a78bfa',
  usb: '#fbbf24',
  audio: '#a3e635',
  serial: '#f59e0b',
  ir: '#fb923c',
  poe: '#fb7185',
  power: '#fb7185',
}

const p = (key: string, label: string, signal: Signal, dir: PortDir, side?: 'L' | 'R'): PortSpec => ({
  key,
  label,
  signal,
  dir,
  ...(side ? { side } : {}),
})

/* -- generic stand-ins: replace with checked layouts as units are confirmed -- */

const NVX_ENCODER_PORTS: PortSpec[] = [
  p('hdmi-in', 'HDMI IN', 'hdmi', 'in'),
  p('audio-in', 'AUDIO IN', 'audio', 'in'),
  p('hdmi-out', 'HDMI OUT', 'hdmi', 'out'),
  p('audio-out', 'AUDIO OUT', 'audio', 'out'),
  p('ir', 'IR OUT', 'ir', 'out'),
  // The network side faces the switch, which sits to the right of a transmitter.
  p('lan', 'LAN (PoE+)', 'lan', 'io', 'R'),
  p('usb', 'USB', 'usb', 'io', 'R'),
  p('rs232', 'RS-232', 'serial', 'io', 'R'),
]

const NVX_DECODER_PORTS: PortSpec[] = [
  p('hdmi-out', 'HDMI OUT', 'hdmi', 'out'),
  p('audio-out', 'AUDIO OUT', 'audio', 'out'),
  p('ir', 'IR OUT', 'ir', 'out'),
  // …and to the left of a receiver.
  p('lan', 'LAN (PoE+)', 'lan', 'io', 'L'),
  p('usb', 'USB', 'usb', 'io', 'L'),
  p('rs232', 'RS-232', 'serial', 'io', 'L'),
]

const nvxModels = (ports: PortSpec[]): UnitModel[] => [
  { id: 'dm-md36x', name: 'DM-MD36x', verified: false, ports },
  { id: 'dm-md38x', name: 'DM-MD38x', verified: false, ports },
]

const GENERIC = (id: string, name: string, ports: PortSpec[]): UnitModel[] => [
  { id, name, verified: true, ports },
]

export const UNIT_KINDS: UnitKind[] = [
  {
    id: 'source',
    label: 'Source',
    side: 'source',
    color: '#38bdf8',
    icon: 'M5 6h14v9H5z M3 19h18',
    suggest: ['Resolution', 'IP mode', 'IP address', 'Signal'],
    models: GENERIC('source', 'Generic source', [p('hdmi-out', 'HDMI OUT', 'hdmi', 'out'), p('lan', 'LAN', 'lan', 'io', 'R')]),
  },
  {
    id: 'display',
    label: 'Display',
    side: 'display',
    color: '#34d399',
    icon: 'M3 5h18v11H3z M9 20h6 M12 16v4',
    suggest: ['Resolution', 'Input', 'IP address'],
    models: GENERIC('display', 'Generic display', [
      p('hdmi-in', 'HDMI IN', 'hdmi', 'in'),
      p('lan', 'LAN', 'lan', 'io', 'L'),
      p('rs232', 'RS-232', 'serial', 'io', 'L'),
    ]),
  },
  {
    id: 'nvx-tx',
    label: 'NVX transmitter',
    side: 'source',
    color: '#a78bfa',
    icon: 'M3 7h12v10H3z M15 12h6 M18 9l3 3-3 3',
    suggest: ['Mode', 'Stream address', 'IP mode', 'IP address'],
    models: nvxModels(NVX_ENCODER_PORTS),
  },
  {
    id: 'nvx-rx',
    label: 'NVX receiver',
    side: 'display',
    color: '#a78bfa',
    icon: 'M9 7h12v10H9z M3 12h6 M6 9l3 3-3 3',
    suggest: ['Mode', 'Stream address', 'IP mode', 'IP address'],
    models: nvxModels(NVX_DECODER_PORTS),
  },
  {
    id: 'switch',
    label: 'Network switch',
    side: null,
    color: '#94a3b8',
    icon: 'M3 8h18v8H3z M7 12h.01 M11 12h.01 M15 12h.01',
    suggest: ['IP address', 'VLAN'],
    models: GENERIC(
      'switch-8',
      '8-port switch',
      // Transmitters connect on the left, receivers on the right.
      Array.from({ length: 8 }, (_, i) => p(`lan-${i + 1}`, `PORT ${i + 1}`, 'lan', 'io', i < 4 ? 'L' : 'R')),
    ),
  },
  {
    id: 'dm-tx',
    label: 'DM transmitter',
    side: 'source',
    color: '#2dd4bf',
    icon: 'M3 7h12v10H3z M15 12h6 M18 9l3 3-3 3',
    suggest: ['Cable', 'Resolution'],
    models: [],
    legacy: true,
  },
  {
    id: 'dm-rx',
    label: 'DM receiver',
    side: 'display',
    color: '#2dd4bf',
    icon: 'M9 7h12v10H9z M3 12h6 M6 9l3 3-3 3',
    suggest: ['Cable', 'Resolution'],
    models: [],
    legacy: true,
  },
  {
    id: 'wallplate',
    label: 'Wall plate / extender',
    side: null,
    color: '#fbbf24',
    icon: 'M6 3h12v18H6z M10 9h4 M10 13h4',
    suggest: ['Cable', 'Signal'],
    models: [],
    legacy: true,
  },
  {
    id: 'other',
    label: 'Other',
    side: null,
    color: '#94a3b8',
    icon: 'M12 3l9 5v8l-9 5-9-5V8z',
    suggest: ['Notes', 'IP address'],
    models: [],
    legacy: true,
  },
]

/** The column a port is drawn in: its own preference, else inputs left and outputs right; two-way ports have none. */
export const specSide = (s: PortSpec): 'L' | 'R' | undefined =>
  s.side ?? (s.dir === 'in' ? 'L' : s.dir === 'out' ? 'R' : undefined)

export const getUnitKind = (id: string): UnitKind =>
  UNIT_KINDS.find((k) => k.id === id) ?? UNIT_KINDS[UNIT_KINDS.length - 1]

/** The model a unit uses: its saved choice if still valid, else the kind's first. */
export const getUnitModel = (kindId: string, modelId?: string): UnitModel | undefined => {
  const models = getUnitKind(kindId).models
  return models.find((m) => m.id === modelId) ?? models[0]
}

/** Ports of a unit, or [] for the plain legacy boxes. */
export const unitPortSpecs = (kindId: string, modelId?: string): PortSpec[] =>
  getUnitModel(kindId, modelId)?.ports ?? []
