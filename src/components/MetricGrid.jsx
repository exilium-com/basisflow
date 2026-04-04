import React from "react";

export function MetricGrid({ items }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2.5">
      {items.map((item, index) => (
        <div key={item.label} className={index === 0 ? "" : "border-t border-(--line) pt-2.5"}>
          <span className="mb-1 block text-sm text-(--ink-soft)">{item.label}</span>
          <span className="text-lg font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
