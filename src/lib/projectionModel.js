import { clamp, readNumber, roundTo } from "./format";
import {
  advanceProjectedBucket,
  createProjectedBucketState,
  getPinnedRetirementTargets,
  snapshotProjectedBucket,
} from "./assetsModel";
import { getAnnualNonHousingExpenses } from "./expensesModel";
import {
  computeAnnualTaxes,
  computeIncrementalTakeHome,
  computeRsuGrossForItems,
} from "./incomeModel";
import { computeAdditionalTax } from "./taxConfig";

export const CASH_BUCKET_ID = "cash-bucket";

function getTaxBases(grossSalary, employee401k, hsaContribution, rsuGross, taxConfig) {
  const taxes = computeAnnualTaxes(
    {
      grossSalary,
      employee401k,
      hsaContribution,
    },
    taxConfig,
    rsuGross,
  );

  return {
    federalTaxableIncome: taxes.federalTaxableIncome,
  };
}

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
    displayMode: parsed?.displayMode === "real" ? "real" : "nominal",
    includeVestedRsusInNetWorth: Boolean(parsed?.includeVestedRsusInNetWorth),
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
    if (
      bucket.id === CASH_BUCKET_ID ||
      (incomeDirectedContributions[bucket.id] ?? 0) > 0
    ) {
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
    displayMode: state.displayMode === "real" ? "real" : "nominal",
    includeVestedRsusInNetWorth: Boolean(state.includeVestedRsusInNetWorth),
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
    const active = year > 0 && expense.oneOffYear === year;
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
    expense.annualBase * Math.pow(1 + expense.growthRate, Math.max(year, 0));

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

function computeDeductionTaxSavings(baseIncome, deduction, taxConfig) {
  const safeDeduction = Math.max(0, deduction);
  if (safeDeduction <= 0) {
    return 0;
  }

  const taxableBase = Math.max(0, baseIncome - safeDeduction);
  const federal = computeAdditionalTax(
    taxableBase,
    safeDeduction,
    taxConfig.federalBrackets,
  );
  const state = computeAdditionalTax(
    taxableBase,
    safeDeduction,
    taxConfig.stateBrackets,
  );
  return roundTo(federal + state, 2);
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
    const nextBasisValue =
      bucketState.taxTreatment === "none" ||
      bucketState.taxTreatment === "taxDeferred"
        ? bucketState.balance > 0
          ? bucketState.basisValue * (nextBalance / bucketState.balance)
          : bucketState.basisValue
        : 0;

    return {
      ...bucketState,
      balance: nextBalance,
      basisValue: Math.max(0, nextBasisValue),
    };
  });
}

