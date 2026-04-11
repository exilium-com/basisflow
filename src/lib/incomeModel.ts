import { clamp, readNumber, roundTo } from "./format";
import { computeProgressiveTax, getTaxDeductions, type TaxConfig } from "./taxConfig";

export type SalaryFrequency = "annual" | "monthly";

export type SalaryInputItem = {
  id?: string;
  name?: string;
  amount: number;
  frequency: SalaryFrequency;
};

export type RsuInputItem = {
  id?: string;
  name?: string;
  grantAmount: number;
  refresherAmount: number;
  vestingYears: number;
};

export type SalaryItem = {
  id: string;
  type: "salary";
  name: string;
  amount: number | null;
  frequency: SalaryFrequency;
  detailsOpen: boolean;
};

export type RsuItem = {
  id: string;
  type: "rsu";
  name: string;
  grantAmount: number | null;
  refresherAmount: number | null;
  vestingYears: number | null;
  detailsOpen: boolean;
};

export type IncomeItem = SalaryItem | RsuItem;

export type Income = {
  incomeItems: IncomeItem[];
  employee401k: number;
  matchRate: number;
  iraContribution: number;
  megaBackdoor: number;
  hsaContribution: number;
};

export type ResolvedIncome = {
  grossSalary: number;
  rsuGrossNextYear: number;
  employee401k: number;
  matchRate: number;
  iraContribution: number;
  megaBackdoor: number;
  hsaContribution: number;
  mortgageInterest: number;
  propertyTax: number;
  rsuItems: RsuInputItem[];
};

export type IncomeSummary = ResolvedIncome & {
  annualTakeHome: number;
  monthlyTakeHome: number;
  federalTax: number;
  californiaTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  caSdi: number;
  totalTaxes: number;
  employerMatch: number;
  rsuNetNextYear: number;
};

export const DEFAULT_RESOLVED_INCOME: ResolvedIncome = {
  grossSalary: 0,
  rsuGrossNextYear: 0,
  employee401k: 0,
  matchRate: 50,
  iraContribution: 0,
  megaBackdoor: 0,
  hsaContribution: 0,
  mortgageInterest: 0,
  propertyTax: 0,
  rsuItems: [],
};

const INCOME_NUMBER_FIELDS = [
  "employee401k",
  "matchRate",
  "iraContribution",
  "megaBackdoor",
  "hsaContribution",
] as const satisfies ReadonlyArray<keyof Income>;

export const DEFAULT_INCOME: Income = {
  incomeItems: [
    {
      id: crypto.randomUUID(),
      type: "salary",
      name: "Salary",
      amount: 150000,
      frequency: "annual",
      detailsOpen: false,
    },
  ],
  employee401k: 0,
  matchRate: 50,
  iraContribution: 0,
  megaBackdoor: 0,
  hsaContribution: 0,
};

export const DEFAULT_INCOME_SUMMARY: IncomeSummary = {
  ...DEFAULT_RESOLVED_INCOME,
  annualTakeHome: 0,
  monthlyTakeHome: 0,
  federalTax: 0,
  californiaTax: 0,
  socialSecurityTax: 0,
  medicareTax: 0,
  additionalMedicareTax: 0,
  caSdi: 0,
  totalTaxes: 0,
  employerMatch: 0,
  rsuNetNextYear: 0,
};

export type IncomeTaxes = ReturnType<typeof computeAnnualTaxes>;
export type IncomeResults = ReturnType<typeof calculateIncome>;

export function createResolvedIncome(overrides: Partial<ResolvedIncome> = {}): ResolvedIncome {
  return {
    ...DEFAULT_RESOLVED_INCOME,
    ...overrides,
    rsuItems: overrides.rsuItems ?? DEFAULT_RESOLVED_INCOME.rsuItems,
  };
}

export function createIncomeSummary(overrides: Partial<IncomeSummary> = {}): IncomeSummary {
  return {
    ...DEFAULT_INCOME_SUMMARY,
    ...overrides,
    rsuItems: overrides.rsuItems ?? DEFAULT_INCOME_SUMMARY.rsuItems,
  };
}

function annualizeSalary(amount: number, frequency: SalaryFrequency = "annual") {
  const safeAmount = Math.max(0, amount);
  return frequency === "monthly" ? safeAmount * 12 : safeAmount;
}

export function normalizeIncomeItem(item: unknown): IncomeItem {
  const candidate = typeof item === "object" && item ? (item as Record<string, unknown>) : {};

  if (candidate.type === "rsu") {
    return {
      id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
      type: "rsu",
      name: typeof candidate.name === "string" ? candidate.name : "RSU grant",
      grantAmount: readNumber(candidate.grantAmount, null),
      refresherAmount: readNumber(candidate.refresherAmount, null),
      vestingYears: readNumber(candidate.vestingYears, null) ?? 4,
      detailsOpen: Boolean(candidate.detailsOpen),
    };
  }

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    type: "salary",
    name: typeof candidate.name === "string" ? candidate.name : "Salary",
    amount: readNumber(candidate.amount, null),
    frequency: candidate.frequency === "monthly" ? "monthly" : "annual",
    detailsOpen: Boolean(candidate.detailsOpen),
  };
}

