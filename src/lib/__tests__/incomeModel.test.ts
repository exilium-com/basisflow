import { describe, expect, it } from "vitest";
import { computeAnnualTaxes } from "../incomeModel";
import { incomeGoldens } from "./goldens/income";
import { runIncomeScenario, type IncomeScenarioOptions } from "./helpers/incomeScenario";

function withInputOverrides(
  base: IncomeScenarioOptions,
  overrides: Partial<NonNullable<IncomeScenarioOptions["income"]>>,
): IncomeScenarioOptions {
  return {
    ...base,
    income: {
      ...base.income,
      ...overrides,
    },
  };
}

const maxed: IncomeScenarioOptions = {
  salary: 250000,
  income: {
    employee401k: 24500,
    hsaContribution: 4400,
    iraContribution: 7000,
    megaBackdoor: 35250,
    matchRate: 50,
  },
};

describe("calculateIncome", () => {
  it("does not reduce taxes for after-tax IRA or mega backdoor contributions", () => {
    const baseline = runIncomeScenario(maxed).taxes.totalTaxes;
    const comparison = runIncomeScenario(
      withInputOverrides(maxed, {
        iraContribution: 0,
        megaBackdoor: 0,
      }),
    ).taxes.totalTaxes;

    expect(comparison).toBeCloseTo(baseline, 6);
  });

  it("reduces total tax when traditional 401(k) contributions are present", () => {
    const with401k = runIncomeScenario(maxed).taxes.totalTaxes;
    const without = runIncomeScenario(
      withInputOverrides(maxed, {
        employee401k: 0,
      }),
    ).taxes.totalTaxes;

    expect(with401k).toBeLessThan(without);
  });

  it("does not let traditional 401(k) reduce FICA wages", () => {
    const with401k = runIncomeScenario(maxed).taxes.fica;
    const without = runIncomeScenario(
      withInputOverrides(maxed, {
        employee401k: 0,
      }),
    ).taxes.fica;

    expect(with401k).toEqual({
      ...without,
      total: without.total,
    });
  });

  it("lets HSA reduce federal tax, but not California or FICA taxes", () => {
    const baseline = runIncomeScenario(maxed).taxes;
    const without = runIncomeScenario(
      withInputOverrides(maxed, {
        hsaContribution: 0,
      }),
    ).taxes;

    expect(baseline.federalTax).toBeLessThan(without.federalTax);
    expect(baseline.californiaTax).toBe(without.californiaTax);
    expect(baseline.fica.total).toBe(without.fica.total);
  });

  it("uses itemized deductions when selected", () => {
    const standard = runIncomeScenario({
      salary: 250000,
      taxConfig: {
        deductionMode: "standard",
        federalStandardDeduction: 1000,
        stateStandardDeduction: 1000,
      },
    }).taxes;
    const itemized = runIncomeScenario({
      salary: 250000,
      taxConfig: {
        deductionMode: "itemized",
        federalStandardDeduction: 1000,
        stateStandardDeduction: 1000,
        federalSaltCap: 40400,
      },
      income: {
        mortgageInterest: 30000,
        propertyTax: 12000,
      },
    }).taxes;

    expect(itemized.federalTax).toBeLessThan(standard.federalTax);
    expect(itemized.californiaTax).toBeLessThan(standard.californiaTax);
  });

  it("caps federal SALT deductions at ten thousand dollars", () => {
    const lowSalt = runIncomeScenario({
      salary: 250000,
      taxConfig: {
        deductionMode: "itemized",
        federalSaltCap: 10000,
      },
      income: {
        mortgageInterest: 0,
        propertyTax: 10000,
      },
    }).taxes.federalTax;
    const highSalt = runIncomeScenario({
      salary: 250000,
      taxConfig: {
        deductionMode: "itemized",
        federalSaltCap: 10000,
      },
      income: {
        mortgageInterest: 0,
        propertyTax: 25000,
      },
    }).taxes.federalTax;

    expect(highSalt).toBe(lowSalt);
  });

  it("phases down the federal SALT cap above the MAGI threshold", () => {
    const belowThreshold = runIncomeScenario({
      salary: 500000,
      taxConfig: {
        deductionMode: "itemized",
        federalSaltCap: 40400,
        federalSaltCapFloor: 10000,
        federalSaltPhaseoutThreshold: 500000,
        federalSaltPhaseoutRate: 30,
      },
      income: {
        mortgageInterest: 0,
        propertyTax: 25000,
      },
    }).taxes.federalTax;
    const aboveThreshold = runIncomeScenario({
      salary: 550000,
      taxConfig: {
        deductionMode: "itemized",
        federalSaltCap: 40400,
        federalSaltCapFloor: 10000,
        federalSaltPhaseoutThreshold: 500000,
        federalSaltPhaseoutRate: 30,
      },
      income: {
        mortgageInterest: 0,
        propertyTax: 25000,
      },
    }).taxes.federalTax;

    expect(aboveThreshold).toBeGreaterThan(belowThreshold);
  });

  it("does not phase the federal SALT cap below its floor", () => {
    const lowerSalt = runIncomeScenario({
      salary: 700000,
      taxConfig: {
        deductionMode: "itemized",
        federalSaltCap: 40400,
        federalSaltCapFloor: 10000,
        federalSaltPhaseoutThreshold: 500000,
        federalSaltPhaseoutRate: 30,
      },
      income: {
        mortgageInterest: 0,
        propertyTax: 10000,
      },
    }).taxes.federalTax;
    const higherSalt = runIncomeScenario({
      salary: 700000,
      taxConfig: {
        deductionMode: "itemized",
        federalSaltCap: 40400,
        federalSaltCapFloor: 10000,
        federalSaltPhaseoutThreshold: 500000,
        federalSaltPhaseoutRate: 30,
      },
      income: {
        mortgageInterest: 0,
        propertyTax: 20000,
      },
    }).taxes.federalTax;

    expect(higherSalt).toBe(lowerSalt);
  });

  it("caps federal and California mortgage interest deductions separately", () => {
    const lowerBalance = runIncomeScenario({
      salary: 250000,
      taxConfig: {
        deductionMode: "itemized",
        federalMortgageInterestDebtCap: 750000,
        stateMortgageInterestDebtCap: 1000000,
      },
      income: {
        mortgageInterest: 60000,
        mortgageAverageBalance: 750000,
      },
    }).taxes;

    const higherBalance = runIncomeScenario({
      salary: 250000,
      taxConfig: {
        deductionMode: "itemized",
        federalMortgageInterestDebtCap: 750000,
        stateMortgageInterestDebtCap: 1000000,
      },
      income: {
        mortgageInterest: 60000,
        mortgageAverageBalance: 1500000,
      },
    }).taxes;

    expect(higherBalance.federalTax).toBeGreaterThan(lowerBalance.federalTax);
    expect(higherBalance.californiaTax).toBeGreaterThan(lowerBalance.californiaTax);
    expect(higherBalance.federalTax).toBeGreaterThan(higherBalance.californiaTax);
  });

  it("reports total tax across salary and RSU income", () => {
    const scenario = runIncomeScenario({
      salary: 250000,
      rsuValue: 430000,
    });
    const expectedTotalTaxes = computeAnnualTaxes(scenario.income, scenario.taxConfig, 430000).totalTaxes;

    expect(scenario.results.totalTaxes).toBe(expectedTotalTaxes);
    expect(scenario.results.totalTaxes).toBeGreaterThan(
      runIncomeScenario({
        salary: 250000,
        rsuValue: 0,
      }).results.totalTaxes,
    );
  });

  it("does not apply FICA to passive income", () => {
    const salaryOnly = runIncomeScenario({
      salary: 250000,
    }).taxes;
    const withPassiveIncome = runIncomeScenario({
      salary: 250000,
      passiveIncome: 50000,
    }).taxes;

    expect(withPassiveIncome.fica).toEqual(salaryOnly.fica);
    expect(withPassiveIncome.caSdi).toBe(salaryOnly.caSdi);
    expect(withPassiveIncome.totalTaxes).toBeGreaterThan(salaryOnly.totalTaxes);
  });

  it.each(incomeGoldens)("$name", (testCase) => {
    const actual = runIncomeScenario(testCase.scenario).taxes;
    expect(actual).toMatchObject(testCase.expected);
  });
});
