import { type ProjectionScenarioOptions } from "../helpers/projectionScenario";

type ProjectionGoldenSnapshot = {
  takeHome: number;
  mortgage: number;
  expenses: number;
  freeCash: number;
  reserveCash: number;
  stockBalance?: number;
};

type ProjectionGolden = {
  name: string;
  scenario: ProjectionScenarioOptions;
  expected: Record<number, ProjectionGoldenSnapshot>;
};

export const projectionGoldens: ProjectionGolden[] = [
  {
    name: "250k income with maxed 401k and hsa with 1.2m house and 300k down",
    scenario: {
      salary: 250000,
      annualMortgage: 84000,
      annualExpenses: 0,
      homePrice: 1200000,
      currentEquity: 300000,
      retirement: {
        employee401k: 24500,
        employerMatch: 0,
        iraContribution: 7000,
        megaBackdoor: 35250,
        hsaContribution: 4400,
      },
      accounts: [],
      allocations: {
        "stock-bucket": {
          amount: 100,
          growth: 7,
        },
      },
      horizonYears: 5,
    },
    expected: {
      1: {
        takeHome: 101150.52,
        mortgage: 84000,
        expenses: 0,
        freeCash: 17150.52,
        reserveCash: 0,
        stockBalance: 17750.79,
      },
      5: {
        takeHome: 101150.52,
        mortgage: 84000,
        expenses: 0,
        freeCash: 17150.52,
        reserveCash: 0,
        stockBalance: 102080.15,
      },
    },
  },
  {
    name: "200k income with no HSA and no traditional 401(k) with 1.2m house and 300k down",
    scenario: {
      salary: 200000,
      annualMortgage: 84000,
      annualExpenses: 0,
      homePrice: 1200000,
      currentEquity: 300000,
      retirement: {
        employee401k: 0,
        employerMatch: 0,
        iraContribution: 0,
        megaBackdoor: 0,
        hsaContribution: 0,
      },
      accounts: [],
      allocations: {
        "stock-bucket": {
          amount: 100,
          growth: 7,
        },
      },
      horizonYears: 5,
    },
    expected: {
      1: {
        takeHome: 131819.02,
        mortgage: 84000,
        expenses: 0,
        freeCash: 47819.02,
        reserveCash: 0,
        stockBalance: 49492.69,
      },
      5: {
        takeHome: 131819.02,
        mortgage: 84000,
        expenses: 0,
        freeCash: 47819.02,
        reserveCash: 0,
        stockBalance: 284619.53,
      },
    },
  },
];
