import type { RefObject } from "react";
import { TrashIcon, CopyIcon } from "./icons";
import { FlaggedBar } from "./FlaggedBar";
import type { FlaggedMatch } from "../types";
import {
  CARD,
  CARD_HEADER,
  COUNT_BADGE,
  GHOST_BTN,
  SECTION_LABEL,
} from "../../../shared/ui/styles";

type EditorProps = {
  value: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  justCopied: boolean;
  flagged: FlaggedMatch[];
  onChange: (value: string) => void;
  onClear: () => void;
  onCopy: () => void;
  onJumpToFlagged: () => void;
  onRemoveFlagged: () => void;
  className?: string;
};

/** The response draft: a toolbar with Clear / Copy and a full-height textarea. */
export function Editor({
  value,
  editorRef,
  justCopied,
  flagged,
  onChange,
  onClear,
  onCopy,
  onJumpToFlagged,
  onRemoveFlagged,
  className,
}: EditorProps) {
  return (
    <section
      className={`${CARD} flex flex-col overflow-hidden ${className ?? ""}`}
    >
      <div className={CARD_HEADER}>
        <div className="flex items-center gap-2">
          <span className={SECTION_LABEL}>Editor</span>
          <span className={COUNT_BADGE}>{value.length} chars</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={!value}
            className={GHOST_BTN}
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={onCopy}
            className={`text-on-brand inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              justCopied ? "bg-emerald-400" : "bg-brand hover:bg-brand-strong"
            }`}
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {justCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <FlaggedBar
        matches={flagged}
        onJump={onJumpToFlagged}
        onRemove={onRemoveFlagged}
      />
      <textarea
        ref={editorRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing your email here…"
        className="text-ink placeholder:text-ink-faint w-full flex-1 resize-none px-5 py-4 text-[15px] leading-relaxed focus:outline-none"
      />
    </section>
  );
}
