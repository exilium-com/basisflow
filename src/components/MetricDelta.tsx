import { usd } from "../lib/format";

type MetricDeltaProps = {
  value: number;
};

export function formatMetricDelta(value: number) {
  return value < 0 ? `(${usd(Math.abs(value))})` : usd(value);
}

export function MetricDelta({ value }: MetricDeltaProps) {
  return (
    <span className={`text-xs font-bold ${value >= 0 ? "text-(--teal)" : "text-(--destructive)"}`}>
      {formatMetricDelta(value)}
    </span>
  );
}
