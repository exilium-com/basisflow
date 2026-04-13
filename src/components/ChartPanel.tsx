import React from "react";
import { numberTextClass } from "../lib/text";

type ChartLegendItem = {
  label: string;
  color: string;
};

type ChartPanelProps = {
  title: React.ReactNode;
  legend?: ChartLegendItem[];
  children: React.ReactNode;
};

export function ChartPanel({ title, legend = [], children }: ChartPanelProps) {
  return (
    <div className="border border-(--line-soft) bg-(--white-soft)">
      <div className="p-4 pb-0">
        <h3 className={numberTextClass}>{title}</h3>
      </div>
      {children}
      {legend.length ? (
        <div className={`mt-4 flex items-center justify-between gap-2 overflow-hidden px-4 pb-4 text-xs text-(--ink-soft)`}>
          {legend.map((item: ChartLegendItem) => (
            <span key={item.label} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <i className="size-4 shrink-0" style={{ background: item.color }}></i>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