export function normalizeIncome(parsed: unknown, fallback: Income): Income {
  const income = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const numericState = Object.fromEntries(
    INCOME_NUMBER_FIELDS.map((field) =>
      field === "megaBackdoor"
        ? [field, readNumber(income.megaBackdoor ?? income.megaBackdoorInput, fallback.megaBackdoor)]
        : [field, readNumber(income[field], fallback[field])],
    ),
  ) as Pick<Income, (typeof INCOME_NUMBER_FIELDS)[number]>;

  return {
    ...fallback,
    ...numericState,
    incomeItems:
      Array.isArray(income.incomeItems) && income.incomeItems.length > 0
        ? income.incomeItems.map((item) => normalizeIncomeItem(item))
        : fallback.incomeItems.map((item) => normalizeIncomeItem(item)),
  };
}

function averageGrowthFactor(growthRate: number, startYearOffset: number) {
  const effectiveGrowth = Math.max(-0.99, growthRate);
  if (effectiveGrowth === 0) {
    return 1;
  }

  const growthBase = 1 + effectiveGrowth;
  return (Math.pow(growthBase, startYearOffset + 1) - Math.pow(growthBase, startYearOffset)) / Math.log(growthBase);
}

export function computeFica(grossSalary: number) {
  const ficaWages = Math.max(0, grossSalary);
  const socialSecurityWageBase = 184500;
  const socialSecurity = roundTo(Math.min(ficaWages, socialSecurityWageBase) * 0.062, 2);
  const medicare = roundTo(ficaWages * 0.0145, 2);
  const additionalMedicare = roundTo(Math.max(0, ficaWages - 200000) * 0.009, 2);

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    total: roundTo(socialSecurity + medicare + additionalMedicare, 2),
  };
}

export function getAnnualSalaryTotal(salaryItems: SalaryInputItem[] = []) {
  return salaryItems.reduce((sum, item) => sum + annualizeSalary(item.amount, item.frequency), 0);
}

export function toSalaryInputs(items: IncomeItem[]): SalaryInputItem[] {
  return items
    .filter((item): item is SalaryItem => item.type === "salary")
    .map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount ?? 0,
      frequency: item.frequency,
    }));
}

export function toRsuInputs(items: IncomeItem[]): RsuInputItem[] {
  return items
    .filter((item): item is RsuItem => item.type === "rsu")
    .map((item) => ({
      id: item.id,
      name: item.name,
      grantAmount: item.grantAmount ?? 0,
      refresherAmount: item.refresherAmount ?? 0,
      vestingYears: item.vestingYears ?? 4,
    }));
}

export function resolveIncome(
  income: Income,
  overrides: Partial<Pick<ResolvedIncome, "mortgageInterest" | "propertyTax" | "rsuGrossNextYear">> = {},
) {
  const salaryItems = toSalaryInputs(income.incomeItems);
  const rsuItems = toRsuInputs(income.incomeItems);

  return createResolvedIncome({
    grossSalary: getAnnualSalaryTotal(salaryItems),
    rsuGrossNextYear: overrides.rsuGrossNextYear ?? computeRsuGrossForItems(rsuItems, 0),
    employee401k: income.employee401k,
    matchRate: income.matchRate,
    iraContribution: income.iraContribution,
    megaBackdoor: income.megaBackdoor,
    hsaContribution: income.hsaContribution,
    mortgageInterest: overrides.mortgageInterest ?? 0,
    propertyTax: overrides.propertyTax ?? 0,
    rsuItems,
  });
}

export function computeSavings(income: ResolvedIncome, taxConfig: TaxConfig) {
  const matchRate = clamp(income.matchRate / 100, 0, 5);
  const employee401k = Math.max(0, income.employee401k);
  const iraContribution = Math.max(0, income.iraContribution);
  const annualAdditions = Math.max(0, taxConfig.annualAdditionsLimit);
  const employerMatch = employee401k * matchRate;
  const availableMegaRoom = Math.max(0, annualAdditions - employee401k - employerMatch);
  const megaBackdoor = clamp(Math.max(0, income.megaBackdoor), 0, availableMegaRoom);

  return {
    employerMatch,
    megaBackdoor,
    iraContribution,
    availableMegaRoom,
  };
}

