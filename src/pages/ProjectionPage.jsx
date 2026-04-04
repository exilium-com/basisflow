import React, { useEffect, useMemo, useState } from "react";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { ChartPanel } from "../components/ChartPanel";
import { DisplayToggle } from "../components/DisplayToggle";
import {
  CheckboxField,
  NumberField,
  SelectField,
  fieldLabelClass,
} from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { RowItem } from "../components/RowItem";
import { Section } from "../components/Section";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { buildLinePath, getChartFrame } from "../lib/chart";
import {
  calculateAssetSnapshot,
  createDefaultAssetsState,
  ensurePinnedRetirementBuckets,
  getVisiblePinnedRetirementBucketIds,
  normalizeAssetInputs,
  normalizeAssetsState,
} from "../lib/assetsModel";
import {
  createDefaultExpenseState,
  normalizeExpenseInputs,
  normalizeExpensesState,
} from "../lib/expensesModel";
import { clamp, usd } from "../lib/format";
import { loadStoredJson } from "../lib/storage";
import {
  buildIncomeDirectedContributions,
  calculateProjection,
  CASH_BUCKET_ID,
  createDefaultProjectionState,
  normalizeProjectionInputs,
  normalizeProjectionState,
  toDisplayValue,
} from "../lib/projectionModel";
import {
  loadTaxConfig,
  STORAGE_KEY as TAX_STORAGE_KEY,
} from "../lib/taxConfig";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";
import {
  ASSETS_STATE_KEY,
  EXPENSES_STATE_KEY,
  INCOME_SUMMARY_KEY,
  MORTGAGE_SUMMARY_KEY,
  PROJECTION_STATE_KEY,
} from "../lib/storageKeys";

