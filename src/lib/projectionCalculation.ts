import { clamp, roundTo } from "./format";
import {
  advanceProjectedBucket,
  buildIncomeDirectedContributions,
  PINNED_BUCKETS,
  deriveProjectedBucketValues,
  type Assets,
  type ProjectedBucketValues,
  type ProjectedBucketState,
} from "./assetsModel";
import { getAnnualNonHousingExpenses, type Expenses, type ExpenseSnapshot } from "./expensesModel";
import {
  calculateIncome,
  createResolvedIncome,
  computeAnnualTaxes,
  computeIncrementalTakeHome,
  computeRsuGrossForItems,
  type IncomeSummary,
  type ResolvedIncome,
} from "./incomeModel";
import { getMortgageYearInterest, getMortgageYearPropertyTax, type MortgageSummary } from "./mortgagePage";
import { type Projection } from "./projectionState";
import { type ProjectionRow } from "./projectionUtils";
import { computeAdditionalTax, type TaxConfig } from "./taxConfig";

type ProjectionMortgageSummary = Partial<MortgageSummary>;

type ProjectionBase = {
  assets: Assets;
  expenses: Expenses;
  projection: Projection;
  mortgageSummary: ProjectionMortgageSummary;
  taxConfig: TaxConfig;
  income: ResolvedIncome;
  mortgage: {
    annualPayment: number;
    homePrice: number;
    currentEquity: number;
  };
  assetPlan: {
    totalContributions: number;
    deductibleContributions: number;
    allocatableBuckets: Assets["buckets"];
    incomeDirectedContributions: Record<string, number>;
  };
  reserveCashBucketId: string;
  allocationPercentScale: number;
};

type ProjectionSimulation = {
  base: ProjectionBase;
  bucketStates: ProjectedBucketState[];
  vestedRsuBalance: number;
  projection: ProjectionRow[];
};

type ProjectionSnapshot = ProjectionAssetSummary & {
  assetSnapshots: ProjectedBucketValues[];
  expenseSnapshots: ExpenseSnapshot[];
};

type ProjectionAssetSummary = {
  assetsGross: number;
  capitalGainsTax: number;
  totalCapitalGains: number;
  reserveCash: number;
};

type ProjectionYearContext = {
  takeHome: number;
  rsuGross: number;
  rsuNet: number;
  nonHousingExpenses: number;
  ordinaryIncome: number;
  taxBases: { federalTaxableIncome?: number };
  freeCashBeforeAllocation: number;
};

type FreeCashAllocation = {
  extraContributionByBucket: Record<string, number>;
  reserveCashFlow: number;
};

export type ProjectionResults = {
  ending: ProjectionRow;
  incomeDirectedContributions: Record<string, number>;
  projection: ProjectionRow[];
};

function getTaxBases(
  income: ResolvedIncome,
  rsuGross: number,
  taxConfig: TaxConfig,
) {
  const taxes = computeAnnualTaxes(income, taxConfig, rsuGross);

  return {
    federalTaxableIncome: taxes.federalTaxableIncome,
  };
}

function buildExpenseSnapshots(expenses: Expenses["expenses"], year: number): ExpenseSnapshot[] {
  return expenses.map((expense) => buildExpenseSnapshot(expense, year));
}

function buildExpenseSnapshot(expense: Expenses["expenses"][number], year: number): ExpenseSnapshot {
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

  const annualAmount = expense.annualBase * Math.pow(1 + expense.growthRate, Math.max(year, 0));

  return {
    id: expense.id,
    label: expense.label,
    frequency: expense.frequency,
    amount: expense.frequency === "monthly" ? annualAmount / 12 : annualAmount,
    annualAmount,
    cadenceLabel: expense.frequency === "annual" ? "Annual" : "Monthly",
  };
}

function mapSnapshotsById<T extends { id: string }>(snapshots: T[]) {
  return Object.fromEntries(snapshots.map((snapshot) => [snapshot.id, snapshot])) as Record<string, T>;
}

function computeDeductionTaxSavings(baseIncome: number, deduction: number, taxConfig: TaxConfig) {
  if (deduction <= 0) {
    return 0;
  }

  const taxableBase = Math.max(0, baseIncome - deduction);
  const federal = computeAdditionalTax(taxableBase, deduction, taxConfig.federalBrackets);
  const state = computeAdditionalTax(taxableBase, deduction, taxConfig.stateBrackets);
  return roundTo(federal + state, 2);
}

