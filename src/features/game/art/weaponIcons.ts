import type { WeaponId } from '../weapons'

/**
 * Small line icons for the weapons, on a 24 by 24 grid in the same stroked style as the rest of
 * the app's icons. They are plain SVG path strings so the menus can render them as `<path>` and
 * the canvas HUD can draw the very same shapes with `Path2D`.
 */
export const WEAPON_ICONS: Record<WeaponId, readonly string[]> = {
  swordShield: ['M4 20 L16 8 L18.5 5.5', 'M6 14 L10 18', 'M15 13 L21 13 L21 17 C21 19.5 18 21 18 21 C18 21 15 19.5 15 17 Z'],
  longSword: ['M3 21 L19 5 L21 3', 'M6 14 L10 18'],
  mace: [
    'M4 20 L14 10',
    'M17 7 m-3.2 0 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0',
    'M17 3.8 V1.5 M17 10.2 V12.5 M13.8 7 H11.5 M20.2 7 H22.5 M14.7 4.7 L13.1 3.1 M19.3 4.7 L20.9 3.1 M14.7 9.3 L13.1 10.9 M19.3 9.3 L20.9 10.9',
  ],
  bow: ['M8 3 C17 7 17 17 8 21', 'M8 3 L8 21', 'M3 12 H19 M19 12 L16 10 M19 12 L16 14'],
}
