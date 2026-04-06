import React from "react";

type MetricGridItem = {
  label: string;
  value: React.ReactNode;
};

type MetricGridProps = {
  items: MetricGridItem[];
};

export function MetricGrid({ items }: MetricGridProps) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2.5">
      {items.map((item: MetricGridItem, index: number) => (
        <div key={item.label} className={index === 0 ? "" : "border-t border-(--line) pt-2.5"}>
          <span className="mb-1 block text-sm text-(--ink-soft)">{item.label}</span>
          <span className="text-lg font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
