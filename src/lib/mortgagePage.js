import { usd } from "./format";

export function serializeMortgageSummary(scenario) {
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
    homePrice: scenario.inputs.homePrice,
    currentEquity: scenario.inputs.homePrice - scenario.loanAmount,
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

export function buildMortgageComparisonRows(scenario, compareScenario) {
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

export function buildMortgageSummaryItems(scenario) {
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
