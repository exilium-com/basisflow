import React from "react";

type SummaryStripProps = {
  kicker: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
};

export function SummaryStrip({ kicker, value, note = null }: SummaryStripProps) {
  return (
    <div className="grid gap-2 border-b border-(--line) pb-4">
      <p className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">{kicker}</p>
      <strong className="block font-serif text-5xl leading-none tracking-tight text-(--teal) md:text-6xl">
        {value}
      </strong>
      {note ? <p className="max-w-prose pt-1 leading-relaxed text-(--ink-soft)">{note}</p> : null}
    </div>
  );
}
