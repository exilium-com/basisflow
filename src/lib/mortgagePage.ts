import { usd } from "./format";
import { type MortgageScenario } from "./mortgageSchedule";

export type MortgageComparisonRow = {
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
    type: scenario.optionId,
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

export function getMortgageMonthlyPaymentForYear(scenario: MortgageScenario, year = 0) {
  return getMortgageScheduleRowForYear(scenario, year)?.payment ?? 0;
}

function getMortgageScheduleRowForYear(scenario: MortgageScenario, year = 0) {
  const monthIndex = year <= 0 ? 0 : year * 12 - 1;
  return scenario.schedule[monthIndex];
}

export function getMortgagePrincipalInterestForYear(scenario: MortgageScenario, year = 0) {
  const row = getMortgageScheduleRowForYear(scenario, year);
  return row ? row.principal + row.interest : 0;
}

export function getMortgagePrincipalForYear(scenario: MortgageScenario, year = 0) {
  return getMortgageScheduleRowForYear(scenario, year)?.principal ?? 0;
}

export function getMortgageInterestForYear(scenario: MortgageScenario, year = 0) {
  return getMortgageScheduleRowForYear(scenario, year)?.interest ?? 0;
}

export function getMortgageRateForYear(scenario: MortgageScenario, year = 0) {
  if (!scenario.isArm || !scenario.armDetails) {
    return scenario.primaryRate;
  }

  return year >= scenario.armDetails.resetYears ? scenario.armDetails.adjustedRate : scenario.primaryRate;
}

export function buildMortgageComparisonRows(
  scenario: MortgageScenario,
  compareScenario: MortgageScenario,
  year = 0,
): MortgageComparisonRow[] {
  return [
    {
      label: "Monthly payment",
      left: usd(getMortgageMonthlyPaymentForYear(scenario, year)),
      right: usd(getMortgageMonthlyPaymentForYear(compareScenario, year)),
    },
    {
      label: "Principal and interest",
      left: usd(getMortgagePrincipalInterestForYear(scenario, year)),
      right: usd(getMortgagePrincipalInterestForYear(compareScenario, year)),
    },
    {
      label: "Rate",
      left: `${getMortgageRateForYear(scenario, year).toFixed(3)}%`,
      right: `${getMortgageRateForYear(compareScenario, year).toFixed(3)}%`,
    },
    {
      label: "Total interest",
      left: usd(scenario.totalInterest),
      right: usd(compareScenario.totalInterest),
    },
  ];
}

export function buildMortgageSummaryItems(scenario: MortgageScenario, year = 0) {
  const monthlyLabelSuffix = year > 0 ? `in year ${year}` : "today";

  return [
    { label: "Loan amount", value: usd(scenario.loanAmount) },
    { label: `Monthly principal ${monthlyLabelSuffix}`, value: usd(getMortgagePrincipalForYear(scenario, year)) },
    { label: `Monthly interest ${monthlyLabelSuffix}`, value: usd(getMortgageInterestForYear(scenario, year)) },
    { label: "Monthly property tax", value: usd(scenario.monthlyTax) },
    { label: "Total interest", value: usd(scenario.totalInterest) },
  ];
}
