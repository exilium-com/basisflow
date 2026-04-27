import React from "react";
import clsx from "clsx";
import { MetricDelta, type MetricDeltaValue } from "./MetricDelta";
import { labelTextClass, numberTextClass, primaryNumberTextClass, smallCapsTextClass } from "../lib/text";

export type MetricGridItem = {
  delta?: MetricDeltaValue;
  label: React.ReactNode;
  value: React.ReactNode;
};

export type MetricGridProps = {
  items: MetricGridItem[];
  primaryItem?: MetricGridItem;
};

export function MetricGrid({ items, primaryItem }: MetricGridProps) {
  return (
    <div className="grid gap-2">
      {primaryItem ? (
        <div className="grid gap-1 border-b border-(--line) pb-4">
          <span className={smallCapsTextClass}>{primaryItem.label}</span>
          <div className="grid justify-items-start">
            <strong className={primaryNumberTextClass}>{primaryItem.value}</strong>
            {primaryItem.delta == null ? null : <MetricDelta delta={primaryItem.delta} />}
          </div>
        </div>
      ) : null}

      {items.map((item: MetricGridItem, index: number) => (
        <div
          key={index}
          className={clsx(
            "flex items-baseline justify-between gap-4",
            index > 0 ? "border-t border-(--line) pt-2" : primaryItem && "pt-2",
          )}
        >
          <span className={labelTextClass}>{item.label}</span>
          <span className="grid justify-items-end">
            <span className={numberTextClass}>{item.value}</span>
            {item.delta == null ? null : <MetricDelta delta={item.delta} />}
          </span>
        </div>
      ))}
    </div>
  );
}
