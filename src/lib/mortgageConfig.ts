import { readNumber, roundTo } from "./format";

type DollarPercentMode = "percent" | "dollar";
type ValueModePair = {
  mode: DollarPercentMode;
  value: number;
};
type MortgageValueModeField = "downPayment" | "purchaseClosingCost" | "saleClosingCost";
export type MortgageOptionKind = "conventional" | "arm" | "rent";
export type MortgageLoanField =
  | "rate"
  | "term"
  | "initialRate"
  | "adjustedRate"
  | "fixedYears"
  | "rentPerMonth"
  | "rentGrowthRate";

export type MortgageOptionState = {
  id: string;
  kind: MortgageOptionKind;
  rate: number | null;
  term: number | null;
  initialRate: number | null;
  adjustedRate: number | null;
  fixedYears: number | null;
  rentPerMonth: number | null;
  rentGrowthRate: number | null;
};

export type MortgageState = {
  homePrice: number;
  downPayment: ValueModePair;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  maintenanceRate: number;
  purchaseClosingCost: ValueModePair;
  saleClosingCost: ValueModePair;
  activeLoanId: string;
  options: MortgageOptionState[];
};

const CONVENTIONAL_DEFAULTS = {
  kind: "conventional" as const,
  rate: 6.475,
  term: 30,
  initialRate: null,
  adjustedRate: null,
  fixedYears: null,
  rentPerMonth: null,
  rentGrowthRate: null,
};

const ARM_DEFAULTS = {
  kind: "arm" as const,
  rate: null,
  term: 30,
  initialRate: 5.635,
  adjustedRate: 7.135,
  fixedYears: 7,
  rentPerMonth: null,
  rentGrowthRate: null,
};

const RENT_DEFAULTS = {
  kind: "rent" as const,
  rate: null,
  term: null,
  initialRate: null,
  adjustedRate: null,
  fixedYears: null,
  rentPerMonth: 3500,
  rentGrowthRate: 3,
};

const MORTGAGE_DEFAULTS = {
  homePrice: 800000,
  downPaymentPercent: 20,
  propertyTaxRate: 1.18,
  insurancePerYear: 1800,
  hoaPerMonth: 0,
  maintenanceRate: 1,
  purchaseClosingCost: 4000,
  saleClosingCostPercent: 0,
};

const MORTGAGE_NUMBER_FIELDS = [
  "homePrice",
  "propertyTaxRate",
  "insurancePerYear",
  "hoaPerMonth",
  "maintenanceRate",
] as const satisfies ReadonlyArray<keyof MortgageState>;

function defaultOptionValues(kind: MortgageOptionKind) {
  if (kind === "arm") {
    return ARM_DEFAULTS;
  }

  if (kind === "rent") {
    return RENT_DEFAULTS;
  }

  return CONVENTIONAL_DEFAULTS;
}

export function createMortgageOption(overrides: Partial<MortgageOptionState> = {}): MortgageOptionState {
  const kind = overrides.kind === "arm" ? "arm" : overrides.kind === "rent" ? "rent" : "conventional";
  const defaults = defaultOptionValues(kind);

  return {
    id: overrides.id ?? crypto.randomUUID(),
    kind,
    rate: overrides.rate ?? defaults.rate,
    term: overrides.term ?? defaults.term,
    initialRate: overrides.initialRate ?? defaults.initialRate,
    adjustedRate: overrides.adjustedRate ?? defaults.adjustedRate,
    fixedYears: overrides.fixedYears ?? defaults.fixedYears,
    rentPerMonth: overrides.rentPerMonth ?? defaults.rentPerMonth,
    rentGrowthRate: overrides.rentGrowthRate ?? defaults.rentGrowthRate,
  };
}

function buildDefaultOptions() {
  const primary = createMortgageOption({ kind: "conventional" });

  return {
    options: [primary],
    activeLoanId: primary.id,
  };
}

const DEFAULT_MORTGAGE_OPTIONS = buildDefaultOptions();

export const DEFAULT_MORTGAGE_STATE: MortgageState = {
  homePrice: MORTGAGE_DEFAULTS.homePrice,
  downPayment: {
    mode: "percent",
    value: MORTGAGE_DEFAULTS.downPaymentPercent,
  },
  propertyTaxRate: MORTGAGE_DEFAULTS.propertyTaxRate,
  insurancePerYear: MORTGAGE_DEFAULTS.insurancePerYear,
  hoaPerMonth: MORTGAGE_DEFAULTS.hoaPerMonth,
  maintenanceRate: MORTGAGE_DEFAULTS.maintenanceRate,
  purchaseClosingCost: {
    mode: "dollar",
    value: MORTGAGE_DEFAULTS.purchaseClosingCost,
  },
  saleClosingCost: {
    mode: "percent",
    value: MORTGAGE_DEFAULTS.saleClosingCostPercent,
  },
  activeLoanId: DEFAULT_MORTGAGE_OPTIONS.activeLoanId,
  options: DEFAULT_MORTGAGE_OPTIONS.options,
};

