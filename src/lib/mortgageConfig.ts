import { percent, readNumber } from "./format";

export type LoanType = "fixed30" | "arm76" | "arm106";
export type MortgageDownPaymentMode = "percent" | "dollar";
export type MortgageLoanKind = "fixed" | "arm";
export type MortgageLoanField = "rate" | "term" | "initialRate" | "adjustedRate";

type FixedLoanOption = {
  type: LoanType;
  label: string;
  kind: "fixed";
  defaults: {
    term: number;
    rate: number;
  };
  fixedYears?: undefined;
};

type ArmLoanOption = {
  type: LoanType;
  label: string;
  kind: "arm";
  fixedYears: number;
  defaults: {
    term: number;
    initialRate: number;
    adjustedRate: number;
  };
};

export type LoanOption = FixedLoanOption | ArmLoanOption;
export type MortgageLoanState = Partial<Record<MortgageLoanField, number | null>>;

export type MortgageLoan =
  | {
      kind: "fixed";
      label: string;
      term: number;
      rate: number;
    }
  | {
      kind: "arm";
      label: string;
      term: number;
      fixedYears: number;
      initialRate: number;
      adjustedRate: number;
    };

export type MortgageState = {
  homePrice: number;
  downPaymentMode: MortgageDownPaymentMode;
  downPayment: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  advancedOpen: boolean;
  activeLoanType: LoanType;
  compareLoanType: LoanType;
  loanOptions: Record<LoanType, MortgageLoanState>;
};

function buildDefaultLoanOptions(): Record<LoanType, MortgageLoanState> {
  return {
    fixed30: { rate: 6.475, term: 30 },
    arm76: { initialRate: 5.635, adjustedRate: null, term: 30 },
    arm106: { initialRate: 5.875, adjustedRate: null, term: 30 },
  };
}

export type Mortgage = {
  homePrice: number;
  downPaymentMode: MortgageDownPaymentMode;
  downPaymentInput: number;
  downPaymentAmount: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  activeLoanType: LoanType;
  compareLoanType: LoanType;
  loanOptions: Record<LoanType, MortgageLoan>;
};

export const LOAN_OPTIONS: LoanOption[] = [
  {
    type: "fixed30",
    label: "30-year fixed",
    kind: "fixed",
    defaults: { term: 30, rate: 6.475 },
  },
  {
    type: "arm76",
    label: "7/1 ARM",
    kind: "arm",
    fixedYears: 7,
    defaults: { term: 30, initialRate: 5.635, adjustedRate: 7.135 },
  },
  {
    type: "arm106",
    label: "10/1 ARM",
    kind: "arm",
    fixedYears: 10,
    defaults: { term: 30, initialRate: 5.875, adjustedRate: 7.375 },
  },
];

export const MORTGAGE_DEFAULTS = {
  homePrice: 800000,
  downPaymentPercent: 20,
  propertyTaxRate: 1.18,
  insurancePerYear: 1800,
  hoaPerMonth: 0,
};

export const DEFAULT_ACTIVE_LOAN = LOAN_OPTIONS[0].type;
export const DEFAULT_COMPARE_LOAN = LOAN_OPTIONS[1].type;
const MORTGAGE_NUMBER_FIELDS = [
  "homePrice",
  "downPayment",
  "propertyTaxRate",
  "insurancePerYear",
  "hoaPerMonth",
] as const satisfies ReadonlyArray<keyof MortgageState>;

export const DEFAULT_MORTGAGE_STATE: MortgageState = {
  homePrice: MORTGAGE_DEFAULTS.homePrice,
  downPaymentMode: "percent",
  downPayment: MORTGAGE_DEFAULTS.downPaymentPercent,
  propertyTaxRate: MORTGAGE_DEFAULTS.propertyTaxRate,
  insurancePerYear: MORTGAGE_DEFAULTS.insurancePerYear,
  hoaPerMonth: MORTGAGE_DEFAULTS.hoaPerMonth,
  advancedOpen: false,
  activeLoanType: DEFAULT_ACTIVE_LOAN,
  compareLoanType: DEFAULT_COMPARE_LOAN,
  loanOptions: buildDefaultLoanOptions(),
};

function normalizeLoanOptionState(
  option: LoanOption,
  rawLoanState: Record<string, unknown>,
  fallbackLoanState: MortgageLoanState,
): MortgageLoanState {
  if (option.kind === "fixed") {
    return {
      rate: rawLoanState.rate == null ? fallbackLoanState.rate ?? null : readNumber(rawLoanState.rate, null),
      term: rawLoanState.term == null ? fallbackLoanState.term ?? null : readNumber(rawLoanState.term, null),
    };
  }

  return {
    initialRate:
      rawLoanState.initialRate == null
        ? fallbackLoanState.initialRate ?? null
        : readNumber(rawLoanState.initialRate, null),
    adjustedRate:
      rawLoanState.adjustedRate == null
        ? fallbackLoanState.adjustedRate ?? null
        : readNumber(rawLoanState.adjustedRate, null),
    term: rawLoanState.term == null ? fallbackLoanState.term ?? null : readNumber(rawLoanState.term, null),
  };
}

