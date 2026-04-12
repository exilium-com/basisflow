import { roundTo } from "./format";
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
  computeRsuGrossForYear,
  type IncomeSummary,
  type ResolvedIncome,
} from "./incomeModel";
import {
  getMortgageAnnualHousingCost,
  getMortgageYearAverageBalance,
  getMortgageYearInterest,
  getMortgageYearPropertyTax,
  type MortgageSummary,
} from "./mortgagePage";
import { type Projection } from "./projectionState";
import { type ProjectionRow } from "./projectionUtils";
import { computeAdditionalTax, type TaxConfig } from "./taxConfig";

type ProjectionBase = {
  assets: Assets;
  expenses: Expenses;
  projection: Projection;
  rsuGrowthRateById: Record<string, number>;
  mortgageSummary: MortgageSummary;
  taxConfig: TaxConfig;
  income: ResolvedIncome;
  mortgage: {
    homePrice: number;
    currentEquity: number;
  };
  assetPlan: {
    totalContributions: number;
    deductibleContributions: number;
    incomeDirectedContributions: Record<string, number>;
    freeCashFlowBucket: Assets["buckets"][number] | null;
  };
  reserveCashBucketId: string;
};

type ProjectionSimulation = {
  base: ProjectionBase;
  bucketStates: ProjectedBucketState[];
  vestedRsuBalance: number;
  vestedRsuBalanceById: Record<string, number>;
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
  rsuGrossById: Record<string, number>;
  housingCost: number;
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

function getTaxBases(income: ResolvedIncome, rsuGross: number, taxConfig: TaxConfig) {
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

function fundHomeEquityFromBuckets(bucketStates: ProjectedBucketState[], fundingBucketId: string, amount: number) {
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

function withdrawBucketForNetCash({
  bucketState,
  neededNetCash,
  taxConfig,
  taxBases,
}: {
  bucketState: ProjectedBucketState;
  neededNetCash: number;
  taxConfig: TaxConfig;
  taxBases: { federalTaxableIncome?: number };
}) {
  const snapshot = deriveProjectedBucketValues(bucketState, taxConfig, taxBases);
  const availableNetCash = Math.max(0, snapshot.afterTax);

  if (neededNetCash <= 0 || bucketState.balance <= 0 || availableNetCash <= 0) {
    return { bucketState, netCash: 0 };
  }

  const netCash = Math.min(neededNetCash, availableNetCash);
  const grossWithdrawal = Math.min(bucketState.balance, roundTo(bucketState.balance * (netCash / availableNetCash), 2));
  const nextBalance = roundTo(bucketState.balance - grossWithdrawal, 2);
  const nextBasisValue =
    bucketState.taxTreatment === "none" || bucketState.taxTreatment === "taxDeferred"
      ? bucketState.balance > 0
        ? roundTo(bucketState.basisValue * (nextBalance / bucketState.balance), 2)
        : bucketState.basisValue
      : 0;

  return {
    bucketState: {
      ...bucketState,
      balance: nextBalance,
      basisValue: Math.max(0, nextBasisValue),
    },
    netCash: roundTo(netCash, 2),
  };
}

function restoreMinimumCash(
  base: ProjectionBase,
  bucketStates: ProjectedBucketState[],
  taxBases: { federalTaxableIncome?: number },
) {
  if (base.projection.minimumCash <= 0) {
    return bucketStates;
  }

  const reserveCashIndex = bucketStates.findIndex((bucketState) => bucketState.id === base.reserveCashBucketId);
  if (reserveCashIndex === -1) {
    return bucketStates;
  }

  const pinnedBucketIds = new Set(Object.values(PINNED_BUCKETS).map((bucket) => bucket.id));
  const nextBucketStates = [...bucketStates];
  const liquidationCandidates = nextBucketStates
    .map((bucketState, index) => ({ bucketState, index }))
    .filter(
      ({ bucketState }) =>
        bucketState.id !== base.reserveCashBucketId &&
        !bucketState.illiquid &&
        bucketState.balance > 0,
    )
    .sort((left, right) => {
      const leftIsCustom = !pinnedBucketIds.has(left.bucketState.id);
      const rightIsCustom = !pinnedBucketIds.has(right.bucketState.id);

      if (leftIsCustom !== rightIsCustom) {
        return leftIsCustom ? -1 : 1;
      }

      return left.index - right.index;
    });

  let reserveCashShortfall = Math.max(0, base.projection.minimumCash - nextBucketStates[reserveCashIndex].balance);
  for (const { index } of liquidationCandidates) {
    if (reserveCashShortfall <= 0) {
      break;
    }

    const withdrawal = withdrawBucketForNetCash({
      bucketState: nextBucketStates[index],
      neededNetCash: reserveCashShortfall,
      taxConfig: base.taxConfig,
      taxBases,
    });
    if (withdrawal.netCash <= 0) {
      continue;
    }

    nextBucketStates[index] = withdrawal.bucketState;
    nextBucketStates[reserveCashIndex] = {
      ...nextBucketStates[reserveCashIndex],
      balance: roundTo(nextBucketStates[reserveCashIndex].balance + withdrawal.netCash, 2),
      basisValue: roundTo(Math.max(0, nextBucketStates[reserveCashIndex].basisValue) + withdrawal.netCash, 2),
    };
    reserveCashShortfall = Math.max(0, base.projection.minimumCash - nextBucketStates[reserveCashIndex].balance);
  }

  return nextBucketStates;
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
  rsuGrowthRateById,
  taxConfig,
}: {
  incomeSummary: IncomeSummary;
  mortgageSummary: MortgageSummary;
  assets: Assets;
  expenses: Expenses;
  projection: Projection;
  rsuGrowthRateById: Record<string, number>;
  taxConfig: TaxConfig;
}): ProjectionSimulation {
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;
  const income = createResolvedIncome({
    ...incomeSummary,
    mortgageAverageBalance: getMortgageYearAverageBalance(mortgageSummary, 0),
    mortgageInterest: getMortgageYearInterest(mortgageSummary, 0),
    propertyTax: getMortgageYearPropertyTax(mortgageSummary),
  });
  const base: ProjectionBase = {
    assets,
    expenses,
    projection,
    rsuGrowthRateById,
    mortgageSummary,
    taxConfig,
    income,
    mortgage: {
      homePrice: mortgageSummary.homePrice ?? 0,
      currentEquity: mortgageSummary.currentEquity ?? 0,
    },
    assetPlan: {
      totalContributions: assets.buckets.reduce((sum, bucket) => sum + bucket.contribution, 0),
      deductibleContributions: assets.buckets.reduce(
        (sum, bucket) => sum + (bucket.taxTreatment === "taxDeductible" ? bucket.contribution : 0),
        0,
      ),
      incomeDirectedContributions,
      freeCashFlowBucket:
        assets.buckets.find(
          (bucket) =>
            bucket.id === projection.freeCashFlowBucketId &&
            bucket.id !== reserveCashBucketId &&
            (incomeDirectedContributions[bucket.id] ?? 0) === 0,
        ) ?? null,
    },
    reserveCashBucketId,
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
  const yearZeroContext = buildProjectionYearContext(base, 0);
  const initialBucketStates = restoreMinimumCash(base, bucketStates, yearZeroContext.taxBases);
  const currentSnapshot = buildProjectionSnapshot({
    base,
    year: 0,
    bucketStates: initialBucketStates,
    taxBases: yearZeroContext.taxBases,
  });

  return {
    base,
    bucketStates: initialBucketStates,
    vestedRsuBalance: 0,
    vestedRsuBalanceById: {},
    projection: [
      buildProjectionRow({
        base,
        year: 0,
        takeHome: yearZeroContext.takeHome,
        rsuGross: yearZeroContext.rsuGross,
        rsuNet: yearZeroContext.rsuNet,
        housingCost: yearZeroContext.housingCost,
        nonHousingExpenses: yearZeroContext.nonHousingExpenses,
        freeCashBeforeAllocation: yearZeroContext.freeCashBeforeAllocation,
        snapshot: currentSnapshot,
        vestedRsuBalance: 0,
        vestedRsuBalanceById: {},
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
    totalCapitalGains: assetSnapshots.reduce((sum, bucket) => sum + Math.max(0, bucket.balance - bucket.basis), 0),
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
  housingCost,
  nonHousingExpenses,
  freeCashBeforeAllocation,
  snapshot,
  vestedRsuBalance,
  vestedRsuBalanceById,
  homeEquity,
}: {
  base: ProjectionBase;
  year: number;
  takeHome: number;
  rsuGross: number;
  rsuNet: number;
  housingCost: number;
  nonHousingExpenses: number;
  freeCashBeforeAllocation: number;
  snapshot: ProjectionSnapshot;
  vestedRsuBalance: number;
  vestedRsuBalanceById: Record<string, number>;
  homeEquity: number;
}): ProjectionRow {
  return {
    year,
    takeHome,
    rsuGross,
    rsuNet,
    nonHousingExpenses,
    mortgageLineItem: housingCost,
    freeCashBeforeAllocation,
    bucketSnapshotsById: mapSnapshotsById(snapshot.assetSnapshots),
    expenseSnapshotsById: mapSnapshotsById(snapshot.expenseSnapshots),
    vestedRsuBalance,
    vestedRsuBalanceById,
    assetsGross: snapshot.assetsGross,
    capitalGainsTax: snapshot.capitalGainsTax,
    totalCapitalGains: snapshot.totalCapitalGains,
    homeEquity,
    residualCash: snapshot.reserveCash,
    netWorth: snapshot.assetsGross + homeEquity + (base.projection.includeVestedRsusInNetWorth ? vestedRsuBalance : 0),
  };
}

function buildProjectionYearContext(base: ProjectionBase, year: number): ProjectionYearContext {
  const growthFactor = Math.pow(1 + base.projection.incomeGrowthRate, year);
  const housingCost = getMortgageAnnualHousingCost(base.mortgageSummary, year);
  const income: ResolvedIncome = {
    ...base.income,
    grossSalary: base.income.grossSalary * growthFactor,
    mortgageAverageBalance: getMortgageYearAverageBalance(base.mortgageSummary, year),
    mortgageInterest: getMortgageYearInterest(base.mortgageSummary, year),
  };
  const rsuGrossById = Object.fromEntries(
    income.rsuItems.map((rsuItem) => [
      rsuItem.id ?? "",
      computeRsuGrossForYear(
        rsuItem,
        year,
        base.rsuGrowthRateById[rsuItem.id ?? ""] ?? base.projection.assetGrowthRate,
        base.projection.incomeGrowthRate,
      ),
    ]),
  );
  const rsuGross = Object.values(rsuGrossById).reduce((sum, value) => sum + value, 0);
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
    rsuGrossById,
    housingCost,
    nonHousingExpenses,
    ordinaryIncome,
    taxBases,
    freeCashBeforeAllocation: roundTo(
      takeHome - housingCost - nonHousingExpenses - base.assetPlan.totalContributions + deductionTaxSavings,
      2,
    ),
  };
}

function allocateFreeCash(
  base: ProjectionBase,
  bucketStates: ProjectedBucketState[],
  yearContext: ProjectionYearContext,
): FreeCashAllocation {
  const extraContributionByBucket: Record<string, number> = {};
  const allocatedCash = Math.max(0, yearContext.freeCashBeforeAllocation);
  const currentReserveCash =
    bucketStates.find((bucketState) => bucketState.id === base.reserveCashBucketId)?.balance ?? 0;
  const reserveCashTopUp = Math.min(allocatedCash, Math.max(0, base.projection.minimumCash - currentReserveCash));
  const investableCash = allocatedCash - reserveCashTopUp;
  let deductibleContribution = 0;
  if (base.assetPlan.freeCashFlowBucket && investableCash > 0) {
    extraContributionByBucket[base.assetPlan.freeCashFlowBucket.id] = investableCash;
    if (base.assetPlan.freeCashFlowBucket.taxTreatment === "taxDeductible") {
      deductibleContribution = investableCash;
    }
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
        ? reserveCashTopUp +
          (base.assetPlan.freeCashFlowBucket ? 0 : investableCash) +
          extraDeductionTaxSavings
        : yearContext.freeCashBeforeAllocation,
  };
}

function buildNextVestedRsuBalancesById(
  currentBalancesById: Record<string, number>,
  rsuGrossById: Record<string, number>,
  totalRsuNet: number,
  rsuGrowthRateById: Record<string, number>,
  defaultGrowthRate: number,
) {
  const nextBalancesById = Object.fromEntries(
    Object.entries(currentBalancesById).map(([id, balance]) => [
      id,
      roundTo(balance * (1 + (rsuGrowthRateById[id] ?? defaultGrowthRate)), 2),
    ]),
  ) as Record<string, number>;
  const totalRsuGross = Object.values(rsuGrossById).reduce((sum, value) => sum + value, 0);

  Object.entries(rsuGrossById).forEach(([id, grossValue]) => {
    const apportionedNet = totalRsuGross > 0 ? roundTo(totalRsuNet * (grossValue / totalRsuGross), 2) : 0;
    nextBalancesById[id] = roundTo((nextBalancesById[id] ?? 0) + apportionedNet, 2);
  });

  return nextBalancesById;
}

function getMortgageEndingBalance(mortgageSummary: MortgageSummary, year: number) {
  const loanYear = mortgageSummary.yearlyLoan?.find((row) => row.year === year);
  if (loanYear) {
    return loanYear.endingBalance;
  }
  return mortgageSummary.yearlyLoan?.length ? 0 : (mortgageSummary.loanAmount ?? 0);
}

function advanceProjectionYear(simulation: ProjectionSimulation, year: number) {
  const { base } = simulation;
  const appliedContext = buildProjectionYearContext(base, year - 1);
  const allocation = allocateFreeCash(base, simulation.bucketStates, appliedContext);
  const nextBucketStates = advanceProjectionBuckets({
    bucketStates: simulation.bucketStates,
    extraContributionByBucket: allocation.extraContributionByBucket,
    incomeDirectedContributions: base.assetPlan.incomeDirectedContributions,
    reserveCashFlow: allocation.reserveCashFlow,
  });
  const nextBucketStatesWithMinimumCash = restoreMinimumCash(base, nextBucketStates, appliedContext.taxBases);
  const vestedRsuBalance = roundTo(
    simulation.vestedRsuBalance * (1 + base.projection.assetGrowthRate) + appliedContext.rsuNet,
    2,
  );
  const vestedRsuBalanceById = buildNextVestedRsuBalancesById(
    simulation.vestedRsuBalanceById,
    appliedContext.rsuGrossById,
    appliedContext.rsuNet,
    base.rsuGrowthRateById,
    base.projection.assetGrowthRate,
  );
  const homeEquity =
    base.mortgageSummary.kind === "rent"
      ? 0
      : base.mortgage.homePrice * Math.pow(1 + base.projection.homeAppreciationRate, year) -
        getMortgageEndingBalance(base.mortgageSummary, year);
  const yearContext = buildProjectionYearContext(base, year);
  const snapshot = buildProjectionSnapshot({
    base,
    year,
    bucketStates: nextBucketStatesWithMinimumCash,
    taxBases: yearContext.taxBases,
  });

  simulation.bucketStates = nextBucketStatesWithMinimumCash;
  simulation.vestedRsuBalance = vestedRsuBalance;
  simulation.vestedRsuBalanceById = vestedRsuBalanceById;
  simulation.projection.push(
    buildProjectionRow({
      base,
      year,
      takeHome: yearContext.takeHome,
      rsuGross: yearContext.rsuGross,
      rsuNet: yearContext.rsuNet,
      housingCost: yearContext.housingCost,
      nonHousingExpenses: yearContext.nonHousingExpenses,
      freeCashBeforeAllocation: yearContext.freeCashBeforeAllocation,
      snapshot,
      vestedRsuBalance,
      vestedRsuBalanceById,
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
  rsuGrowthRateById,
  taxConfig,
}: {
  incomeSummary: IncomeSummary;
  mortgageSummary: MortgageSummary;
  assets: Assets;
  expenses: Expenses;
  projection: Projection;
  rsuGrowthRateById: Record<string, number>;
  taxConfig: TaxConfig;
}): ProjectionResults {
  const simulation = createProjectionSimulation({
    incomeSummary,
    mortgageSummary,
    assets,
    expenses,
    projection,
    rsuGrowthRateById,
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
