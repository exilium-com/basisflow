import { MetricDelta } from "./MetricDelta";
import { labelTextClass } from "../lib/text";

type ProjectedValueDisplayProps = {
  deltaValue?: number;
  label: string;
  value: string;
};

export function ProjectedValueDisplay({ deltaValue, label, value }: ProjectedValueDisplayProps) {
  return (
    <div className="grid gap-1">
      <div className={labelTextClass}>{label}</div>
      <div className="grid min-h-10 content-center">
        <div className="text-base font-semibold text-(--ink-soft)">{value}</div>
        {deltaValue == null ? null : <MetricDelta value={deltaValue} />}
      </div>
    </div>
  );
}
