import { createIncome, calculateIncome, computeAnnualTaxes, computeSavings, type Income } from "../../incomeModel";
import { DEFAULT_CONFIG, normalizeConfig, type TaxConfig } from "../../taxConfig";

export type IncomeScenarioOptions = {
  salary?: number;
  rsuValue?: number;
  income?: Partial<Income>;
  taxConfig?: Partial<TaxConfig>;
  extraOrdinaryIncome?: number;
};

export function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function createScenarioIncome({ salary = 0, rsuValue = 0, ...overrides }: IncomeScenarioOptions = {}): Income {
  return createIncome({
    grossSalary: salary,
    rsuGrossNextYear: rsuValue,
    ...overrides,
  });
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
  income = {},
  taxConfig = {},
  extraOrdinaryIncome = 0,
}: IncomeScenarioOptions = {}) {
  const resolvedIncome = createScenarioIncome({
    salary,
    rsuValue,
    ...income,
  });
  const resolvedTaxConfig = createIncomeTaxConfig(taxConfig);

  return {
    income: resolvedIncome,
    taxConfig: resolvedTaxConfig,
    grossSalary: resolvedIncome.grossSalary,
    savings: computeSavings(resolvedIncome, resolvedTaxConfig),
    taxes: computeAnnualTaxes(resolvedIncome, resolvedTaxConfig, extraOrdinaryIncome),
    results: calculateIncome(resolvedIncome, resolvedTaxConfig),
  };
}