function fundHomeEquityFromBuckets(
  bucketStates: ProjectedBucketState[],
  fundingBucketId: string,
  amount: number,
) {
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
      bucketState.taxTreatment === "none" || bucketState.taxTreatment === "taxDeferred"
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
  bucketState: ProjectedBucketState,
  annualContribution = 0,
): ProjectedBucketState {
  const nextBalance = roundTo(
    bucketState.balance * (1 + bucketState.growth) + annualContribution * (1 + bucketState.growth / 2),
    2,
  );
  const nextBasisValue =
    bucketState.taxTreatment === "none" || bucketState.taxTreatment === "taxDeferred"
      ? annualContribution >= 0
        ? roundTo(bucketState.basisValue + annualContribution, 2)
        : bucketState.balance > 0
          ? roundTo(bucketState.basisValue * (Math.max(0, nextBalance) / bucketState.balance), 2)
          : 0
      : 0;

  return {
    ...bucketState,
    balance: nextBalance,
    basisValue: Math.max(0, nextBasisValue),
  };
}

function advanceProjectionBuckets({
  bucketStates,
  extraContributionByBucket,
  incomeDirectedContributions,
  reserveCashFlow,
}: {
  bucketStates: ProjectedBucketState[];
  extraContributionByBucket: Record<string, number>;
  incomeDirectedContributions: Record<string, number>;
  reserveCashFlow: number;
}) {
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;

  return bucketStates.map((bucketState) => {
    const totalContribution =
      bucketState.contribution +
      (incomeDirectedContributions[bucketState.id] ?? 0) +
      (extraContributionByBucket[bucketState.id] ?? 0) +
      (bucketState.id === reserveCashBucketId ? reserveCashFlow : 0);

    return bucketState.id === reserveCashBucketId
      ? advanceProjectedBucketWithNetContribution(bucketState, totalContribution)
      : advanceProjectedBucket(bucketState, totalContribution);
  });
}

function createProjectionSimulation({
  incomeSummary,
  mortgageSummary,
  assets,
  expenses,
  projection,
  taxConfig,
}: {
  incomeSummary: IncomeSummary;
  mortgageSummary: ProjectionMortgageSummary;
  assets: Assets;
  expenses: Expenses;
  projection: Projection;
  taxConfig: TaxConfig;
}): ProjectionSimulation {
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;
  const income = createResolvedIncome({
    ...incomeSummary,
    mortgageInterest: getMortgageYearInterest(mortgageSummary, 1),
    propertyTax: getMortgageYearPropertyTax(mortgageSummary),
  });
  const base: ProjectionBase = {
    assets,
    expenses,
    projection,
    mortgageSummary,
    taxConfig,
    income,
    mortgage: {
      annualPayment: (mortgageSummary.totalMonthlyPayment ?? 0) * 12,
      homePrice: mortgageSummary.homePrice ?? 0,
      currentEquity: mortgageSummary.currentEquity ?? 0,
    },
    assetPlan: {
      totalContributions: assets.buckets.reduce((sum, bucket) => sum + bucket.contribution, 0),
      deductibleContributions: assets.buckets.reduce(
        (sum, bucket) => sum + (bucket.taxTreatment === "taxDeductible" ? bucket.contribution : 0),
        0,
      ),
      allocatableBuckets: assets.buckets.filter(
        (bucket) =>
          bucket.id !== reserveCashBucketId &&
          (incomeDirectedContributions[bucket.id] ?? 0) === 0,
      ),
      incomeDirectedContributions,
    },
    reserveCashBucketId,
    allocationPercentScale:
      projection.allocationPercentTotal > 100 ? 100 / projection.allocationPercentTotal : 1,
  };
  const bucketStates = fundHomeEquityFromBuckets(
    base.assets.buckets.map((bucket) => ({
      ...bucket,
      balance: bucket.current,
      basisValue: bucket.taxTreatment === "none" ? bucket.basis : bucket.current,
    })),
    base.projection.mortgageFundingBucketId,
    base.mortgage.currentEquity,
  );
  const currentTaxBases = getTaxBases(base.income, base.income.rsuGrossNextYear, base.taxConfig);
  const currentSnapshot = buildProjectionSnapshot({
    base,
    year: 0,
    bucketStates,
    taxBases: currentTaxBases,
  });

  return {
    base,
    bucketStates,
    vestedRsuBalance: 0,
    projection: [
      buildProjectionRow({
        base,
        year: 0,
        takeHome: calculateIncome(base.income, base.taxConfig).annualTakeHome,
        rsuGross: 0,
        rsuNet: 0,
        nonHousingExpenses: roundTo(getAnnualNonHousingExpenses(base.expenses.expenses, 0), 2),
        freeCashBeforeAllocation: currentSnapshot.reserveCash,
        snapshot: currentSnapshot,
        vestedRsuBalance: 0,
        homeEquity: base.mortgage.currentEquity,
      }),
    ],
  };
}

