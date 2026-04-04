import { percent } from "./format";

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

export const FIELD_CONFIGS = {
  homePrice: { kind: "currency", decimals: 0, min: 1, max: 100000000 },
  propertyTaxRate: { kind: "percent", decimals: 3, min: 0, max: 10 },
  insurancePerYear: { kind: "currency", decimals: 0, min: 0, max: 1000000 },
  hoaPerMonth: { kind: "currency", decimals: 0, min: 0, max: 100000 },
};

export const NUMERIC_DEFAULTS = {
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

const RATE_CONFIG = { kind: "percent", decimals: 3, min: 0, max: 25 };
const TERM_CONFIG = { kind: "integer", decimals: 0, min: 1, max: 50 };

export const LOAN_FIELD_CONFIGS = Object.fromEntries(
  LOAN_OPTIONS.map((option) => [
    option.type,
    Object.fromEntries(option.fields.map((field) => [field.field, field.field === "term" ? TERM_CONFIG : RATE_CONFIG])),
  ]),
);

export function getLoanFieldFallback(type, field) {
  const definition = LOAN_OPTIONS.find((option) => option.type === type) ?? LOAN_OPTIONS[0];

  if (field === "adjustedRate") {
    return definition.defaults.initialRate ?? 0;
  }

  return definition.defaults[field] ?? 0;
}

export function getMortgageLoanMeta(loanOption) {
  if (loanOption.kind === "arm") {
    return Math.abs(loanOption.adjustedRate - loanOption.initialRate) < 0.0005
      ? `${percent(loanOption.initialRate, 3)} / ${Math.round(loanOption.term)}y`
      : `${percent(loanOption.initialRate, 3)} to ${percent(loanOption.adjustedRate, 3)} / ${Math.round(loanOption.term)}y`;
  }

  return `${percent(loanOption.rate, 3)} / ${Math.round(loanOption.term)}y`;
}
