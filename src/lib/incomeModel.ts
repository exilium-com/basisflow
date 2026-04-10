import { clamp, roundTo } from "./format";
import { computeProgressiveTax, getTaxDeductions, type TaxConfig } from "./taxConfig";

export type SalaryFrequency = "annual" | "monthly";

export type SalaryInputItem = {
  id?: string;
  name?: string;
  amount: number;
  frequency: SalaryFrequency;
};

export type RsuInputItem = {
  id?: string;
  name?: string;
  grantAmount: number;
  refresherAmount: number;
  vestingYears: number;
};

export type IncomeInputs = {
  grossSalary: number;
  rsuGrossNextYear: number;
  employee401k: number;
  matchRate: number;
  iraContribution: number;
  megaBackdoor: number;
  hsaContribution: number;
  mortgageInterest: number;
  propertyTax: number;
  rsuItems: RsuInputItem[];
};

export type IncomeSummary = IncomeInputs & {
  annualTakeHome: number;
  monthlyTakeHome: number;
  federalTax: number;
  californiaTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  caSdi: number;
  totalTaxes: number;
  employerMatch: number;
  rsuNetNextYear: number;
};

export const DEFAULT_INCOME_INPUTS: IncomeInputs = {
  grossSalary: 0,
  rsuGrossNextYear: 0,
  employee401k: 0,
  matchRate: 0,
  iraContribution: 0,
  megaBackdoor: 0,
  hsaContribution: 0,
  mortgageInterest: 0,
  propertyTax: 0,
  rsuItems: [],
};

export const DEFAULT_INCOME_SUMMARY: IncomeSummary = {
  ...DEFAULT_INCOME_INPUTS,
  annualTakeHome: 0,
  monthlyTakeHome: 0,
  federalTax: 0,
  californiaTax: 0,
  socialSecurityTax: 0,
  medicareTax: 0,
  additionalMedicareTax: 0,
  caSdi: 0,
  totalTaxes: 0,
  employerMatch: 0,
  rsuNetNextYear: 0,
};

export type IncomeTaxes = ReturnType<typeof computeAnnualTaxes>;
export type IncomeResults = ReturnType<typeof calculateIncome>;

export function buildIncomeInputs(overrides: Partial<IncomeInputs> = {}): IncomeInputs {
  return {
    ...DEFAULT_INCOME_INPUTS,
    ...overrides,
    rsuItems: overrides.rsuItems ?? DEFAULT_INCOME_INPUTS.rsuItems,
  };
}

export function createIncomeSummary(overrides: Partial<IncomeSummary> = {}): IncomeSummary {
  return {
    ...DEFAULT_INCOME_SUMMARY,
    ...overrides,
    rsuItems: overrides.rsuItems ?? DEFAULT_INCOME_SUMMARY.rsuItems,
  };
}

function annualizeSalary(amount: number, frequency: SalaryFrequency = "annual") {
  const safeAmount = Math.max(0, amount);
  return frequency === "monthly" ? safeAmount * 12 : safeAmount;
}

function averageGrowthFactor(growthRate: number, startYearOffset: number) {
  const effectiveGrowth = Math.max(-0.99, growthRate);
  if (effectiveGrowth === 0) {
    return 1;
  }

  const growthBase = 1 + effectiveGrowth;
  return (Math.pow(growthBase, startYearOffset + 1) - Math.pow(growthBase, startYearOffset)) / Math.log(growthBase);
}

export function computeFica(grossSalary: number) {
  const ficaWages = Math.max(0, grossSalary);
  const socialSecurityWageBase = 184500;
  const socialSecurity = roundTo(Math.min(ficaWages, socialSecurityWageBase) * 0.062, 2);
  const medicare = roundTo(ficaWages * 0.0145, 2);
  const additionalMedicare = roundTo(Math.max(0, ficaWages - 200000) * 0.009, 2);

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: roundTo(socialSecurity + medicare + additionalMedicare, 2),
  };
}

export function getAnnualSalaryTotal(salaryItems: SalaryInputItem[] = []) {
  return salaryItems.reduce((sum, item) => sum + annualizeSalary(item.amount, item.frequency), 0);
}

export function computeSavings(inputs: IncomeInputs, taxConfig: TaxConfig) {
  const matchRate = clamp(inputs.matchRate / 100, 0, 5);
  const employee401k = Math.max(0, inputs.employee401k);
  const iraContribution = Math.max(0, inputs.iraContribution);
  const annualAdditions = Math.max(0, taxConfig.annualAdditionsLimit);
  const employerMatch = employee401k * matchRate;
  const availableMegaRoom = Math.max(0, annualAdditions - employee401k - employerMatch);
  const megaBackdoor = clamp(Math.max(0, inputs.megaBackdoor), 0, availableMegaRoom);

  return {
    employerMatch,
    megaBackdoor,
    iraContribution,
    availableMegaRoom,
  };
}

