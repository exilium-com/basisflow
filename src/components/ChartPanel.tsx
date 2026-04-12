import React from "react";
import { labelTextClass, numberTextClass } from "../lib/text";

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
        <div className={`mt-4 flex flex-wrap gap-4 px-4 pb-4 ${labelTextClass}`}>
          {legend.map((item: ChartLegendItem) => (
            <span key={item.label} className="flex items-center gap-2">
              <i className="size-4" style={{ background: item.color }}></i>
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
