import { calculateIncome, computeRsuGrossForItems, getAnnualSalaryTotal } from "./incomeModel";
import {
  buildMortgageInputs,
} from "./mortgageConfig";
import { buildMortgageScenario } from "./mortgageSchedule";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY, MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "./storageKeys";
import { normalizeConfig, STORAGE_KEY as TAX_CONFIG_KEY } from "./taxConfig";

function rebuildIncomeSummary(documentValue) {
  const incomeState = documentValue[INCOME_STATE_KEY];
  if (!incomeState || !Array.isArray(incomeState.incomeItems)) {
    return;
  }

  const salaryItems = incomeState.incomeItems
    .filter((item) => item?.type === "salary")
    .map((item) => ({
      amount: Number(item?.amount) || 0,
      frequency: item?.frequency === "monthly" ? "monthly" : "annual",
    }));
  const rsuItems = incomeState.incomeItems
    .filter((item) => item?.type === "rsu")
    .map((item) => ({
      grantAmount: Number(item?.grantAmount) || 0,
      refresherAmount: Number(item?.refresherAmount) || 0,
      vestingYears: Number(item?.vestingYears) || 4,
    }));
  const taxConfig = normalizeConfig(documentValue[TAX_CONFIG_KEY]);
  const inputs = {
    grossSalary: getAnnualSalaryTotal(salaryItems),
    rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
    employee401k: Number(incomeState.employee401k) || 0,
    matchRate: Number(incomeState.matchRate) || 0,
    iraContribution: Number(incomeState.iraContribution) || 0,
    megaBackdoorInput: Number(incomeState.megaBackdoorInput) || 0,
    hsaContribution: Number(incomeState.hsaContribution) || 0,
    rsuItems,
  };
  const results = calculateIncome(inputs, taxConfig);

  documentValue[INCOME_SUMMARY_KEY] = {
    grossSalary: results.grossSalary,
    annualTakeHome: results.annualTakeHome,
    monthlyTakeHome: results.monthlyTakeHome,
    federalTax: results.federalTax,
    californiaTax: results.californiaTax,
    socialSecurityTax: results.fica.socialSecurity,
    medicareTax: results.fica.medicare,
    additionalMedicareTax: results.fica.additionalMedicare,
    caSdi: results.caSdi,
    totalTaxes: results.totalTaxes,
    employee401k: inputs.employee401k,
    employerMatch: results.employerMatch,
    iraContribution: inputs.iraContribution,
    megaBackdoor: results.mega,
    hsaContribution: inputs.hsaContribution,
    matchRate: inputs.matchRate,
    rsuItems: inputs.rsuItems,
    rsuGrossNextYear: results.rsuGrossNextYear,
    rsuNetNextYear: results.rsuNetNextYear,
  };
}

function rebuildMortgageSummary(documentValue) {
  const mortgageState = documentValue[MORTGAGE_STATE_KEY];
  if (!mortgageState) {
    return;
  }

  const inputs = buildMortgageInputs(mortgageState);
  const scenario = buildMortgageScenario(inputs, inputs.activeLoanType);
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

  documentValue[MORTGAGE_SUMMARY_KEY] = {
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

export function rebuildDerivedState(documentValue) {
  rebuildIncomeSummary(documentValue);
  rebuildMortgageSummary(documentValue);
  return documentValue;
}
