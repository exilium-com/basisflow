import { colorVars } from "./colors";
import { type ProjectedBucketValues } from "./assetsModel";
import { type ExpenseSnapshot } from "./expensesModel";
import { type IncomeSummary } from "./incomeModel";
import { toDisplayValue, type Projection } from "./projectionState";

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
  vestedRsuBalanceById: Record<string, number>;
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
  projection,
  currentRow,
}: {
  incomeSummary: IncomeSummary;
  projection: Projection;
  currentRow: ProjectionRow;
}) {
  const growthFactor = Math.pow(1 + projection.incomeGrowthRate, projection.currentYear);
  const grossIncome = toDisplayValue(
    ((incomeSummary.grossSalary ?? 0) * growthFactor) / 12,
    projection.currentYear,
    projection,
  );
  const retirementSaving = toDisplayValue(
    ((incomeSummary.employee401k ?? 0) +
      (incomeSummary.iraContribution ?? 0) +
      (incomeSummary.megaBackdoor ?? 0) +
      (incomeSummary.hsaContribution ?? 0)) /
      12,
    projection.currentYear,
    projection,
  );
  const takeHome = toDisplayValue(currentRow.takeHome / 12, projection.currentYear, projection);
  const taxes = grossIncome - retirementSaving - takeHome;
  const mortgage = toDisplayValue(currentRow.mortgageLineItem / 12, projection.currentYear, projection);
  const expenses = toDisplayValue(currentRow.nonHousingExpenses / 12, projection.currentYear, projection);
  const netFlow = grossIncome - taxes - retirementSaving - mortgage - expenses;
  const items: MonthlyCashFlowItem[] = [
    {
      label: "Taxes",
      value: taxes,
      color: colorVars.chartTaxes,
    },
    {
      label: "Retirement savings",
      value: retirementSaving,
      color: colorVars.chartRetirementSavings,
    },
    {
      label: "Housing",
      value: mortgage,
      color: colorVars.chartHousing,
    },
    {
      label: "Expenses",
      value: expenses,
      color: colorVars.chartExpenses,
    },
    netFlow > 0
      ? {
          label: "Excess",
          value: netFlow,
          color: colorVars.chartExcess,
        }
      : {
          label: "Shortfall",
          value: -netFlow,
          color: colorVars.danger,
        },
  ].filter((item) => item.value !== 0);

  return {
    items,
    netFlow,
    total: grossIncome,
  };
}

export type MonthlyCashFlow = ReturnType<typeof buildMonthlyCashFlow>;
