/**
 * Catalog of unit types that can sit around a device: what the picker offers,
 * how a box is drawn, and which detail lines to suggest. Generic hardware
 * classes only; names, rooms and addresses live in the guide file.
 */

export type UnitKind = {
  id: string
  label: string
  /** Which side of the unit it belongs on by default; null = same side as what it hangs off. */
  side: 'source' | 'display' | null
  color: string
  /** 24×24 stroke icon path(s). */
  icon: string
  /** Detail lines offered as one-click chips. */
  suggest: string[]
}

export const UNIT_KINDS: UnitKind[] = [
  {
    id: 'source',
    label: 'Source',
    side: 'source',
    color: '#38bdf8',
    icon: 'M5 6h14v9H5z M3 19h18',
    suggest: ['Resolution', 'IP mode', 'IP address', 'Signal'],
  },
  {
    id: 'display',
    label: 'Display',
    side: 'display',
    color: '#34d399',
    icon: 'M3 5h18v11H3z M9 20h6 M12 16v4',
    suggest: ['Resolution', 'Input', 'IP address'],
  },
  {
    id: 'nvx-tx',
    label: 'NVX encoder',
    side: 'source',
    color: '#a78bfa',
    icon: 'M3 7h12v10H3z M15 12h6 M18 9l3 3-3 3',
    suggest: ['Mode', 'Stream address', 'IP mode', 'IP address'],
  },
  {
    id: 'nvx-rx',
    label: 'NVX receiver',
    side: 'display',
    color: '#a78bfa',
    icon: 'M9 7h12v10H9z M3 12h6 M6 9l3 3-3 3',
    suggest: ['Mode', 'Stream address', 'IP mode', 'IP address'],
  },
  {
    id: 'dm-tx',
    label: 'DM transmitter',
    side: 'source',
    color: '#2dd4bf',
    icon: 'M3 7h12v10H3z M15 12h6 M18 9l3 3-3 3',
    suggest: ['Cable', 'Resolution'],
  },
  {
    id: 'dm-rx',
    label: 'DM receiver',
    side: 'display',
    color: '#2dd4bf',
    icon: 'M9 7h12v10H9z M3 12h6 M6 9l3 3-3 3',
    suggest: ['Cable', 'Resolution'],
  },
  {
    id: 'wallplate',
    label: 'Wall plate / extender',
    side: null,
    color: '#fbbf24',
    icon: 'M6 3h12v18H6z M10 9h4 M10 13h4',
    suggest: ['Cable', 'Signal'],
  },
  {
    id: 'switch',
    label: 'Network switch',
    side: null,
    color: '#94a3b8',
    icon: 'M3 8h18v8H3z M7 12h.01 M11 12h.01 M15 12h.01',
    suggest: ['IP address', 'VLAN'],
  },
  {
    id: 'other',
    label: 'Other',
    side: null,
    color: '#94a3b8',
    icon: 'M12 3l9 5v8l-9 5-9-5V8z',
    suggest: ['Notes', 'IP address'],
  },
]

export const getUnitKind = (id: string): UnitKind =>
  UNIT_KINDS.find((k) => k.id === id) ?? UNIT_KINDS[UNIT_KINDS.length - 1]
