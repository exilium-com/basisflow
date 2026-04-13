import { usd } from "./format";
import { type MortgageScenario } from "./mortgageSchedule";

export function serializeMortgageSummary(scenario: MortgageScenario) {
  const yearlyLoan = scenario.yearlyBreakdown.map((row) => {
    const startMonthIndex = (row.year - 1) * 12;
    const monthIndex = Math.min(row.year * 12, scenario.schedule.length) - 1;
    const scheduleRow = monthIndex >= 0 ? scenario.schedule[monthIndex] : null;
    const startingBalance =
      startMonthIndex > 0 ? (scenario.schedule[startMonthIndex - 1]?.balance ?? 0) : scenario.loanAmount;
    const endingBalance = scheduleRow ? scheduleRow.balance : scenario.loanAmount;

    return {
      year: row.year,
      payment: scheduleRow?.payment ?? 0,
      principal: row.principal,
      interest: row.interest,
      averageBalance: (startingBalance + endingBalance) / 2,
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

function findMortgageLoanYear(
  summary: Pick<MortgageSummary, "yearlyLoan">,
  year: number,
) {
  return summary.yearlyLoan.find((row) => row.year === year + 1);
}

function getMortgageScheduleRowForYear(scenario: MortgageScenario, year = 0) {
  const monthIndex = Math.max(0, year) * 12;
  return scenario.schedule[monthIndex];
}

export function getMortgageAnnualHousingCost(summary: MortgageSummary, year = 0) {
  if (year < 0) {
    return 0;
  }

  if (summary.kind === "rent") {
    const monthlyRent = summary.totalMonthlyPayment;
    const growthRate = summary.rentGrowthRate / 100;
    return monthlyRent * Math.pow(1 + growthRate, Math.max(year, 0)) * 12;
  }

  const loanYear = findMortgageLoanYear(summary, year);
  return (loanYear ? loanYear.payment : summary.monthlyTax + summary.monthlyInsurance + summary.monthlyHoa) * 12;
}

export function getMortgageYearInterest(summary: MortgageSummary, year = 0) {
  return findMortgageLoanYear(summary, year)?.interest ?? 0;
}

export function getMortgageYearAverageBalance(summary: MortgageSummary, year = 0) {
  return findMortgageLoanYear(summary, year)?.averageBalance ?? 0;
}

export function getMortgageYearPropertyTax(summary: MortgageSummary) {
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
      { label: "Yearly increase", value: `${scenario.rentGrowthRate.toFixed(1)}%` },
    ];
  }

  return [
    { label: `Monthly principal ${monthlyLabelSuffix}`, value: usd(getMortgagePrincipalForYear(scenario, year)) },
    { label: `Monthly interest ${monthlyLabelSuffix}`, value: usd(getMortgageInterestForYear(scenario, year)) },
    { label: "Monthly property tax", value: usd(scenario.monthlyTax) },
    { label: "Total interest", value: usd(scenario.totalInterest) },
  ];
}
