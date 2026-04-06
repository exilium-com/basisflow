import { percent, readNumber } from "./format";

export type LoanType = "fixed30" | "arm76" | "arm106";
export type MortgageDownPaymentMode = "percent" | "dollar";
export type MortgageLoanKind = "fixed" | "arm";
export type MortgageLoanField = "rate" | "term" | "initialRate" | "adjustedRate";
export type MortgageAdvancedField = "propertyTaxRate" | "insurancePerYear" | "hoaPerMonth";

type FixedLoanOption = {
  type: LoanType;
  label: string;
  kind: "fixed";
  defaults: {
    term: number;
    rate: number;
  };
  fields: Array<{
    field: "rate" | "term";
    label: string;
    prefix?: string;
    suffix?: string;
    step: string;
    placeholderFrom?: undefined;
  }>;
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
  fields: Array<{
    field: "initialRate" | "adjustedRate" | "term";
    label: string;
    prefix?: string;
    suffix?: string;
    step: string;
    placeholderFrom?: "initialRate";
  }>;
};

export type LoanOption = FixedLoanOption | ArmLoanOption;
export type MortgageLoanState = Partial<Record<MortgageLoanField, number | null>>;

export type MortgageLoanInputs =
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

export type MortgageInputs = {
  homePrice: number;
  downPaymentMode: MortgageDownPaymentMode;
  downPaymentInput: number;
  downPaymentAmount: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  activeLoanType: LoanType;
  compareLoanType: LoanType;
  loanOptions: Record<LoanType, MortgageLoanInputs>;
};

export const LOAN_OPTIONS: LoanOption[] = [
  {
    type: "fixed30",
    label: "30-year fixed",
    kind: "fixed",
    defaults: { term: 30, rate: 6.475 },
    fields: [
      { field: "rate", label: "Interest rate", suffix: "%", step: "0.001" },
      { field: "term", label: "Loan term", suffix: "years", step: "1" },
    ],
  },
  {
    type: "arm76",
    label: "7/1 ARM",
    kind: "arm",
    fixedYears: 7,
    defaults: { term: 30, initialRate: 5.635, adjustedRate: 7.135 },
    fields: [
      { field: "initialRate", label: "Initial rate", suffix: "%", step: "0.001" },
      { field: "adjustedRate", label: "Reset rate", suffix: "%", step: "0.001", placeholderFrom: "initialRate" },
      { field: "term", label: "Loan term", suffix: "years", step: "1" },
    ],
  },
  {
    type: "arm106",
    label: "10/1 ARM",
    kind: "arm",
    fixedYears: 10,
    defaults: { term: 30, initialRate: 5.875, adjustedRate: 7.375 },
    fields: [
      { field: "initialRate", label: "Initial rate", suffix: "%", step: "0.001" },
      { field: "adjustedRate", label: "Reset rate", suffix: "%", step: "0.001", placeholderFrom: "initialRate" },
      { field: "term", label: "Loan term", suffix: "years", step: "1" },
    ],
  },
];

export const MORTGAGE_DEFAULTS = {
  homePrice: 800000,
  downPaymentPercent: 20,
  propertyTaxRate: 1.18,
  insurancePerYear: 1800,
  hoaPerMonth: 0,
};

export const ADVANCED_FIELDS: Array<{
  field: MortgageAdvancedField;
  label: string;
  prefix?: string;
  suffix?: string;
  step: string;
}> = [
  { field: "propertyTaxRate", label: "Property tax rate", suffix: "%", step: "0.001" },
  { field: "insurancePerYear", label: "Home insurance", prefix: "$", suffix: "/ year", step: "1" },
  { field: "hoaPerMonth", label: "HOA", prefix: "$", suffix: "/ month", step: "1" },
];

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

      return [
        option.type,
        Object.fromEntries(
          option.fields.map((field) => [
            field.field,
            rawLoanState[field.field] == null ? fallbackLoanState[field.field] ?? null : readNumber(rawLoanState[field.field], null),
          ]),
        ),
      ];
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

export function buildMortgageInputs(state: MortgageState = DEFAULT_MORTGAGE_STATE): MortgageInputs {
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
        const loanState = state.loanOptions[option.type] ?? {};
        const term = Math.max(1, Math.round(loanState.term ?? option.defaults.term));

        if (option.kind === "fixed") {
          return [
            option.type,
            {
              kind: "fixed",
              label: option.label,
              term,
              rate: loanState.rate ?? option.defaults.rate,
            },
          ];
        }

        const initialRate = loanState.initialRate ?? option.defaults.initialRate;

        return [
          option.type,
          {
            kind: "arm",
            label: option.label,
            term,
            fixedYears: option.fixedYears,
            initialRate,
            adjustedRate: loanState.adjustedRate ?? initialRate,
          },
        ];
      }),
    ) as Record<LoanType, MortgageLoanInputs>,
  };
}

export function getMortgageLoanMeta(loanOption: MortgageLoanInputs) {
  if (loanOption.kind === "arm") {
    return Math.abs(loanOption.adjustedRate - loanOption.initialRate) < 0.0005
      ? `${percent(loanOption.initialRate, 3)} / ${Math.round(loanOption.term)}y`
      : `${percent(loanOption.initialRate, 3)} to ${percent(loanOption.adjustedRate, 3)} / ${Math.round(loanOption.term)}y`;
  }

  return `${percent(loanOption.rate, 3)} / ${Math.round(loanOption.term)}y`;
}
