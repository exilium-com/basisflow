import { clamp, readNumber } from "./format";

export type ProjectionDisplayMode = "nominal" | "real";

export type ProjectionAssetOverride = {
  growth?: number | null;
};

export type ProjectionExpenseOverride = {
  growthRate?: number | null;
};

export type ProjectionSharedSettings = {
  horizonYears: number;
  currentYear: number;
  inflationRate: number;
  assetGrowthRate: number;
  expenseGrowthRate: number;
  incomeGrowthRate: number;
  homeAppreciationRate: number;
  displayMode: ProjectionDisplayMode;
  includeVestedRsusInNetWorth: boolean;
  targetCash: number;
};

export type ProjectionTimelineState = {
  homeSaleYear: number | null;
};

export type ProjectionProfileState = {
  mortgageFundingBucketId: string;
  freeCashFlowBucketId: string;
  assetOverrides: Record<string, ProjectionAssetOverride>;
  expenseOverrides: Record<string, ProjectionExpenseOverride>;
  timeline: ProjectionTimelineState;
};

export type ProjectionState = ProjectionSharedSettings & ProjectionProfileState;

export type Projection = ProjectionSharedSettings &
  Pick<ProjectionProfileState, "mortgageFundingBucketId" | "freeCashFlowBucketId" | "timeline">;

const PROJECTION_SHARED_NUMBER_FIELDS = [
  "horizonYears",
  "currentYear",
  "inflationRate",
  "assetGrowthRate",
  "expenseGrowthRate",
  "incomeGrowthRate",
  "homeAppreciationRate",
  "targetCash",
] as const satisfies ReadonlyArray<keyof ProjectionSharedSettings>;

export const DEFAULT_PROJECTION_SHARED_SETTINGS: ProjectionSharedSettings = {
  horizonYears: 20,
  currentYear: 20,
  inflationRate: 2.5,
  assetGrowthRate: 7,
  expenseGrowthRate: 2.5,
  incomeGrowthRate: 5,
  homeAppreciationRate: 3,
  displayMode: "nominal",
  includeVestedRsusInNetWorth: false,
  targetCash: 10000,
};

export const DEFAULT_PROJECTION_PROFILE_STATE: ProjectionProfileState = {
  mortgageFundingBucketId: "",
  freeCashFlowBucketId: "",
  assetOverrides: {},
  expenseOverrides: {},
  timeline: {
    homeSaleYear: null,
  },
};

export const DEFAULT_PROJECTION_STATE: ProjectionState = {
  ...DEFAULT_PROJECTION_SHARED_SETTINGS,
  ...DEFAULT_PROJECTION_PROFILE_STATE,
};

function asRecord(value: unknown) {
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {};
}

export function normalizeProjectionSharedSettings(
  parsed: unknown,
  fallback: ProjectionSharedSettings,
): ProjectionSharedSettings {
  const state = asRecord(parsed);
  const numericState = Object.fromEntries(
    PROJECTION_SHARED_NUMBER_FIELDS.map((field) => [field, readNumber(state[field], fallback[field])]),
  ) as Pick<ProjectionSharedSettings, (typeof PROJECTION_SHARED_NUMBER_FIELDS)[number]>;

  return {
    ...fallback,
    ...numericState,
    displayMode:
      state.displayMode === "real" || state.displayMode === "nominal" ? state.displayMode : fallback.displayMode,
    includeVestedRsusInNetWorth:
      typeof state.includeVestedRsusInNetWorth === "boolean"
        ? state.includeVestedRsusInNetWorth
        : fallback.includeVestedRsusInNetWorth,
  };
}

export function normalizeProjectionProfileState(
  parsed: unknown,
  fallback: ProjectionProfileState,
): ProjectionProfileState {
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
  const rawTimeline = asRecord(state.timeline);
  const homeSaleYear = readNumber(rawTimeline.homeSaleYear ?? state.homeSaleYear, fallback.timeline.homeSaleYear);

  return {
    mortgageFundingBucketId:
      typeof state.mortgageFundingBucketId === "string"
        ? state.mortgageFundingBucketId
        : fallback.mortgageFundingBucketId,
    freeCashFlowBucketId:
      typeof state.freeCashFlowBucketId === "string" ? state.freeCashFlowBucketId : fallback.freeCashFlowBucketId,
    assetOverrides,
    expenseOverrides,
    timeline: {
      homeSaleYear,
    },
  };
}

export function normalizeProjectionState(parsed: unknown, fallback: ProjectionState): ProjectionState {
  return {
    ...normalizeProjectionSharedSettings(parsed, fallback),
    ...normalizeProjectionProfileState(parsed, fallback),
  };
}

export function composeProjectionState(
  sharedSettings: ProjectionSharedSettings,
  profileState: ProjectionProfileState,
): ProjectionState {
  return {
    ...sharedSettings,
    ...profileState,
  };
}

export function createProjection(state: ProjectionState): Projection {
  const horizonYears = clamp(Math.round(state.horizonYears), 1, 60);
  const homeSaleYear =
    state.timeline.homeSaleYear == null ? null : clamp(Math.round(state.timeline.homeSaleYear), 1, horizonYears);

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
    targetCash: Math.max(0, state.targetCash),
    timeline: {
      homeSaleYear,
    },
  };
}

export function toDisplayValue(value: number, year: number, projection: Projection) {
  if (projection.displayMode !== "real") {
    return value;
  }
  return value / Math.pow(1 + projection.inflationRate, year);
}
