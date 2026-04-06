import { readNumber } from "./format";
import { calculateIncome, computeRsuGrossForItems, getAnnualSalaryTotal, type IncomeSummary } from "./incomeModel";
import { buildMortgageInputs, DEFAULT_MORTGAGE_STATE, normalizeMortgageState } from "./mortgageConfig";
import { buildMortgageScenario } from "./mortgageSchedule";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY, MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "./storageKeys";
import { normalizeConfig, STORAGE_KEY as TAX_CONFIG_KEY } from "./taxConfig";

type StoredIncomeItem = {
  type?: "salary" | "rsu";
  amount?: string | number;
  frequency?: string;
  grantAmount?: string | number;
  refresherAmount?: string | number;
  vestingYears?: string | number;
};

type StoredIncomeState = {
  incomeItems?: StoredIncomeItem[];
  employee401k?: string | number;
  matchRate?: string | number;
  iraContribution?: string | number;
  megaBackdoorInput?: string | number;
  hsaContribution?: string | number;
};

type DerivedStateDocument = Record<string, unknown>;

function rebuildIncomeSummary(documentValue: DerivedStateDocument) {
  const incomeState = documentValue[INCOME_STATE_KEY];
  if (!incomeState || typeof incomeState !== "object" || !Array.isArray((incomeState as StoredIncomeState).incomeItems)) {
    return;
  }

  const state = incomeState as StoredIncomeState;

  const salaryItems = state.incomeItems!
    .filter((item: StoredIncomeItem) => item?.type === "salary")
    .map((item: StoredIncomeItem) => ({
      amount: readNumber(item?.amount, 0),
      frequency: item?.frequency === "monthly" ? ("monthly" as const) : ("annual" as const),
    }));
  const rsuItems = state.incomeItems!
    .filter((item: StoredIncomeItem) => item?.type === "rsu")
    .map((item: StoredIncomeItem) => ({
      grantAmount: readNumber(item?.grantAmount, 0),
      refresherAmount: readNumber(item?.refresherAmount, 0),
      vestingYears: readNumber(item?.vestingYears, 4),
    }));
  const taxConfig = normalizeConfig(documentValue[TAX_CONFIG_KEY]);
  const inputs = {
    grossSalary: getAnnualSalaryTotal(salaryItems),
    rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
    employee401k: readNumber(state.employee401k, 0),
    matchRate: readNumber(state.matchRate, 0),
    iraContribution: readNumber(state.iraContribution, 0),
    megaBackdoorInput: readNumber(state.megaBackdoorInput, 0),
    hsaContribution: readNumber(state.hsaContribution, 0),
    rsuItems,
  };
  const results = calculateIncome(inputs, taxConfig);

  const summary: IncomeSummary = {
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

  documentValue[INCOME_SUMMARY_KEY] = summary;
}

function rebuildMortgageSummary(documentValue: DerivedStateDocument) {
  const mortgageState = documentValue[MORTGAGE_STATE_KEY];
  if (!mortgageState) {
    return;
  }

  const inputs = buildMortgageInputs(normalizeMortgageState(mortgageState, DEFAULT_MORTGAGE_STATE));
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

export function rebuildDerivedState(documentValue: DerivedStateDocument) {
  rebuildIncomeSummary(documentValue);
  rebuildMortgageSummary(documentValue);
  return documentValue;
}