export function computeAnnualTaxes(inputs: IncomeInputs, taxConfig: TaxConfig, extraOrdinaryIncome = 0) {
  const grossIncome = Math.max(0, inputs.grossSalary + extraOrdinaryIncome);
  const californiaAdjustedGross = Math.max(0, grossIncome - inputs.employee401k);
  const stateDeductions = getTaxDeductions(taxConfig, inputs);
  const californiaTaxableIncome = Math.max(0, californiaAdjustedGross - stateDeductions.stateDeduction);
  const californiaTax = computeProgressiveTax(californiaTaxableIncome, taxConfig.stateBrackets);

  const federalAdjustedGross = Math.max(0, grossIncome - inputs.employee401k - inputs.hsaContribution);
  const federalDeductions = getTaxDeductions(taxConfig, inputs, californiaTax);
  const federalTaxableIncome = Math.max(0, federalAdjustedGross - federalDeductions.federalDeduction);
  const federalTax = computeProgressiveTax(federalTaxableIncome, taxConfig.federalBrackets);

  const fica = computeFica(grossIncome);
  const caSdi = roundTo(grossIncome * (taxConfig.caSdiRate / 100), 2);

  return {
    federalTaxableIncome,
    californiaTaxableIncome,
    federalTax,
    californiaTax,
    fica,
    caSdi,
    totalTaxes: roundTo(federalTax + californiaTax + fica.total + caSdi, 2),
  };
}

export function computeIncrementalTakeHome(
  inputs: IncomeInputs,
  taxConfig: TaxConfig,
  extraOrdinaryIncome: number,
) {
  const safeExtra = Math.max(0, extraOrdinaryIncome);
  if (safeExtra <= 0) {
    return 0;
  }

  const baseTaxes = computeAnnualTaxes(inputs, taxConfig, 0).totalTaxes;
  const extraTaxes = computeAnnualTaxes(inputs, taxConfig, safeExtra).totalTaxes;
  return roundTo(safeExtra - (extraTaxes - baseTaxes), 2);
}

export function computeRsuGrossForYear(
  rsus: RsuInputItem,
  yearIndex: number,
  stockGrowthRate = 0,
  refresherGrowthRate = 0,
) {
  const grantAmount = Math.max(0, rsus.grantAmount);
  const refresherAmount = Math.max(0, rsus.refresherAmount);
  const vestYears = Math.max(1, Math.round(rsus.vestingYears));

  let total = 0;
  if (grantAmount > 0 && yearIndex < vestYears) {
    total += (grantAmount / vestYears) * averageGrowthFactor(stockGrowthRate, yearIndex);
  }

  for (let refresherIndex = 1; refresherIndex <= yearIndex; refresherIndex += 1) {
    if (yearIndex - refresherIndex >= vestYears || refresherAmount <= 0) {
      continue;
    }
    const grownRefresherAmount = refresherAmount * Math.pow(1 + refresherGrowthRate, refresherIndex - 1);
    total += (grownRefresherAmount / vestYears) * averageGrowthFactor(stockGrowthRate, yearIndex - refresherIndex);
  }

  return total;
}

export function computeRsuGrossForItems(
  rsuItems: RsuInputItem[] = [],
  yearIndex: number,
  stockGrowthRate = 0,
  refresherGrowthRate = 0,
) {
  return rsuItems.reduce(
    (sum, rsu) => sum + computeRsuGrossForYear(rsu, yearIndex, stockGrowthRate, refresherGrowthRate),
    0,
  );
}

export function calculateIncome(inputs: IncomeInputs, taxConfig: TaxConfig) {
  const grossSalary = Math.max(0, inputs.grossSalary);
  const savings = computeSavings(inputs, taxConfig);
  const taxInputs = buildIncomeInputs({ ...inputs, grossSalary });
  const taxes = computeAnnualTaxes(taxInputs, taxConfig, 0);
  const annualTakeHome = roundTo(
    grossSalary -
      taxInputs.employee401k -
      taxInputs.hsaContribution -
      savings.iraContribution -
      savings.megaBackdoor -
      taxes.totalTaxes,
    2,
  );
  const rsuGrossNextYear = Math.max(0, inputs.rsuGrossNextYear);
  const rsuNetNextYear = computeIncrementalTakeHome(taxInputs, taxConfig, rsuGrossNextYear);

  return {
    ...savings,
    federalTax: taxes.federalTax,
    californiaTax: taxes.californiaTax,
    fica: taxes.fica,
    caSdi: taxes.caSdi,
    totalTaxes: taxes.totalTaxes,
    grossSalary,
    annualTakeHome,
    monthlyTakeHome: roundTo(annualTakeHome / 12, 2),
    rsuGrossNextYear,
    rsuNetNextYear,
  };
}

export function buildIncomeSummary(inputs: IncomeInputs, results: IncomeResults): IncomeSummary {
  return createIncomeSummary({
    ...inputs,
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
    employerMatch: results.employerMatch,
    rsuGrossNextYear: results.rsuGrossNextYear,
    rsuNetNextYear: results.rsuNetNextYear,
    megaBackdoor: results.megaBackdoor,
  });
}