function createMortgageLoan(option: LoanOption, loanState: MortgageLoanState): MortgageLoan {
  const term = Math.max(1, Math.round(loanState.term ?? option.defaults.term));

  if (option.kind === "fixed") {
    return {
      kind: "fixed",
      label: option.label,
      term,
      rate: loanState.rate ?? option.defaults.rate,
    };
  }

  const initialRate = loanState.initialRate ?? option.defaults.initialRate;

  return {
    kind: "arm",
    label: option.label,
    term,
    fixedYears: option.fixedYears,
    initialRate,
    adjustedRate: loanState.adjustedRate ?? initialRate,
  };
}

export function normalizeMortgageState(parsed: unknown, fallback: MortgageState): MortgageState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const rawLoanOptions =
    typeof state.loanOptions === "object" && state.loanOptions ? (state.loanOptions as Record<string, unknown>) : {};
  const numericState = Object.fromEntries(
    MORTGAGE_NUMBER_FIELDS.map((field) => [field, readNumber(state[field], fallback[field])]),
  ) as Pick<MortgageState, (typeof MORTGAGE_NUMBER_FIELDS)[number]>;
  const loanOptions = Object.fromEntries(
    LOAN_OPTIONS.map((option) => {
      const rawLoanState =
        typeof rawLoanOptions[option.type] === "object" && rawLoanOptions[option.type]
          ? (rawLoanOptions[option.type] as Record<string, unknown>)
          : {};
      const fallbackLoanState = { ...option.defaults, ...fallback.loanOptions[option.type] };

      return [option.type, normalizeLoanOptionState(option, rawLoanState, fallbackLoanState)];
    }),
  ) as Record<LoanType, MortgageLoanState>;

  return {
    ...fallback,
    ...numericState,
    downPaymentMode: state.downPaymentMode === "dollar" ? "dollar" : "percent",
    advancedOpen: Boolean(state.advancedOpen),
    activeLoanType: LOAN_OPTIONS.some((option) => option.type === state.activeLoanType)
      ? (state.activeLoanType as LoanType)
      : fallback.activeLoanType,
    compareLoanType: LOAN_OPTIONS.some((option) => option.type === state.compareLoanType)
      ? (state.compareLoanType as LoanType)
      : fallback.compareLoanType,
    loanOptions,
  };
}

export function createMortgage(state: MortgageState = DEFAULT_MORTGAGE_STATE): Mortgage {
  const homePrice = Math.max(0, state.homePrice ?? MORTGAGE_DEFAULTS.homePrice);
  const downPaymentMode = state.downPaymentMode === "dollar" ? "dollar" : "percent";
  const downPaymentInput = Math.max(0, state.downPayment ?? MORTGAGE_DEFAULTS.downPaymentPercent);

  return {
    homePrice,
    downPaymentMode,
    downPaymentInput,
    downPaymentAmount: downPaymentMode === "percent" ? (homePrice * downPaymentInput) / 100 : downPaymentInput,
    propertyTaxRate: Math.max(0, state.propertyTaxRate ?? MORTGAGE_DEFAULTS.propertyTaxRate),
    insurancePerYear: Math.max(0, state.insurancePerYear ?? MORTGAGE_DEFAULTS.insurancePerYear),
    hoaPerMonth: Math.max(0, state.hoaPerMonth ?? MORTGAGE_DEFAULTS.hoaPerMonth),
    activeLoanType: state.activeLoanType,
    compareLoanType: state.compareLoanType,
    loanOptions: Object.fromEntries(
      LOAN_OPTIONS.map((option) => {
        return [option.type, createMortgageLoan(option, state.loanOptions[option.type] ?? {})];
      }),
    ) as Record<LoanType, MortgageLoan>,
  };
}

export function getMortgageLoanMeta(loanOption: MortgageLoan) {
  if (loanOption.kind === "arm") {
    return Math.abs(loanOption.adjustedRate - loanOption.initialRate) < 0.0005
      ? `${percent(loanOption.initialRate, 3)} / ${Math.round(loanOption.term)}y`
      : `${percent(loanOption.initialRate, 3)} to ${percent(loanOption.adjustedRate, 3)} / ${Math.round(loanOption.term)}y`;
  }

  return `${percent(loanOption.rate, 3)} / ${Math.round(loanOption.term)}y`;
}
