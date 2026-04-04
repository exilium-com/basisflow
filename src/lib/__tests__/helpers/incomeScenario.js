import { calculateIncome, computeAnnualTaxes, computeSavings } from "../../incomeModel";
import { DEFAULT_CONFIG, normalizeConfig } from "../../taxConfig";

export function money(value) {
  return Math.round(value * 100) / 100;
}

export function createIncomeInputs({ salary = 0, rsuValue = 0, ...overrides } = {}) {
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

export function createIncomeTaxConfig(overrides = {}) {
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
} = {}) {
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
