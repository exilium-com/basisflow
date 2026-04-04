import { createDefaultAssetsState, normalizeAssetInputs, normalizeAssetsState } from "../../assetsModel";
import { createDefaultExpenseState, normalizeExpenseInputs, normalizeExpensesState } from "../../expensesModel";
import {
  buildIncomeDirectedContributions,
  createDefaultProjectionState,
  normalizeProjectionInputs,
  normalizeProjectionState,
} from "../../projectionState";
import { calculateProjection } from "../../projectionCalculation";
import { roundTo } from "../../format";
import { DEFAULT_CONFIG, normalizeConfig } from "../../taxConfig";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const RETIREMENT_ACCOUNTS = {
  retirementBucketId: {
    id: "traditional-401k",
    name: "401(k)",
    taxTreatment: "taxDeductible",
  },
  iraBucketId: {
    id: "ira-bucket",
    name: "IRA",
    taxTreatment: "taxDeferred",
  },
  megaBucketId: {
    id: "roth-401k",
    name: "Roth 401(k)",
    taxTreatment: "taxDeferred",
  },
  hsaBucketId: {
    id: "hsa-bucket",
    name: "HSA",
    taxTreatment: "taxDeferred",
  },
};

function labelFromId(id) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAllocationEntry(allocation) {
  if (allocation && typeof allocation === "object" && "amount" in allocation) {
    return {
      amount: roundTo(Number(allocation.amount) || 0, 2),
      growth: roundTo(Number(allocation.growth) || 0, 2),
    };
  }

  return {
    amount: roundTo(Number(allocation?.value) || 0, 2),
    growth: 0,
  };
}

function createProjectionRsuItems(rsuValue) {
  if (!rsuValue) {
    return [];
  }

  return [
    {
      id: "rsu-1",
      name: "RSU",
      grantAmount: rsuValue,
      refresherAmount: 0,
      vestingYears: 1,
    },
  ];
}

function createAccount({ id, name, taxTreatment = "none", balance = 0, annualContribution = 0, growth = 0, basis }) {
  const startingBalance = roundTo(balance, 2);
  const effectiveBasis = basis ?? (taxTreatment === "none" ? startingBalance : 0);

  return {
    id,
    taxTreatment,
    name,
    current: String(startingBalance),
    contribution: String(roundTo(annualContribution, 2)),
    growth: String(growth),
    basis: taxTreatment === "none" ? String(roundTo(effectiveBasis, 2)) : "",
    detailsOpen: false,
  };
}

function ensureRetirementAccounts(accounts, retirement) {
  const nextAccounts = [...accounts];

  Object.entries({
    retirementBucketId: retirement.employee401k + retirement.employerMatch,
    iraBucketId: retirement.iraContribution,
    megaBucketId: retirement.megaBackdoor,
    hsaBucketId: retirement.hsaContribution,
  }).forEach(([destinationKey, amount]) => {
    if (amount <= 0) {
      return;
    }

    const defaultAccount = RETIREMENT_ACCOUNTS[destinationKey];
    const targetId = defaultAccount.id;

    if (nextAccounts.some((candidate) => candidate.id === targetId)) {
      return;
    }

    nextAccounts.push(
      createAccount({
        id: targetId,
        name: defaultAccount.name,
        taxTreatment: defaultAccount.taxTreatment,
      }),
    );
  });

  return nextAccounts;
}

function createIncomeSummary({ salary = 150000, annualTakeHome = 100000, retirement = {}, rsuValue = 0 }) {
  const {
    employee401k = 0,
    employerMatch = 0,
    iraContribution = 0,
    megaBackdoor = 0,
    hsaContribution = 0,
  } = retirement;

  return {
    grossSalary: salary,
    annualTakeHome: roundTo(annualTakeHome, 2),
    monthlyTakeHome: roundTo(annualTakeHome / 12, 2),
    totalTaxes: 0,
    employee401k,
    employerMatch,
    iraContribution,
    megaBackdoor,
    hsaContribution,
    matchRate: 0,
    rsuItems: createProjectionRsuItems(rsuValue),
    rsuGrossNextYear: roundTo(rsuValue, 2),
    rsuNetNextYear: 0,
  };
}

function createMortgageSummary({ annualMortgage = 0, homePrice = 0, currentEquity = 0 }) {
  return {
    totalMonthlyPayment: roundTo(annualMortgage / 12, 2),
    currentEquity: roundTo(currentEquity, 2),
    homePrice: roundTo(homePrice, 2),
    yearlyLoan: [],
  };
}

function createExpensesState(annualExpenses = 0) {
  return annualExpenses > 0
    ? {
        expenses: [
          {
            id: "annual-spend",
            name: "Annual spending",
            amount: String(roundTo(annualExpenses, 2)),
            frequency: "annual",
            oneOffYear: "",
            growthRate: "",
            detailsOpen: false,
          },
        ],
        advancedOpen: false,
      }
    : {
        expenses: [],
        advancedOpen: false,
      };
}

