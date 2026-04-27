import { MetricDelta, type MetricDeltaValue } from "./MetricDelta";
import { labelTextClass } from "../lib/text";

type ProjectedValueDisplayProps = {
  delta?: MetricDeltaValue;
  label: string;
  value: string;
};

export function ProjectedValueDisplay({ delta, label, value }: ProjectedValueDisplayProps) {
  return (
    <div className="grid gap-1">
      <div className={labelTextClass}>{label}</div>
      <div className="grid min-h-10 content-center">
        <div className="text-base font-semibold text-(--ink-soft)">{value}</div>
        {delta == null ? null : <MetricDelta delta={delta} />}
      </div>
    </div>
  );
}
