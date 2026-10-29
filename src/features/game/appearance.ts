/** How the hero looks: purely cosmetic, chosen on the start screen. */

export type HelmetId = 'great' | 'open' | 'horned'
export type ArmorId = 'leather' | 'mail' | 'plate'
export type ColorId = 'amber' | 'crimson' | 'azure' | 'emerald' | 'violet' | 'ivory'

export type Appearance = { helmet: HelmetId; armor: ArmorId; color: ColorId }

export type Swatch = { name: string; main: string; dark: string; deep: string; light: string }

export const COLORS: Record<ColorId, Swatch> = {
  amber: { name: 'Amber', main: '#f5a93a', dark: '#b9741c', deep: '#8f5712', light: '#ffd27a' },
  crimson: { name: 'Crimson', main: '#d6525c', dark: '#a33a44', deep: '#7a2a33', light: '#ff9a9a' },
  azure: { name: 'Azure', main: '#5aa0e0', dark: '#3d78b3', deep: '#2b5885', light: '#a9d2f5' },
  emerald: { name: 'Emerald', main: '#4fbf8a', dark: '#37906a', deep: '#27684c', light: '#9fe0c0' },
  violet: { name: 'Violet', main: '#9a7ae0', dark: '#7658b8', deep: '#563f8a', light: '#cdb9f5' },
  ivory: { name: 'Ivory', main: '#e8e0d0', dark: '#b9b09c', deep: '#8a826f', light: '#ffffff' },
}

export const HELMETS: { id: HelmetId; name: string; blurb: string }[] = [
  { id: 'great', name: 'Great helm', blurb: 'Closed visor and a tall plume' },
  { id: 'open', name: 'Open face', blurb: 'Cheek guards and a short crest' },
  { id: 'horned', name: 'Horned helm', blurb: 'Swept horns, no plume' },
]

export const ARMORS: { id: ArmorId; name: string; blurb: string }[] = [
  { id: 'plate', name: 'Plate', blurb: 'Polished steel plates' },
  { id: 'mail', name: 'Chainmail', blurb: 'Rings of grey mail' },
  { id: 'leather', name: 'Leather', blurb: 'Stitched hide and straps' },
]

export const COLOR_IDS = Object.keys(COLORS) as ColorId[]

export const DEFAULT_LOOK: Appearance = { helmet: 'great', armor: 'plate', color: 'amber' }

/** Read a look back from storage, refusing anything that is not one. */
export function reviveLook(raw: unknown): Appearance | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { helmet, armor, color } = raw as Record<string, unknown>
  const ok = HELMETS.some((h) => h.id === helmet) && ARMORS.some((a) => a.id === armor) && COLOR_IDS.includes(color as ColorId)
  return ok ? (raw as Appearance) : null
}
