import { describe, expect, it } from "vitest";
import { roundTo } from "../format";
import { computeRsuGrossForItems, computeRsuGrossForProjectionYear } from "../incomeModel";
import { getMortgageAnnualHousingCost, getMortgageYearInterest } from "../mortgagePage";
import { computeAdditionalTax, DEFAULT_CONFIG, normalizeConfig } from "../taxConfig";
import { buildMonthlyCashFlow } from "../projectionUtils";
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
    const projection = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
    });
    const today = projection.getYear(0);
    const yearOne = projection.getYear(1);

    expect(today.rsuGross).toBe(100000);
    expect(today.rsuNet).toBeGreaterThan(0);
    expect(today.freeCashBeforeAllocation).toBe(today.takeHome);
    expect(yearOne.vestedRsuBalance).toBe(today.rsuNet);
    expect(yearOne.residualCash).toBe(today.takeHome);
  });

  it("treats RSU tax as sell-to-cover instead of a monthly cash-flow hit", () => {
    const scenario = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
      currentYear: 0,
    });
    const today = scenario.getYear(0);
    const monthlyCashFlow = buildMonthlyCashFlow({
      incomeSummary: scenario.scenario.incomeSummary,
      projection: scenario.projection,
      currentRow: today,
    });
    const taxItem = monthlyCashFlow.items.find((item) => item.label === "Taxes");

    expect(today.totalTax).toBeGreaterThan(today.cashFlowTax);
    expect(today.rsuSellToCoverTax).toBeCloseTo(today.totalTax - today.cashFlowTax, 2);
    expect(today.rsuNet).toBeCloseTo(today.rsuGross - today.rsuSellToCoverTax, 2);
    expect(taxItem?.value).toBeCloseTo(today.cashFlowTax / 12, 2);
    expect(taxItem?.value).not.toBeCloseTo(today.totalTax / 12, 2);
    expect(monthlyCashFlow.netFlow).toBeCloseTo(today.takeHome / 12, 2);
  });

  it("optionally counts vested RSUs in net worth without treating them as reserve cash", () => {
    const projection = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
      includeVestedRsusInNetWorth: true,
    });
    const today = projection.getYear(0);
    const yearOne = projection.getYear(1);

    expect(yearOne.vestedRsuBalance).toBe(today.rsuNet);
    expect(yearOne.assetsGross).toBe(yearOne.residualCash);
    expect(yearOne.netWorth).toBe(yearOne.residualCash + today.rsuNet);
    expect(yearOne.residualCash).toBe(today.takeHome);
  });

  it("grows annual RSU refreshers with income growth in projection", () => {
    const rsuItems = [
      {
        id: "rsu-1",
        name: "RSU",
        grantAmount: 0,
        refresherAmount: 40000,
        vestingYears: 4,
        illiquid: true,
      },
    ];

    const flatYearThree = computeRsuGrossForItems(rsuItems, 2, 0, 0.0);
    const growingYearThree = computeRsuGrossForItems(rsuItems, 2, 0, 0.1);

    expect(growingYearThree).toBeGreaterThan(flatYearThree);
  });

  it("uses projection year zero for the first RSU vest slice", () => {
    const rsuItems = [
      {
        id: "rsu-1",
        name: "RSU",
        grantAmount: 40000,
        refresherAmount: 0,
        vestingYears: 4,
        illiquid: true,
      },
    ];

    expect(computeRsuGrossForProjectionYear(rsuItems, 0)).toBe(10000);
    expect(computeRsuGrossForProjectionYear(rsuItems, 1)).toBe(10000);
    expect(computeRsuGrossForProjectionYear(rsuItems, 2)).toBe(10000);
    expect(computeRsuGrossForProjectionYear(rsuItems, 3)).toBe(10000);
    expect(computeRsuGrossForProjectionYear(rsuItems, 4)).toBe(0);
  });

  it("tracks vested RSU balances by grant instead of using unvested grant value", () => {
    const projection = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
    });
    const today = projection.getYear(0);
    const yearOne = projection.getYear(1);

    expect(today.vestedRsuBalanceById["rsu-1"]).toBeUndefined();
    expect(yearOne.vestedRsuBalanceById["rsu-1"]).toBe(today.rsuNet);
    expect(yearOne.vestedRsuBalanceById["rsu-1"]).not.toBe(100000);
  });

  it("uses per-grant RSU growth overrides in aggregate net worth", () => {
    const projection = runProjectionScenario({
      salary: 150000,
      rsuValue: 100000,
      horizonYears: 2,
      currentYear: 2,
      assetGrowthRate: 0,
      includeVestedRsusInNetWorth: true,
      rsuGrowthRateById: {
        "rsu-1": 0.5,
      },
    });
    const yearOne = projection.getYear(1);
    const yearTwo = projection.getYear(2);

    expect(yearTwo.vestedRsuBalanceById["rsu-1"]).toBe(roundTo(yearOne.vestedRsuBalanceById["rsu-1"] * 1.5, 2));
    expect(yearTwo.vestedRsuBalance).toBe(yearTwo.vestedRsuBalanceById["rsu-1"]);
    expect(yearTwo.netWorth).toBe(yearTwo.assetsGross + yearTwo.homeEquity + yearTwo.vestedRsuBalanceById["rsu-1"]);
  });

  it("sells custom assets to restore target cash before drawing from retirement accounts", () => {
    const yearOne = runProjectionScenario({
      salary: 0,
      annualExpenses: 5000,
      targetCash: 1000,
      accounts: [
        {
          id: "brokerage",
          name: "Brokerage",
          balance: 3000,
          basis: 3000,
        },
        {
          id: "ira-bucket",
          name: "IRA",
          taxTreatment: "taxDeferred",
          balance: 10000,
        },
      ],
    }).getYear(1);

    expect(yearOne.residualCash).toBe(1000);
    expect(yearOne.bucketSnapshotsById.brokerage?.balance).toBe(0);
    expect(yearOne.bucketSnapshotsById["ira-bucket"]?.balance).toBe(7000);
  });

  it("does not sell illiquid assets when restoring target cash", () => {
    const yearOne = runProjectionScenario({
      salary: 0,
      annualExpenses: 5000,
      targetCash: 1000,
      accounts: [
        {
          id: "brokerage",
          name: "Brokerage",
          balance: 10000,
          basis: 10000,
          illiquid: true,
        },
        {
          id: "ira-bucket",
          name: "IRA",
          taxTreatment: "taxDeferred",
          balance: 10000,
        },
      ],
    }).getYear(1);

    expect(yearOne.residualCash).toBe(1000);
    expect(yearOne.bucketSnapshotsById.brokerage?.balance).toBe(10000);
    expect(yearOne.bucketSnapshotsById["ira-bucket"]?.balance).toBe(4000);
  });

  it("invests excess reserve cash down to the target", () => {
    const today = runProjectionScenario({
      targetCash: 10000,
      freeCashFlowBucketId: "brokerage",
      currentYear: 0,
      accounts: [
        {
          id: "cash-bucket",
          name: "Cash",
          balance: 50000,
          growth: 0,
        },
        {
          id: "brokerage",
          name: "Brokerage",
          balance: 0,
          basis: 0,
          growth: 0,
        },
      ],
    }).getYear(0);

    expect(today.residualCash).toBe(10000);
    expect(today.bucketSnapshotsById.brokerage?.balance).toBe(40000);
  });

  it("keeps ownership costs after the mortgage payoff year", () => {
    expect(
      getMortgageAnnualHousingCost(
        {
          type: "loan",
          kind: "conventional",
          isArm: false,
          rentGrowthRate: 0,
          homePrice: 600000,
          currentEquity: 100000,
          loanAmount: 500000,
          totalMonthlyPayment: 2500,
          principalInterest: 1950,
          monthlyTax: 400,
          monthlyInsurance: 100,
          monthlyHoa: 50,
          maintenanceRate: 0,
          purchaseClosingCost: 0,
          saleClosingCostMode: "percent",
          saleClosingCostInput: 0,
          totalInterest: 100000,
          yearlyLoan: [
            { year: 1, payment: 2500, principal: 1000, interest: 950, averageBalance: 250000, endingBalance: 0 },
          ],
        },
        2,
      ),
    ).toBe(6600);
  });

  it("maps projection year zero to the first mortgage year", () => {
    const mortgageSummary = {
      type: "loan",
      kind: "conventional" as const,
      isArm: false,
      rentGrowthRate: 0,
      homePrice: 600000,
      currentEquity: 100000,
      loanAmount: 500000,
      totalMonthlyPayment: 3250,
      principalInterest: 2700,
      monthlyTax: 400,
      monthlyInsurance: 100,
      monthlyHoa: 50,
      maintenanceRate: 0,
      purchaseClosingCost: 0,
      saleClosingCostMode: "percent" as const,
      saleClosingCostInput: 0,
      totalInterest: 100000,
      yearlyLoan: [
        { year: 1, payment: 3250, principal: 1800, interest: 900, averageBalance: 510000, endingBalance: 500000 },
        { year: 2, payment: 3150, principal: 1900, interest: 800, averageBalance: 490000, endingBalance: 480000 },
      ],
    };

    expect(getMortgageAnnualHousingCost(mortgageSummary, 0)).toBe(39000);
    expect(getMortgageAnnualHousingCost(mortgageSummary, 1)).toBe(37800);
    expect(getMortgageYearInterest(mortgageSummary, 0)).toBe(900);
    expect(getMortgageYearInterest(mortgageSummary, 1)).toBe(800);
  });

  it("includes principal, tax, insurance, and hoa in year-zero housing cost", () => {
    expect(
      getMortgageAnnualHousingCost(
        {
          type: "loan",
          kind: "conventional",
          isArm: false,
          rentGrowthRate: 0,
          homePrice: 600000,
          currentEquity: 100000,
          loanAmount: 500000,
          totalMonthlyPayment: 3250,
          principalInterest: 2700,
          monthlyTax: 400,
          monthlyInsurance: 100,
          monthlyHoa: 50,
          maintenanceRate: 0,
          purchaseClosingCost: 0,
          saleClosingCostMode: "percent",
          saleClosingCostInput: 0,
          totalInterest: 100000,
          yearlyLoan: [
            { year: 1, payment: 3250, principal: 1800, interest: 900, averageBalance: 510000, endingBalance: 500000 },
          ],
        },
        0,
      ),
    ).toBe(39000);
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

    const today = projection.getYear(0);
    const yearOne = projection.getYear(1);

    expect(yearOne.takeHome).toBeLessThan(today.takeHome);
    expect(yearOne.freeCashBeforeAllocation).toBeLessThan(today.freeCashBeforeAllocation);
  });

  it("grows rent housing cost over time without creating home equity", () => {
    const projection = runProjectionScenario({
      salary: 180000,
      annualMortgage: 36000,
      housingKind: "rent",
      rentGrowthRate: 3,
      horizonYears: 2,
      currentYear: 2,
    });

    const today = projection.getYear(0);
    const yearOne = projection.getYear(1);
    const yearTwo = projection.getYear(2);

    expect(today.mortgageLineItem).toBe(36000);
    expect(yearOne.mortgageLineItem).toBeCloseTo(37080, 2);
    expect(yearTwo.mortgageLineItem).toBeCloseTo(38192.4, 2);
    expect(yearOne.homeEquity).toBe(0);
    expect(yearTwo.homeEquity).toBe(0);
    expect(yearTwo.freeCashBeforeAllocation).toBeLessThan(yearOne.freeCashBeforeAllocation);
  });

  it("adds yearly home maintenance to owner housing cost", () => {
    const yearOne = runProjectionScenario({
      annualMortgage: 24000,
      homePrice: 1000000,
      currentEquity: 200000,
      maintenanceRate: 1,
      currentYear: 1,
    }).getYear(1);

    expect(yearOne.mortgageLineItem).toBe(34000);
  });

  it("reduces buy-side net worth for purchase closing costs", () => {
    const withoutClosingCosts = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      accounts: [
        {
          id: "cash-bucket",
          name: "Cash",
          balance: 400000,
          growth: 0,
        },
      ],
      mortgageFundingBucketId: "cash-bucket",
      currentYear: 0,
    }).getYear(0);

    const withClosingCosts = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      purchaseClosingCost: 20000,
      accounts: [
        {
          id: "cash-bucket",
          name: "Cash",
          balance: 400000,
          growth: 0,
        },
      ],
      mortgageFundingBucketId: "cash-bucket",
      currentYear: 0,
    }).getYear(0);

    expect(withClosingCosts.netWorth).toBeLessThan(withoutClosingCosts.netWorth);
  });

  it("reduces projected home equity for selling costs", () => {
    const withoutSellingCosts = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      currentYear: 0,
    }).getYear(0);

    const withSellingCosts = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      saleClosingCost: 5,
      currentYear: 0,
    }).getYear(0);

    expect(withSellingCosts.homeEquity).toBeLessThan(withoutSellingCosts.homeEquity);
    expect(withSellingCosts.netWorth).toBeLessThan(withoutSellingCosts.netWorth);
    expect(withSellingCosts.homeEquity).toBe(150000);
  });

  it("uses current equity, not full home value, in year zero", () => {
    const today = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      currentYear: 0,
    }).getYear(0);

    expect(today.homeEquity).toBe(200000);
  });

  it("does not grant unfunded down-payment equity in year zero", () => {
    const funded = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      accounts: [
        {
          id: "cash-bucket",
          name: "Cash",
          balance: 250000,
          growth: 0,
        },
      ],
      mortgageFundingBucketId: "cash-bucket",
      currentYear: 0,
    }).getYear(0);

    const unfunded = runProjectionScenario({
      homePrice: 1000000,
      currentEquity: 200000,
      accounts: [
        {
          id: "cash-bucket",
          name: "Cash",
          balance: 50000,
          growth: 0,
        },
      ],
      mortgageFundingBucketId: "cash-bucket",
      currentYear: 0,
    }).getYear(0);

    expect(unfunded.homeEquity).toBeLessThan(funded.homeEquity);
    expect(unfunded.netWorth).toBeLessThan(funded.netWorth);
    expect(unfunded.homeEquity).toBe(50000);
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
    expect(yearOne.residualCash).toBe(0);
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
