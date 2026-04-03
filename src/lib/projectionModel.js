import { clamp, readNumber } from "./format";
import {
  advanceProjectedBucket,
  createProjectedBucketState,
  snapshotProjectedBucket,
} from "./assetsModel";
import { getAnnualNonHousingExpenses } from "./expensesModel";

export function createDefaultProjectionState() {
  return {
    horizonYears: "20",
    currentYear: "20",
    inflationRate: "2.5",
    assetGrowthRate: "7.0",
    expenseGrowthRate: "2.5",
    takeHomeGrowthRate: "0.0",
    homeAppreciationRate: "3.0",
    cashYieldRate: "4.0",
    displayMode: "nominal",
    advancedOpen: false,
    allocations: {},
    assetOverrides: {},
    expenseOverrides: {},
  };
}

export function normalizeProjectionState(parsed, fallback) {
  return {
    horizonYears:
      typeof parsed?.horizonYears === "string"
        ? parsed.horizonYears
        : fallback.horizonYears,
    currentYear:
      typeof parsed?.currentYear === "string"
        ? parsed.currentYear
        : fallback.currentYear,
    inflationRate:
      typeof parsed?.inflationRate === "string"
        ? parsed.inflationRate
        : fallback.inflationRate,
    assetGrowthRate:
      typeof parsed?.assetGrowthRate === "string"
        ? parsed.assetGrowthRate
        : fallback.assetGrowthRate,
    expenseGrowthRate:
      typeof parsed?.expenseGrowthRate === "string"
        ? parsed.expenseGrowthRate
        : fallback.expenseGrowthRate,
    takeHomeGrowthRate:
      typeof parsed?.takeHomeGrowthRate === "string"
        ? parsed.takeHomeGrowthRate
        : fallback.takeHomeGrowthRate,
    homeAppreciationRate:
      typeof parsed?.homeAppreciationRate === "string"
        ? parsed.homeAppreciationRate
        : fallback.homeAppreciationRate,
    cashYieldRate:
      typeof parsed?.cashYieldRate === "string"
        ? parsed.cashYieldRate
        : fallback.cashYieldRate,
    displayMode: parsed?.displayMode === "real" ? "real" : "nominal",
    advancedOpen: Boolean(parsed?.advancedOpen),
    allocations:
      typeof parsed?.allocations === "object" && parsed.allocations
        ? parsed.allocations
        : {},
    assetOverrides:
      typeof parsed?.assetOverrides === "object" && parsed.assetOverrides
        ? parsed.assetOverrides
        : {},
    expenseOverrides:
      typeof parsed?.expenseOverrides === "object" && parsed.expenseOverrides
        ? parsed.expenseOverrides
        : {},
  };
}

export function normalizeProjectionInputs(state, assetInputs) {
  const allocations = {};
  let allocationTotal = 0;

  assetInputs.buckets.forEach((bucket) => {
    const allocationPct = clamp(
      readNumber(state.allocations?.[bucket.id], 0),
      0,
      100,
    );
    allocations[bucket.id] = allocationPct;
    allocationTotal += allocationPct;
  });

  return {
    horizonYears: clamp(Math.round(readNumber(state.horizonYears, 20)), 1, 60),
    currentYear: clamp(
      Math.round(
        readNumber(state.currentYear, readNumber(state.horizonYears, 20)),
      ),
      0,
      clamp(Math.round(readNumber(state.horizonYears, 20)), 1, 60),
    ),
    inflationRate: Math.max(0, readNumber(state.inflationRate, 2.5)) / 100,
    assetGrowthRate: Math.max(0, readNumber(state.assetGrowthRate, 7)) / 100,
    expenseGrowthRate:
      Math.max(-20, readNumber(state.expenseGrowthRate, 2.5)) / 100,
    takeHomeGrowthRate: readNumber(state.takeHomeGrowthRate, 0) / 100,
    homeAppreciationRate: readNumber(state.homeAppreciationRate, 3) / 100,
    cashYieldRate: readNumber(state.cashYieldRate, 4) / 100,
    displayMode: state.displayMode === "real" ? "real" : "nominal",
    allocations,
    allocationTotal,
  };
}

export function toDisplayValue(value, year, inputs) {
  if (inputs.displayMode !== "real") {
    return value;
  }
  return value / Math.pow(1 + inputs.inflationRate, year);
}

function getLoanYear(mortgageSummary, year) {
  const yearlyLoan = Array.isArray(mortgageSummary?.yearlyLoan)
    ? mortgageSummary.yearlyLoan
    : [];
  const found = yearlyLoan.find((row) => row.year === year);
  if (found) {
    return found;
  }
  const last = yearlyLoan[yearlyLoan.length - 1];
  return last
    ? { year, principal: 0, interest: 0, endingBalance: 0 }
    : {
        year,
        principal: 0,
        interest: 0,
        endingBalance: Number.isFinite(mortgageSummary?.loanAmount)
          ? mortgageSummary.loanAmount
          : 0,
      };
}

