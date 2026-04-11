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
  income: {
    employee401k: realisticRetirement.employee401k,
    hsaContribution: realisticRetirement.hsaContribution,
    iraContribution: realisticRetirement.iraContribution,
    megaBackdoor: realisticRetirement.megaBackdoor,
    matchRate: 50,
  },
}).results;

const deductibleTaxSavings =
  computeAdditionalTax(170000, 10000, normalizeConfig(DEFAULT_CONFIG).federalBrackets) +
  computeAdditionalTax(170000, 10000, normalizeConfig(DEFAULT_CONFIG).stateBrackets);

describe("calculateProjection", () => {
  it("subtracts cash-funded asset contributions from year-one reserve cash", () => {
    const yearOne = runProjectionScenario({
      accounts: [
        {
          id: "taxable-bucket",
          name: "Brokerage",
          balance: 100000,
          annualContribution: 30000,
        },
      ],
    }).getYear(1);

    expect(yearOne.freeCashBeforeAllocation).toBe(yearOne.takeHome - 30000);
    expect(yearOne.residualCash).toBe(yearOne.takeHome - 30000);
  });

  it("does not subtract income-directed retirement contributions from reserve cash a second time", () => {
    const yearOne = runProjectionScenario({
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
    }).getYear(1);

    expect(yearOne.freeCashBeforeAllocation).toBe(yearOne.takeHome);
    expect(yearOne.residualCash).toBe(yearOne.takeHome);
    expect(yearOne.bucketSnapshotsById["traditional-401k"]?.balance).toBe(80000);
  });

  it("routes retirement contributions into the configured destination buckets", () => {
    const yearOne = runProjectionScenario({
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
    }).getYear(1);

    expect(yearOne.bucketSnapshotsById["traditional-401k"]?.balance).toBe(35000);
    expect(yearOne.bucketSnapshotsById["ira-bucket"]?.balance).toBe(9000);
  });

  it("keeps RSU vesting out of reserve cash", () => {
    const yearOne = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
    }).getYear(1);

    expect(yearOne.rsuGross).toBe(100000);
    expect(yearOne.rsuNet).toBeGreaterThan(0);
    expect(yearOne.freeCashBeforeAllocation).toBe(yearOne.takeHome);
    expect(yearOne.residualCash).toBe(yearOne.takeHome);
  });

  it("optionally counts vested RSUs in net worth without treating them as reserve cash", () => {
    const yearOne = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
      includeVestedRsusInNetWorth: true,
    }).getYear(1);

    expect(yearOne.vestedRsuBalance).toBe(yearOne.rsuNet);
    expect(yearOne.assetsGross).toBe(yearOne.residualCash);
    expect(yearOne.netWorth).toBe(yearOne.residualCash + yearOne.rsuNet);
    expect(yearOne.residualCash).toBe(yearOne.takeHome);
  });

  it("grows annual RSU refreshers with income growth in projection", () => {
    const rsuItems = [
      {
        id: "rsu-1",
        name: "RSU",
        grantAmount: 0,
        refresherAmount: 40000,
        vestingYears: 4,
      },
    ];

    const flatYearThree = computeRsuGrossForItems(rsuItems, 2, 0, 0.0);
    const growingYearThree = computeRsuGrossForItems(rsuItems, 2, 0, 0.1);

    expect(growingYearThree).toBeGreaterThan(flatYearThree);
  });

  it("adds current-year tax savings for deductible bucket contributions", () => {
    const yearOne = runProjectionScenario({
      salary: 180000,
      accounts: [
        {
          id: "traditional-bucket",
          name: "Traditional",
          taxTreatment: "taxDeductible",
          annualContribution: 10000,
        },
      ],
    }).getYear(1);

    expect(yearOne.freeCashBeforeAllocation).toBe(yearOne.takeHome - 10000 + deductibleTaxSavings);
    expect(yearOne.residualCash).toBe(yearOne.takeHome - 10000 + deductibleTaxSavings);
  });

  it("reduces projected take-home as itemized mortgage interest falls over time", () => {
    const projection = runProjectionScenario({
      salary: 250000,
      annualMortgage: 60000,
      homePrice: 900000,
      currentEquity: 200000,
      horizonYears: 2,
      currentYear: 2,
      yearlyLoan: [
        { year: 1, interest: 30000, endingBalance: 700000 },
        { year: 2, interest: 20000, endingBalance: 680000 },
      ],
      taxConfig: {
        ...DEFAULT_CONFIG,
        deductionMode: "itemized",
        federalSaltCap: 40400,
      },
    });

    const yearOne = projection.getYear(1);
    const yearTwo = projection.getYear(2);

    expect(yearTwo.takeHome).toBeLessThan(yearOne.takeHome);
    expect(yearTwo.freeCashBeforeAllocation).toBeLessThan(yearOne.freeCashBeforeAllocation);
  });

  it("handles a realistic salary plus mortgage scenario without double counting cash", () => {
    const yearOne = runProjectionScenario({
      salary: realisticIncome.grossSalary,
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
    }).getYear(1);

    expect(yearOne.takeHome).toBe(realisticIncome.annualTakeHome);
    expect(yearOne.mortgageLineItem).toBe(84000);
    expect(yearOne.freeCashBeforeAllocation).toBe(17150.52);
    expect(yearOne.residualCash).toBe(yearOne.freeCashBeforeAllocation);
    expect(yearOne.bucketSnapshotsById["traditional-401k"]?.balance).toBe(236750);
    expect(yearOne.bucketSnapshotsById["roth-401k"]?.balance).toBe(75250);
  });

  it("shows the realistic salary plus mortgage plus spending scenario going negative in year one", () => {
    const yearOne = runProjectionScenario({
      salary: realisticIncome.grossSalary,
      annualMortgage: 84000,
      annualExpenses: 50000,
      homePrice: 1200000,
      currentEquity: 300000,
      retirement: realisticRetirement,
    }).getYear(1);

    expect(yearOne.takeHome).toBe(realisticIncome.annualTakeHome);
    expect(yearOne.nonHousingExpenses).toBe(50000);
    expect(yearOne.mortgageLineItem).toBe(84000);
    expect(yearOne.freeCashBeforeAllocation).toBe(-32849.48);
    expect(yearOne.residualCash).toBe(yearOne.freeCashBeforeAllocation);
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
