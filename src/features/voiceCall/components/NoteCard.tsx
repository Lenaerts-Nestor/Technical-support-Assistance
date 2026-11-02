import { ModeToggle } from "./ModeToggle";
import { CARD } from "../../../shared/ui/styles";
import type { NoteAccent, NoteMode } from "../types";

type NoteCardProps = {
  label: string;
  placeholder: string;
  accent: NoteAccent;
  value: string;
  mode: NoteMode;
  onValueChange: (value: string) => void;
  onModeChange: (mode: NoteMode) => void;
  className?: string;
};

/**
 * Each note template has a role colour so the three cards stay distinguishable at a glance
 * mid-call: coral for the current fault, amber for what the client tried, lavender for the
 * work done. The colour is a thin top edge and a rail beside the title — the title itself
 * says what the card is, so colour is only a second cue.
 */
const ACCENTS: Record<NoteAccent, { top: string; rail: string }> = {
  rose: { top: "border-t-rose-400", rail: "bg-rose-400" },
  amber: { top: "border-t-amber-400", rail: "bg-amber-400" },
  sky: { top: "border-t-sky-400", rail: "bg-sky-400" },
};

/** One free-text note template with a Text / Bullets mode switch. */
export function NoteCard({
  label,
  placeholder,
  accent,
  value,
  mode,
  onValueChange,
  onModeChange,
  className,
}: NoteCardProps) {
  const { top, rail } = ACCENTS[accent];

  return (
    <section
      className={`${CARD} focus-within:ring-focus/50 flex flex-col overflow-hidden border-t-[3px] focus-within:ring-2 ${top} ${className ?? ""}`}
    >
      <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className={`h-4 w-1 shrink-0 rounded-full ${rail}`} />
          <h3 className="text-ink truncate text-sm font-bold tracking-tight">{label}</h3>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="text-ink placeholder:text-ink-faint h-[22rem] min-h-64 w-full flex-1 resize-y bg-transparent px-4 py-3.5 text-[15px] leading-relaxed focus:outline-none"
      />
    </section>
  );
}
