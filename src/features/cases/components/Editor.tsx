import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";
import { TrashIcon, CopyIcon } from "./icons";
import { FlaggedBar } from "./FlaggedBar";
import { FormatToolbar } from "./FormatToolbar";
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
  justCopiedPlain: boolean;
  flagged: FlaggedMatch[];
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  onClear: () => void;
  onCopy: () => void;
  onCopyPlain: () => void;
  onJumpToFlagged: () => void;
  onRemoveFlagged: () => void;
  onBold: () => void;
  onBullets: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  className?: string;
};

/** The response draft: a toolbar with Clear / Copy and a full-height textarea. */
export function Editor({
  value,
  editorRef,
  justCopied,
  justCopiedPlain,
  flagged,
  onChange,
  onKeyDown,
  onPaste,
  onClear,
  onCopy,
  onCopyPlain,
  onJumpToFlagged,
  onRemoveFlagged,
  onBold,
  onBullets,
  onIndent,
  onOutdent,
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
            onClick={onCopyPlain}
            disabled={!value}
            title="Copy as plain text only, without list formatting"
            className={GHOST_BTN}
          >
            {justCopiedPlain ? "Copied" : "Plain text"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            title="Copy with real bullet lists for Salesforce, Notes and email — plain fields get tidy • lines"
            className={`text-on-brand inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              justCopied ? "bg-emerald-400" : "bg-brand hover:bg-brand-strong"
            }`}
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {justCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <FormatToolbar onBold={onBold} onBullets={onBullets} onIndent={onIndent} onOutdent={onOutdent} />
      <FlaggedBar
        matches={flagged}
        onJump={onJumpToFlagged}
        onRemove={onRemoveFlagged}
      />
      <textarea
        ref={editorRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder="Start typing your email here…"
        className="text-ink placeholder:text-ink-faint w-full flex-1 resize-none px-5 py-4 text-[15px] leading-relaxed focus:outline-none"
      />
    </section>
  );
}
