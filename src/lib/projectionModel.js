import { clamp, readNumber } from "./format";
import {
  advanceProjectedBucket,
  createProjectedBucketState,
  snapshotProjectedBucket,
} from "./assetsModel";
import { getAnnualNonHousingExpenses } from "./expensesModel";
import { computeIncrementalTakeHome, computeRsuGrossForItems } from "./incomeModel";

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
    cashYieldRate: "4.0",
    displayMode: "nominal",
    advancedOpen: false,
    mortgageFundingBucketId: "",
    allocations: {},
    assetOverrides: {},
    expenseOverrides: {},
  };
}

export function normalizeProjectionState(parsed, fallback) {
  const rawAllocations =
    typeof parsed?.allocations === "object" && parsed.allocations
      ? parsed.allocations
      : {};

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
          value:
            typeof allocation?.value === "string" ? allocation.value : "0",
        },
      ];
    }),
  );

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
    rsuStockGrowthRate:
      typeof parsed?.rsuStockGrowthRate === "string"
        ? parsed.rsuStockGrowthRate
        : fallback.rsuStockGrowthRate,
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
    mortgageFundingBucketId:
      typeof parsed?.mortgageFundingBucketId === "string"
        ? parsed.mortgageFundingBucketId
        : fallback.mortgageFundingBucketId,
    allocations,
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

