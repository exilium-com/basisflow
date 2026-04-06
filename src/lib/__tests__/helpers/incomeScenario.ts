import { calculateIncome, computeAnnualTaxes, computeSavings, type IncomeInputs } from "../../incomeModel";
import { DEFAULT_CONFIG, normalizeConfig, type TaxConfig } from "../../taxConfig";

export type IncomeScenarioOptions = {
  salary?: number;
  rsuValue?: number;
  inputs?: Partial<IncomeInputs>;
  taxConfig?: Partial<TaxConfig>;
  extraOrdinaryIncome?: number;
};

export function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function createIncomeInputs({ salary = 0, rsuValue = 0, ...overrides }: IncomeScenarioOptions = {}): IncomeInputs {
  return {
    grossSalary: salary,
    rsuGrossNextYear: rsuValue,
    employee401k: 0,
    matchRate: 0,
    iraContribution: 0,
    megaBackdoorInput: 0,
    hsaContribution: 0,
    ...overrides,
  };
}

export function createIncomeTaxConfig(overrides: Partial<TaxConfig> = {}) {
  return normalizeConfig({
    ...DEFAULT_CONFIG,
    ...overrides,
  });
}

export function runIncomeScenario({
  salary = 0,
  rsuValue = 0,
  inputs = {},
  taxConfig = {},
  extraOrdinaryIncome = 0,
}: IncomeScenarioOptions = {}) {
  const resolvedInputs = createIncomeInputs({
    salary,
    rsuValue,
    ...inputs,
  });
  const resolvedTaxConfig = createIncomeTaxConfig(taxConfig);

  return {
    inputs: resolvedInputs,
    taxConfig: resolvedTaxConfig,
    grossSalary: resolvedInputs.grossSalary,
    savings: computeSavings(resolvedInputs, resolvedTaxConfig),
    taxes: computeAnnualTaxes(resolvedInputs, resolvedTaxConfig, extraOrdinaryIncome),
    income: calculateIncome(resolvedInputs, resolvedTaxConfig),
  };
}