function summarizeAssetSnapshots(
  assetSnapshots: ProjectedBucketValues[],
  reserveCashBucketId: string,
): ProjectionAssetSummary {
  return {
    assetsGross: assetSnapshots.reduce((sum, bucket) => sum + bucket.balance, 0),
    capitalGainsTax: assetSnapshots.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "none" ? bucket.taxDue : 0),
      0,
    ),
    totalCapitalGains: assetSnapshots.reduce(
      (sum, bucket) => sum + Math.max(0, bucket.balance - bucket.basis),
      0,
    ),
    reserveCash: assetSnapshots.find((bucket) => bucket.id === reserveCashBucketId)?.balance ?? 0,
  };
}

function buildProjectionSnapshot({
  base,
  year,
  bucketStates,
  taxBases,
}: {
  base: ProjectionBase;
  year: number;
  bucketStates: ProjectedBucketState[];
  taxBases: { federalTaxableIncome?: number };
}): ProjectionSnapshot {
  const assetSnapshots = bucketStates.map((bucketState) =>
    deriveProjectedBucketValues(bucketState, base.taxConfig, taxBases),
  );

  return {
    ...summarizeAssetSnapshots(assetSnapshots, base.reserveCashBucketId),
    assetSnapshots,
    expenseSnapshots: buildExpenseSnapshots(base.expenses.expenses, year),
  };
}

function buildProjectionRow({
  base,
  year,
  takeHome,
  rsuGross,
  rsuNet,
  nonHousingExpenses,
  freeCashBeforeAllocation,
  snapshot,
  vestedRsuBalance,
  homeEquity,
}: {
  base: ProjectionBase;
  year: number;
  takeHome: number;
  rsuGross: number;
  rsuNet: number;
  nonHousingExpenses: number;
  freeCashBeforeAllocation: number;
  snapshot: ProjectionSnapshot;
  vestedRsuBalance: number;
  homeEquity: number;
}): ProjectionRow {
  return {
    year,
    takeHome,
    rsuGross,
    rsuNet,
    nonHousingExpenses,
    mortgageLineItem: base.mortgage.annualPayment,
    freeCashBeforeAllocation,
    bucketSnapshotsById: mapSnapshotsById(snapshot.assetSnapshots),
    expenseSnapshotsById: mapSnapshotsById(snapshot.expenseSnapshots),
    vestedRsuBalance,
    assetsGross: snapshot.assetsGross,
    capitalGainsTax: snapshot.capitalGainsTax,
    totalCapitalGains: snapshot.totalCapitalGains,
    homeEquity,
    residualCash: snapshot.reserveCash,
    netWorth:
      snapshot.assetsGross +
      homeEquity +
      (base.projection.includeVestedRsusInNetWorth ? vestedRsuBalance : 0),
  };
}

function buildProjectionYearContext(base: ProjectionBase, year: number): ProjectionYearContext {
  const growthFactor = Math.pow(1 + base.projection.incomeGrowthRate, year);
  const income: ResolvedIncome = {
    ...base.income,
    grossSalary: base.income.grossSalary * growthFactor,
    mortgageInterest: getMortgageYearInterest(base.mortgageSummary, year),
  };
  const rsuGross = computeRsuGrossForItems(
    income.rsuItems,
    year - 1,
    base.projection.rsuStockGrowthRate,
    base.projection.incomeGrowthRate,
  );
  const rsuNet = roundTo(computeIncrementalTakeHome(income, base.taxConfig, rsuGross), 2);
  const takeHome = calculateIncome(income, base.taxConfig).annualTakeHome;
  const nonHousingExpenses = roundTo(getAnnualNonHousingExpenses(base.expenses.expenses, year), 2);
  const ordinaryIncome = income.grossSalary;
  const taxBases = getTaxBases(income, rsuGross, base.taxConfig);
  const deductionTaxSavings = computeDeductionTaxSavings(
    ordinaryIncome,
    base.assetPlan.deductibleContributions,
    base.taxConfig,
  );

  return {
    takeHome,
    rsuGross,
    rsuNet,
    nonHousingExpenses,
    ordinaryIncome,
    taxBases,
    freeCashBeforeAllocation: roundTo(
      takeHome -
        base.mortgage.annualPayment -
        nonHousingExpenses -
        base.assetPlan.totalContributions +
        deductionTaxSavings,
      2,
    ),
  };
}

