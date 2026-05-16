import React from "react";
import clsx from "clsx";
import { numberTextClass } from "../lib/text";

type ChartLegendItem = {
  label: string;
  color: string;
};

type ChartPanelProps = {
  title: React.ReactNode;
  action?: React.ReactNode;
  legend?: ChartLegendItem[];
  children: React.ReactNode;
};

const chartLegendClassName = clsx(
  "mt-4 flex flex-wrap items-center gap-2 px-4 pb-4",
  "text-xs text-ink-soft lg:flex-nowrap",
);

export function ChartPanel({ title, action = null, legend = [], children }: ChartPanelProps) {
  return (
    <div className="min-w-0 border border-line-soft bg-white-soft">
      <div className="flex items-start justify-between gap-4 p-4 pb-0">
        <h3 className={numberTextClass}>{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
      {legend.length ? (
        <div className={chartLegendClassName}>
          {legend.map((item: ChartLegendItem) => (
            <span key={item.label} className="flex items-center gap-2 whitespace-nowrap">
              <i className="size-4 shrink-0" style={{ background: item.color }}></i>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
