import { clamp, numberToEditableString, stripToNumber } from "./format";
import {
  DEFAULT_ACTIVE_LOAN,
  DEFAULT_COMPARE_LOAN,
  FIELD_CONFIGS,
  getLoanFieldFallback,
  LOAN_FIELD_CONFIGS,
  LOAN_OPTIONS,
  NUMERIC_DEFAULTS,
} from "./mortgageConfig";

const LOAN_DEFAULTS = Object.fromEntries(
  LOAN_OPTIONS.map((option) => [
    option.type,
    {
      label: option.label,
      kind: option.kind,
      ...(option.fixedYears ? { fixedYears: option.fixedYears } : {}),
      ...option.defaults,
    },
  ]),
);

export function createDefaultMortgageState() {
  return {
    homePrice: String(NUMERIC_DEFAULTS.homePrice),
    downPaymentMode: "percent",
    downPayment: String(NUMERIC_DEFAULTS.downPaymentPercent),
    propertyTaxRate: String(NUMERIC_DEFAULTS.propertyTaxRate),
    insurancePerYear: String(NUMERIC_DEFAULTS.insurancePerYear),
    hoaPerMonth: String(NUMERIC_DEFAULTS.hoaPerMonth),
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
}

export function sanitizeMortgageValue(rawValue, config, fallback, options = {}) {
  const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
  if (options.allowBlank && value.trim() === "") {
    return "";
  }

  const parsed = stripToNumber(value);
  const safeValue = Number.isFinite(parsed) ? clamp(parsed, config.min, config.max) : fallback;
  const decimals = config.kind === "integer" ? 0 : config.decimals;
  return numberToEditableString(safeValue, decimals);
}

export function readSafeMortgageValue(rawValue, config, fallback) {
  const parsed = stripToNumber(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, config.min, config.max);
}

export function getDownPaymentNumericValue(homePrice, rawValue, mode) {
  const fallback =
    mode === "percent"
      ? NUMERIC_DEFAULTS.downPaymentPercent
      : (NUMERIC_DEFAULTS.homePrice * NUMERIC_DEFAULTS.downPaymentPercent) / 100;
  const parsed = stripToNumber(rawValue);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;

  if (mode === "percent") {
    return clamp(safeValue, 0, 100);
  }

  return clamp(safeValue, 0, homePrice);
}

export function sanitizeMortgageDownPayment(rawValue, homePrice, mode) {
  const safeValue = getDownPaymentNumericValue(homePrice, rawValue, mode);
  return mode === "percent" ? numberToEditableString(safeValue, 3) : numberToEditableString(safeValue, 0);
}

export function normalizeMortgageState(parsed, fallback) {
  const defaults = fallback;

  const loanOptions = Object.fromEntries(
    LOAN_OPTIONS.map((option) => [
      option.type,
      Object.fromEntries(
        option.fields.map((field) => {
          const nestedValue = parsed?.loanOptions?.[option.type]?.[field.field];
          const fallbackValue = defaults.loanOptions[option.type][field.field];

          return [field.field, typeof nestedValue === "string" ? nestedValue : fallbackValue];
        }),
      ),
    ]),
  );

  return {
    homePrice: typeof parsed?.homePrice === "string" ? parsed.homePrice : defaults.homePrice,
    downPaymentMode: parsed?.downPaymentMode === "dollar" ? "dollar" : defaults.downPaymentMode,
    downPayment: typeof parsed?.downPayment === "string" ? parsed.downPayment : defaults.downPayment,
    propertyTaxRate: typeof parsed?.propertyTaxRate === "string" ? parsed.propertyTaxRate : defaults.propertyTaxRate,
    insurancePerYear:
      typeof parsed?.insurancePerYear === "string" ? parsed.insurancePerYear : defaults.insurancePerYear,
    hoaPerMonth: typeof parsed?.hoaPerMonth === "string" ? parsed.hoaPerMonth : defaults.hoaPerMonth,
    advancedOpen: Boolean(parsed?.advancedOpen),
    activeLoanType: LOAN_DEFAULTS[parsed?.activeLoanType] ? parsed.activeLoanType : defaults.activeLoanType,
    compareLoanType: LOAN_DEFAULTS[parsed?.compareLoanType] ? parsed.compareLoanType : defaults.compareLoanType,
    loanOptions,
  };
}

function readLoanOptions(state) {
  return Object.fromEntries(
    LOAN_OPTIONS.map((option) => {
      const base = {
        kind: option.kind,
        label: option.label,
        ...(option.fixedYears ? { fixedYears: option.fixedYears } : {}),
      };

      const values = Object.fromEntries(
        option.fields.map((field) => {
          const fallback = getLoanFieldFallback(option.type, field.field);
          const config = LOAN_FIELD_CONFIGS[option.type][field.field];
          const rawValue = state.loanOptions[option.type][field.field];

          if (field.field === "adjustedRate") {
            return [field.field, stripToNumber(rawValue)];
          }

          return [field.field, readSafeMortgageValue(rawValue, config, fallback)];
        }),
      );

      if (option.kind === "arm") {
        const initialRate = values.initialRate;
        const adjustedRate = Number.isFinite(values.adjustedRate)
          ? clamp(
              values.adjustedRate,
              LOAN_FIELD_CONFIGS[option.type].adjustedRate.min,
              LOAN_FIELD_CONFIGS[option.type].adjustedRate.max,
            )
          : initialRate;

        return [
          option.type,
          {
            ...base,
            ...values,
            adjustedRate,
          },
        ];
      }

      return [option.type, { ...base, ...values }];
    }),
  );
}

export function normalizeMortgageInputs(state) {
  const homePrice = readSafeMortgageValue(state.homePrice, FIELD_CONFIGS.homePrice, NUMERIC_DEFAULTS.homePrice);
  const downPaymentInput = getDownPaymentNumericValue(homePrice, state.downPayment, state.downPaymentMode);
  const downPaymentAmount =
    state.downPaymentMode === "percent"
      ? clamp((homePrice * downPaymentInput) / 100, 0, homePrice)
      : clamp(downPaymentInput, 0, homePrice);

  return {
    homePrice,
    downPaymentMode: state.downPaymentMode === "dollar" ? "dollar" : "percent",
    downPaymentInput,
    downPaymentAmount,
    propertyTaxRate: readSafeMortgageValue(
      state.propertyTaxRate,
      FIELD_CONFIGS.propertyTaxRate,
      NUMERIC_DEFAULTS.propertyTaxRate,
    ),
    insurancePerYear: readSafeMortgageValue(
      state.insurancePerYear,
      FIELD_CONFIGS.insurancePerYear,
      NUMERIC_DEFAULTS.insurancePerYear,
    ),
    hoaPerMonth: readSafeMortgageValue(state.hoaPerMonth, FIELD_CONFIGS.hoaPerMonth, NUMERIC_DEFAULTS.hoaPerMonth),
    activeLoanType: LOAN_DEFAULTS[state.activeLoanType] ? state.activeLoanType : DEFAULT_ACTIVE_LOAN,
    compareLoanType: LOAN_DEFAULTS[state.compareLoanType] ? state.compareLoanType : DEFAULT_COMPARE_LOAN,
    loanOptions: readLoanOptions(state),
  };
}
