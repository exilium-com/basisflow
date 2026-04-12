import React from "react";
import clsx from "clsx";

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
    <div className="grid gap-2">
      {primaryItem ? (
        <div className="grid gap-1 border-b border-(--line) pb-4">
          <span className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">{primaryItem.label}</span>
          <strong className="font-serif text-4xl leading-none tracking-tight text-(--teal)">
            {primaryItem.value}
          </strong>
        </div>
      ) : null}

      {items.map((item: MetricGridItem, index: number) => (
        <div
          key={item.label}
          className={clsx("grid gap-1", index > 0 ? "border-t border-(--line) pt-2" : primaryItem && "pt-2")}
        >
          <span className="text-sm text-(--ink-soft)">{item.label}</span>
          <span className="text-lg font-bold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
