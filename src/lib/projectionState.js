import { clamp, readNumber } from "./format";
import { getPinnedRetirementTargets } from "./assetsModel";

export const CASH_BUCKET_ID = "cash-bucket";

export function createDefaultProjectionState() {
  return {
    horizonYears: "20",
    currentYear: "20",
    inflationRate: "2.5",
    assetGrowthRate: "7.0",
    rsuStockGrowthRate: "0.0",
    expenseGrowthRate: "2.5",
    takeHomeGrowthRate: "0.0",
    homeAppreciationRate: "3.0",
    displayMode: "nominal",
    includeVestedRsusInNetWorth: false,
    advancedOpen: false,
    mortgageFundingBucketId: "",
    allocations: {},
    assetOverrides: {},
    expenseOverrides: {},
  };
}

export function normalizeProjectionState(parsed, fallback) {
  const rawAllocations = typeof parsed?.allocations === "object" && parsed.allocations ? parsed.allocations : {};

  const allocations = Object.fromEntries(
    Object.entries(rawAllocations).map(([bucketId, allocation]) => {
      if (typeof allocation === "string") {
        return [
          bucketId,
          {
            mode: "percent",
            value: allocation,
          },
        ];
      }

      return [
        bucketId,
        {
          mode: allocation?.mode === "amount" ? "amount" : "percent",
          value: typeof allocation?.value === "string" ? allocation.value : "0",
        },
      ];
    }),
  );

  return {
    horizonYears: typeof parsed?.horizonYears === "string" ? parsed.horizonYears : fallback.horizonYears,
    currentYear: typeof parsed?.currentYear === "string" ? parsed.currentYear : fallback.currentYear,
    inflationRate: typeof parsed?.inflationRate === "string" ? parsed.inflationRate : fallback.inflationRate,
    assetGrowthRate: typeof parsed?.assetGrowthRate === "string" ? parsed.assetGrowthRate : fallback.assetGrowthRate,
    rsuStockGrowthRate:
      typeof parsed?.rsuStockGrowthRate === "string" ? parsed.rsuStockGrowthRate : fallback.rsuStockGrowthRate,
    expenseGrowthRate:
      typeof parsed?.expenseGrowthRate === "string" ? parsed.expenseGrowthRate : fallback.expenseGrowthRate,
    takeHomeGrowthRate:
      typeof parsed?.takeHomeGrowthRate === "string" ? parsed.takeHomeGrowthRate : fallback.takeHomeGrowthRate,
    homeAppreciationRate:
      typeof parsed?.homeAppreciationRate === "string" ? parsed.homeAppreciationRate : fallback.homeAppreciationRate,
    displayMode: parsed?.displayMode === "real" ? "real" : "nominal",
    includeVestedRsusInNetWorth: Boolean(parsed?.includeVestedRsusInNetWorth),
    advancedOpen: Boolean(parsed?.advancedOpen),
    mortgageFundingBucketId:
      typeof parsed?.mortgageFundingBucketId === "string"
        ? parsed.mortgageFundingBucketId
        : fallback.mortgageFundingBucketId,
    allocations,
    assetOverrides: typeof parsed?.assetOverrides === "object" && parsed.assetOverrides ? parsed.assetOverrides : {},
    expenseOverrides:
      typeof parsed?.expenseOverrides === "object" && parsed.expenseOverrides ? parsed.expenseOverrides : {},
  };
}

export function normalizeProjectionInputs(state, assetInputs, incomeDirectedContributions = {}) {
  const allocations = {};
  let allocationPercentTotal = 0;
  let allocationAmountTotal = 0;

  assetInputs.buckets.forEach((bucket) => {
    if (bucket.id === CASH_BUCKET_ID || (incomeDirectedContributions[bucket.id] ?? 0) > 0) {
      allocations[bucket.id] = { mode: "amount", value: 0 };
      return;
    }

    const allocation = state.allocations?.[bucket.id] ?? {
      mode: "percent",
      value: "0",
    };
    const mode = allocation.mode === "amount" ? "amount" : "percent";
    const value = Math.max(0, readNumber(allocation.value, 0));

    allocations[bucket.id] = { mode, value };
    if (mode === "amount") {
      allocationAmountTotal += value;
    } else {
      allocationPercentTotal += clamp(value, 0, 100);
    }
  });

  return {
    horizonYears: clamp(Math.round(readNumber(state.horizonYears, 20)), 1, 60),
    currentYear: clamp(
      Math.round(readNumber(state.currentYear, readNumber(state.horizonYears, 20))),
      0,
      clamp(Math.round(readNumber(state.horizonYears, 20)), 1, 60),
    ),
    inflationRate: Math.max(0, readNumber(state.inflationRate, 2.5)) / 100,
    assetGrowthRate: Math.max(0, readNumber(state.assetGrowthRate, 7)) / 100,
    rsuStockGrowthRate: readNumber(state.rsuStockGrowthRate, 0) / 100,
    expenseGrowthRate: Math.max(-20, readNumber(state.expenseGrowthRate, 2.5)) / 100,
    takeHomeGrowthRate: readNumber(state.takeHomeGrowthRate, 0) / 100,
    homeAppreciationRate: readNumber(state.homeAppreciationRate, 3) / 100,
    displayMode: state.displayMode === "real" ? "real" : "nominal",
    includeVestedRsusInNetWorth: Boolean(state.includeVestedRsusInNetWorth),
    mortgageFundingBucketId: typeof state.mortgageFundingBucketId === "string" ? state.mortgageFundingBucketId : "",
    allocations,
    allocationPercentTotal,
    allocationAmountTotal,
  };
}

export function toDisplayValue(value, year, inputs) {
  if (inputs.displayMode !== "real") {
    return value;
  }
  return value / Math.pow(1 + inputs.inflationRate, year);
}

export function buildIncomeDirectedContributions(incomeSummary) {
  const contributions = {};
  const targets = getPinnedRetirementTargets();

  function add(bucketId, amount) {
    if (!bucketId || amount <= 0) {
      return;
    }
    contributions[bucketId] = (contributions[bucketId] ?? 0) + amount;
  }

  add(
    targets.retirementBucketId,
    Math.max(0, Number(incomeSummary?.employee401k) || 0) + Math.max(0, Number(incomeSummary?.employerMatch) || 0),
  );
  add(targets.megaBucketId, Math.max(0, Number(incomeSummary?.megaBackdoor) || 0));
  add(targets.hsaBucketId, Math.max(0, Number(incomeSummary?.hsaContribution) || 0));
  add(targets.iraBucketId, Math.max(0, Number(incomeSummary?.iraContribution) || 0));

  return contributions;
}
