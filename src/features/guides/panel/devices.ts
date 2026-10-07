/**
 * Rear-panel templates for the interactive panel block. Hardware layouts live
 * here, in code, so every guide that picks a device shares one drawing and a
 * layout fix lands everywhere. A guide only stores the device id plus its own
 * notes and troubleshooting checks (see `PanelPart`).
 *
 * Coordinates are in SVG user units. These are schematics for orientation, not
 * to-scale drawings; `note` is shown under the diagram to say so.
 */

export type PortKind = 'input' | 'output' | 'network' | 'control' | 'power'

export type PortDef = {
  id: string
  /** Full name, shown in the detail panel and pickers. */
  label: string
  /** Short text drawn on the port itself. */
  short: string
  kind: PortKind
  x: number
  y: number
  w: number
  h: number
}

export type ZoneDef = { label: string; x: number; y: number; w: number; h: number }

export type DeviceDef = {
  id: string
  name: string
  summary: string
  width: number
  height: number
  zones: ZoneDef[]
  ports: PortDef[]
  note: string
}

export const PORT_KIND_LABEL: Record<PortKind, string> = {
  input: 'Input',
  output: 'Output',
  network: 'Network',
  control: 'Control',
  power: 'Power',
}

/** Legend swatch per port kind. */
export const KIND_DOT: Record<PortKind, string> = {
  input: 'bg-sky-400',
  output: 'bg-emerald-400',
  network: 'bg-violet-400',
  control: 'bg-amber-400',
  power: 'bg-rose-400',
}

const SCHEMATIC_NOTE =
  'Schematic layout for orientation, not to scale. Confirm exact port positions against the unit\'s rear panel.'

/** `count` ports in a grid, numbered left to right then top to bottom. */
function slotGrid(
  prefix: 'in' | 'out',
  label: string,
  kind: 'input' | 'output',
  originX: number,
): PortDef[] {
  const cols = 8
  const w = 44
  const h = 74
  const gap = 8
  const rowGap = 12
  const top = 76
  return Array.from({ length: 16 }, (_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      id: `${prefix}-${i + 1}`,
      label: `${label} ${i + 1}`,
      short: String(i + 1),
      kind,
      x: originX + col * (w + gap),
      y: top + row * (h + rowGap),
      w,
      h,
    }
  })
}

const DM_MD16X16: DeviceDef = {
  id: 'dm-md16x16',
  name: 'DM-MD16X16',
  summary: '16×16 DigitalMedia switcher: 16 input slots, 16 output slots, control and power.',
  width: 960,
  height: 380,
  zones: [
    { label: 'Inputs', x: 24, y: 44, w: 440, h: 208 },
    { label: 'Outputs', x: 496, y: 44, w: 440, h: 208 },
    { label: 'Control & power', x: 24, y: 272, w: 912, h: 84 },
  ],
  ports: [
    ...slotGrid('in', 'Input', 'input', 40),
    ...slotGrid('out', 'Output', 'output', 512),
    { id: 'lan', label: 'LAN', short: 'LAN', kind: 'network', x: 44, y: 300, w: 90, h: 44 },
    { id: 'cresnet', label: 'Cresnet', short: 'CRESNET', kind: 'control', x: 150, y: 300, w: 90, h: 44 },
    { id: 'rs232', label: 'RS-232', short: 'RS-232', kind: 'control', x: 256, y: 300, w: 90, h: 44 },
    { id: 'usb', label: 'USB', short: 'USB', kind: 'control', x: 362, y: 300, w: 90, h: 44 },
    { id: 'power', label: 'AC power', short: 'POWER', kind: 'power', x: 826, y: 300, w: 90, h: 44 },
  ],
  note: SCHEMATIC_NOTE,
}

const NVX: DeviceDef = {
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
  ports: [
    { id: 'hdmi-in', label: 'HDMI in', short: 'HDMI IN', kind: 'input', x: 40, y: 78, w: 120, h: 50 },
    { id: 'hdmi-out', label: 'HDMI out', short: 'HDMI OUT', kind: 'output', x: 188, y: 78, w: 120, h: 50 },
    { id: 'audio-in', label: 'Audio in', short: 'AUDIO IN', kind: 'input', x: 356, y: 78, w: 120, h: 50 },
    { id: 'audio-out', label: 'Audio out', short: 'AUDIO OUT', kind: 'output', x: 488, y: 78, w: 112, h: 50 },
    { id: 'rs232', label: 'RS-232', short: 'RS-232', kind: 'control', x: 40, y: 190, w: 100, h: 44 },
    { id: 'ir', label: 'IR out', short: 'IR', kind: 'control', x: 156, y: 190, w: 100, h: 44 },
    { id: 'usb', label: 'USB', short: 'USB', kind: 'control', x: 272, y: 190, w: 116, h: 44 },
    { id: 'lan', label: 'LAN (PoE+)', short: 'LAN PoE+', kind: 'network', x: 436, y: 190, w: 90, h: 44 },
    { id: 'power', label: 'DC power', short: 'POWER', kind: 'power', x: 536, y: 190, w: 64, h: 44 },
  ],
  note: SCHEMATIC_NOTE,
}

export const DEVICES: DeviceDef[] = [DM_MD16X16, NVX]

export const DEFAULT_DEVICE_ID = DM_MD16X16.id

export const getDevice = (id: string): DeviceDef | undefined =>
  DEVICES.find((d) => d.id === id)

export const portCenter = (p: PortDef) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 })
