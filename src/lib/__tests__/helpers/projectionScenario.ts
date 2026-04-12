import {
  DEFAULT_ASSETS_STATE,
  PINNED_BUCKETS,
  buildIncomeDirectedContributions,
  createAssets,
  normalizeAssetsState,
  type AssetBucketState,
  type AssetTaxTreatment,
} from "../../assetsModel";
import { DEFAULT_EXPENSES_STATE, createExpenses, normalizeExpensesState } from "../../expensesModel";
import { DEFAULT_PROJECTION_STATE, createProjection, normalizeProjectionState } from "../../projectionState";
import { calculateProjection, type ProjectionResults } from "../../projectionCalculation";
import { roundTo } from "../../format";
import { DEFAULT_CONFIG, normalizeConfig, type TaxConfig } from "../../taxConfig";
import { type ProjectionRow } from "../../projectionUtils";
import { buildIncomeSummary, calculateIncome, createResolvedIncome, type RsuInputItem } from "../../incomeModel";
import { MortgageSummary } from "../../mortgagePage";

type RetirementInputs = {
  employee401k?: number;
  employerMatch?: number;
  iraContribution?: number;
  megaBackdoor?: number;
  hsaContribution?: number;
};

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
  annualMortgage?: number;
  housingKind?: "conventional" | "rent";
  rentGrowthRate?: number;
  yearlyLoan?: Array<{ year: number; payment?: number; principal?: number; interest: number; endingBalance?: number }>;
  annualExpenses?: number;
  homePrice?: number;
  currentEquity?: number;
  rsuValue?: number;
  retirement?: RetirementInputs;
  accounts?: AccountInput[];
  freeCashFlowBucketId?: string;
  horizonYears?: number;
  currentYear?: number;
  assetGrowthRate?: number;
  expenseGrowthRate?: number;
  incomeGrowthRate?: number;
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
  assets: ReturnType<typeof createAssets>;
  expenses: ReturnType<typeof createExpenses>;
  projection: ReturnType<typeof createProjection>;
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
  retirement = {},
  rsuValue = 0,
  taxConfig = DEFAULT_CONFIG,
}: {
  salary?: number;
  retirement?: RetirementInputs;
  rsuValue?: number;
  taxConfig?: TaxConfig;
}) {
  const {
    employee401k = 0,
    employerMatch = 0,
    iraContribution = 0,
    megaBackdoor = 0,
    hsaContribution = 0,
  } = retirement;

  const income = createResolvedIncome({
    grossSalary: salary,
    employee401k,
    matchRate: employee401k > 0 ? (employerMatch / employee401k) * 100 : 0,
    iraContribution,
    megaBackdoor,
    hsaContribution,
    rsuItems: createProjectionRsuItems(rsuValue),
    rsuGrossNextYear: roundTo(rsuValue, 2),
  });
  const results = calculateIncome(income, taxConfig);

  return buildIncomeSummary(income, results);
}

