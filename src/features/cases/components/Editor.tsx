import type { ClipboardEvent, KeyboardEvent, ReactNode, RefObject, UIEvent } from "react";
import { useRef } from "react";
import { TrashIcon, CopyIcon } from "./icons";
import { FlaggedBar } from "./FlaggedBar";
import { FormatToolbar } from "./FormatToolbar";
import { PlaceholderBar } from "./PlaceholderBar";
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
  placeholders: FlaggedMatch[];
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  onClear: () => void;
  onCopy: () => void;
  onCopyPlain: () => void;
  onJumpToFlagged: () => void;
  onRemoveFlagged: () => void;
  onJumpToPlaceholder: () => void;
  onBold: () => void;
  onBullets: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  className?: string;
};

/** Shared by the textarea and its highlight mirror — they must wrap identically. */
const FIELD_TEXT =
  "px-5 py-4 text-[15px] leading-relaxed [scrollbar-gutter:stable]";

/** The draft split into plain runs and highlighted placeholder runs. */
function highlight(text: string, matches: FlaggedMatch[]) {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const m of matches) {
    parts.push(text.slice(at, m.start));
    parts.push(
      <mark
        key={m.start}
        className="rounded-sm bg-yellow-300/35 text-transparent shadow-[0_0_0_2px_rgba(253,224,71,0.35)]"
      >
        {m.text}
      </mark>,
    );
    at = m.end;
  }
  // The trailing space keeps a final newline from collapsing the last line.
  parts.push(text.slice(at) + " ");
  return parts;
}

/** The response draft: a toolbar with Clear / Copy and a full-height textarea. */
export function Editor({
  value,
  editorRef,
  justCopied,
  justCopiedPlain,
  flagged,
  placeholders,
  onChange,
  onKeyDown,
  onPaste,
  onClear,
  onCopy,
  onCopyPlain,
  onJumpToFlagged,
  onRemoveFlagged,
  onJumpToPlaceholder,
  onBold,
  onBullets,
  onIndent,
  onOutdent,
  className,
}: EditorProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const hasPlaceholders = placeholders.length > 0;
  const copyBlocked = "Fill in or delete every [placeholder] first";

  const syncScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop;
  };

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
            disabled={!value || hasPlaceholders}
            title={
              hasPlaceholders
                ? copyBlocked
                : "Copy as plain text only, without list formatting"
            }
            className={GHOST_BTN}
          >
            {justCopiedPlain ? "Copied" : "Plain text"}
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={hasPlaceholders}
            title={
              hasPlaceholders
                ? copyBlocked
                : "Copy with real bullet lists for Salesforce, Notes and email — plain fields get tidy • lines"
            }
            className={`text-on-brand inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
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
      <PlaceholderBar matches={placeholders} onJump={onJumpToPlaceholder} />
      <div className="relative min-h-0 flex-1">
        {/* Mirror of the draft sitting behind the transparent textarea: same
            metrics, so each [placeholder] gets a yellow highlight exactly under
            its text. Scroll is synced from the textarea. */}
        <div
          ref={backdropRef}
          aria-hidden
          className={`${FIELD_TEXT} pointer-events-none absolute inset-0 overflow-hidden break-words whitespace-pre-wrap text-transparent`}
        >
          {highlight(value, placeholders)}
        </div>
        <textarea
          ref={editorRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onScroll={syncScroll}
          placeholder="Start typing your email here…"
          className={`${FIELD_TEXT} text-ink placeholder:text-ink-faint relative h-full w-full resize-none bg-transparent focus:outline-none`}
        />
      </div>
    </section>
  );
}
