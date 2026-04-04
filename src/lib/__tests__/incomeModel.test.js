import { describe, expect, it } from "vitest";
import merge from "lodash.merge";
import { incomeGoldens } from "./goldens/income";
import { runIncomeScenario } from "./helpers/incomeScenario";

const maxed = {
  salary: 250000,
  inputs: {
    employee401k: 24500,
    hsaContribution: 4400,
    iraContribution: 7000,
    megaBackdoorInput: 35250,
    matchRate: 50,
  },
};

const incomeCases = [
  {
    name: "does not reduce taxes for after-tax IRA or mega backdoor contributions",
    scenario: {
      baseline: maxed,
      comparison: merge({}, maxed, {
        inputs: {
          iraContribution: 0,
          megaBackdoorInput: 0,
        },
      }),
    },
    act: (scenario) => ({
      baseline: runIncomeScenario(scenario.baseline).taxes.totalTaxes,
      comparison: runIncomeScenario(scenario.comparison).taxes.totalTaxes,
    }),
    assert: ({ baseline, comparison }) => {
      expect(comparison).toBeCloseTo(baseline, 6);
    },
  },
  {
    name: "reduces total tax when traditional 401(k) contributions are present",
    scenario: {
      with: maxed,
      without: merge({}, maxed, {
        inputs: {
          employee401k: 0,
        },
      }),
    },
    act: (scenario) => ({
      without: runIncomeScenario(scenario.without).taxes.totalTaxes,
      with401k: runIncomeScenario(scenario.with).taxes.totalTaxes,
    }),
    assert: ({ with401k, without }) => {
      expect(with401k).toBeLessThan(without);
    },
  },
  {
    name: "does not let traditional 401(k) reduce FICA wages",
    scenario: {
      with401k: maxed,
      without401k: merge({}, maxed, {
        inputs: {
          employee401k: 0,
        },
      }),
    },
    act: (scenario) => ({
      without: runIncomeScenario(scenario.without401k).taxes.fica,
      with401k: runIncomeScenario(scenario.with401k).taxes.fica,
    }),
    assert: ({ with401k, without }) => {
      expect(with401k).toEqual({
        ...without,
        total: without.total,
      });
    },
  },
  {
    name: "lets HSA reduce federal tax, but not California or FICA taxes",
    scenario: {
      baseline: maxed,
      withoutHsa: merge({}, maxed, {
        inputs: {
          hsaContribution: 0,
        },
      }),
    },
    act: (scenario) => ({
      baseline: runIncomeScenario(scenario.baseline).taxes,
      without: runIncomeScenario(scenario.withoutHsa).taxes,
    }),
    assert: ({ baseline, without }) => {
      expect(baseline.federalTax).toBeLessThan(without.federalTax);
      expect(baseline.californiaTax).toBe(without.californiaTax);
      expect(baseline.fica.total).toBe(without.fica.total);
    },
  },
];

describe("calculateIncome", () => {
  it.each(incomeCases)("$name", (testCase) => {
    const actual = testCase.act(testCase.scenario);
    testCase.assert(actual);
  });

  it.each(incomeGoldens)("$name", (testCase) => {
    const actual = runIncomeScenario(testCase.scenario).taxes;
    expect(actual).toMatchObject(testCase.expected);
  });
});
