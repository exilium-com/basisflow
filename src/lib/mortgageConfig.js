import { percent, readNumber } from "./format";

export const LOAN_OPTIONS = [
  {
    type: "fixed30",
    label: "30-year fixed",
    kind: "fixed",
    defaults: { term: 30, rate: 6.475 },
    fields: [
      {
        field: "rate",
        label: "Interest rate",
        suffix: "%",
        step: "0.001",
      },
      {
        field: "term",
        label: "Loan term",
        suffix: "years",
        step: "1",
      },
    ],
  },
  {
    type: "arm76",
    label: "7/1 ARM",
    kind: "arm",
    fixedYears: 7,
    defaults: { term: 30, initialRate: 5.635, adjustedRate: 7.135 },
    fields: [
      {
        field: "initialRate",
        label: "Initial rate",
        suffix: "%",
        step: "0.001",
      },
      {
        field: "adjustedRate",
        label: "Reset rate",
        suffix: "%",
        step: "0.001",
        placeholderFrom: "initialRate",
      },
      {
        field: "term",
        label: "Loan term",
        suffix: "years",
        step: "1",
      },
    ],
  },
  {
    type: "arm106",
    label: "10/1 ARM",
    kind: "arm",
    fixedYears: 10,
    defaults: { term: 30, initialRate: 5.875, adjustedRate: 7.375 },
    fields: [
      {
        field: "initialRate",
        label: "Initial rate",
        suffix: "%",
        step: "0.001",
      },
      {
        field: "adjustedRate",
        label: "Reset rate",
        suffix: "%",
        step: "0.001",
        placeholderFrom: "initialRate",
      },
      {
        field: "term",
        label: "Loan term",
        suffix: "years",
        step: "1",
      },
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

export const ADVANCED_FIELDS = [
  {
    field: "propertyTaxRate",
    label: "Property tax rate",
    suffix: "%",
    step: "0.001",
  },
  {
    field: "insurancePerYear",
    label: "Home insurance",
    prefix: "$",
    suffix: "/ year",
    step: "1",
  },
  {
    field: "hoaPerMonth",
    label: "HOA",
    prefix: "$",
    suffix: "/ month",
    step: "1",
  },
];

export const DEFAULT_ACTIVE_LOAN = LOAN_OPTIONS[0].type;
export const DEFAULT_COMPARE_LOAN = LOAN_OPTIONS[1].type;

export const DEFAULT_MORTGAGE_STATE = {
  homePrice: String(MORTGAGE_DEFAULTS.homePrice),
  downPaymentMode: "percent",
  downPayment: String(MORTGAGE_DEFAULTS.downPaymentPercent),
  propertyTaxRate: String(MORTGAGE_DEFAULTS.propertyTaxRate),
  insurancePerYear: String(MORTGAGE_DEFAULTS.insurancePerYear),
  hoaPerMonth: String(MORTGAGE_DEFAULTS.hoaPerMonth),
  advancedOpen: false,
  activeLoanType: DEFAULT_ACTIVE_LOAN,
  compareLoanType: DEFAULT_COMPARE_LOAN,
  loanOptions: Object.fromEntries(
    LOAN_OPTIONS.map((option) => [
      option.type,
      Object.fromEntries(
        option.fields.map((field) => [
          field.field,
          field.field === "adjustedRate" ? "" : String(option.defaults[field.field]),
        ]),
      ),
    ]),
  ),
};

export function buildMortgageInputs(state = DEFAULT_MORTGAGE_STATE) {
  const homePrice = readNumber(state.homePrice ?? MORTGAGE_DEFAULTS.homePrice, MORTGAGE_DEFAULTS.homePrice);
  const downPaymentMode = state.downPaymentMode === "dollar" ? "dollar" : "percent";
  const downPaymentInput = readNumber(
    state.downPayment ?? MORTGAGE_DEFAULTS.downPaymentPercent,
    MORTGAGE_DEFAULTS.downPaymentPercent,
  );

  return {
    homePrice,
    downPaymentMode,
    downPaymentInput,
    downPaymentAmount: downPaymentMode === "percent" ? (homePrice * downPaymentInput) / 100 : downPaymentInput,
    propertyTaxRate: readNumber(
      state.propertyTaxRate ?? MORTGAGE_DEFAULTS.propertyTaxRate,
      MORTGAGE_DEFAULTS.propertyTaxRate,
    ),
    insurancePerYear: readNumber(
      state.insurancePerYear ?? MORTGAGE_DEFAULTS.insurancePerYear,
      MORTGAGE_DEFAULTS.insurancePerYear,
    ),
    hoaPerMonth: readNumber(state.hoaPerMonth ?? MORTGAGE_DEFAULTS.hoaPerMonth, MORTGAGE_DEFAULTS.hoaPerMonth),
    activeLoanType: LOAN_OPTIONS.some((option) => option.type === state.activeLoanType)
      ? state.activeLoanType
      : DEFAULT_ACTIVE_LOAN,
    compareLoanType: LOAN_OPTIONS.some((option) => option.type === state.compareLoanType)
      ? state.compareLoanType
      : DEFAULT_COMPARE_LOAN,
    loanOptions: Object.fromEntries(
      LOAN_OPTIONS.map((option) => {
        const loanState = state.loanOptions?.[option.type] ?? {};
        const values = Object.fromEntries(
          option.fields.map((field) => {
            if (field.field === "adjustedRate") {
              return [
                field.field,
                loanState.adjustedRate === "" || loanState.adjustedRate == null
                  ? readNumber(loanState.initialRate ?? option.defaults.initialRate, option.defaults.initialRate)
                  : readNumber(loanState.adjustedRate, option.defaults.adjustedRate),
              ];
            }

            return [
              field.field,
              readNumber(loanState[field.field] ?? option.defaults[field.field], option.defaults[field.field]),
            ];
          }),
        );

        return [
          option.type,
          {
            kind: option.kind,
            label: option.label,
            ...(option.fixedYears ? { fixedYears: option.fixedYears } : {}),
            ...values,
          },
        ];
      }),
    ),
  };
}

export function getMortgageLoanMeta(loanOption) {
  if (loanOption.kind === "arm") {
    return Math.abs(loanOption.adjustedRate - loanOption.initialRate) < 0.0005
      ? `${percent(loanOption.initialRate, 3)} / ${Math.round(loanOption.term)}y`
      : `${percent(loanOption.initialRate, 3)} to ${percent(loanOption.adjustedRate, 3)} / ${Math.round(loanOption.term)}y`;
  }

  return `${percent(loanOption.rate, 3)} / ${Math.round(loanOption.term)}y`;
}
