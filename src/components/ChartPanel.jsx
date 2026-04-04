import React from "react";

export function ChartPanel({ title, legend = [], children }) {
  return (
    <div className="border border-(--line-soft) bg-(--white-soft)">
      <div className="px-4 pt-4">
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      {children}
      {legend.length ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3 px-4 pb-4 text-sm text-(--ink-soft)">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-2">
              <i className="inline-block h-3 w-3" style={{ background: item.color }}></i>
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
