import type { RefObject } from "react";
import { ClearIcon, CopyIcon } from "./icons";

type EditorProps = {
  value: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  justCopied: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onCopy: () => void;
};

/** The response draft: a toolbar with Clear / Copy and a full-height textarea. */
export function Editor({
  value,
  editorRef,
  justCopied,
  onChange,
  onClear,
  onCopy,
}: EditorProps) {
  return (
    <section className="flex min-h-[750px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Editor
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={!value}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
          >
            <ClearIcon className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {justCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <textarea
        ref={editorRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing your email here…"
        className="w-full flex-1 resize-none px-4 py-3 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
    </section>
  );
}
