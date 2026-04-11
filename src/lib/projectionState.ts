import { clamp, readNumber } from "./format";
import { PINNED_BUCKETS, type Assets } from "./assetsModel";

export type ProjectionDisplayMode = "nominal" | "real";
export type AllocationMode = "percent" | "amount";

export type ProjectionAllocationState = {
  mode: AllocationMode;
  value: number;
};

export type ProjectionAssetOverride = {
  growth?: number | null;
  detailsOpen?: boolean;
};

export type ProjectionExpenseOverride = {
  growthRate?: number | null;
  detailsOpen?: boolean;
};

type ProjectionSettings = {
  horizonYears: number;
  currentYear: number;
  inflationRate: number;
  assetGrowthRate: number;
  rsuStockGrowthRate: number;
  expenseGrowthRate: number;
  incomeGrowthRate: number;
  homeAppreciationRate: number;
  displayMode: ProjectionDisplayMode;
  includeVestedRsusInNetWorth: boolean;
  mortgageFundingBucketId: string;
  allocations: Record<string, ProjectionAllocationState>;
};

export type ProjectionState = ProjectionSettings & {
  advancedOpen: boolean;
  assetOverrides: Record<string, ProjectionAssetOverride>;
  expenseOverrides: Record<string, ProjectionExpenseOverride>;
};

export type Projection = ProjectionSettings & {
  allocationPercentTotal: number;
  allocationAmountTotal: number;
};

const PROJECTION_NUMBER_FIELDS = [
  "horizonYears",
  "currentYear",
  "inflationRate",
  "assetGrowthRate",
  "rsuStockGrowthRate",
  "expenseGrowthRate",
  "incomeGrowthRate",
  "homeAppreciationRate",
] as const satisfies ReadonlyArray<keyof ProjectionState>;

export const DEFAULT_PROJECTION_STATE: ProjectionState = {
  horizonYears: 20,
  currentYear: 20,
  inflationRate: 2.5,
  assetGrowthRate: 7,
  rsuStockGrowthRate: 7,
  expenseGrowthRate: 2.5,
  incomeGrowthRate: 5,
  homeAppreciationRate: 3,
  displayMode: "nominal",
  includeVestedRsusInNetWorth: false,
  advancedOpen: false,
  mortgageFundingBucketId: "",
  allocations: {},
  assetOverrides: {},
  expenseOverrides: {},
};

export function normalizeProjectionState(parsed: unknown, fallback: ProjectionState): ProjectionState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const rawAllocations =
    typeof state.allocations === "object" && state.allocations ? (state.allocations as Record<string, unknown>) : {};
  const rawAssetOverrides =
    typeof state.assetOverrides === "object" && state.assetOverrides
      ? (state.assetOverrides as Record<string, unknown>)
      : {};
  const rawExpenseOverrides =
    typeof state.expenseOverrides === "object" && state.expenseOverrides
      ? (state.expenseOverrides as Record<string, unknown>)
      : {};

  const allocations = Object.fromEntries(
    Object.entries(rawAllocations).map(([bucketId, allocation]) => {
      if (typeof allocation === "string" || typeof allocation === "number") {
        return [
          bucketId,
          {
            mode: "percent" as const,
            value: Math.max(0, readNumber(allocation, 0)),
          },
        ];
      }

      const entry = allocation && typeof allocation === "object" ? (allocation as Record<string, unknown>) : {};
      return [
        bucketId,
        {
          mode: entry.mode === "amount" ? ("amount" as const) : ("percent" as const),
          value: Math.max(0, readNumber(entry.value, 0)),
        },
      ];
    }),
  );

  const assetOverrides = Object.fromEntries(
    Object.entries(rawAssetOverrides).map(([bucketId, override]) => {
      const entry = override && typeof override === "object" ? (override as Record<string, unknown>) : {};
      return [
        bucketId,
        {
          growth: readNumber(entry.growth, null),
          detailsOpen: Boolean(entry.detailsOpen),
        },
      ];
    }),
  );

  const expenseOverrides = Object.fromEntries(
    Object.entries(rawExpenseOverrides).map(([expenseId, override]) => {
      const entry = override && typeof override === "object" ? (override as Record<string, unknown>) : {};
      return [
        expenseId,
        {
          growthRate: readNumber(entry.growthRate, null),
          detailsOpen: Boolean(entry.detailsOpen),
        },
      ];
    }),
  );
  const numericState = Object.fromEntries(
    PROJECTION_NUMBER_FIELDS.map((field) => [field, readNumber(state[field], fallback[field])]),
  ) as Pick<ProjectionState, (typeof PROJECTION_NUMBER_FIELDS)[number]>;

  return {
    ...fallback,
    ...numericState,
    displayMode: state.displayMode === "real" ? "real" : "nominal",
    includeVestedRsusInNetWorth: Boolean(state.includeVestedRsusInNetWorth),
    advancedOpen: Boolean(state.advancedOpen),
    mortgageFundingBucketId:
      typeof state.mortgageFundingBucketId === "string" ? state.mortgageFundingBucketId : fallback.mortgageFundingBucketId,
    allocations,
    assetOverrides,
    expenseOverrides,
  };
}

export function createProjection(
  state: ProjectionState,
  assets: Assets,
  incomeDirectedContributions: Record<string, number> = {},
): Projection {
  const allocations: Projection["allocations"] = {};
  let allocationPercentTotal = 0;
  let allocationAmountTotal = 0;
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;

  assets.buckets.forEach((bucket) => {
    if (bucket.id === reserveCashBucketId || (incomeDirectedContributions[bucket.id] ?? 0) > 0) {
      allocations[bucket.id] = { mode: "amount", value: 0 };
      return;
    }

    const allocation = state.allocations[bucket.id] ?? { mode: "percent", value: 0 };
    const mode = allocation.mode === "amount" ? "amount" : "percent";
    const value = Math.max(0, allocation.value ?? 0);

    allocations[bucket.id] = { mode, value };
    if (mode === "amount") {
      allocationAmountTotal += value;
    } else {
      allocationPercentTotal += clamp(value, 0, 100);
    }
  });

  const horizonYears = clamp(Math.round(state.horizonYears), 1, 60);

  return {
    horizonYears,
    currentYear: clamp(Math.round(state.currentYear), 0, horizonYears),
    inflationRate: Math.max(0, state.inflationRate) / 100,
    assetGrowthRate: Math.max(0, state.assetGrowthRate) / 100,
    rsuStockGrowthRate: state.rsuStockGrowthRate / 100,
    expenseGrowthRate: Math.max(-20, state.expenseGrowthRate) / 100,
    incomeGrowthRate: state.incomeGrowthRate / 100,
    homeAppreciationRate: state.homeAppreciationRate / 100,
    displayMode: state.displayMode,
    includeVestedRsusInNetWorth: state.includeVestedRsusInNetWorth,
    mortgageFundingBucketId: state.mortgageFundingBucketId,
    allocations,
    allocationPercentTotal,
    allocationAmountTotal,
  };
}

export function toDisplayValue(value: number, year: number, projection: Projection) {
  if (projection.displayMode !== "real") {
    return value;
  }
  return value / Math.pow(1 + projection.inflationRate, year);
}
