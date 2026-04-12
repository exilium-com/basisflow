import React from "react";
import { labelTextClass } from "../lib/text";

type ProjectedValueDisplayProps = {
  label: string;
  value: string;
};

export function ProjectedValueDisplay({ label, value }: ProjectedValueDisplayProps) {
  return (
    <div className="grid gap-1">
      <div className={labelTextClass}>{label}</div>
      <div className="flex min-h-10 items-center text-base font-semibold text-(--ink-soft)">
        {value}
      </div>
    </div>
  );
}
