import { usd } from "./format";
import { type MortgageScenario } from "./mortgageSchedule";

export function serializeMortgageSummary(scenario: MortgageScenario) {
  const yearlyLoan = scenario.yearlyBreakdown.map((row) => {
    const monthIndex = Math.min(row.year * 12, scenario.schedule.length) - 1;
    const scheduleRow = monthIndex >= 0 ? scenario.schedule[monthIndex] : null;
    const endingBalance = scheduleRow ? scheduleRow.balance : scenario.loanAmount;

    return {
      year: row.year,
      payment: scheduleRow?.payment ?? 0,
      principal: row.principal,
      interest: row.interest,
      endingBalance,
    };
  });

  return {
    type: scenario.optionId,
    kind: scenario.kind,
    typeLabel: scenario.typeLabel,
    isArm: scenario.isArm,
    rentGrowthRate: scenario.rentGrowthRate,
    homePrice: scenario.mortgage.homePrice,
    currentEquity: scenario.kind === "rent" ? 0 : scenario.mortgage.homePrice - scenario.loanAmount,
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

function getMortgageMonthlyOwnershipCost(summary: Partial<MortgageSummary>) {
  return (summary.monthlyTax ?? 0) + (summary.monthlyInsurance ?? 0) + (summary.monthlyHoa ?? 0);
}

export function getMortgageMonthlyPaymentForSummaryYear(summary: Partial<MortgageSummary>, year = 0) {
  if (summary.kind === "rent") {
    const monthlyRent = summary.totalMonthlyPayment ?? 0;
    const growthRate = (summary.rentGrowthRate ?? 0) / 100;
    return monthlyRent * Math.pow(1 + growthRate, Math.max(year, 0));
  }

  if (year <= 0) {
    return summary.totalMonthlyPayment ?? 0;
  }

  const loanYear = summary.yearlyLoan?.find((row) => row.year === year);
  if (typeof loanYear?.payment === "number") {
    return loanYear.payment;
  }

  if (summary.yearlyLoan?.length && year > summary.yearlyLoan.length) {
    return getMortgageMonthlyOwnershipCost(summary);
  }

  return summary.totalMonthlyPayment ?? getMortgageMonthlyOwnershipCost(summary);
}

export function getMortgageAnnualHousingCost(summary: Partial<MortgageSummary>, year = 0) {
  return getMortgageMonthlyPaymentForSummaryYear(summary, year) * 12;
}

export function getMortgageYearInterest(summary: Partial<MortgageSummary>, year = 1) {
  return summary.yearlyLoan?.find((row) => row.year === year)?.interest ?? 0;
}

export function getMortgageYearPropertyTax(summary: Partial<MortgageSummary>) {
  return (summary.monthlyTax ?? 0) * 12;
}

export function getMortgageMonthlyPaymentForYear(scenario: MortgageScenario, year = 0) {
  if (scenario.kind === "rent") {
    const growthRate = scenario.rentGrowthRate / 100;
    return scenario.totalMonthlyPayment * Math.pow(1 + growthRate, Math.max(year, 0));
  }

  return (
    getMortgageScheduleRowForYear(scenario, year)?.payment ??
    scenario.monthlyTax + scenario.monthlyInsurance + scenario.monthlyHoa
  );
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
  if (scenario.kind === "rent") {
    return 0;
  }

  if (!scenario.isArm || !scenario.armDetails) {
    return scenario.primaryRate;
  }

  return year >= scenario.armDetails.resetYears ? scenario.armDetails.adjustedRate : scenario.primaryRate;
}

export function buildMortgageSummaryItems(scenario: MortgageScenario, year = 0) {
  const monthlyLabelSuffix = year > 0 ? `in year ${year}` : "today";

  if (scenario.kind === "rent") {
    const monthlyRent = getMortgageMonthlyPaymentForYear(scenario, year);

    return [
      { label: "Annual housing cost", value: usd(monthlyRent * 12) },
      { label: "Rent growth", value: `${scenario.rentGrowthRate.toFixed(1)}%` },
    ];
  }

  return [
    { label: "Loan amount", value: usd(scenario.loanAmount) },
    { label: `Monthly principal ${monthlyLabelSuffix}`, value: usd(getMortgagePrincipalForYear(scenario, year)) },
    { label: `Monthly interest ${monthlyLabelSuffix}`, value: usd(getMortgageInterestForYear(scenario, year)) },
    { label: "Monthly property tax", value: usd(scenario.monthlyTax) },
    { label: "Total interest", value: usd(scenario.totalInterest) },
  ];
}
