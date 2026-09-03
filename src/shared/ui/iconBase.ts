/**
 * The house icon style: a 2px stroked outline on a 24×24 grid.
 *
 * Kept apart from `icons.tsx` because that file may only export components —
 * a non-component export there breaks fast refresh. Feature icon files spread
 * {@link ICON_BASE} onto their `<svg>` so a new glyph matches without
 * redeclaring the attributes.
 *
 * (`features/rma/components/icons.tsx` is deliberately a separate filled
 * family; don't fold it into this one without a design decision.)
 */

export type IconProps = { className?: string }

export const ICON_BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}