export function calculateProjection({
  incomeSummary,
  mortgageSummary,
  assetInputs,
  expenseInputs,
  projectionInputs,
  taxConfig,
}) {
  const annualTakeHomeBase = Number.isFinite(incomeSummary?.annualTakeHome)
    ? incomeSummary.annualTakeHome
    : 0;
  const annualExpenseTotal = expenseInputs.expenses.reduce(
    (sum, expense) => sum + expense.annualBase,
    0,
  );
  const fixedMortgageAnnual =
    (Number.isFinite(mortgageSummary?.totalMonthlyPayment)
      ? mortgageSummary.totalMonthlyPayment
      : 0) * 12;
  const baseAssetPlan = assetInputs.buckets.reduce(
    (sum, bucket) => sum + bucket.contribution,
    0,
  );
  const currentAssets = assetInputs.buckets.reduce(
    (sum, bucket) => sum + bucket.current,
    0,
  );
  const homePrice = Number.isFinite(mortgageSummary?.homePrice)
    ? mortgageSummary.homePrice
    : 0;
  const currentHomeEquity = Number.isFinite(mortgageSummary?.currentEquity)
    ? mortgageSummary.currentEquity
    : 0;

  let residualCash = 0;
  let bucketStates = assetInputs.buckets.map((bucket) =>
    createProjectedBucketState(bucket),
  );
  const projection = [];

  const scaledAllocationFactor =
    projectionInputs.allocationTotal > 100
      ? 100 / projectionInputs.allocationTotal
      : 1;

  for (let year = 1; year <= projectionInputs.horizonYears; year += 1) {
    const takeHome =
      annualTakeHomeBase *
      Math.pow(1 + projectionInputs.takeHomeGrowthRate, year - 1);
    const nonHousingExpenses = getAnnualNonHousingExpenses(
      expenseInputs.expenses,
      year,
    );
    const freeCashBeforeAllocation =
      takeHome - fixedMortgageAnnual - nonHousingExpenses;
    const positiveFreeCash = Math.max(0, freeCashBeforeAllocation);

    const extraContributionByBucket = {};
    let allocatedFreeCash = 0;

    assetInputs.buckets.forEach((bucket) => {
      const share =
        ((projectionInputs.allocations[bucket.id] ?? 0) / 100) *
        scaledAllocationFactor;
      const extraContribution = positiveFreeCash * share;
      extraContributionByBucket[bucket.id] = extraContribution;
      allocatedFreeCash += extraContribution;
    });

    bucketStates = bucketStates.map((bucketState) =>
      advanceProjectedBucket(
        bucketState,
        bucketState.contribution +
          (extraContributionByBucket[bucketState.id] ?? 0),
      ),
    );

    const assetSnapshots = bucketStates.map((bucketState) =>
      snapshotProjectedBucket(bucketState, taxConfig),
    );
    const reserveCashFlow =
      freeCashBeforeAllocation >= 0
        ? freeCashBeforeAllocation - allocatedFreeCash
        : freeCashBeforeAllocation;
    residualCash =
      residualCash * (1 + projectionInputs.cashYieldRate) + reserveCashFlow;

    const loanYear = getLoanYear(mortgageSummary, year);
    const homeValue =
      homePrice * Math.pow(1 + projectionInputs.homeAppreciationRate, year);
    const homeEquity = homeValue - loanYear.endingBalance;
    const assetsGross = assetSnapshots.reduce(
      (sum, bucket) => sum + bucket.balance,
      0,
    );
    const assetEmbeddedTax = assetSnapshots.reduce(
      (sum, bucket) => sum + bucket.taxDue,
      0,
    );
    const assetAfterTax = assetSnapshots.reduce(
      (sum, bucket) => sum + bucket.afterTax,
      0,
    );
    const netWorth = assetsGross + homeEquity + residualCash;

    projection.push({
      year,
      takeHome,
      nonHousingExpenses,
      mortgageLineItem: fixedMortgageAnnual,
      baseAssetPlan,
      freeCashBeforeAllocation,
      allocatedFreeCash,
      reserveCashFlow,
      assetsGross,
      assetEmbeddedTax,
      assetAfterTax,
      homeEquity,
      residualCash,
      netWorth,
    });
  }

  const firstYear = projection[0] ?? {
    mortgageLineItem: fixedMortgageAnnual,
    baseAssetPlan,
    freeCashBeforeAllocation:
      annualTakeHomeBase -
      fixedMortgageAnnual -
      getAnnualNonHousingExpenses(expenseInputs.expenses, 1),
    allocatedFreeCash: 0,
    reserveCashFlow:
      annualTakeHomeBase -
      fixedMortgageAnnual -
      getAnnualNonHousingExpenses(expenseInputs.expenses, 1),
  };
  const ending = projection[projection.length - 1] ?? {
    netWorth: currentAssets + currentHomeEquity,
    homeEquity: currentHomeEquity,
    assetsGross: currentAssets,
    assetEmbeddedTax: 0,
    residualCash: 0,
  };

  return {
    annualTakeHomeBase,
    annualExpenseTotal,
    fixedMortgageAnnual,
    baseAssetPlan,
    currentNetWorth: currentAssets + currentHomeEquity,
    firstYear,
    ending,
    scaledAllocationFactor,
    projection,
  };
}
