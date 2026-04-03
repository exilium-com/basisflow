import React from "react";

export function SummaryStrip({ kicker, value, note = null }) {
  return (
    <div className="border-b border-(--line) pb-4">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-(--ink-soft)">
        {kicker}
      </p>
      <strong className="block break-words font-serif text-5xl leading-none tracking-tight text-(--teal) md:text-6xl">
        {value}
      </strong>
      {note ? (
        <p className="mt-3 max-w-prose leading-relaxed text-(--ink-soft)">
          {note}
        </p>
      ) : null}
    </div>
  );
}
