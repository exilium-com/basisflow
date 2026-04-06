import {
  DEFAULT_ASSETS_STATE,
  PINNED_BUCKETS,
  normalizeAssetInputs,
  normalizeAssetsState,
  type AssetBucketState,
  type AssetTaxTreatment,
} from "../../assetsModel";
import {
  DEFAULT_EXPENSES_STATE,
  normalizeExpenseInputs,
  normalizeExpensesState,
} from "../../expensesModel";
import {
  buildIncomeDirectedContributions,
  DEFAULT_PROJECTION_STATE,
  normalizeProjectionInputs,
  normalizeProjectionState,
} from "../../projectionState";
import { calculateProjection, type ProjectionResults } from "../../projectionCalculation";
import { roundTo } from "../../format";
import { DEFAULT_CONFIG, normalizeConfig, type TaxConfig } from "../../taxConfig";
import { type ProjectionRow } from "../../projectionUtils";
import { type RsuInputItem } from "../../incomeModel";

type RetirementInputs = {
  employee401k?: number;
  employerMatch?: number;
  iraContribution?: number;
  megaBackdoor?: number;
  hsaContribution?: number;
};

type AllocationInput = number | { amount?: number; growth?: number; value?: number };

type AccountInput = {
  id: string;
  name: string;
  taxTreatment?: AssetTaxTreatment;
  balance?: number;
  annualContribution?: number;
  growth?: number;
  basis?: number;
};

export type ProjectionScenarioOptions = {
  salary?: number;
  annualTakeHome?: number;
  annualMortgage?: number;
  annualExpenses?: number;
  homePrice?: number;
  currentEquity?: number;
  rsuValue?: number;
  retirement?: RetirementInputs;
  accounts?: AccountInput[];
  allocations?: Record<string, AllocationInput>;
  horizonYears?: number;
  currentYear?: number;
  assetGrowthRate?: number;
  expenseGrowthRate?: number;
  takeHomeGrowthRate?: number;
  homeAppreciationRate?: number;
  rsuStockGrowthRate?: number;
  includeVestedRsusInNetWorth?: boolean;
  mortgageFundingBucketId?: string;
  taxConfig?: Partial<TaxConfig>;
};

type ProjectionScenarioRun = {
  scenario: {
    incomeSummary: ReturnType<typeof createIncomeSummary>;
    mortgageSummary: ReturnType<typeof createMortgageSummary>;
    assetsState: ReturnType<typeof createAssetsState>;
    expensesState: ReturnType<typeof createExpensesState>;
    projectionState: ReturnType<typeof createProjectionState>;
    taxConfig: TaxConfig;
  };
  taxConfig: TaxConfig;
  assetInputs: ReturnType<typeof normalizeAssetInputs>;
  expenseInputs: ReturnType<typeof normalizeExpenseInputs>;
  projectionInputs: ReturnType<typeof normalizeProjectionInputs>;
  results: ProjectionResults;
  getYear: (year: number) => ProjectionRow;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const RETIREMENT_ACCOUNTS: Record<string, { id: string; name: string; taxTreatment: AssetTaxTreatment }> = {
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

function labelFromId(id: string) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeAllocationEntry(allocation: AllocationInput) {
  if (allocation && typeof allocation === "object" && "amount" in allocation) {
    return {
      amount: roundTo(Number(allocation.amount) || 0, 2),
      growth: roundTo(Number(allocation.growth) || 0, 2),
    };
  }

  return {
    amount: roundTo(Number(typeof allocation === "number" ? allocation : allocation?.value) || 0, 2),
    growth: 0,
  };
}

function createProjectionRsuItems(rsuValue: number): RsuInputItem[] {
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

function createAccount({
  id,
  name,
  taxTreatment = "none",
  balance = 0,
  annualContribution = 0,
  growth = 0,
  basis,
}: {
  id: string;
  name: string;
  taxTreatment?: AssetTaxTreatment;
  balance?: number;
  annualContribution?: number;
  growth?: number;
  basis?: number;
}): AssetBucketState {
  const startingBalance = roundTo(balance, 2);
  const effectiveBasis = basis ?? (taxTreatment === "none" ? startingBalance : 0);

  return {
    id,
    taxTreatment,
    name,
    current: startingBalance,
    contribution: roundTo(annualContribution, 2),
    growth,
    basis: taxTreatment === "none" ? roundTo(effectiveBasis, 2) : null,
    detailsOpen: false,
  };
}

function ensureRetirementAccounts(accounts: AssetBucketState[], retirement: Required<RetirementInputs>) {
  const nextAccounts = [...accounts];
  const retirementContributions = {
    retirementBucketId: retirement.employee401k + retirement.employerMatch,
    iraBucketId: retirement.iraContribution,
    megaBucketId: retirement.megaBackdoor,
    hsaBucketId: retirement.hsaContribution,
  } satisfies Record<keyof typeof RETIREMENT_ACCOUNTS, number>;

  Object.entries(retirementContributions).forEach(([destinationKey, amount]) => {
    if (amount <= 0) {
      return;
    }

    const defaultAccount = RETIREMENT_ACCOUNTS[destinationKey as keyof typeof RETIREMENT_ACCOUNTS];
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

function createIncomeSummary({
  salary = 150000,
  annualTakeHome = 100000,
  retirement = {},
  rsuValue = 0,
}: {
  salary?: number;
  annualTakeHome?: number;
  retirement?: RetirementInputs;
  rsuValue?: number;
}) {
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

function createMortgageSummary({
  annualMortgage = 0,
  homePrice = 0,
  currentEquity = 0,
}: {
  annualMortgage?: number;
  homePrice?: number;
  currentEquity?: number;
}) {
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
            amount: roundTo(annualExpenses, 2),
            frequency: "annual",
            oneOffYear: null,
            growthRate: null,
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
}: ProjectionScenarioOptions) {
  const normalizedAllocations = Object.fromEntries(
    Object.entries(allocations).map(([bucketId, allocation]) => {
      const { amount } = normalizeAllocationEntry(allocation);
      return [
        bucketId,
        {
          mode: "percent",
          value: amount,
        },
      ];
    }),
  );

  return {
    ...DEFAULT_PROJECTION_STATE,
    horizonYears,
    currentYear,
    assetGrowthRate,
    expenseGrowthRate,
    takeHomeGrowthRate,
    homeAppreciationRate,
    rsuStockGrowthRate,
    includeVestedRsusInNetWorth,
    mortgageFundingBucketId,
    allocations: normalizedAllocations,
  };
}

function createAssetsState(
  accounts: AccountInput[],
  retirement: Required<RetirementInputs>,
  allocations: Record<string, AllocationInput>,
) {
  const nextAccounts = ensureRetirementAccounts(
    accounts.map((account) => createAccount(account)),
    retirement,
  );
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;

  if (!nextAccounts.some((account) => account.id === reserveCashBucketId)) {
    nextAccounts.unshift(
      createAccount({
        id: reserveCashBucketId,
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
  accounts = [{ id: "taxable-bucket", name: "Taxable" }],
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
}: ProjectionScenarioOptions = {}): ProjectionScenarioRun {
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

  const fallbackAssetsState = DEFAULT_ASSETS_STATE;
  const fallbackExpensesState = DEFAULT_EXPENSES_STATE;
  const fallbackProjectionState = DEFAULT_PROJECTION_STATE;

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
      const snapshot = results.projection.find((row) => row.year === year);
      if (!snapshot) {
        throw new Error(`Missing projection year ${year}`);
      }
      return snapshot;
    },
  };
}
