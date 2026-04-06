import { describe, expect, it } from "vitest";
import { incomeGoldens } from "./goldens/income";
import { runIncomeScenario, type IncomeScenarioOptions } from "./helpers/incomeScenario";

function withInputOverrides(
  base: IncomeScenarioOptions,
  overrides: Partial<NonNullable<IncomeScenarioOptions["inputs"]>>,
): IncomeScenarioOptions {
  return {
    ...base,
    inputs: {
      ...base.inputs,
      ...overrides,
    },
  };
}

const maxed: IncomeScenarioOptions = {
  salary: 250000,
  inputs: {
    employee401k: 24500,
    hsaContribution: 4400,
    iraContribution: 7000,
    megaBackdoorInput: 35250,
    matchRate: 50,
  },
};

describe("calculateIncome", () => {
  it("does not reduce taxes for after-tax IRA or mega backdoor contributions", () => {
    const baseline = runIncomeScenario(maxed).taxes.totalTaxes;
    const comparison = runIncomeScenario(
      withInputOverrides(maxed, {
        iraContribution: 0,
        megaBackdoorInput: 0,
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

  it.each(incomeGoldens)("$name", (testCase) => {
    const actual = runIncomeScenario(testCase.scenario).taxes;
    expect(actual).toMatchObject(testCase.expected);
  });
});
