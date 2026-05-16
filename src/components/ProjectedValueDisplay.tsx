import { InlineLabelLayout } from "./InlineLabelLayout";
import { MetricDelta, type MetricDeltaValue } from "./MetricDelta";

type ProjectedValueDisplayProps = {
  delta?: MetricDeltaValue;
  label: string;
  mobileInline?: boolean;
  value: string;
};

export function ProjectedValueDisplay({ delta, label, mobileInline = false, value }: ProjectedValueDisplayProps) {
  return (
    <InlineLabelLayout label={label} mobileInline={mobileInline}>
      <div className="grid min-h-9 content-center justify-items-end lg:justify-items-start">
        <div className="text-sm font-semibold text-ink-soft">{value}</div>
        {delta == null ? null : <MetricDelta delta={delta} />}
      </div>
    </InlineLabelLayout>
  );
}
