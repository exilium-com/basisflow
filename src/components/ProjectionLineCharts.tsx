import { PINNED_BUCKETS } from "../lib/assetsModel";
import { buildAreaPath, buildLinePath, getChartFrame } from "../lib/chart";
import { colorVars } from "../lib/colors";
import { clamp, usd } from "../lib/format";
import { toDisplayValue, type Projection } from "../lib/projectionState";
import { type ProjectionResults } from "../lib/projectionCalculation";
import { type ProjectionRow } from "../lib/projectionUtils";

type ProjectionSeriesItem = {
  key: keyof Pick<ProjectionRow, "assetsGross" | "homeEquity" | "residualCash" | "netWorth" | "capitalGainsTax">;
  stroke: string;
  strokeWidth?: number;
  strokeDasharray?: string;
};

type EmptyChartProps = {
  ariaLabel: string;
};

type ProjectionLineChartProps = {
  ariaLabel: string;
  currentYear: number;
  projection: Projection;
  rows: ProjectionRow[];
  series: ProjectionSeriesItem[];
  valueDomain?: "span" | "zeroToMax";
};

type ProjectionChartProps = {
  comparison?: {
    projection: Projection;
    results: ProjectionResults;
  } | null;
  projection: Projection;
  results: ProjectionResults;
  currentYear: number;
};

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1000000) {
    const millions = value / 1000000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return usd(value);
}

function getRoundedAxisMax(value: number) {
  if (value <= 0) {
    return 1;
  }
  if (value <= 1000000) {
    return Math.ceil(value / 100000) * 100000;
  }
  return Math.ceil(value / 1000000) * 1000000;
}

const RETIREMENT_BUCKET_IDS = new Set([
  PINNED_BUCKETS.retirementBucketId.id,
  PINNED_BUCKETS.iraBucketId.id,
  PINNED_BUCKETS.megaBucketId.id,
  PINNED_BUCKETS.hsaBucketId.id,
]);

function EmptyChart({ ariaLabel }: EmptyChartProps) {
  return (
    <svg className="h-auto w-full" viewBox="0 0 720 320" role="img" aria-label={ariaLabel}>
      <rect x="18" y="18" width="684" height="284" fill="var(--white-soft)" stroke="var(--line-soft)" />
    </svg>
  );
}

