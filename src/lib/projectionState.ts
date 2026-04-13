import { clamp, readNumber } from "./format";

export type ProjectionDisplayMode = "nominal" | "real";

export type ProjectionAssetOverride = {
  growth?: number | null;
};

export type ProjectionExpenseOverride = {
  growthRate?: number | null;
};

type ProjectionSettings = {
  horizonYears: number;
  currentYear: number;
  inflationRate: number;
  assetGrowthRate: number;
  expenseGrowthRate: number;
  incomeGrowthRate: number;
  homeAppreciationRate: number;
  displayMode: ProjectionDisplayMode;
  includeVestedRsusInNetWorth: boolean;
  mortgageFundingBucketId: string;
  freeCashFlowBucketId: string;
  minimumCash: number;
};

export type ProjectionState = ProjectionSettings & {
  assetOverrides: Record<string, ProjectionAssetOverride>;
  expenseOverrides: Record<string, ProjectionExpenseOverride>;
};

export type Projection = ProjectionSettings;

const PROJECTION_NUMBER_FIELDS = [
  "horizonYears",
  "currentYear",
  "inflationRate",
  "assetGrowthRate",
  "expenseGrowthRate",
  "incomeGrowthRate",
  "homeAppreciationRate",
  "minimumCash",
] as const satisfies ReadonlyArray<keyof ProjectionState>;

export const DEFAULT_PROJECTION_STATE: ProjectionState = {
  horizonYears: 20,
  currentYear: 20,
  inflationRate: 2.5,
  assetGrowthRate: 7,
  expenseGrowthRate: 2.5,
  incomeGrowthRate: 5,
  homeAppreciationRate: 3,
  displayMode: "nominal",
  includeVestedRsusInNetWorth: false,
  mortgageFundingBucketId: "",
  freeCashFlowBucketId: "",
  minimumCash: 0,
  assetOverrides: {},
  expenseOverrides: {},
};

export function normalizeProjectionState(parsed: unknown, fallback: ProjectionState): ProjectionState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const rawAssetOverrides =
    typeof state.assetOverrides === "object" && state.assetOverrides
      ? (state.assetOverrides as Record<string, unknown>)
      : {};
  const rawExpenseOverrides =
    typeof state.expenseOverrides === "object" && state.expenseOverrides
      ? (state.expenseOverrides as Record<string, unknown>)
      : {};

  const assetOverrides = Object.fromEntries(
    Object.entries(rawAssetOverrides).map(([bucketId, override]) => {
      const entry = override && typeof override === "object" ? (override as Record<string, unknown>) : {};
      return [
        bucketId,
        {
          growth: readNumber(entry.growth, null),
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
    mortgageFundingBucketId:
      typeof state.mortgageFundingBucketId === "string" ? state.mortgageFundingBucketId : fallback.mortgageFundingBucketId,
    freeCashFlowBucketId:
      typeof state.freeCashFlowBucketId === "string" ? state.freeCashFlowBucketId : fallback.freeCashFlowBucketId,
    assetOverrides,
    expenseOverrides,
  };
}

export function createProjection(state: ProjectionState): Projection {
  const horizonYears = clamp(Math.round(state.horizonYears), 1, 60);

  return {
    horizonYears,
    currentYear: clamp(Math.round(state.currentYear), 0, horizonYears),
    inflationRate: Math.max(0, state.inflationRate) / 100,
    assetGrowthRate: Math.max(0, state.assetGrowthRate) / 100,
    expenseGrowthRate: Math.max(-20, state.expenseGrowthRate) / 100,
    incomeGrowthRate: state.incomeGrowthRate / 100,
    homeAppreciationRate: state.homeAppreciationRate / 100,
    displayMode: state.displayMode,
    includeVestedRsusInNetWorth: state.includeVestedRsusInNetWorth,
    mortgageFundingBucketId: state.mortgageFundingBucketId,
    freeCashFlowBucketId: state.freeCashFlowBucketId,
    minimumCash: Math.max(0, state.minimumCash),
  };
}

export function toDisplayValue(value: number, year: number, projection: Projection) {
  if (projection.displayMode !== "real") {
    return value;
  }
  return value / Math.pow(1 + projection.inflationRate, year);
}
