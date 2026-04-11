import React from "react";

type SummaryStripProps = {
  kicker: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  compact?: boolean;
};

export function SummaryStrip({ kicker, value, note = null, compact = false }: SummaryStripProps) {
  return (
    <div className={compact ? "grid gap-1.5 border-b border-(--line) pb-3" : "grid gap-2 border-b border-(--line) pb-4"}>
      <p className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">{kicker}</p>
      <strong
        className={
          compact
            ? "block font-serif text-4xl leading-none tracking-tight text-(--teal) md:text-5xl"
            : "block font-serif text-5xl leading-none tracking-tight text-(--teal) md:text-6xl"
        }
      >
        {value}
      </strong>
      {note ? <p className="max-w-prose pt-1 leading-relaxed text-(--ink-soft)">{note}</p> : null}
    </div>
  );
}