export function computeAnnualTaxes(income: ResolvedIncome, taxConfig: TaxConfig, extraOrdinaryIncome = 0) {
  const grossIncome = Math.max(0, income.grossSalary + extraOrdinaryIncome);
  const californiaAdjustedGross = Math.max(0, grossIncome - income.employee401k);
  const stateDeductions = getTaxDeductions(taxConfig, income);
  const californiaTaxableIncome = Math.max(0, californiaAdjustedGross - stateDeductions.stateDeduction);
  const californiaTax = computeProgressiveTax(californiaTaxableIncome, taxConfig.stateBrackets);

  const federalAdjustedGross = Math.max(0, grossIncome - income.employee401k - income.hsaContribution);
  const federalDeductions = getTaxDeductions(taxConfig, income, californiaTax);
  const federalTaxableIncome = Math.max(0, federalAdjustedGross - federalDeductions.federalDeduction);
  const federalTax = computeProgressiveTax(federalTaxableIncome, taxConfig.federalBrackets);

  const fica = computeFica(grossIncome);
  const caSdi = roundTo(grossIncome * (taxConfig.caSdiRate / 100), 2);

  return {
    federalTaxableIncome,
    californiaTaxableIncome,
    federalTax,
    californiaTax,
    fica,
    caSdi,
    totalTaxes: roundTo(federalTax + californiaTax + fica.total + caSdi, 2),
  };
}

export function computeIncrementalTakeHome(
  income: ResolvedIncome,
  taxConfig: TaxConfig,
  extraOrdinaryIncome: number,
) {
  const safeExtra = Math.max(0, extraOrdinaryIncome);
  if (safeExtra <= 0) {
    return 0;
  }

  const baseTaxes = computeAnnualTaxes(income, taxConfig, 0).totalTaxes;
  const extraTaxes = computeAnnualTaxes(income, taxConfig, safeExtra).totalTaxes;
  return roundTo(safeExtra - (extraTaxes - baseTaxes), 2);
}

export function computeRsuGrossForYear(
  rsus: RsuInputItem,
  yearIndex: number,
  stockGrowthRate = 0,
  refresherGrowthRate = 0,
) {
  const grantAmount = Math.max(0, rsus.grantAmount);
  const refresherAmount = Math.max(0, rsus.refresherAmount);
  const vestYears = Math.max(1, Math.round(rsus.vestingYears));

  let total = 0;
  if (grantAmount > 0 && yearIndex < vestYears) {
    total += (grantAmount / vestYears) * averageGrowthFactor(stockGrowthRate, yearIndex);
  }

  for (let refresherIndex = 1; refresherIndex <= yearIndex; refresherIndex += 1) {
    if (yearIndex - refresherIndex >= vestYears || refresherAmount <= 0) {
      continue;
    }
    const grownRefresherAmount = refresherAmount * Math.pow(1 + refresherGrowthRate, refresherIndex - 1);
    total += (grownRefresherAmount / vestYears) * averageGrowthFactor(stockGrowthRate, yearIndex - refresherIndex);
  }

  return total;
}

export function computeRsuGrossForItems(
  rsuItems: RsuInputItem[] = [],
  yearIndex: number,
  stockGrowthRate = 0,
  refresherGrowthRate = 0,
) {
  return rsuItems.reduce(
    (sum, rsu) => sum + computeRsuGrossForYear(rsu, yearIndex, stockGrowthRate, refresherGrowthRate),
    0,
  );
}

export function calculateIncome(income: ResolvedIncome, taxConfig: TaxConfig) {
  const grossSalary = Math.max(0, income.grossSalary);
  const rsuGrossNextYear = Math.max(0, income.rsuGrossNextYear);
  const savings = computeSavings(income, taxConfig);
  const taxableIncome = createResolvedIncome({ ...income, grossSalary });
  const salaryTaxes = computeAnnualTaxes(taxableIncome, taxConfig, 0);
  const totalTaxes = computeAnnualTaxes(taxableIncome, taxConfig, rsuGrossNextYear);
  const annualTakeHome = roundTo(
    grossSalary -
      taxableIncome.employee401k -
      taxableIncome.hsaContribution -
      savings.iraContribution -
      savings.megaBackdoor -
      salaryTaxes.totalTaxes,
    2,
  );
  const rsuNetNextYear = computeIncrementalTakeHome(taxableIncome, taxConfig, rsuGrossNextYear);

  return {
    ...savings,
    federalTax: totalTaxes.federalTax,
    californiaTax: totalTaxes.californiaTax,
    fica: totalTaxes.fica,
    caSdi: totalTaxes.caSdi,
    totalTaxes: totalTaxes.totalTaxes,
    grossSalary,
    annualTakeHome,
    monthlyTakeHome: roundTo(annualTakeHome / 12, 2),
    rsuGrossNextYear,
    rsuNetNextYear,
  };
}

export function buildIncomeSummary(income: ResolvedIncome, results: IncomeResults): IncomeSummary {
  return createIncomeSummary({
    ...income,
    grossSalary: results.grossSalary,
    annualTakeHome: results.annualTakeHome,
    monthlyTakeHome: results.monthlyTakeHome,
    federalTax: results.federalTax,
    californiaTax: results.californiaTax,
    socialSecurityTax: results.fica.socialSecurity,
    medicareTax: results.fica.medicare,
    additionalMedicareTax: results.fica.additionalMedicare,
    caSdi: results.caSdi,
    totalTaxes: results.totalTaxes,
    employerMatch: results.employerMatch,
    rsuGrossNextYear: results.rsuGrossNextYear,
    rsuNetNextYear: results.rsuNetNextYear,
    megaBackdoor: results.megaBackdoor,
  });
}