function createMortgageSummary({
  housingKind = "conventional",
  annualMortgage = 0,
  rentGrowthRate = 0,
  homePrice = 0,
  currentEquity = 0,
  yearlyLoan = [],
}: {
  housingKind?: "conventional" | "rent";
  annualMortgage?: number;
  rentGrowthRate?: number;
  homePrice?: number;
  currentEquity?: number;
  yearlyLoan?: Array<{
    year: number;
    payment?: number;
    principal?: number;
    interest: number;
    averageBalance?: number;
    endingBalance?: number;
  }>;
}) {
  const defaultYearlyLoan: Array<{
    year: number;
    payment?: number;
    principal?: number;
    interest: number;
    averageBalance?: number;
    endingBalance?: number;
  }> = Array.from({ length: 60 }, (_, index) => ({
    year: index + 1,
    interest: 0,
  }));
  const normalizedYearlyLoan =
    housingKind === "rent"
      ? []
      : (yearlyLoan.length ? yearlyLoan : defaultYearlyLoan).map((row) => ({
          year: row.year,
          payment: row.payment ?? roundTo(annualMortgage / 12, 2),
          principal: row.principal ?? 0,
          interest: row.interest,
          averageBalance: row.averageBalance ?? row.endingBalance ?? 0,
          endingBalance: row.endingBalance ?? 0,
        }));

  return {
    type: housingKind === "rent" ? "rent" : "loan",
    kind: housingKind,
    typeLabel: housingKind === "rent" ? "Rent" : "Conventional",
    isArm: false,
    rentGrowthRate,
    loanAmount: roundTo(Math.max(0, homePrice - currentEquity), 2),
    totalMonthlyPayment: roundTo(annualMortgage / 12, 2),
    principalInterest: roundTo(annualMortgage / 12, 2),
    monthlyTax: 0,
    monthlyInsurance: 0,
    monthlyHoa: 0,
    totalInterest: normalizedYearlyLoan.reduce((sum, row) => sum + row.interest, 0),
    currentEquity: housingKind === "rent" ? 0 : roundTo(currentEquity, 2),
    homePrice: roundTo(homePrice, 2),
    yearlyLoan: normalizedYearlyLoan,
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
  incomeGrowthRate = 0,
  homeAppreciationRate = 0,
  rsuStockGrowthRate = 0,
  includeVestedRsusInNetWorth = false,
  freeCashFlowBucketId = "",
  mortgageFundingBucketId = "",
}: ProjectionScenarioOptions) {
  return {
    ...DEFAULT_PROJECTION_STATE,
    horizonYears,
    currentYear,
    assetGrowthRate,
    expenseGrowthRate,
    incomeGrowthRate,
    homeAppreciationRate,
    rsuStockGrowthRate,
    includeVestedRsusInNetWorth,
    freeCashFlowBucketId,
    mortgageFundingBucketId,
  };
}

function createAssetsState(accounts: AccountInput[], retirement: Required<RetirementInputs>) {
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

  return {
    buckets: nextAccounts,
  };
}

export function runProjectionScenario({
  salary = 150000,
  annualMortgage = 0,
  housingKind = "conventional",
  rentGrowthRate = 0,
  yearlyLoan = [],
  annualExpenses = 0,
  homePrice = 0,
  currentEquity = 0,
  rsuValue = 0,
  retirement = {},
  accounts = [{ id: "taxable-bucket", name: "Taxable" }],
  freeCashFlowBucketId = "",
  horizonYears = 5,
  currentYear = 1,
  assetGrowthRate = 0,
  expenseGrowthRate = 0,
  incomeGrowthRate = 0,
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
      retirement: normalizedRetirement,
      rsuValue,
      taxConfig: normalizeConfig(clone(taxConfig)),
    }),
    mortgageSummary: createMortgageSummary({
      housingKind,
      annualMortgage,
      rentGrowthRate,
      homePrice,
      currentEquity,
      yearlyLoan,
    }),
    assetsState: createAssetsState(accounts, normalizedRetirement),
    expensesState: createExpensesState(annualExpenses),
    projectionState: createProjectionState({
      horizonYears,
      currentYear,
      assetGrowthRate,
      expenseGrowthRate,
      incomeGrowthRate,
      homeAppreciationRate,
      rsuStockGrowthRate,
      includeVestedRsusInNetWorth,
      freeCashFlowBucketId,
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

  const assets = createAssets(assetsState, projectionState.assetGrowthRate);
  const expenses = createExpenses(expensesState, projectionState.expenseGrowthRate);
  const projection = createProjection(projectionState);
  const results = calculateProjection({
    incomeSummary: scenario.incomeSummary,
    mortgageSummary: scenario.mortgageSummary as MortgageSummary,
    assets,
    expenses,
    projection,
    taxConfig: scenario.taxConfig,
  });

  return {
    scenario,
    taxConfig: scenario.taxConfig,
    assets,
    expenses,
    projection,
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