export function normalizeProjectionInputs(
  state,
  assetInputs,
  incomeDirectedContributions = {},
) {
  const allocations = {};
  let allocationPercentTotal = 0;
  let allocationAmountTotal = 0;

  assetInputs.buckets.forEach((bucket) => {
    if ((incomeDirectedContributions[bucket.id] ?? 0) > 0) {
      allocations[bucket.id] = { mode: "amount", value: 0 };
      return;
    }

    const allocation = state.allocations?.[bucket.id] ?? {
      mode: "percent",
      value: "0",
    };
    const mode = allocation.mode === "amount" ? "amount" : "percent";
    const value = Math.max(
      0,
      readNumber(allocation.value, 0),
    );

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
      Math.round(
        readNumber(state.currentYear, readNumber(state.horizonYears, 20)),
      ),
      0,
      clamp(Math.round(readNumber(state.horizonYears, 20)), 1, 60),
    ),
    inflationRate: Math.max(0, readNumber(state.inflationRate, 2.5)) / 100,
    assetGrowthRate: Math.max(0, readNumber(state.assetGrowthRate, 7)) / 100,
    rsuStockGrowthRate: readNumber(state.rsuStockGrowthRate, 0) / 100,
    expenseGrowthRate:
      Math.max(-20, readNumber(state.expenseGrowthRate, 2.5)) / 100,
    takeHomeGrowthRate: readNumber(state.takeHomeGrowthRate, 0) / 100,
    homeAppreciationRate: readNumber(state.homeAppreciationRate, 3) / 100,
    cashYieldRate: readNumber(state.cashYieldRate, 4) / 100,
    displayMode: state.displayMode === "real" ? "real" : "nominal",
    mortgageFundingBucketId:
      typeof state.mortgageFundingBucketId === "string"
        ? state.mortgageFundingBucketId
        : "",
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

function snapshotExpenseForYear(expense, year) {
  if (expense.frequency === "one_off") {
    const active = expense.oneOffYear === year;
    return {
      id: expense.id,
      label: expense.label,
      frequency: expense.frequency,
      amount: active ? expense.amount : 0,
      annualAmount: active ? expense.amount : 0,
      cadenceLabel: "One-off",
    };
  }

  const annualAmount =
    expense.annualBase * Math.pow(1 + expense.growthRate, Math.max(year - 1, 0));

  return {
    id: expense.id,
    label: expense.label,
    frequency: expense.frequency,
    amount: expense.frequency === "monthly" ? annualAmount / 12 : annualAmount,
    annualAmount,
    cadenceLabel: expense.frequency === "annual" ? "Annual" : "Monthly",
  };
}

function buildExpenseSnapshots(expenses, year) {
  return expenses.map((expense) => snapshotExpenseForYear(expense, year));
}

function mapSnapshotsById(snapshots) {
  return Object.fromEntries(snapshots.map((snapshot) => [snapshot.id, snapshot]));
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

function fundHomeEquityFromBuckets(bucketStates, fundingBucketId, amount) {
  if (!fundingBucketId || amount <= 0) {
    return bucketStates;
  }

  return bucketStates.map((bucketState) => {
    if (bucketState.id !== fundingBucketId) {
      return bucketState;
    }

    const fundedAmount = Math.min(bucketState.balance, amount);
    if (fundedAmount <= 0) {
      return bucketState;
    }

    const nextBalance = bucketState.balance - fundedAmount;
    const nextBasisValue = bucketState.taxFree
      ? nextBalance
      : bucketState.balance > 0
        ? bucketState.basisValue * (nextBalance / bucketState.balance)
        : bucketState.basisValue;

    return {
      ...bucketState,
      balance: nextBalance,
      basisValue: Math.max(0, nextBasisValue),
    };
  });
}

export function buildIncomeDirectedContributions(incomeSummary) {
  const contributions = {};
  const destinations = incomeSummary?.contributionDestinations ?? {};

  function add(bucketId, amount) {
    if (!bucketId || amount <= 0) {
      return;
    }
    contributions[bucketId] = (contributions[bucketId] ?? 0) + amount;
  }

  add(
    destinations.retirementBucketId,
    Math.max(0, Number(incomeSummary?.employee401k) || 0) +
      Math.max(0, Number(incomeSummary?.employerMatch) || 0),
  );
  add(
    destinations.megaBucketId,
    Math.max(0, Number(incomeSummary?.megaBackdoor) || 0),
  );
  add(
    destinations.hsaBucketId,
    Math.max(0, Number(incomeSummary?.hsaContribution) || 0),
  );
  add(
    destinations.iraBucketId,
    Math.max(0, Number(incomeSummary?.iraContribution) || 0),
  );

  return contributions;
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
  const rsuInputs = {
    grossSalary: Number.isFinite(incomeSummary?.grossSalary)
      ? incomeSummary.grossSalary
      : 0,
    employee401k: Number.isFinite(incomeSummary?.employee401k)
      ? incomeSummary.employee401k
      : 0,
    hsaContribution: Number.isFinite(incomeSummary?.hsaContribution)
      ? incomeSummary.hsaContribution
      : 0,
    rsuItems: Array.isArray(incomeSummary?.rsuItems)
      ? incomeSummary.rsuItems
      : incomeSummary?.rsus
        ? [incomeSummary.rsus]
        : [],
  };
  const annualExpenseTotal = expenseInputs.expenses.reduce(
    (sum, expense) => sum + expense.annualBase,
    0,
  );
  const fixedMortgageAnnual =
    (Number.isFinite(mortgageSummary?.totalMonthlyPayment)
      ? mortgageSummary.totalMonthlyPayment
      : 0) * 12;
  const incomeDirectedContributions = buildIncomeDirectedContributions(
    incomeSummary,
  );
  const cashFundedAssetPlan = assetInputs.buckets.reduce(
    (sum, bucket) => sum + bucket.contribution,
    0,
  );
  const baseAssetPlan =
    cashFundedAssetPlan +
    Object.values(incomeDirectedContributions).reduce(
      (sum, amount) => sum + amount,
      0,
    );
  const homePrice = Number.isFinite(mortgageSummary?.homePrice)
    ? mortgageSummary.homePrice
    : 0;
  const currentHomeEquity = Number.isFinite(mortgageSummary?.currentEquity)
    ? mortgageSummary.currentEquity
    : 0;

  let residualCash = 0;
  let bucketStates = fundHomeEquityFromBuckets(
    assetInputs.buckets.map((bucket) => createProjectedBucketState(bucket)),
    projectionInputs.mortgageFundingBucketId,
    currentHomeEquity,
  );
  const currentAssetSnapshots = bucketStates.map((bucketState) =>
    snapshotProjectedBucket(bucketState, taxConfig),
  );
  const currentAssetsGross = currentAssetSnapshots.reduce(
    (sum, bucket) => sum + bucket.balance,
    0,
  );
  const currentAssetEmbeddedTax = currentAssetSnapshots.reduce(
    (sum, bucket) => sum + bucket.taxDue,
    0,
  );
  const currentExpenseSnapshots = buildExpenseSnapshots(expenseInputs.expenses, 1);
  const projection = [];

  const scaledAllocationFactor =
    projectionInputs.allocationPercentTotal > 100
      ? 100 / projectionInputs.allocationPercentTotal
      : 1;

  for (let year = 1; year <= projectionInputs.horizonYears; year += 1) {
    const rsuGross = computeRsuGrossForItems(
      rsuInputs.rsuItems,
      year - 1,
      projectionInputs.rsuStockGrowthRate,
    );
    const rsuNet = computeIncrementalTakeHome(rsuInputs, taxConfig, rsuGross);
    const takeHome =
      annualTakeHomeBase *
        Math.pow(1 + projectionInputs.takeHomeGrowthRate, year - 1) +
      rsuNet;
    const nonHousingExpenses = getAnnualNonHousingExpenses(
      expenseInputs.expenses,
      year,
    );
    const freeCashBeforeAllocation =
      takeHome -
      fixedMortgageAnnual -
      nonHousingExpenses -
      cashFundedAssetPlan;
    const positiveFreeCash = Math.max(0, freeCashBeforeAllocation);
    let remainingFreeCash = positiveFreeCash;

    const extraContributionByBucket = {};
    let allocatedFreeCash = 0;

    assetInputs.buckets.forEach((bucket) => {
      if ((incomeDirectedContributions[bucket.id] ?? 0) > 0) {
        return;
      }
      const allocation = projectionInputs.allocations[bucket.id] ?? {
        mode: "percent",
        value: 0,
      };
      if (allocation.mode !== "amount") {
        return;
      }

      const extraContribution = Math.min(remainingFreeCash, allocation.value);
      extraContributionByBucket[bucket.id] = extraContribution;
      allocatedFreeCash += extraContribution;
      remainingFreeCash -= extraContribution;
    });

    assetInputs.buckets.forEach((bucket) => {
      if ((incomeDirectedContributions[bucket.id] ?? 0) > 0) {
        return;
      }
      const allocation = projectionInputs.allocations[bucket.id] ?? {
        mode: "percent",
        value: 0,
      };
      if (allocation.mode !== "percent") {
        return;
      }

      const share =
        (clamp(allocation.value, 0, 100) / 100) *
        scaledAllocationFactor;
      const extraContribution = remainingFreeCash * share;
      extraContributionByBucket[bucket.id] =
        (extraContributionByBucket[bucket.id] ?? 0) + extraContribution;
      allocatedFreeCash += extraContribution;
    });

    bucketStates = bucketStates.map((bucketState) =>
      advanceProjectedBucket(
        bucketState,
        bucketState.contribution +
          (incomeDirectedContributions[bucketState.id] ?? 0) +
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
    const expenseSnapshots = buildExpenseSnapshots(expenseInputs.expenses, year);
    const netWorth = assetsGross + homeEquity + residualCash;

    projection.push({
      year,
      takeHome,
      rsuGross,
      rsuNet,
      nonHousingExpenses,
      mortgageLineItem: fixedMortgageAnnual,
      baseAssetPlan,
      freeCashBeforeAllocation,
      allocatedFreeCash,
      reserveCashFlow,
      bucketSnapshots: assetSnapshots,
      bucketSnapshotsById: mapSnapshotsById(assetSnapshots),
      expenseSnapshots,
      expenseSnapshotsById: mapSnapshotsById(expenseSnapshots),
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
    cashFundedAssetPlan,
    freeCashBeforeAllocation:
      annualTakeHomeBase -
      fixedMortgageAnnual -
      getAnnualNonHousingExpenses(expenseInputs.expenses, 1) -
      cashFundedAssetPlan,
    allocatedFreeCash: 0,
    reserveCashFlow:
      annualTakeHomeBase -
      fixedMortgageAnnual -
      getAnnualNonHousingExpenses(expenseInputs.expenses, 1) -
      cashFundedAssetPlan,
    rsuGross: computeRsuGrossForItems(
      rsuInputs.rsuItems,
      0,
      projectionInputs.rsuStockGrowthRate,
    ),
    rsuNet: computeIncrementalTakeHome(
      rsuInputs,
      taxConfig,
      computeRsuGrossForItems(
        rsuInputs.rsuItems,
        0,
        projectionInputs.rsuStockGrowthRate,
      ),
    ),
  };
  const ending = projection[projection.length - 1] ?? {
    netWorth: currentAssetsGross + currentHomeEquity,
    homeEquity: currentHomeEquity,
    assetsGross: currentAssetsGross,
    assetEmbeddedTax: currentAssetEmbeddedTax,
    residualCash: 0,
  };

  return {
    annualTakeHomeBase,
    annualExpenseTotal,
    fixedMortgageAnnual,
    baseAssetPlan,
    cashFundedAssetPlan,
    currentAssetSnapshots,
    currentAssetSnapshotsById: mapSnapshotsById(currentAssetSnapshots),
    currentExpenseSnapshots,
    currentExpenseSnapshotsById: mapSnapshotsById(currentExpenseSnapshots),
    currentAssetsGross,
    currentAssetEmbeddedTax,
    currentNetWorth: currentAssetsGross + currentHomeEquity,
    firstYear,
    ending,
    scaledAllocationFactor,
    incomeDirectedContributions,
    projection,
  };
}
