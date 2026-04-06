import {
  advanceProjectedBucket,
  PINNED_BUCKETS,
  resolvePinnedBuckets,
  type AssetsState,
  type ProjectedBucketValues,
  type ProjectedBucketState,
} from "./assetsModel";
import { type ExpenseInput, type ExpenseSnapshot } from "./expensesModel";
import { roundTo } from "./format";
import { computeAnnualTaxes, type IncomeSummary } from "./incomeModel";
import { computeAdditionalTax, type TaxConfig } from "./taxConfig";
import { toDisplayValue, type ProjectionInputs } from "./projectionState";

export type ProjectionRow = {
  year: number;
  takeHome: number;
  rsuGross: number;
  rsuNet: number;
  nonHousingExpenses: number;
  mortgageLineItem: number;
  freeCashBeforeAllocation: number;
  bucketSnapshotsById: Record<string, ProjectedBucketValues>;
  expenseSnapshotsById: Record<string, ExpenseSnapshot>;
  vestedRsuBalance: number;
  assetsGross: number;
  capitalGainsTax: number;
  totalCapitalGains: number;
  homeEquity: number;
  residualCash: number;
  netWorth: number;
};

type MonthlyCashFlowItem = {
  label: string;
  value: number;
  color: string;
};

export function createDerivedProjectionBuckets(
  assetState: AssetsState,
  incomeDirectedContributions: Record<string, number>,
) {
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;
  const pinnedState = resolvePinnedBuckets(assetState, incomeDirectedContributions);

  return {
    ...pinnedState.state,
    buckets: pinnedState.orderedBuckets.map((bucket) =>
      bucket.id === reserveCashBucketId
        ? {
            ...bucket,
            growth: 0,
            basis: bucket.current ?? 0,
          }
        : bucket,
    ),
  };
}

export function buildMonthlyCashFlow({
  incomeSummary,
  projectionInputs,
  currentRow,
}: {
  incomeSummary: Partial<IncomeSummary>;
  projectionInputs: ProjectionInputs;
  currentRow: ProjectionRow;
}) {
  const growthFactor = Math.pow(1 + projectionInputs.takeHomeGrowthRate, projectionInputs.currentYear);
  const grossIncome = toDisplayValue(
    ((incomeSummary.grossSalary ?? 0) * growthFactor) / 12,
    projectionInputs.currentYear,
    projectionInputs,
  );
  const retirementSaving = toDisplayValue(
    ((incomeSummary.employee401k ?? 0) +
      (incomeSummary.iraContribution ?? 0) +
      (incomeSummary.megaBackdoor ?? 0) +
      (incomeSummary.hsaContribution ?? 0)) /
      12,
    projectionInputs.currentYear,
    projectionInputs,
  );
  const takeHome = toDisplayValue(currentRow.takeHome / 12, projectionInputs.currentYear, projectionInputs);
  const taxes = grossIncome - retirementSaving - takeHome;
  const mortgage = toDisplayValue(currentRow.mortgageLineItem / 12, projectionInputs.currentYear, projectionInputs);
  const expenses = toDisplayValue(currentRow.nonHousingExpenses / 12, projectionInputs.currentYear, projectionInputs);
  const netFlow = grossIncome - taxes - retirementSaving - mortgage - expenses;
  const items: MonthlyCashFlowItem[] = [
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
    netFlow > 0
      ? {
          label: "Excess",
          value: netFlow,
          color: "#b8d8d9",
        }
      : {
          label: "Shortfall",
          value: -netFlow,
          color: "var(--danger)",
        },
  ].filter((item) => item.value !== 0);

  return {
    items,
    netFlow,
    total: grossIncome,
  };
}

export function getTaxBases(
  grossSalary: number,
  employee401k: number,
  hsaContribution: number,
  rsuGross: number,
  taxConfig: TaxConfig,
) {
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

function snapshotExpenseForYear(expense: ExpenseInput, year: number): ExpenseSnapshot {
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

export function buildExpenseSnapshots(expenses: ExpenseInput[], year: number) {
  return expenses.map((expense) => snapshotExpenseForYear(expense, year));
}

export function mapSnapshotsById<T extends { id: string }>(snapshots: T[]): Record<string, T> {
  return Object.fromEntries(snapshots.map((snapshot) => [snapshot.id, snapshot])) as Record<string, T>;
}

export function computeDeductionTaxSavings(baseIncome: number, deduction: number, taxConfig: TaxConfig) {
  if (deduction <= 0) {
    return 0;
  }

  const taxableBase = Math.max(0, baseIncome - deduction);
  const federal = computeAdditionalTax(taxableBase, deduction, taxConfig.federalBrackets);
  const state = computeAdditionalTax(taxableBase, deduction, taxConfig.stateBrackets);
  return roundTo(federal + state, 2);
}

export function fundHomeEquityFromBuckets(
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

export function advanceProjectionBuckets({
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
  const nextBucketStates = bucketStates.map((bucketState) => {
    const totalContribution =
      bucketState.contribution +
      (incomeDirectedContributions[bucketState.id] ?? 0) +
      (extraContributionByBucket[bucketState.id] ?? 0) +
      (bucketState.id === reserveCashBucketId ? reserveCashFlow : 0);

    return bucketState.id === reserveCashBucketId
      ? advanceProjectedBucketWithNetContribution(bucketState, totalContribution)
      : advanceProjectedBucket(bucketState, totalContribution);
  });

  return nextBucketStates;
}
