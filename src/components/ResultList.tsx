import React from "react";
const rowClassName = "flex justify-between gap-4 border-b border-(--line) py-3 max-md:flex-col max-md:items-start";

type ResultListItem = {
  label: string;
  value: React.ReactNode;
};

type ResultListProps = {
  items: ResultListItem[];
  live?: boolean;
};

export function ResultList({ items, live = false }: ResultListProps) {
  return (
    <div className="mt-4 grid" aria-live={live ? "polite" : undefined}>
      {items.map((item: ResultListItem) => (
        <div key={item.label} className={rowClassName}>
          <span className="text-(--ink-soft)">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
