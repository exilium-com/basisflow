import {
  createResolvedIncome,
  calculateIncome,
  computeAnnualTaxes,
  computeSavings,
  type ResolvedIncome,
} from "../../incomeModel";
import { DEFAULT_CONFIG, normalizeConfig, type TaxConfig } from "../../taxConfig";

export type IncomeScenarioOptions = {
  salary?: number;
  passiveIncome?: number;
  rsuValue?: number;
  income?: Partial<ResolvedIncome>;
  taxConfig?: Partial<TaxConfig>;
  extraOrdinaryIncome?: number;
};

export function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function createScenarioIncome({
  salary = 0,
  passiveIncome = 0,
  rsuValue = 0,
  ...overrides
}: IncomeScenarioOptions = {}): ResolvedIncome {
  return createResolvedIncome({
    grossSalary: salary,
    passiveIncome,
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
  passiveIncome = 0,
  rsuValue = 0,
  income = {},
  taxConfig = {},
  extraOrdinaryIncome = 0,
}: IncomeScenarioOptions = {}) {
  const resolvedIncome = createScenarioIncome({
    salary,
    passiveIncome,
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
