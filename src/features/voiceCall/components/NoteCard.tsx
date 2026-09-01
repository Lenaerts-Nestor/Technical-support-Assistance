import { ModeToggle } from "./ModeToggle";
import { AlertIcon, UsersIcon, WrenchIcon } from "./icons";
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
 * Each note template gets a colour so the three cards stay distinguishable at a
 * glance mid-call: the band tints the header and a matching rail marks the edge.
 */
const ACCENTS: Record<
  NoteAccent,
  {
    band: string;
    rail: string;
    Icon: (p: { className?: string }) => React.ReactElement;
  }
> = {
  rose: {
    band: "border-rose-400/35 bg-rose-400/12 text-rose-200",
    rail: "bg-rose-400",
    Icon: AlertIcon,
  },
  amber: {
    band: "border-amber-400/35 bg-amber-400/12 text-amber-200",
    rail: "bg-amber-400",
    Icon: UsersIcon,
  },
  sky: {
    band: "border-sky-400/35 bg-sky-400/12 text-sky-200",
    rail: "bg-sky-400",
    Icon: WrenchIcon,
  },
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
  const { band, rail, Icon } = ACCENTS[accent];

  return (
    <section
      className={`${CARD} flex flex-col overflow-hidden ${className ?? ""}`}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b px-4 py-2.5 ${band}`}
      >
        <div className="flex items-center gap-2">
          <span className={`h-4 w-1 shrink-0 rounded-full ${rail}`} />
          <Icon className="h-4 w-4" />
          <span className="text-xs font-semibold tracking-[0.06em] uppercase">
            {label}
          </span>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="text-ink placeholder:text-ink-faint h-72 min-h-64 w-full flex-1 resize-y px-4 py-3 text-[15px] leading-relaxed focus:outline-none"
      />
    </section>
  );
}
