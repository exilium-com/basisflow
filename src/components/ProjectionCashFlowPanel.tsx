import clsx from "clsx";
import { formatMetricDelta, metricDeltaBetween, MetricDelta } from "./MetricDelta";
import { usd } from "../lib/format";
import { labelTextClass } from "../lib/text";
import { colors } from "../lib/colors";

type MonthlyCashFlowItem = {
  label: string;
  value: number;
  color: string;
};

type MonthlyCashFlowPanelProps = {
  comparison?: {
    items: MonthlyCashFlowItem[];
    netFlow: number;
  } | null;
  items: MonthlyCashFlowItem[];
  netFlow: number;
};

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarPoint(cx, cy, outerRadius, startAngle);
  const endOuter = polarPoint(cx, cy, outerRadius, endAngle);
  const startInner = polarPoint(cx, cy, innerRadius, startAngle);
  const endInner = polarPoint(cx, cy, innerRadius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function deltaColor(good: boolean | null) {
  return good == null ? "var(--ink-soft)" : good ? "var(--teal)" : "var(--destructive)";
}

export function MonthlyCashFlowPanel({ comparison, items, netFlow }: MonthlyCashFlowPanelProps) {
  const cx = 112;
  const cy = 112;
  const outerRadius = 82;
  const innerRadius = 50;
  const sliceTotal = items.reduce((sum, item) => sum + item.value, 0);
  const comparisonItemsByLabel = new Map((comparison?.items ?? []).map((item) => [item.label, item]));
  const netFlowDelta = metricDeltaBetween(netFlow, comparison?.netFlow);
  let currentAngle = -Math.PI / 2;

  function getComparisonValue(item: MonthlyCashFlowItem) {
    if (!comparison) {
      return null;
    }

    if (item.label === "Excess" || item.label === "Shortfall") {
      return comparison.netFlow;
    }

    return comparisonItemsByLabel.get(item.label)?.value ?? 0;
  }

  function betterDirection(item: MonthlyCashFlowItem) {
    return item.label === "Retirement" || item.label === "Excess" || item.label === "Shortfall" ? "higher" : "lower";
  }

  function getItemDelta(item: MonthlyCashFlowItem) {
    const comparisonValue = getComparisonValue(item);

    if (comparisonValue == null) {
      return undefined;
    }

    return item.label === "Excess" || item.label === "Shortfall"
      ? metricDeltaBetween(netFlow, comparison?.netFlow, "higher")
      : metricDeltaBetween(item.value, comparisonValue, betterDirection(item));
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex w-full justify-center sm:w-60 sm:shrink-0">
        <svg
          className="h-auto w-full max-w-56"
          viewBox="0 0 224 224"
          role="img"
          aria-label="Monthly cash flow breakdown"
        >
          <circle cx={cx} cy={cy} r={outerRadius} fill="var(--white)" stroke="var(--line-soft)" />
          {sliceTotal > 0
            ? items.map((item: MonthlyCashFlowItem) => {
                const sliceAngle = (item.value / sliceTotal) * Math.PI * 2;
                const startAngle = currentAngle;
                const endAngle = currentAngle + sliceAngle;
                currentAngle = endAngle;

                return (
                  <path
                    key={item.label}
                    d={describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle)}
                    fill={item.color}
                    stroke="var(--white)"
                    strokeWidth="2"
                  />
                );
              })
            : null}
          <circle cx={cx} cy={cy} r={innerRadius} fill="var(--white-soft)" />
          <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--ink-soft)" fontSize="12">
            Net monthly
          </text>
          <text
            x={cx}
            y={netFlowDelta == null ? cy + 10 : cy + 6}
            textAnchor="middle"
            fill={netFlow >= 0 ? colors.teal : colors.destructive}
            fontSize="18"
            fontWeight="700"
          >
            {usd(netFlow)}
          </text>
          {netFlowDelta == null ? null : (
            <text
              x={cx}
              y={cy + 18}
              textAnchor="middle"
              fill={deltaColor(netFlowDelta.good)}
              fontSize="10"
              fontWeight="700"
            >
              {formatMetricDelta(netFlowDelta.value)}
            </text>
          )}
        </svg>
      </div>
      <div className="grid min-w-0 flex-1 gap-2">
        {items.map((item: MonthlyCashFlowItem, index: number) => {
          const delta = getItemDelta(item);

          return (
            <div
              key={item.label}
              className={clsx(
                "flex items-start justify-between gap-4 py-2",
                index < items.length - 1 && "border-b border-(--line)",
              )}
            >
              <div className="flex min-w-0 items-center gap-4">
                <i className="size-4" style={{ background: item.color }} />
                <span className={labelTextClass}>{item.label}</span>
              </div>
              <span className="grid justify-items-end">
                <strong>{usd(item.value)}</strong>
                {delta == null ? null : <MetricDelta delta={delta} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
