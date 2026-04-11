import React from "react";

type ProjectedValueDisplayProps = {
  label: string;
  value: string;
};

export function ProjectedValueDisplay({ label, value }: ProjectedValueDisplayProps) {
  return (
    <div className="grid gap-1">
      <div className="text-sm text-(--ink-soft)">{label}</div>
      <div className="flex min-h-10 items-center text-base font-semibold text-(--ink-soft)">
        {value}
      </div>
    </div>
  );
}
