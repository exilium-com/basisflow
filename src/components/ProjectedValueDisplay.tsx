import React from "react";

type ProjectedValueDisplayProps = {
  label: string;
  value: string;
};

export function ProjectedValueDisplay({ label, value }: ProjectedValueDisplayProps) {
  return (
    <div className="grid gap-1">
      <div className="text-sm text-(--ink-soft)">{label}</div>
      <div className="min-h-10 pt-2 text-base font-semibold text-(--ink-soft) sm:text-lg">{value}</div>
    </div>
  );
}
