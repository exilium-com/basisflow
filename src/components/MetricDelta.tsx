import clsx from "clsx";
import { usd } from "../lib/format";

export type MetricDeltaValue = {
  good: boolean | null;
  value: number;
};

type MetricDeltaProps = {
  delta: MetricDeltaValue;
};

export function formatMetricDelta(value: number) {
  if (value === 0) {
    return usd(0);
  }

  return `${value > 0 ? "+" : "-"}${usd(Math.abs(value))}`;
}

export function metricDeltaBetween(
  value: number,
  comparisonValue: number | null | undefined,
  better: "higher" | "lower" = "higher",
) {
  if (comparisonValue == null) {
    return undefined;
  }

  const good =
    value === comparisonValue ? null : better === "higher" ? value > comparisonValue : value < comparisonValue;
  return { value: value - comparisonValue, good };
}

export function MetricDelta({ delta }: MetricDeltaProps) {
  return (
    <span
      className={clsx(
        "text-xs font-bold",
        delta.good === null && "text-(--ink-soft)",
        delta.good === true && "text-(--teal)",
        delta.good === false && "text-(--destructive)",
      )}
    >
      {formatMetricDelta(delta.value)}
    </span>
  );
}