function allocateFreeCash(
  base: ProjectionBase,
  yearContext: ProjectionYearContext,
): FreeCashAllocation {
  const extraContributionByBucket: Record<string, number> = {};
  let remainingCash = Math.max(0, yearContext.freeCashBeforeAllocation);
  let allocatedCash = 0;
  let deductibleContribution = 0;

  function addContribution(bucket: Assets["buckets"][number], amount: number) {
    extraContributionByBucket[bucket.id] = roundTo((extraContributionByBucket[bucket.id] ?? 0) + amount, 2);
    allocatedCash = roundTo(allocatedCash + amount, 2);
    if (bucket.taxTreatment === "taxDeductible") {
      deductibleContribution = roundTo(deductibleContribution + amount, 2);
    }
  }

  for (const bucket of base.assetPlan.allocatableBuckets) {
    const allocation = base.projection.allocations[bucket.id] ?? { mode: "percent", value: 0 };
    if (allocation.mode !== "amount") {
      continue;
    }

    const contribution = roundTo(Math.min(remainingCash, allocation.value), 2);
    remainingCash = roundTo(remainingCash - contribution, 2);
    addContribution(bucket, contribution);
  }

  for (const bucket of base.assetPlan.allocatableBuckets) {
    const allocation = base.projection.allocations[bucket.id] ?? { mode: "percent", value: 0 };
    if (allocation.mode !== "percent") {
      continue;
    }

    const share = (clamp(allocation.value, 0, 100) / 100) * base.allocationPercentScale;
    addContribution(bucket, roundTo(remainingCash * share, 2));
  }

  const extraDeductionTaxSavings = computeDeductionTaxSavings(
    yearContext.ordinaryIncome,
    deductibleContribution,
    base.taxConfig,
  );

  return {
    extraContributionByBucket,
    reserveCashFlow:
      yearContext.freeCashBeforeAllocation >= 0
        ? yearContext.freeCashBeforeAllocation - allocatedCash + extraDeductionTaxSavings
        : yearContext.freeCashBeforeAllocation,
  };
}

function getMortgageEndingBalance(mortgageSummary: ProjectionMortgageSummary, year: number) {
  const loanYear = mortgageSummary.yearlyLoan?.find((row) => row.year === year);
  if (loanYear) {
    return loanYear.endingBalance;
  }
  return mortgageSummary.yearlyLoan?.length ? 0 : (mortgageSummary.loanAmount ?? 0);
}

function advanceProjectionYear(simulation: ProjectionSimulation, year: number) {
  const { base } = simulation;
  const yearContext = buildProjectionYearContext(base, year);
  const allocation = allocateFreeCash(base, yearContext);
  const nextBucketStates = advanceProjectionBuckets({
    bucketStates: simulation.bucketStates,
    extraContributionByBucket: allocation.extraContributionByBucket,
    incomeDirectedContributions: base.assetPlan.incomeDirectedContributions,
    reserveCashFlow: allocation.reserveCashFlow,
  });
  const vestedRsuBalance = roundTo(
    simulation.vestedRsuBalance * (1 + base.projection.rsuStockGrowthRate) + yearContext.rsuNet,
    2,
  );
  const homeEquity =
    base.mortgage.homePrice * Math.pow(1 + base.projection.homeAppreciationRate, year) -
    getMortgageEndingBalance(base.mortgageSummary, year);
  const snapshot = buildProjectionSnapshot({
    base,
    year,
    bucketStates: nextBucketStates,
    taxBases: yearContext.taxBases,
  });

  simulation.bucketStates = nextBucketStates;
  simulation.vestedRsuBalance = vestedRsuBalance;
  simulation.projection.push(
    buildProjectionRow({
      base,
      year,
      takeHome: yearContext.takeHome,
      rsuGross: yearContext.rsuGross,
      rsuNet: yearContext.rsuNet,
      nonHousingExpenses: yearContext.nonHousingExpenses,
      freeCashBeforeAllocation: yearContext.freeCashBeforeAllocation,
      snapshot,
      vestedRsuBalance,
      homeEquity,
    }),
  );
}

export function calculateProjection({
  incomeSummary,
  mortgageSummary,
  assets,
  expenses,
  projection,
  taxConfig,
}: {
  incomeSummary: IncomeSummary;
  mortgageSummary: ProjectionMortgageSummary;
  assets: Assets;
  expenses: Expenses;
  projection: Projection;
  taxConfig: TaxConfig;
}): ProjectionResults {
  const simulation = createProjectionSimulation({
    incomeSummary,
    mortgageSummary,
    assets,
    expenses,
    projection,
    taxConfig,
  });

  for (let year = 1; year <= projection.horizonYears; year += 1) {
    advanceProjectionYear(simulation, year);
  }

  return {
    ending: simulation.projection[simulation.projection.length - 1] ?? simulation.projection[0],
    incomeDirectedContributions: simulation.base.assetPlan.incomeDirectedContributions,
    projection: simulation.projection,
  };
}
