import { usd } from "./format";
import { type MortgageScenario } from "./mortgageSchedule";

type MortgageComparisonRow = {
  label: string;
  left: string;
  right: string;
};

export function serializeMortgageSummary(scenario: MortgageScenario) {
  const yearlyLoan = scenario.yearlyBreakdown.map((row) => {
    const monthIndex = Math.min(row.year * 12, scenario.schedule.length) - 1;
    const endingBalance = monthIndex >= 0 ? scenario.schedule[monthIndex].balance : scenario.loanAmount;

    return {
      year: row.year,
      principal: row.principal,
      interest: row.interest,
      endingBalance,
    };
  });

  return {
    type: scenario.type,
    typeLabel: scenario.typeLabel,
    isArm: scenario.isArm,
    homePrice: scenario.mortgage.homePrice,
    currentEquity: scenario.mortgage.homePrice - scenario.loanAmount,
    loanAmount: scenario.loanAmount,
    totalMonthlyPayment: scenario.totalMonthlyPayment,
    principalInterest: scenario.principalInterest,
    monthlyTax: scenario.monthlyTax,
    monthlyInsurance: scenario.monthlyInsurance,
    monthlyHoa: scenario.monthlyHoa,
    totalInterest: scenario.totalInterest,
    yearlyLoan,
  };
}

export type MortgageSummary = ReturnType<typeof serializeMortgageSummary>;

export function getMortgageYearInterest(summary: Partial<MortgageSummary>, year = 1) {
  return summary.yearlyLoan?.find((row) => row.year === year)?.interest ?? 0;
}

export function getMortgageYearPropertyTax(summary: Partial<MortgageSummary>) {
  return (summary.monthlyTax ?? 0) * 12;
}

export function buildMortgageComparisonRows(
  scenario: MortgageScenario,
  compareScenario: MortgageScenario,
): MortgageComparisonRow[] {
  return [
    {
      label: "Monthly payment",
      left: usd(scenario.totalMonthlyPayment),
      right: usd(compareScenario.totalMonthlyPayment),
    },
    {
      label: "Principal and interest",
      left: usd(scenario.principalInterest),
      right: usd(compareScenario.principalInterest),
    },
    {
      label: "Rate",
      left: `${scenario.primaryRate.toFixed(3)}%`,
      right: `${compareScenario.primaryRate.toFixed(3)}%`,
    },
    {
      label: "Total interest",
      left: usd(scenario.totalInterest),
      right: usd(compareScenario.totalInterest),
    },
  ];
}

export function buildMortgageSummaryItems(scenario: MortgageScenario) {
  return [
    { label: "Loan amount", value: usd(scenario.loanAmount) },
    {
      label: "Monthly principal and interest",
      value: usd(scenario.principalInterest),
    },
    { label: "Monthly property tax", value: usd(scenario.monthlyTax) },
    { label: "Monthly insurance", value: usd(scenario.monthlyInsurance) },
    { label: "Monthly HOA", value: usd(scenario.monthlyHoa) },
    { label: "Total interest", value: usd(scenario.totalInterest) },
  ];
}
