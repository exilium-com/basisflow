import { type ProjectedBucketValues } from "./assetsModel";
import { type ExpenseSnapshot } from "./expensesModel";
import { type IncomeSummary } from "./incomeModel";
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

export function buildMonthlyCashFlow({
  incomeSummary,
  projectionInputs,
  currentRow,
}: {
  incomeSummary: IncomeSummary;
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
