/**
 * Actual screenshots for the guide, imported from `images/` so Vite bundles
 * and hashes them like any other asset. A step with no screenshot yet just
 * isn't in `STEP_IMAGES`; `ImageSlot` falls back to a placeholder for those.
 */

import stepOpenVsCode from './images/step-1-open-vscode.png'
import stepGitBashTerminal from './images/step-2-git-bash-terminal.png'
import stepCreateProject from './images/step-3-create-project.png'
import stepNpmInstall from './images/step-4-npm-install.png'
import stepNpmRunDev from './images/step-5-npm-run-dev.png'
import stepBrowser from './images/step-6-browser.png'

export const STEP_IMAGES: Record<string, string> = {
  'step-1-open-vscode.png': stepOpenVsCode,
  'step-2-git-bash-terminal.png': stepGitBashTerminal,
  'step-3-create-project.png': stepCreateProject,
  'step-4-npm-install.png': stepNpmInstall,
  'step-5-npm-run-dev.png': stepNpmRunDev,
  'step-6-browser.png': stepBrowser,
}

export { default as appTsxStructureImg } from './images/apptsxStructure.png'
export { default as whatIsVercelImg } from './images/whatIsVercel.png'
export { default as githubProjectImg } from './images/githubProject.png'
