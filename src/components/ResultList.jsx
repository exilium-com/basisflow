import React from "react";
const rowClassName = "flex justify-between gap-4 border-b border-(--line) py-3 max-md:flex-col max-md:items-start";

export function ResultList({ items, live = false }) {
  return (
    <div className="mt-4 grid" aria-live={live ? "polite" : undefined}>
      {items.map((item) => (
        <div key={item.label} className={rowClassName}>
          <span className="text-(--ink-soft)">{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
