import { ICON_BTN } from "../../../shared/ui/styles";
import { BoldIcon, BulletListIcon, IndentIcon, OutdentIcon } from "./icons";

type FormatToolbarProps = {
  onBold: () => void;
  onBullets: () => void;
  onIndent: () => void;
  onOutdent: () => void;
};

/**
 * Formatting actions for the draft. Bold (Ctrl+B) swaps the selection for
 * Unicode bold characters — those are real characters, so they survive being
 * pasted anywhere. Bullets (Ctrl+Shift+8) puts one canonical "• " marker on the
 * touched lines; Enter then carries the list on, Tab / Shift+Tab nest it.
 * Copy turns those lines into a real list for rich editors (see `bullets.ts`).
 */
export function FormatToolbar({ onBold, onBullets, onIndent, onOutdent }: FormatToolbarProps) {
  return (
    <div className="border-line-soft flex items-center gap-1.5 border-b px-4 py-2">
      <button
        type="button"
        onClick={onBold}
        title="Bold (Ctrl+B)"
        className={ICON_BTN}
      >
        <BoldIcon className="h-4 w-4" />
      </button>
      <span aria-hidden className="bg-line mx-1 h-4 w-px" />
      <button
        type="button"
        onClick={onBullets}
        title="Bullet list (Ctrl+Shift+8)"
        className={ICON_BTN}
      >
        <BulletListIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onOutdent}
        title="Move bullet out (Shift+Tab)"
        aria-label="Move bullet out"
        className={ICON_BTN}
      >
        <OutdentIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onIndent}
        title="Nest bullet (Tab)"
        aria-label="Nest bullet"
        className={ICON_BTN}
      >
        <IndentIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
