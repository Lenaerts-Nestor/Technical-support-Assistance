import type { IconProps } from '../../../shared/ui/iconBase'
import type { ToolId } from '../kevinGuideData'
import {
  EslintIcon,
  GitIcon,
  NodeIcon,
  TailwindIcon,
  TypeScriptIcon,
  VercelIcon,
  ViteIcon,
  VsCodeIcon,
} from './icons'

/**
 * Kept out of `icons.tsx` — that file must stay component-only exports or Vite
 * fast refresh breaks (see `shared/ui/iconBase.ts`'s own note on this).
 */
export const TOOL_ICONS: Record<ToolId, (props: IconProps) => React.ReactElement> = {
  git: GitIcon,
  typescript: TypeScriptIcon,
  vite: ViteIcon,
  tailwind: TailwindIcon,
  vercel: VercelIcon,
  eslint: EslintIcon,
  node: NodeIcon,
  vscode: VsCodeIcon,
}
