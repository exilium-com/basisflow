import { describe, expect, it } from "vitest";
import { computeRsuGrossForItems } from "../incomeModel";
import { computeAdditionalTax, DEFAULT_CONFIG, normalizeConfig } from "../taxConfig";
import { projectionGoldens } from "./goldens/projection";
import { runIncomeScenario } from "./helpers/incomeScenario";
import { runProjectionScenario } from "./helpers/projectionScenario";

const realisticRetirement = {
  employee401k: 24500,
  employerMatch: 12250,
  iraContribution: 7000,
  megaBackdoor: 35250,
  hsaContribution: 4400,
};

const realisticIncome = runIncomeScenario({
  salary: 250000,
  inputs: {
    employee401k: realisticRetirement.employee401k,
    hsaContribution: realisticRetirement.hsaContribution,
    iraContribution: realisticRetirement.iraContribution,
    megaBackdoorInput: realisticRetirement.megaBackdoor,
    matchRate: 50,
  },
}).income;

const deductibleTaxSavings =
  computeAdditionalTax(
    170000,
    10000,
    normalizeConfig(DEFAULT_CONFIG).federalBrackets,
  ) +
  computeAdditionalTax(
    170000,
    10000,
    normalizeConfig(DEFAULT_CONFIG).stateBrackets,
  );