function NetWorthChart({ inputs, results, currentYear }) {
  if (!results.projection.length) {
    return (
      <svg viewBox="0 0 720 320" role="img" aria-label="Net worth chart">
        <rect
          x="18"
          y="18"
          width="684"
          height="284"
          fill="var(--white-soft)"
          stroke="var(--line-soft)"
        />
      </svg>
    );
  }

  const {
    height,
    innerWidth,
    innerHeight,
    plotLeft,
    plotTop,
    plotRight,
    plotBottom,
  } = getChartFrame();
  const displayProjection = results.projection.map((row) => ({
    year: row.year,
    assets: toDisplayValue(row.assetsGross, row.year, inputs),
    homeEquity: toDisplayValue(row.homeEquity, row.year, inputs),
    reserveCash: toDisplayValue(row.residualCash, row.year, inputs),
    netWorth: toDisplayValue(row.netWorth, row.year, inputs),
  }));
  const totalYears = displayProjection.length;
  const minValue = Math.min(
    ...displayProjection.flatMap((row) => [
      row.netWorth,
      row.homeEquity,
      row.reserveCash,
      row.assets,
    ]),
    0,
  );
  const maxValue = Math.max(
    ...displayProjection.flatMap((row) => [
      row.netWorth,
      row.homeEquity,
      row.reserveCash,
      row.assets,
    ]),
    1,
  );
  const span = Math.max(maxValue - minValue, 1);

  function pointFor(value, index) {
    return {
      x: plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth,
      y: plotTop + ((maxValue - value) / span) * innerHeight,
    };
  }

  const assetPoints = displayProjection.map((row, index) =>
    pointFor(row.assets, index),
  );
  const homePoints = displayProjection.map((row, index) =>
    pointFor(row.homeEquity, index),
  );
  const reservePoints = displayProjection.map((row, index) =>
    pointFor(row.reserveCash, index),
  );
  const netWorthPoints = displayProjection.map((row, index) =>
    pointFor(row.netWorth, index),
  );
  const zeroY = clamp(
    plotTop + ((maxValue - 0) / span) * innerHeight,
    plotTop,
    plotBottom,
  );
  const markerX =
    plotLeft + (currentYear / Math.max(inputs.horizonYears, 1)) * innerWidth;

  return (
    <svg
      viewBox="0 0 720 320"
      role="img"
      aria-label="Net worth over time chart"
    >
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
            <line
              x1={plotLeft}
              y1={y}
              x2={plotRight}
              y2={y}
              stroke="var(--line-soft)"
              strokeDasharray="4 8"
            />
            <text
              x={plotLeft - 12}
              y={y + 5}
              textAnchor="end"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {usd(value)}
            </text>
          </g>
        );
      })}
      <line
        x1={plotLeft}
        y1={zeroY}
        x2={plotRight}
        y2={zeroY}
        stroke="var(--line)"
      />
      <line
        x1={markerX}
        y1={plotTop}
        x2={markerX}
        y2={plotBottom}
        stroke="var(--line)"
        strokeDasharray="5 6"
      />
      <path
        d={buildLinePath(assetPoints)}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={buildLinePath(homePoints)}
        fill="none"
        stroke="var(--clay)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={buildLinePath(reservePoints)}
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth="3"
        strokeDasharray="7 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={buildLinePath(netWorthPoints)}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={plotRight}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Projected value
      </text>
      {displayProjection.map((row, index) => {
        if (
          !(
            index === 0 ||
            index === displayProjection.length - 1 ||
            row.year % 5 === 0
          )
        ) {
          return null;
        }
        const x = plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth;
        return (
          <g key={row.year}>
            <line
              x1={x}
              y1={plotBottom}
              x2={x}
              y2={plotBottom + 6}
              stroke="var(--line)"
            />
            <text
              x={x}
              y={height - 12}
              textAnchor="middle"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {row.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AssetTaxChart({ inputs, results, currentYear }) {
  if (!results.projection.length) {
    return (
      <svg
        viewBox="0 0 720 320"
        role="img"
        aria-label="Asset gross value and embedded tax chart"
      >
        <rect
          x="18"
          y="18"
          width="684"
          height="284"
          fill="var(--white-soft)"
          stroke="var(--line-soft)"
        />
      </svg>
    );
  }

  const {
    height,
    innerWidth,
    innerHeight,
    plotLeft,
    plotTop,
    plotRight,
    plotBottom,
  } = getChartFrame();
  const displayProjection = results.projection.map((row) => ({
    year: row.year,
    assetsGross: toDisplayValue(row.assetsGross, row.year, inputs),
    capitalGainsTax: toDisplayValue(row.capitalGainsTax, row.year, inputs),
  }));
  const totalYears = displayProjection.length;
  const maxValue = Math.max(
    ...displayProjection.flatMap((row) => [
      row.assetsGross,
      row.capitalGainsTax,
    ]),
    1,
  );

  function pointFor(value, index) {
    return {
      x: plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth,
      y: plotTop + ((maxValue - value) / maxValue) * innerHeight,
    };
  }

  const grossPoints = displayProjection.map((row, index) =>
    pointFor(row.assetsGross, index),
  );
  const taxPoints = displayProjection.map((row, index) =>
    pointFor(row.capitalGainsTax, index),
  );
  const markerX =
    plotLeft + (currentYear / Math.max(inputs.horizonYears, 1)) * innerWidth;

  return (
    <svg
      viewBox="0 0 720 320"
      role="img"
      aria-label="Projected asset gross value and capital gains tax chart"
    >
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
            <line
              x1={plotLeft}
              y1={y}
              x2={plotRight}
              y2={y}
              stroke="var(--line-soft)"
              strokeDasharray="4 8"
            />
            <text
              x={plotLeft - 12}
              y={y + 5}
              textAnchor="end"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {usd(value)}
            </text>
          </g>
        );
      })}
      <line
        x1={markerX}
        y1={plotTop}
        x2={markerX}
        y2={plotBottom}
        stroke="var(--line)"
        strokeDasharray="5 6"
      />
      <path
        d={buildLinePath(taxPoints)}
        fill="none"
        stroke="var(--clay)"
        strokeWidth="3"
        strokeDasharray="8 8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={buildLinePath(grossPoints)}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={plotRight}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Projected value
      </text>
      {displayProjection.map((row, index) => {
        if (
          !(
            index === 0 ||
            index === displayProjection.length - 1 ||
            row.year % 5 === 0
          )
        ) {
          return null;
        }
        const x = plotLeft + (index / Math.max(totalYears - 1, 1)) * innerWidth;
        return (
          <g key={row.year}>
            <line
              x1={x}
              y1={plotBottom}
              x2={x}
              y2={plotBottom + 6}
              stroke="var(--line)"
            />
            <text
              x={x}
              y={height - 12}
              textAnchor="middle"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {row.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function polarPoint(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
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

function MonthlyCashFlowPanel({ items, total, netFlow }) {
  const cx = 112;
  const cy = 112;
  const outerRadius = 82;
  const innerRadius = 50;
  let currentAngle = -Math.PI / 2;

  return (
    <div className="grid gap-6 px-4 pb-4 pt-2 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
      <div className="flex justify-center">
        <svg viewBox="0 0 224 224" role="img" aria-label="Monthly cash flow breakdown">
          <circle
            cx={cx}
            cy={cy}
            r={outerRadius}
            fill="var(--white)"
            stroke="var(--line-soft)"
          />
          {total > 0
            ? items.map((item) => {
                const sliceAngle = (item.value / total) * Math.PI * 2;
                const startAngle = currentAngle;
                const endAngle = currentAngle + sliceAngle;
                currentAngle = endAngle;

                return (
                  <path
                    key={item.label}
                    d={describeDonutSlice(
                      cx,
                      cy,
                      outerRadius,
                      innerRadius,
                      startAngle,
                      endAngle,
                    )}
                    fill={item.color}
                    stroke="var(--white)"
                    strokeWidth="2"
                  />
                );
              })
            : null}
          <circle cx={cx} cy={cy} r={innerRadius} fill="var(--white-soft)" />
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fill="var(--ink-soft)"
            fontSize="12"
          >
            Net monthly
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill={netFlow >= 0 ? "var(--ink)" : "var(--danger)"}
            fontSize="18"
            fontWeight="700"
          >
            {usd(netFlow)}
          </text>
        </svg>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 border-b border-(--line) py-2"
          >
            <div className="inline-flex items-center gap-3">
              <i
                className="inline-block h-3 w-3"
                style={{ background: item.color }}
              />
              <span className="text-(--ink-soft)">{item.label}</span>
            </div>
            <strong>{usd(item.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function createDerivedProjectionBuckets(assetState, incomeDirectedContributions) {
  const visiblePinnedRetirementBucketIds = getVisiblePinnedRetirementBucketIds(
    assetState,
    incomeDirectedContributions,
  );
  const pinnedState = ensurePinnedRetirementBuckets(
    assetState,
    visiblePinnedRetirementBucketIds,
  );
  const buckets = [...pinnedState.buckets];

  if (!buckets.some((bucket) => bucket.id === CASH_BUCKET_ID)) {
    buckets.unshift({
      id: CASH_BUCKET_ID,
      taxTreatment: "none",
      name: "Cash",
      current: "0",
      contribution: "0",
      growth: "0",
      basis: "0",
      detailsOpen: false,
    });
  }

  const pinnedRetirementTargets = [...visiblePinnedRetirementBucketIds];
  const pinnedIds = [CASH_BUCKET_ID, ...pinnedRetirementTargets];

  return {
    ...pinnedState,
    buckets: buckets
      .map((bucket) =>
        bucket.id === CASH_BUCKET_ID
          ? {
              ...bucket,
              growth: "0",
              basis: bucket.current || "0",
            }
          : bucket,
      )
      .sort((left, right) => {
        const leftIndex = pinnedIds.indexOf(left.id);
        const rightIndex = pinnedIds.indexOf(right.id);

        if (leftIndex !== -1 || rightIndex !== -1) {
          if (leftIndex === -1) {
            return 1;
          }
          if (rightIndex === -1) {
            return -1;
          }
          return leftIndex - rightIndex;
        }

        return 0;
      }),
  };
}

export function ProjectionPage() {
  const [state, setState] = useStoredState(
    PROJECTION_STATE_KEY,
    createDefaultProjectionState,
    {
      normalize: normalizeProjectionState,
      localStorage: true,
      preferLocalStorage: true,
    },
  );
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    function handleStorage() {
      setRefreshVersion((current) => current + 1);
    }

    function handleVisibility() {
      if (!document.hidden) {
        setRefreshVersion((current) => current + 1);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener("pageshow", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const taxConfig = useMemo(() => loadTaxConfig(), [refreshVersion]);
  const incomeSummary = useMemo(
    () => loadStoredJson(INCOME_SUMMARY_KEY) ?? {},
    [refreshVersion],
  );
  const mortgageSummary = useMemo(
    () => loadStoredJson(MORTGAGE_SUMMARY_KEY) ?? {},
    [refreshVersion],
  );
  const rawAssetsState = useMemo(
    () => loadStoredJson(ASSETS_STATE_KEY, true) ?? createDefaultAssetsState(),
    [refreshVersion],
  );
  const rawExpensesState = useMemo(
    () =>
      loadStoredJson(EXPENSES_STATE_KEY, true) ?? createDefaultExpenseState(),
    [refreshVersion],
  );
  const assetState = useMemo(
    () => normalizeAssetsState(rawAssetsState, createDefaultAssetsState()),
    [rawAssetsState],
  );
  const expenseState = useMemo(
    () => normalizeExpensesState(rawExpensesState, createDefaultExpenseState()),
    [rawExpensesState],
  );
  const incomeDirectedContributions = useMemo(
    () => buildIncomeDirectedContributions(incomeSummary),
    [incomeSummary],
  );
  const projectionAssetState = useMemo(() => {
    const derivedState = createDerivedProjectionBuckets(
      assetState,
      incomeDirectedContributions,
    );

    return {
      ...derivedState,
      buckets: derivedState.buckets.map((bucket) => {
        const override = state.assetOverrides?.[bucket.id] ?? {};
        return {
          ...bucket,
          contribution: bucket.id === CASH_BUCKET_ID ? "0" : bucket.contribution,
          growth:
            bucket.id === CASH_BUCKET_ID
              ? "0"
              : typeof override.growth === "string"
                ? override.growth
                : "",
        };
      }),
    };
  }, [assetState, incomeDirectedContributions, state.assetOverrides]);
  const projectionExpenseState = useMemo(
    () => ({
      ...expenseState,
      expenses: expenseState.expenses.map((expense) => {
        const override = state.expenseOverrides?.[expense.id] ?? {};
        return {
          ...expense,
          growthRate:
            typeof override.growthRate === "string" ? override.growthRate : "",
        };
      }),
    }),
    [expenseState, state.expenseOverrides],
  );
  const assetInputs = useMemo(
    () => normalizeAssetInputs(projectionAssetState, state.assetGrowthRate),
    [projectionAssetState, state.assetGrowthRate],
  );
  const expenseInputs = useMemo(
    () =>
      normalizeExpenseInputs(projectionExpenseState, state.expenseGrowthRate),
    [projectionExpenseState, state.expenseGrowthRate],
  );
  const projectionInputs = useMemo(
    () =>
      normalizeProjectionInputs(
        state,
        assetInputs,
        incomeDirectedContributions,
      ),
    [state, assetInputs, incomeDirectedContributions],
  );
  const assetSnapshot = useMemo(
    () => calculateAssetSnapshot(assetInputs, taxConfig),
    [assetInputs, taxConfig],
  );
  const results = useMemo(
    () =>
      calculateProjection({
        incomeSummary,
        mortgageSummary,
        assetInputs,
        expenseInputs,
        projectionInputs,
        taxConfig,
      }),
    [
      incomeSummary,
      mortgageSummary,
      assetInputs,
      expenseInputs,
      projectionInputs,
      taxConfig,
    ],
  );

  function updateState(patch) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateAllocation(bucketId, value) {
    setState((current) => ({
      ...current,
      allocations: {
        ...current.allocations,
        [bucketId]: {
          mode:
            current.allocations?.[bucketId]?.mode === "amount"
              ? "amount"
              : "percent",
          value,
        },
      },
    }));
  }

  function updateAllocationMode(bucketId, mode) {
    setState((current) => ({
      ...current,
      allocations: {
        ...current.allocations,
        [bucketId]: {
          mode: mode === "amount" ? "amount" : "percent",
          value: current.allocations?.[bucketId]?.value ?? "0",
        },
      },
    }));
  }

  function toggleAssetOverrideDetails(bucketId, open) {
    updateAssetOverride(bucketId, { detailsOpen: open });
  }

  function toggleExpenseOverrideDetails(expenseId, open) {
    updateExpenseOverride(expenseId, { detailsOpen: open });
  }

  function updateAssetOverride(bucketId, patch) {
    setState((current) => ({
      ...current,
      assetOverrides: {
        ...current.assetOverrides,
        [bucketId]: {
          ...(current.assetOverrides?.[bucketId] ?? {}),
          ...patch,
        },
      },
    }));
  }

  function updateExpenseOverride(expenseId, patch) {
    setState((current) => ({
      ...current,
      expenseOverrides: {
        ...current.expenseOverrides,
        [expenseId]: {
          ...(current.expenseOverrides?.[expenseId] ?? {}),
          ...patch,
        },
      },
    }));
  }

  const selectedRow =
    projectionInputs.currentYear === 0
      ? {
          year: 0,
          takeHome: Number.isFinite(incomeSummary.annualTakeHome)
            ? incomeSummary.annualTakeHome
            : 0,
          nonHousingExpenses: results.annualExpenseTotal,
          mortgageLineItem: results.fixedMortgageAnnual,
          freeCashBeforeAllocation:
            (Number.isFinite(incomeSummary.annualTakeHome)
              ? incomeSummary.annualTakeHome
              : 0) -
            results.fixedMortgageAnnual -
            results.annualExpenseTotal,
          allocatedFreeCash: 0,
          rsuGross: Number.isFinite(incomeSummary.rsuGrossNextYear)
            ? incomeSummary.rsuGrossNextYear
            : 0,
          rsuNet: Number.isFinite(incomeSummary.rsuNetNextYear)
            ? incomeSummary.rsuNetNextYear
            : 0,
          bucketSnapshots: results.currentAssetSnapshots,
          bucketSnapshotsById: results.currentAssetSnapshotsById,
          expenseSnapshots: results.currentExpenseSnapshots,
          expenseSnapshotsById: results.currentExpenseSnapshotsById,
          vestedRsuBalance: results.currentVestedRsuBalance,
          assetsGross: results.currentAssetsGross,
          assetEmbeddedTax: results.currentAssetEmbeddedTax,
          capitalGainsTax: results.currentCapitalGainsTax,
          homeEquity: Number.isFinite(mortgageSummary.currentEquity)
            ? mortgageSummary.currentEquity
            : 0,
          residualCash:
            results.currentAssetSnapshotsById?.[CASH_BUCKET_ID]?.balance ?? 0,
          netWorth: results.currentNetWorth,
        }
      : (results.projection.find(
          (row) => row.year === projectionInputs.currentYear,
        ) ?? results.ending);
  const selectedYearLabel =
    projectionInputs.currentYear === 0
      ? "Today"
      : `Year ${projectionInputs.currentYear}`;

  const summaryItems = [
    {
      label: "Gross assets",
      value: usd(
        toDisplayValue(
          selectedRow.assetsGross ?? results.currentAssetsGross,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Home equity",
      value: usd(
        toDisplayValue(
          selectedRow.homeEquity ?? 0,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Capital gains tax",
      value: usd(
        toDisplayValue(
          selectedRow.capitalGainsTax ?? results.currentCapitalGainsTax,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Total capital gains",
      value: usd(
        toDisplayValue(
          selectedRow.totalCapitalGains ?? results.currentTotalCapitalGains,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Vested RSUs",
      value: usd(
        toDisplayValue(
          selectedRow.vestedRsuBalance ?? results.currentVestedRsuBalance,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
  ];
  const monthlyCashFlow = useMemo(() => {
    const growthFactor = Math.pow(
      1 + projectionInputs.takeHomeGrowthRate,
      Math.max(projectionInputs.currentYear, 0),
    );
    const grossIncome = toDisplayValue(
      Math.max(
        0,
        ((Number(incomeSummary.grossSalary) || 0) * growthFactor) / 12,
      ),
      projectionInputs.currentYear,
      projectionInputs,
    );
    const retirementSaving = toDisplayValue(
      (Math.max(0, Number(incomeSummary.employee401k) || 0) +
        Math.max(0, Number(incomeSummary.iraContribution) || 0) +
        Math.max(0, Number(incomeSummary.megaBackdoor) || 0) +
        Math.max(0, Number(incomeSummary.hsaContribution) || 0)) / 12,
      projectionInputs.currentYear,
      projectionInputs,
    );
    const takeHome = Math.max(
      0,
      toDisplayValue(
        (selectedRow.takeHome ?? 0) / 12,
        projectionInputs.currentYear,
        projectionInputs,
      ),
    );
    const taxes = Math.max(0, grossIncome - retirementSaving - takeHome);
    const mortgage = Math.max(
      0,
      toDisplayValue(
        (selectedRow.mortgageLineItem ?? 0) / 12,
        projectionInputs.currentYear,
        projectionInputs,
      ),
    );
    const expenses = Math.max(
      0,
      toDisplayValue(
        (selectedRow.nonHousingExpenses ?? 0) / 12,
        projectionInputs.currentYear,
        projectionInputs,
      ),
    );
    const excess = Math.max(
      0,
      grossIncome - taxes - retirementSaving - mortgage - expenses,
    );
    const shortfall = Math.max(
      0,
      taxes + retirementSaving + mortgage + expenses - grossIncome,
    );
    const items = [
      {
        label: "Taxes",
        value: taxes,
        color: "#d18a5b",
      },
      {
        label: "Retirement savings",
        value: retirementSaving,
        color: "#0d6a73",
      },
      {
        label: "Mortgage",
        value: mortgage,
        color: "#7c8e97",
      },
      {
        label: "Expenses",
        value: expenses,
        color: "#9cadb5",
      },
      {
        label: "Excess",
        value: excess,
        color: "#b8d8d9",
      },
      {
        label: "Shortfall",
        value: shortfall,
        color: "var(--danger)",
      },
    ].filter((item) => item.value > 0);

    return {
      items,
      netFlow: excess - shortfall,
      total: grossIncome,
    };
  }, [incomeSummary, projectionInputs, selectedRow]);
  const pinnedProjectionBucketIds = new Set([
    CASH_BUCKET_ID,
    ...getVisiblePinnedRetirementBucketIds(
      assetState,
      incomeDirectedContributions,
    ),
  ]);

  function getAssetOverrideSummary(bucket) {
    const override = state.assetOverrides?.[bucket.id] ?? {};
    const parts = [];
    if ((override.growth ?? "") !== "") {
      parts.push(`Growth ${override.growth}%`);
    }
    return parts.length ? parts.join(" · ") : null;
  }

  function getExpenseOverrideSummary(expense) {
    const growthRate = state.expenseOverrides?.[expense.id]?.growthRate ?? "";
    return growthRate !== "" ? `Growth ${growthRate}%` : null;
  }

  const snapshotLabelClass = "font-bold text-(--ink)";
  const snapshotValueClass = "mt-1 font-bold text-(--ink)";
  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <div className="grid gap-2 border-b border-(--line) pb-4">
                <p
                  className="text-xs font-extrabold tracking-widest
                    text-(--ink-soft) uppercase"
                >
                  {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
                </p>
                <div className="flex items-end justify-between gap-4">
                  <strong
                    className="block font-serif text-5xl leading-none
                      tracking-tight text-(--teal) md:text-6xl"
                  >
                    {usd(
                      toDisplayValue(
                        selectedRow.netWorth ?? results.ending.netWorth,
                        projectionInputs.currentYear,
                        projectionInputs,
                      ),
                    )}
                  </strong>
                  <DisplayToggle
                    value={state.displayMode}
                    onChange={(mode) => updateState({ displayMode: mode })}
                  />
                </div>
              </div>
              <div className="mt-4 border-b border-(--line) pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex flex-1 justify-center">
                    <div className="grid w-full max-w-md gap-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className={fieldLabelClass}>Current year</span>
                        <span className={fieldLabelClass}>
                          {selectedYearLabel}
                        </span>
                      </div>
                      <div
                        className="flex min-h-10 items-center border border-l-4
                          border-(--line) border-l-(--teal-soft) bg-(--white)
                          px-3"
                      >
                        <input
                          type="range"
                          min="0"
                          max={projectionInputs.horizonYears}
                          step="1"
                          value={projectionInputs.currentYear}
                          onChange={(event) =>
                            updateState({ currentYear: event.target.value })
                          }
                          className="slider-input w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <NumberField
                    label="Horizon"
                    className="md:w-32"
                    suffix="years"
                    min="1"
                    max="60"
                    step="1"
                    value={state.horizonYears}
                    onChange={(event) =>
                      updateState({ horizonYears: event.target.value })
                    }
                  />
                </div>
              </div>
              <ResultList items={summaryItems} />
              <AdvancedPanel
                id="advancedDetails"
                title="Projection parameters"
                open={state.advancedOpen}
                onToggle={(open) => updateState({ advancedOpen: open })}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <NumberField
                    label="Inflation"
                    suffix="%"
                    min="0"
                    step="0.1"
                    value={state.inflationRate}
                    onChange={(event) =>
                      updateState({ inflationRate: event.target.value })
                    }
                  />
                  <NumberField
                    label="Baseline asset growth"
                    suffix="%"
                    min="0"
                    step="0.1"
                    value={state.assetGrowthRate}
                    onChange={(event) =>
                      updateState({ assetGrowthRate: event.target.value })
                    }
                  />
                  <NumberField
                    label="RSU stock growth"
                    suffix="%"
                    min="-50"
                    step="0.1"
                    value={state.rsuStockGrowthRate}
                    onChange={(event) =>
                      updateState({ rsuStockGrowthRate: event.target.value })
                    }
                  />
                  <CheckboxField
                    label="Include vested RSUs"
                    checked={state.includeVestedRsusInNetWorth}
                    onChange={(event) =>
                      updateState({
                        includeVestedRsusInNetWorth: event.target.checked,
                      })
                    }
                  />
                  <NumberField
                    label="Baseline expense growth"
                    suffix="%"
                    min="-20"
                    step="0.1"
                    value={state.expenseGrowthRate}
                    onChange={(event) =>
                      updateState({ expenseGrowthRate: event.target.value })
                    }
                  />
                  <NumberField
                    label="Take-home growth"
                    suffix="%"
                    min="-10"
                    step="0.1"
                    value={state.takeHomeGrowthRate}
                    onChange={(event) =>
                      updateState({ takeHomeGrowthRate: event.target.value })
                    }
                  />
                  <NumberField
                    label="Home appreciation"
                    suffix="%"
                    min="-10"
                    step="0.1"
                    value={state.homeAppreciationRate}
                    onChange={(event) =>
                      updateState({ homeAppreciationRate: event.target.value })
                    }
                  />
                  <SelectField
                    label="Down payment funded by"
                    value={state.mortgageFundingBucketId}
                    onChange={(event) =>
                      updateState({
                        mortgageFundingBucketId: event.target.value,
                      })
                    }
                  >
                    <option value="">None</option>
                    {assetInputs.buckets.map((bucket) => (
                      <option key={bucket.id} value={bucket.id}>
                        {bucket.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </AdvancedPanel>
            </>
          }
        >
          <Section title="Assets">
            <div className="grid gap-2.5">
              {assetInputs.buckets.map((bucket) => (
                <RowItem
                  key={bucket.id}
                  pinned={pinnedProjectionBucketIds.has(bucket.id)}
                  headerClassName="grid items-start gap-4 lg:grid-cols-4"
                  detailsTitle="Asset overrides"
                  detailsSummary={getAssetOverrideSummary(bucket)}
                  detailsOpen={Boolean(
                    state.assetOverrides?.[bucket.id]?.detailsOpen,
                  )}
                  onToggleDetails={(open) =>
                    toggleAssetOverrideDetails(bucket.id, open)
                  }
                  detailsContentClassName="grid gap-3 sm:grid-cols-2"
                  header={
                    <>
                      <div className="min-w-0">
                        <div className={snapshotLabelClass}>{bucket.label}</div>
                      </div>
                      <div>
                        <div
                          className="text-xs font-extrabold tracking-wide
                            text-(--ink-soft) uppercase"
                        >
                          Current value
                        </div>
                        <div className={snapshotValueClass}>
                          {usd(bucket.current)}
                        </div>
                      </div>
                      {projectionInputs.currentYear !== 0 ? (
                        <div>
                          <div
                            className="text-xs font-extrabold tracking-wide
                              text-(--ink-soft) uppercase"
                          >
                            {selectedYearLabel}
                          </div>
                          <div className={snapshotValueClass}>
                            {usd(
                              toDisplayValue(
                                selectedRow.bucketSnapshotsById?.[bucket.id]
                                  ?.balance ?? bucket.current,
                                projectionInputs.currentYear,
                                projectionInputs,
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        <div aria-hidden="true" />
                      )}
                      <div className="grid min-w-0 gap-1">
                        <div className={fieldLabelClass}>Allocation</div>
                        {bucket.id === CASH_BUCKET_ID ? (
                          <NumberField
                            label={null}
                            className="min-w-0"
                            suffix="%"
                            inputClassName="text-(--ink-soft)"
                            min="0"
                            max="100"
                            step="1"
                            value={String(
                              Math.max(
                                0,
                                100 -
                                  Math.min(
                                    projectionInputs.allocationPercentTotal,
                                    100,
                                  ),
                              ),
                            )}
                            disabled
                            onChange={() => {}}
                          />
                        ) : (results.incomeDirectedContributions?.[bucket.id] ??
                            0) > 0 ? (
                          <NumberField
                            label={null}
                            className="min-w-0"
                            prefix="$"
                            inputClassName="text-(--ink-soft)"
                            min="0"
                            step="500"
                            value={String(
                              results.incomeDirectedContributions[bucket.id],
                            )}
                            disabled
                            onChange={() => {}}
                          />
                        ) : (
                          <div className="flex items-start gap-2">
                            <SegmentedToggle
                              ariaLabel={`${bucket.label} allocation mode`}
                              className="shrink-0"
                              value={
                                state.allocations?.[bucket.id]?.mode ??
                                "percent"
                              }
                              onChange={(mode) =>
                                updateAllocationMode(bucket.id, mode)
                              }
                              options={[
                                { value: "amount", label: "$" },
                                { value: "percent", label: "%" },
                              ]}
                            />
                            <NumberField
                              label={null}
                              className="min-w-0 flex-1"
                              min="0"
                              max={
                                (state.allocations?.[bucket.id]?.mode ??
                                  "percent") === "percent"
                                  ? "100"
                                  : undefined
                              }
                              step={
                                (state.allocations?.[bucket.id]?.mode ??
                                  "percent") === "percent"
                                  ? "1"
                                  : "500"
                              }
                              value={
                                state.allocations?.[bucket.id]?.value ?? "0"
                              }
                              onChange={(event) =>
                                updateAllocation(bucket.id, event.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                    </>
                  }
                >
                  <NumberField
                    label="Growth override"
                    suffix="%"
                    min="0"
                    step="0.1"
                    compact
                    value={state.assetOverrides?.[bucket.id]?.growth ?? ""}
                    placeholder={state.assetGrowthRate}
                    onChange={(event) =>
                      updateAssetOverride(bucket.id, {
                        growth: event.target.value,
                      })
                    }
                  />
                </RowItem>
              ))}
            </div>
          </Section>

          <Section title="Expenses" divider>
            <div className="grid gap-2.5">
              {expenseInputs.expenses.map((expense) => (
                <RowItem
                  key={expense.id}
                  headerClassName="grid items-start gap-4 lg:grid-cols-4"
                  detailsTitle="Expense overrides"
                  detailsSummary={getExpenseOverrideSummary(expense)}
                  detailsOpen={Boolean(
                    state.expenseOverrides?.[expense.id]?.detailsOpen,
                  )}
                  onToggleDetails={(open) =>
                    toggleExpenseOverrideDetails(expense.id, open)
                  }
                  detailsContentClassName="grid gap-3"
                  header={
                    <>
                      <div className="min-w-0">
                        <div className={snapshotLabelClass}>
                          {expense.label}
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-xs font-extrabold tracking-wide
                            text-(--ink-soft) uppercase"
                        >
                          Current amount
                        </div>
                        <div className={snapshotValueClass}>
                          {usd(expense.amount)}
                        </div>
                      </div>
                      {projectionInputs.currentYear !== 0 ? (
                        <div>
                          <div
                            className="text-xs font-extrabold tracking-wide
                              text-(--ink-soft) uppercase"
                          >
                            {selectedYearLabel}
                          </div>
                          <div className={snapshotValueClass}>
                            {usd(
                              toDisplayValue(
                                selectedRow.expenseSnapshotsById?.[expense.id]
                                  ?.amount ?? expense.amount,
                                projectionInputs.currentYear,
                                projectionInputs,
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        <div aria-hidden="true" />
                      )}
                      <div>
                        <div
                          className="text-xs font-extrabold tracking-wide
                            text-(--ink-soft) uppercase"
                        >
                          Cadence
                        </div>
                        <div className={snapshotValueClass}>
                          {selectedRow.expenseSnapshotsById?.[expense.id]
                            ?.cadenceLabel ??
                            (expense.frequency === "annual"
                              ? "Annual"
                              : expense.frequency === "one_off"
                                ? "One-off"
                                : "Monthly")}
                        </div>
                      </div>
                    </>
                  }
                >
                  <NumberField
                    label="Growth override"
                    suffix="%"
                    min="-20"
                    step="0.1"
                    compact
                    value={
                      state.expenseOverrides?.[expense.id]?.growthRate ?? ""
                    }
                    placeholder={state.expenseGrowthRate}
                    onChange={(event) =>
                      updateExpenseOverride(expense.id, {
                        growthRate: event.target.value,
                      })
                    }
                  />
                </RowItem>
              ))}
            </div>
          </Section>

          <Section divider>
            <ChartPanel title={`Monthly Cash Flow For ${selectedYearLabel}`}>
              <MonthlyCashFlowPanel
                items={monthlyCashFlow.items}
                netFlow={monthlyCashFlow.netFlow}
                total={monthlyCashFlow.total}
              />
            </ChartPanel>
          </Section>

          <Section divider>
            <ChartPanel
              title="Net Worth Curve"
              legend={[
                { label: "Net worth", color: "#0a4a53" },
                { label: "Assets", color: "#0d6a73" },
                { label: "Home equity", color: "#c56b3d" },
                { label: "Reserve cash", color: "#566773" },
              ]}
            >
              <NetWorthChart
                inputs={projectionInputs}
                results={results}
                currentYear={projectionInputs.currentYear}
              />
            </ChartPanel>
          </Section>

          <Section divider>
            <ChartPanel
              title="Asset Growth And Capital Gains"
              legend={[
                { label: "Gross assets", color: "#0c6a7c" },
                { label: "Capital gains tax", color: "#d28a47" },
              ]}
            >
              <AssetTaxChart
                inputs={projectionInputs}
                results={results}
                currentYear={projectionInputs.currentYear}
              />
            </ChartPanel>
          </Section>

          <Section title="Year-by-Year Projection" divider>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Assets</th>
                  <th>Asset tax</th>
                  <th>Home equity</th>
                  <th>Reserve cash</th>
                  <th>Net worth</th>
                </tr>
              </thead>
              <tbody>
                {results.projection.map((row) => (
                  <tr
                    key={row.year}
                    className={
                      row.year === projectionInputs.currentYear
                        ? "bg-(--teal-soft)"
                        : ""
                    }
                  >
                    <td>{row.year}</td>
                    <td>
                      {usd(
                        toDisplayValue(
                          row.assetsGross,
                          row.year,
                          projectionInputs,
                        ),
                      )}
                    </td>
                    <td>
                      {usd(
                        toDisplayValue(
                          row.capitalGainsTax,
                          row.year,
                          projectionInputs,
                        ),
                      )}
                    </td>
                    <td>
                      {usd(
                        toDisplayValue(
                          row.homeEquity,
                          row.year,
                          projectionInputs,
                        ),
                      )}
                    </td>
                    <td>
                      {usd(
                        toDisplayValue(
                          row.residualCash,
                          row.year,
                          projectionInputs,
                        ),
                      )}
                    </td>
                    <td>
                      {usd(
                        toDisplayValue(
                          row.netWorth,
                          row.year,
                          projectionInputs,
                        ),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