function createProjectionState({
  horizonYears = 5,
  currentYear = 1,
  assetGrowthRate = 0,
  expenseGrowthRate = 0,
  takeHomeGrowthRate = 0,
  homeAppreciationRate = 0,
  rsuStockGrowthRate = 0,
  includeVestedRsusInNetWorth = false,
  allocations = {},
  mortgageFundingBucketId = "",
}) {
  const normalizedAllocations = Object.fromEntries(
    Object.entries(allocations).map(([bucketId, allocation]) => {
      const { amount } = normalizeAllocationEntry(allocation);
      return [
        bucketId,
        {
          mode: "percent",
          value: String(amount),
        },
      ];
    }),
  );

  return {
    ...createDefaultProjectionState(),
    horizonYears: String(horizonYears),
    currentYear: String(currentYear),
    assetGrowthRate: String(assetGrowthRate),
    expenseGrowthRate: String(expenseGrowthRate),
    takeHomeGrowthRate: String(takeHomeGrowthRate),
    homeAppreciationRate: String(homeAppreciationRate),
    rsuStockGrowthRate: String(rsuStockGrowthRate),
    includeVestedRsusInNetWorth,
    mortgageFundingBucketId,
    allocations: normalizedAllocations,
  };
}

function createAssetsState(accounts, retirement, allocations) {
  const nextAccounts = ensureRetirementAccounts(
    accounts.map((account) => createAccount(account)),
    retirement,
  );

  if (!nextAccounts.some((account) => account.id === "cash-bucket")) {
    nextAccounts.unshift(
      createAccount({
        id: "cash-bucket",
        name: "Cash",
        growth: 0,
      }),
    );
  }

  Object.entries(allocations).forEach(([bucketId, allocation]) => {
    if (nextAccounts.some((account) => account.id === bucketId)) {
      return;
    }

    const { growth } = normalizeAllocationEntry(allocation);
    nextAccounts.push(
      createAccount({
        id: bucketId,
        name: labelFromId(bucketId),
        growth,
      }),
    );
  });

  return {
    buckets: nextAccounts,
  };
}

export function runProjectionScenario({
  salary = 150000,
  annualTakeHome = 100000,
  annualMortgage = 0,
  annualExpenses = 0,
  homePrice = 0,
  currentEquity = 0,
  rsuValue = 0,
  retirement = {},
  accounts = [
    createAccount({
      id: "taxable-bucket",
      name: "Taxable",
    }),
  ],
  allocations = {},
  horizonYears = 5,
  currentYear = 1,
  assetGrowthRate = 0,
  expenseGrowthRate = 0,
  takeHomeGrowthRate = 0,
  homeAppreciationRate = 0,
  rsuStockGrowthRate = 0,
  includeVestedRsusInNetWorth = false,
  mortgageFundingBucketId = "",
  taxConfig = DEFAULT_CONFIG,
} = {}) {
  const normalizedRetirement = {
    employee401k: 0,
    employerMatch: 0,
    iraContribution: 0,
    megaBackdoor: 0,
    hsaContribution: 0,
    ...retirement,
  };

  const scenario = {
    incomeSummary: createIncomeSummary({
      salary,
      annualTakeHome,
      retirement: normalizedRetirement,
      rsuValue,
    }),
    mortgageSummary: createMortgageSummary({
      annualMortgage,
      homePrice,
      currentEquity,
    }),
    assetsState: createAssetsState(accounts, normalizedRetirement, allocations),
    expensesState: createExpensesState(annualExpenses),
    projectionState: createProjectionState({
      horizonYears,
      currentYear,
      assetGrowthRate,
      expenseGrowthRate,
      takeHomeGrowthRate,
      homeAppreciationRate,
      rsuStockGrowthRate,
      includeVestedRsusInNetWorth,
      allocations,
      mortgageFundingBucketId,
    }),
    taxConfig: normalizeConfig(clone(taxConfig)),
  };

  const fallbackAssetsState = createDefaultAssetsState();
  const fallbackExpensesState = createDefaultExpenseState();
  const fallbackProjectionState = createDefaultProjectionState();

  const assetsState = normalizeAssetsState(clone(scenario.assetsState), fallbackAssetsState);
  const expensesState = normalizeExpensesState(clone(scenario.expensesState), fallbackExpensesState);
  const projectionState = normalizeProjectionState(clone(scenario.projectionState), fallbackProjectionState);

  const assetInputs = normalizeAssetInputs(assetsState, projectionState.assetGrowthRate);
  const expenseInputs = normalizeExpenseInputs(expensesState, projectionState.expenseGrowthRate);
  const incomeDirectedContributions = buildIncomeDirectedContributions(scenario.incomeSummary);
  const projectionInputs = normalizeProjectionInputs(projectionState, assetInputs, incomeDirectedContributions);
  const results = calculateProjection({
    incomeSummary: scenario.incomeSummary,
    mortgageSummary: scenario.mortgageSummary,
    assetInputs,
    expenseInputs,
    projectionInputs,
    taxConfig: scenario.taxConfig,
  });

  return {
    scenario,
    taxConfig: scenario.taxConfig,
    assetInputs,
    expenseInputs,
    projectionInputs,
    results,
    getYear(year) {
      return results.projection.find((row) => row.year === year);
    },
  };
}
