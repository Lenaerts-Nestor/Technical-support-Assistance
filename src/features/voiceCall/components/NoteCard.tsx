import { ModeToggle } from "./ModeToggle";
import { AlertIcon, UsersIcon, WrenchIcon } from "./icons";
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

const ACCENTS: Record<
  NoteAccent,
  { header: string; Icon: (p: { className?: string }) => React.ReactElement }
> = {
  rose: { header: "bg-rose-50 text-rose-600", Icon: AlertIcon },
  amber: { header: "bg-amber-50 text-amber-600", Icon: UsersIcon },
  sky: { header: "bg-sky-50 text-sky-600", Icon: WrenchIcon },
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
  const { header, Icon } = ACCENTS[accent];

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white ${className ?? ""}`}
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-2.5 ${header}`}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {label}
          </span>
        </div>
        <ModeToggle mode={mode} onChange={onModeChange} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="h-72 min-h-64 w-full flex-1 resize-y px-4 py-3 text-[15px] leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
    </section>
  );
}
