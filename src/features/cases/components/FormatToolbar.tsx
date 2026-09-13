import { ICON_BTN } from "../../../shared/ui/styles";
import { BoldIcon, BulletListIcon } from "./icons";

type FormatToolbarProps = {
  onBold: () => void;
  onBullets: () => void;
};

/**
 * Formatting actions for the draft. Bold (Ctrl+B) swaps the selection for
 * Unicode bold characters — the draft only ever copies as plain text, so
 * that's the only "bold" that survives into an email or case system. Bullets
 * prefixes the touched lines with "• ".
 */
export function FormatToolbar({ onBold, onBullets }: FormatToolbarProps) {
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
      <button
        type="button"
        onClick={onBullets}
        title="Bullet list"
        className={ICON_BTN}
      >
        <BulletListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
