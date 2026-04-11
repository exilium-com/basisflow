import React from "react";
const rowClassName = "flex justify-between gap-4 border-b border-(--line) py-3 max-md:flex-col max-md:items-start";

type ResultListItem = {
  label: string;
  value: React.ReactNode;
};

type ResultListProps = {
  items: ResultListItem[];
  live?: boolean;
  compact?: boolean;
};

export function ResultList({ items, live = false, compact = false }: ResultListProps) {
  return (
    <div className={compact ? "mt-1 grid" : "mt-4 grid"} aria-live={live ? "polite" : undefined}>
      {items.map((item: ResultListItem) => (
        <div key={item.label} className={compact ? "flex justify-between gap-3 border-b border-(--line) py-2" : rowClassName}>
          <span className={compact ? "text-sm text-(--ink-soft)" : "text-(--ink-soft)"}>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
