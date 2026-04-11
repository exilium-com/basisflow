import React from "react";

type MetricGridItem = {
  label: string;
  value: React.ReactNode;
};

type MetricGridProps = {
  items: MetricGridItem[];
  primaryItem?: MetricGridItem;
};

export function MetricGrid({ items, primaryItem }: MetricGridProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {primaryItem ? (
        <div className="grid gap-1 border-b border-(--line) pb-3">
          <span className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">{primaryItem.label}</span>
          <strong className="block font-serif text-4xl leading-none tracking-tight text-(--teal) md:text-5xl">
            {primaryItem.value}
          </strong>
        </div>
      ) : null}

      {items.map((item: MetricGridItem, index: number) => (
        <div
          key={item.label}
          className={index > 0 ? "border-t border-(--line) pt-2.5" : primaryItem ? "pt-2.5" : ""}
        >
          <span className="mb-1 block text-sm text-(--ink-soft)">{item.label}</span>
          <span className="text-lg font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
