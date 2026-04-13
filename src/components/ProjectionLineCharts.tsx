import React from "react";
import { buildLinePath, getChartFrame } from "../lib/chart";
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
  projection: Projection;
  results: ProjectionResults;
  currentYear: number;
};

function EmptyChart({ ariaLabel }: EmptyChartProps) {
  return (
    <svg viewBox="0 0 720 320" role="img" aria-label={ariaLabel}>
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
    <svg viewBox="0 0 720 320" role="img" aria-label={ariaLabel}>
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

export function NetWorthChart({ projection, results, currentYear }: ProjectionChartProps) {
  return (
    <ProjectionLineChart
      ariaLabel="Net worth over time chart"
      currentYear={currentYear}
      projection={projection}
      rows={results.projection}
      series={[
        { key: "assetsGross", stroke: "var(--teal)" },
        { key: "homeEquity", stroke: "var(--clay)" },
        {
          key: "residualCash",
          stroke: "var(--ink-soft)",
          strokeDasharray: "7 7",
        },
        { key: "netWorth", stroke: "var(--ink)", strokeWidth: 4 },
      ]}
    />
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