function normalizeValueModePair(raw: unknown, fallback: ValueModePair): ValueModePair {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const valueMode = raw as Record<string, unknown>;
  return {
    mode: valueMode.mode === "dollar" ? "dollar" : "percent",
    value: readNumber(valueMode.value, fallback.value),
  };
}

function normalizeMortgageOption(parsed: unknown, fallback?: MortgageOptionState): MortgageOptionState {
  const raw = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const kind =
    raw.kind === "arm"
      ? "arm"
      : raw.kind === "rent"
        ? "rent"
        : raw.kind === "conventional"
          ? "conventional"
          : (fallback?.kind ?? "conventional");
  const defaults = defaultOptionValues(kind);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : (fallback?.id ?? crypto.randomUUID()),
    kind,
    rate: readNumber(raw.rate, fallback?.rate ?? defaults.rate),
    term: readNumber(raw.term, fallback?.term ?? defaults.term),
    initialRate: readNumber(raw.initialRate, fallback?.initialRate ?? defaults.initialRate),
    adjustedRate: readNumber(raw.adjustedRate, fallback?.adjustedRate ?? defaults.adjustedRate),
    fixedYears: readNumber(raw.fixedYears, fallback?.fixedYears ?? defaults.fixedYears),
    rentPerMonth: readNumber(raw.rentPerMonth, fallback?.rentPerMonth ?? defaults.rentPerMonth),
    rentGrowthRate: readNumber(raw.rentGrowthRate, fallback?.rentGrowthRate ?? defaults.rentGrowthRate),
  };
}

export function normalizeMortgageState(parsed: unknown, fallback: MortgageState): MortgageState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const numericState = Object.fromEntries(
    MORTGAGE_NUMBER_FIELDS.map((field) => [field, readNumber(state[field], fallback[field])]),
  ) as Pick<MortgageState, (typeof MORTGAGE_NUMBER_FIELDS)[number]>;

  const normalizedOptions = Array.isArray(state.options)
    ? state.options.map((option, index) => normalizeMortgageOption(option, fallback.options[index]))
    : fallback.options;
  const allOptions = normalizedOptions.length > 0 ? normalizedOptions : fallback.options;
  const allOptionIds = new Set(allOptions.map((option) => option.id));
  const activeLoanIdCandidate =
    typeof state.activeLoanId === "string" && state.activeLoanId ? state.activeLoanId : null;
  const activeOption =
    activeLoanIdCandidate && allOptionIds.has(activeLoanIdCandidate)
      ? allOptions.find((option) => option.id === activeLoanIdCandidate)
      : allOptions[0];
  const options = activeOption ? [activeOption] : fallback.options.slice(0, 1);
  const activeLoanId = options[0]?.id ?? fallback.activeLoanId;

  return {
    ...fallback,
    ...numericState,
    downPayment: normalizeValueModePair(state.downPayment, fallback.downPayment),
    purchaseClosingCost: normalizeValueModePair(state.purchaseClosingCost, fallback.purchaseClosingCost),
    saleClosingCost: normalizeValueModePair(state.saleClosingCost, fallback.saleClosingCost),
    activeLoanId,
    options,
  };
}

export function resolveAmountFromMode(input: ValueModePair, homePrice: number) {
  return input.mode === "percent" ? (homePrice * input.value) / 100 : input.value;
}

function toggleValueMode(input: ValueModePair, homePrice: number): ValueModePair {
  const amount = resolveAmountFromMode(input, homePrice);

  return {
    mode: input.mode === "dollar" ? "percent" : "dollar",
    value: input.mode === "dollar" ? roundTo(homePrice > 0 ? (amount / homePrice) * 100 : 0, 3) : Math.round(amount),
  };
}

export function toggleMortgageValueMode(state: MortgageState, field: MortgageValueModeField) {
  switch (field) {
    case "downPayment": {
      state.downPayment = toggleValueMode(state.downPayment, state.homePrice);
      return;
    }
    case "purchaseClosingCost": {
      state.purchaseClosingCost = toggleValueMode(state.purchaseClosingCost, state.homePrice);
      return;
    }
    case "saleClosingCost": {
      state.saleClosingCost = toggleValueMode(state.saleClosingCost, state.homePrice);
      return;
    }
  }
}