function ProjectionLineChart({
  ariaLabel,
  currentYear,
  projection,
  rows,
  series,
  valueDomain = "span",
}: ProjectionLineChartProps) {
  if (!rows.length) {
    return <EmptyChart ariaLabel={ariaLabel} />;
  }

  const { height, innerWidth, innerHeight, plotLeft, plotTop, plotRight, plotBottom } = getChartFrame();
  const displayProjection = rows.map((row) => ({
    year: row.year,
    values: Object.fromEntries(series.map((item) => [item.key, toDisplayValue(row[item.key], row.year, projection)])),
  }));
  const totalYears = displayProjection.length;
  const allValues = displayProjection.flatMap((row) => series.map((item) => row.values[item.key]));
  const minValue = valueDomain === "zeroToMax" ? 0 : Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 1);
  const span = Math.max(maxValue - minValue, 1);

  function pointFor(value: number, index: number) {
    return {
      x: plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth,
      y: plotTop + ((maxValue - value) / span) * innerHeight,
    };
  }

  const markerX = plotLeft + (currentYear / Math.max(projection.horizonYears, 1)) * innerWidth;
  const zeroY = clamp(plotTop + ((maxValue - 0) / span) * innerHeight, plotTop, plotBottom);

  return (
    <svg className="h-auto w-full" viewBox="0 0 720 320" role="img" aria-label={ariaLabel}>
      <rect
        x={plotLeft}
        y={plotTop}
        width={innerWidth}
        height={innerHeight}
        fill="var(--white)"
        stroke="var(--line-soft)"
      />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const value = maxValue - span * fraction;
        const y = plotTop + innerHeight * fraction;
        return (
          <g key={fraction}>
            <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="var(--line-soft)" strokeDasharray="4 8" />
            <text x={plotLeft - 12} y={y + 5} textAnchor="end" fill="var(--ink-soft)" fontSize="12">
              {usd(value)}
            </text>
          </g>
        );
      })}
      {valueDomain === "span" ? <line x1={plotLeft} y1={zeroY} x2={plotRight} y2={zeroY} stroke="var(--line)" /> : null}
      <line x1={markerX} y1={plotTop} x2={markerX} y2={plotBottom} stroke="var(--line)" strokeDasharray="5 6" />
      {series.map((item: ProjectionSeriesItem) => (
        <path
          key={item.key}
          d={buildLinePath(displayProjection.map((row, index) => pointFor(Number(row.values[item.key]), index)))}
          fill="none"
          stroke={item.stroke}
          strokeWidth={item.strokeWidth ?? 3}
          strokeDasharray={item.strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--line)" />
      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="var(--line)" />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Projected value
      </text>
      {displayProjection.map((row, index: number) => {
        if (!(index === 0 || index === displayProjection.length - 1 || row.year % 5 === 0)) {
          return null;
        }
        const x = plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth;
        return (
          <g key={row.year}>
            <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 6} stroke="var(--line)" />
            <text x={x} y={height - 12} textAnchor="middle" fill="var(--ink-soft)" fontSize="12">
              {row.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function NetWorthChart({ comparison, projection, results, currentYear }: ProjectionChartProps) {
  const rows = results.projection;

  if (!rows.length) {
    return <EmptyChart ariaLabel="Net worth over time chart" />;
  }

  const { height, innerWidth, innerHeight, plotLeft, plotTop, plotRight, plotBottom } = getChartFrame();
  const totalYears = rows.length;
  const comparisonRows =
    comparison?.results.projection.map((row) => ({
      year: row.year,
      netWorth: toDisplayValue(row.netWorth, row.year, comparison.projection),
    })) ?? [];
  const stackedRows = rows.map((row) => {
    const cash = toDisplayValue(
      row.bucketSnapshotsById[PINNED_BUCKETS.reserveCashBucketId.id]?.balance ?? 0,
      row.year,
      projection,
    );
    const retirement = toDisplayValue(
      Object.values(row.bucketSnapshotsById).reduce(
        (sum, bucket) => sum + (RETIREMENT_BUCKET_IDS.has(bucket.id) ? bucket.balance : 0),
        0,
      ),
      row.year,
      projection,
    );
    const otherAssets = toDisplayValue(
      Object.values(row.bucketSnapshotsById).reduce(
        (sum, bucket) =>
          sum +
          (bucket.id !== PINNED_BUCKETS.reserveCashBucketId.id && !RETIREMENT_BUCKET_IDS.has(bucket.id)
            ? bucket.balance
            : 0),
        0,
      ),
      row.year,
      projection,
    );
    const homeEquity = toDisplayValue(row.homeEquity, row.year, projection);
    const rsus = toDisplayValue(
      projection.includeVestedRsusInNetWorth ? row.vestedRsuBalance : 0,
      row.year,
      projection,
    );

    return {
      year: row.year,
      cash,
      retirement,
      otherAssets,
      homeEquity,
      rsus,
      netWorth: toDisplayValue(row.netWorth, row.year, projection),
    };
  });
  const maxValue = getRoundedAxisMax(
    Math.max(...stackedRows.map((row) => row.netWorth), ...comparisonRows.map((row) => row.netWorth), 1),
  );

  function pointFor(value: number, index: number) {
    return {
      x: plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth,
      y: plotTop + ((maxValue - value) / maxValue) * innerHeight,
    };
  }

  const markerX = plotLeft + (currentYear / Math.max(projection.horizonYears, 1)) * innerWidth;
  const cashPoints = stackedRows.map((row, index) => pointFor(row.cash, index));
  const retirementPoints = stackedRows.map((row, index) => pointFor(row.cash + row.retirement, index));
  const otherAssetPoints = stackedRows.map((row, index) =>
    pointFor(row.cash + row.retirement + row.otherAssets, index),
  );
  const homeEquityPoints = stackedRows.map((row, index) =>
    pointFor(row.cash + row.retirement + row.otherAssets + row.homeEquity, index),
  );
  const rsuPoints = stackedRows.map((row, index) =>
    pointFor(row.cash + row.retirement + row.otherAssets + row.homeEquity + row.rsus, index),
  );
  const netWorthLine = stackedRows.map((row, index) => pointFor(row.netWorth, index));
  const comparisonLine = comparisonRows.map((row) => ({
    x: plotLeft + (row.year / Math.max(projection.horizonYears, 1)) * innerWidth,
    y: plotTop + ((maxValue - row.netWorth) / maxValue) * innerHeight,
  }));

  return (
    <svg className="h-auto w-full" viewBox="0 0 720 320" role="img" aria-label="Net worth over time chart">
      <rect
        x={plotLeft}
        y={plotTop}
        width={innerWidth}
        height={innerHeight}
        fill="var(--white)"
        stroke="var(--line-soft)"
      />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const value = maxValue * (1 - fraction);
        const y = plotTop + innerHeight * fraction;
        return (
          <g key={fraction}>
            <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="var(--line-soft)" strokeDasharray="4 8" />
            <text x={plotLeft - 12} y={y + 5} textAnchor="end" fill="var(--ink-soft)" fontSize="12">
              {formatAxisValue(value)}
            </text>
          </g>
        );
      })}
      <path d={buildAreaPath(rsuPoints, plotBottom)} fill={colorVars.chartRsus} />
      <path d={buildAreaPath(homeEquityPoints, plotBottom)} fill={colorVars.chartHomeEquity} />
      <path d={buildAreaPath(otherAssetPoints, plotBottom)} fill={colorVars.chartOtherAssets} />
      <path d={buildAreaPath(retirementPoints, plotBottom)} fill={colorVars.chartRetirement} />
      <path d={buildAreaPath(cashPoints, plotBottom)} fill={colorVars.chartCash} />
      <line x1={markerX} y1={plotTop} x2={markerX} y2={plotBottom} stroke="var(--line)" strokeDasharray="5 6" />
      <path
        d={buildLinePath(netWorthLine)}
        fill="none"
        stroke={colorVars.chartNetWorth}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {comparisonLine.length ? (
        <path
          d={buildLinePath(comparisonLine)}
          fill="none"
          stroke="var(--clay)"
          strokeWidth="3"
          strokeDasharray="8 8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--line)" />
      <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="var(--line)" />
      {stackedRows.map((row, index: number) => {
        if (!(index === 0 || index === stackedRows.length - 1 || row.year % 5 === 0)) {
          return null;
        }
        const x = plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth;
        return (
          <g key={row.year}>
            <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 6} stroke="var(--line)" />
            <text x={x} y={height - 12} textAnchor="middle" fill="var(--ink-soft)" fontSize="12">
              {row.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AssetTaxChart({ projection, results, currentYear }: ProjectionChartProps) {
  return (
    <ProjectionLineChart
      ariaLabel="Projected asset gross value and capital gains tax chart"
      currentYear={currentYear}
      projection={projection}
      rows={results.projection}
      series={[
        {
          key: "capitalGainsTax",
          stroke: "var(--clay)",
          strokeDasharray: "8 8",
        },
        { key: "assetsGross", stroke: "var(--teal)", strokeWidth: 4 },
      ]}
      valueDomain="zeroToMax"
    />
  );
}