const projectionCases = [
  {
    name: "subtracts cash-funded asset contributions from year-one reserve cash",
    scenario: {
      annualTakeHome: 120000,
      accounts: [
        {
          id: "taxable-bucket",
          name: "Brokerage",
          balance: 100000,
          annualContribution: 30000,
        },
      ],
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        freeCash: yearOne.freeCashBeforeAllocation,
        reserveCash: yearOne.residualCash,
      };
    },
    assert: ({ freeCash, reserveCash }) => {
      expect(freeCash).toBe(90000);
      expect(reserveCash).toBe(90000);
    },
  },
  {
    name: "does not subtract income-directed retirement contributions from reserve cash a second time",
    scenario: {
      annualTakeHome: 100000,
      retirement: {
        employee401k: 23000,
        employerMatch: 7000,
      },
      accounts: [
        {
          id: "traditional-401k",
          name: "401(k)",
          taxTreatment: "taxDeductible",
          balance: 50000,
        },
      ],
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        freeCash: yearOne.freeCashBeforeAllocation,
        reserveCash: yearOne.residualCash,
        retirementBalance: yearOne.bucketSnapshotsById["traditional-401k"].balance,
      };
    },
    assert: ({ freeCash, reserveCash, retirementBalance }) => {
      expect(freeCash).toBe(100000);
      expect(reserveCash).toBe(100000);
      expect(retirementBalance).toBe(80000);
    },
  },
  {
    name: "routes retirement contributions into the configured destination buckets",
    scenario: {
      annualTakeHome: 100000,
      retirement: {
        employee401k: 20000,
        employerMatch: 5000,
        iraContribution: 7000,
      },
      accounts: [
        {
          id: "traditional-401k",
          name: "401(k)",
          taxTreatment: "taxDeductible",
          balance: 10000,
        },
        {
          id: "ira-bucket",
          name: "IRA",
          taxTreatment: "taxDeferred",
          balance: 2000,
        },
      ],
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        traditional401k: yearOne.bucketSnapshotsById["traditional-401k"].balance,
        ira: yearOne.bucketSnapshotsById["ira-bucket"].balance,
      };
    },
    assert: ({ traditional401k, ira }) => {
      expect(traditional401k).toBe(35000);
      expect(ira).toBe(9000);
    },
  },
  {
    name: "keeps RSU vesting out of reserve cash",
    scenario: {
      salary: 150000,
      annualTakeHome: 100000,
      rsuValue: 100000,
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        rsuGross: yearOne.rsuGross,
        rsuNet: yearOne.rsuNet,
        freeCash: yearOne.freeCashBeforeAllocation,
        reserveCash: yearOne.residualCash,
      };
    },
    assert: ({ freeCash, reserveCash, rsuGross, rsuNet }) => {
      expect(rsuGross).toBe(100000);
      expect(rsuNet).toBeGreaterThan(0);
      expect(freeCash).toBe(100000);
      expect(reserveCash).toBe(100000);
    },
  },
  {
    name: "optionally counts vested RSUs in net worth without treating them as reserve cash",
    scenario: {
      salary: 150000,
      annualTakeHome: 100000,
      rsuValue: 100000,
      includeVestedRsusInNetWorth: true,
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        rsuNet: yearOne.rsuNet,
        vestedRsuBalance: yearOne.vestedRsuBalance,
        assetsGross: yearOne.assetsGross,
        netWorth: yearOne.netWorth,
        reserveCash: yearOne.residualCash,
      };
    },
    assert: ({ assetsGross, netWorth, reserveCash, rsuNet, vestedRsuBalance }) => {
      expect(vestedRsuBalance).toBe(rsuNet);
      expect(assetsGross).toBe(100000);
      expect(netWorth).toBe(100000 + rsuNet);
      expect(reserveCash).toBe(100000);
    },
  },
  {
    name: "grows annual RSU refreshers with take-home growth in projection",
    act: () => {
      const rsuItems = [
        {
          id: "rsu-1",
          name: "RSU",
          grantAmount: 0,
          refresherAmount: 40000,
          vestingYears: 4,
        },
      ];

      return {
        flatYearThree: computeRsuGrossForItems(rsuItems, 2, 0, 0.0),
        growingYearThree: computeRsuGrossForItems(rsuItems, 2, 0, 0.1),
      };
    },
    assert: ({ flatYearThree, growingYearThree }) => {
      expect(growingYearThree).toBeGreaterThan(flatYearThree);
    },
  },
  {
    name: "adds current-year tax savings for deductible bucket contributions",
    scenario: {
      salary: 180000,
      annualTakeHome: 120000,
      accounts: [
        {
          id: "traditional-bucket",
          name: "Traditional",
          taxTreatment: "taxDeductible",
          annualContribution: 10000,
        },
      ],
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        freeCash: yearOne.freeCashBeforeAllocation,
        reserveCash: yearOne.residualCash,
      };
    },
    assert: ({ freeCash, reserveCash }) => {
      expect(freeCash).toBe(110000 + deductibleTaxSavings);
      expect(reserveCash).toBe(110000 + deductibleTaxSavings);
    },
  },
  {
    name: "handles a realistic salary plus mortgage scenario without double counting cash",
    scenario: {
      salary: realisticIncome.grossSalary,
      annualTakeHome: realisticIncome.annualTakeHome,
      annualMortgage: 84000,
      homePrice: 1200000,
      currentEquity: 300000,
      retirement: realisticRetirement,
      accounts: [
        {
          id: "brokerage",
          name: "Brokerage",
          balance: 50000,
          basis: 50000,
        },
        {
          id: "traditional-401k",
          name: "401(k)",
          taxTreatment: "taxDeductible",
          balance: 200000,
        },
        {
          id: "ira-bucket",
          name: "IRA",
          taxTreatment: "taxDeferred",
          balance: 30000,
        },
        {
          id: "roth-401k",
          name: "Roth 401(k)",
          taxTreatment: "taxDeferred",
          balance: 40000,
        },
        {
          id: "hsa-bucket",
          name: "HSA",
          taxTreatment: "taxDeferred",
          balance: 15000,
        },
      ],
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        takeHome: yearOne.takeHome,
        mortgage: yearOne.mortgageLineItem,
        freeCash: yearOne.freeCashBeforeAllocation,
        reserveCash: yearOne.residualCash,
        traditional401k: yearOne.bucketSnapshotsById["traditional-401k"].balance,
        roth401k: yearOne.bucketSnapshotsById["roth-401k"].balance,
      };
    },
    assert: ({ freeCash, mortgage, reserveCash, roth401k, takeHome, traditional401k }) => {
      expect(takeHome).toBe(realisticIncome.annualTakeHome);
      expect(mortgage).toBe(84000);
      expect(freeCash).toBe(17150.52);
      expect(reserveCash).toBe(freeCash);
      expect(traditional401k).toBe(236750);
      expect(roth401k).toBe(75250);
    },
  },
  {
    name: "shows the realistic salary plus mortgage plus spending scenario going negative in year one",
    scenario: {
      salary: realisticIncome.grossSalary,
      annualTakeHome: realisticIncome.annualTakeHome,
      annualMortgage: 84000,
      annualExpenses: 50000,
      homePrice: 1200000,
      currentEquity: 300000,
      retirement: realisticRetirement,
    },
    act: (scenario) => {
      const yearOne = runProjectionScenario(scenario).getYear(1);
      return {
        takeHome: yearOne.takeHome,
        expenses: yearOne.nonHousingExpenses,
        mortgage: yearOne.mortgageLineItem,
        freeCash: yearOne.freeCashBeforeAllocation,
        reserveCash: yearOne.residualCash,
      };
    },
    assert: ({ expenses, freeCash, mortgage, reserveCash, takeHome }) => {
      expect(takeHome).toBe(realisticIncome.annualTakeHome);
      expect(expenses).toBe(50000);
      expect(mortgage).toBe(84000);
      expect(freeCash).toBe(-32849.48);
      expect(reserveCash).toBe(freeCash);
    },
  },
];

describe("calculateProjection", () => {
  it.each(projectionCases)("$name", (testCase) => {
    const actual = testCase.act(testCase.scenario);
    testCase.assert(actual);
  });

  it.each(projectionGoldens)("$name", (testCase) => {
    const projection = runProjectionScenario(testCase.scenario);
    const actual = Object.fromEntries(
      Object.keys(testCase.expected).map((year) => {
        const snapshot = projection.getYear(Number(year));
        return [
          year,
          {
            takeHome: snapshot.takeHome,
            mortgage: snapshot.mortgageLineItem,
            expenses: snapshot.nonHousingExpenses,
            freeCash: snapshot.freeCashBeforeAllocation,
            reserveCash: snapshot.residualCash,
            stockBalance: snapshot.bucketSnapshotsById["stock-bucket"]?.balance,
          },
        ];
      }),
    );

    expect(actual).toMatchObject(testCase.expected);
  });
});