function advanceProjectedBucketWithNetContribution(
  bucketState,
  annualContribution = 0,
) {
  const contribution = annualContribution;
  const nextBalance = roundTo(
    bucketState.balance * (1 + bucketState.growth) +
      contribution * (1 + bucketState.growth / 2),
    2,
  );

  let nextBasisValue = bucketState.basisValue;
  if (
    bucketState.taxTreatment === "none" ||
    bucketState.taxTreatment === "taxDeferred"
  ) {
    if (contribution >= 0) {
      nextBasisValue = roundTo(bucketState.basisValue + contribution, 2);
    } else if (bucketState.balance > 0) {
      nextBasisValue = roundTo(
        bucketState.basisValue *
          (Math.max(0, nextBalance) / bucketState.balance),
        2,
      );
    } else {
      nextBasisValue = 0;
    }
  } else {
    nextBasisValue = 0;
  }

  return {
    ...bucketState,
    balance: nextBalance,
    basisValue: Math.max(0, nextBasisValue),
  };
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
    Math.max(0, Number(incomeSummary?.employee401k) || 0) +
      Math.max(0, Number(incomeSummary?.employerMatch) || 0),
  );
  add(
    targets.megaBucketId,
    Math.max(0, Number(incomeSummary?.megaBackdoor) || 0),
  );
  add(
    targets.hsaBucketId,
    Math.max(0, Number(incomeSummary?.hsaContribution) || 0),
  );
  add(
    targets.iraBucketId,
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
      : [],
  };
  const annualExpenseTotal = expenseInputs.expenses.reduce(
    (sum, expense) => sum + expense.annualBase,
    0,
  );
  const employee401k = Number.isFinite(incomeSummary?.employee401k)
    ? incomeSummary.employee401k
    : 0;
  const hsaContribution = Number.isFinite(incomeSummary?.hsaContribution)
    ? incomeSummary.hsaContribution
    : 0;
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
  const deductibleCashFundedAssetPlan = assetInputs.buckets.reduce(
    (sum, bucket) =>
      sum + (bucket.taxTreatment === "taxDeductible" ? bucket.contribution : 0),
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

  let bucketStates = fundHomeEquityFromBuckets(
    assetInputs.buckets.map((bucket) => createProjectedBucketState(bucket)),
    projectionInputs.mortgageFundingBucketId,
    currentHomeEquity,
  );
  let vestedRsuBalance = 0;
  const currentTaxBases = getTaxBases(
    Number.isFinite(incomeSummary?.grossSalary) ? incomeSummary.grossSalary : 0,
    employee401k,
    hsaContribution,
    Number.isFinite(incomeSummary?.rsuGrossNextYear)
      ? incomeSummary.rsuGrossNextYear
      : 0,
    taxConfig,
  );
  const currentAssetSnapshots = bucketStates.map((bucketState) =>
    snapshotProjectedBucket(bucketState, taxConfig, currentTaxBases),
  );
  const currentAssetsGross = currentAssetSnapshots.reduce(
    (sum, bucket) => sum + bucket.balance,
    0,
  );
  const currentAssetEmbeddedTax = currentAssetSnapshots.reduce(
    (sum, bucket) => sum + bucket.taxDue,
    0,
  );
  const currentCapitalGainsTax = currentAssetSnapshots.reduce(
    (sum, bucket) =>
      sum + (bucket.taxTreatment === "none" ? bucket.taxDue : 0),
    0,
  );
  const currentTotalCapitalGains = currentAssetSnapshots.reduce(
    (sum, bucket) =>
      sum + Math.max(0, bucket.balance - bucket.basis),
    0,
  );
  const currentReserveCash =
    currentAssetSnapshots.find((bucket) => bucket.id === CASH_BUCKET_ID)?.balance ??
    0;
  const currentExpenseSnapshots = buildExpenseSnapshots(expenseInputs.expenses, 0);
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
      projectionInputs.takeHomeGrowthRate,
    );
    const rsuNet = roundTo(
      computeIncrementalTakeHome(rsuInputs, taxConfig, rsuGross),
      2,
    );
    const takeHome = roundTo(
      annualTakeHomeBase *
        Math.pow(1 + projectionInputs.takeHomeGrowthRate, year),
      2,
    );
    const nonHousingExpenses = roundTo(
      getAnnualNonHousingExpenses(expenseInputs.expenses, year),
      2,
    );
    const ordinaryIncomeBase =
      (Number.isFinite(incomeSummary?.grossSalary) ? incomeSummary.grossSalary : 0) *
      Math.pow(1 + projectionInputs.takeHomeGrowthRate, year);
    const taxBases = getTaxBases(
      ordinaryIncomeBase,
      employee401k,
      hsaContribution,
      rsuGross,
      taxConfig,
    );
    const baseDeductionTaxSavings = computeDeductionTaxSavings(
      ordinaryIncomeBase,
      deductibleCashFundedAssetPlan,
      taxConfig,
    );
    const freeCashBeforeAllocation = roundTo(
      takeHome -
        fixedMortgageAnnual -
        nonHousingExpenses -
        cashFundedAssetPlan +
        baseDeductionTaxSavings,
      2,
    );
    const positiveFreeCash = Math.max(0, freeCashBeforeAllocation);
    let remainingFreeCash = positiveFreeCash;

    const extraContributionByBucket = {};
    let allocatedFreeCash = 0;
    let deductibleExtraContribution = 0;

    assetInputs.buckets.forEach((bucket) => {
      if (
        bucket.id === CASH_BUCKET_ID ||
        (incomeDirectedContributions[bucket.id] ?? 0) > 0
      ) {
        return;
      }
      const allocation = projectionInputs.allocations[bucket.id] ?? {
        mode: "percent",
        value: 0,
      };
      if (allocation.mode !== "amount") {
        return;
      }

      const extraContribution = roundTo(
        Math.min(remainingFreeCash, allocation.value),
        2,
      );
      extraContributionByBucket[bucket.id] = extraContribution;
      allocatedFreeCash = roundTo(allocatedFreeCash + extraContribution, 2);
      remainingFreeCash = roundTo(remainingFreeCash - extraContribution, 2);
      if (bucket.taxTreatment === "taxDeductible") {
        deductibleExtraContribution = roundTo(
          deductibleExtraContribution + extraContribution,
          2,
        );
      }
    });

    assetInputs.buckets.forEach((bucket) => {
      if (
        bucket.id === CASH_BUCKET_ID ||
        (incomeDirectedContributions[bucket.id] ?? 0) > 0
      ) {
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
      const extraContribution = roundTo(remainingFreeCash * share, 2);
      extraContributionByBucket[bucket.id] =
        roundTo(
          (extraContributionByBucket[bucket.id] ?? 0) + extraContribution,
          2,
        );
      allocatedFreeCash = roundTo(allocatedFreeCash + extraContribution, 2);
      if (bucket.taxTreatment === "taxDeductible") {
        deductibleExtraContribution = roundTo(
          deductibleExtraContribution + extraContribution,
          2,
        );
      }
    });

    const extraDeductionTaxSavings = computeDeductionTaxSavings(
      ordinaryIncomeBase,
      deductibleExtraContribution,
      taxConfig,
    );
    const reserveCashFlow =
      freeCashBeforeAllocation >= 0
        ? freeCashBeforeAllocation - allocatedFreeCash + extraDeductionTaxSavings
        : freeCashBeforeAllocation;
    bucketStates = bucketStates.map((bucketState) => {
      const totalContribution =
        bucketState.contribution +
        (incomeDirectedContributions[bucketState.id] ?? 0) +
        (extraContributionByBucket[bucketState.id] ?? 0) +
        (bucketState.id === CASH_BUCKET_ID ? reserveCashFlow : 0);

      return bucketState.id === CASH_BUCKET_ID
        ? advanceProjectedBucketWithNetContribution(
            bucketState,
            totalContribution,
          )
        : advanceProjectedBucket(bucketState, totalContribution);
    });

    const assetSnapshots = bucketStates.map((bucketState) =>
      snapshotProjectedBucket(bucketState, taxConfig, taxBases),
    );

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
    const capitalGainsTax = assetSnapshots.reduce(
      (sum, bucket) =>
        sum + (bucket.taxTreatment === "none" ? bucket.taxDue : 0),
      0,
    );
    const totalCapitalGains = assetSnapshots.reduce(
      (sum, bucket) =>
        sum + Math.max(0, bucket.balance - bucket.basis),
      0,
    );
    const assetAfterTax = assetSnapshots.reduce(
      (sum, bucket) => sum + bucket.afterTax,
      0,
    );
    const expenseSnapshots = buildExpenseSnapshots(expenseInputs.expenses, year);
    const reserveCash =
      assetSnapshots.find((bucket) => bucket.id === CASH_BUCKET_ID)?.balance ?? 0;
    const nextVestedRsuBalance = roundTo(
      vestedRsuBalance * (1 + projectionInputs.rsuStockGrowthRate) + rsuNet,
      2,
    );
    vestedRsuBalance = nextVestedRsuBalance;
    const netWorth =
      assetsGross +
      homeEquity +
      (projectionInputs.includeVestedRsusInNetWorth ? vestedRsuBalance : 0);

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
      vestedRsuBalance,
      assetsGross,
      assetEmbeddedTax,
      capitalGainsTax,
      totalCapitalGains,
      assetAfterTax,
      homeEquity,
      residualCash: reserveCash,
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
      getAnnualNonHousingExpenses(expenseInputs.expenses, 0) -
      cashFundedAssetPlan,
    allocatedFreeCash: 0,
    reserveCashFlow:
      annualTakeHomeBase -
      fixedMortgageAnnual -
      getAnnualNonHousingExpenses(expenseInputs.expenses, 0) -
      cashFundedAssetPlan,
    rsuGross: computeRsuGrossForItems(
      rsuInputs.rsuItems,
      0,
      projectionInputs.rsuStockGrowthRate,
      projectionInputs.takeHomeGrowthRate,
    ),
    rsuNet: computeIncrementalTakeHome(
      rsuInputs,
      taxConfig,
        computeRsuGrossForItems(
          rsuInputs.rsuItems,
          0,
          projectionInputs.rsuStockGrowthRate,
          projectionInputs.takeHomeGrowthRate,
        ),
      ),
  };
  const ending = projection[projection.length - 1] ?? {
    netWorth: currentAssetsGross + currentHomeEquity,
    homeEquity: currentHomeEquity,
    assetsGross: currentAssetsGross,
    vestedRsuBalance: 0,
    assetEmbeddedTax: currentAssetEmbeddedTax,
    residualCash: currentReserveCash,
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
    currentVestedRsuBalance: 0,
    currentAssetEmbeddedTax,
    currentCapitalGainsTax,
    currentTotalCapitalGains,
    currentNetWorth: currentAssetsGross + currentHomeEquity,
    firstYear,
    ending,
    scaledAllocationFactor,
    incomeDirectedContributions,
    projection,
  };
}
