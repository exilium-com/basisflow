import { readNumber, roundTo } from "./format";

export type DollarPercentMode = "percent" | "dollar";
export type ValueModePair = {
  mode: DollarPercentMode;
  value: number;
};
export type MortgageValueModeField = "downPayment" | "purchaseClosingCost" | "saleClosingCost";
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
  name: string;
  kind: MortgageOptionKind;
  rate: number | null;
  term: number | null;
  initialRate: number | null;
  adjustedRate: number | null;
  fixedYears: number | null;
  rentPerMonth: number | null;
  rentGrowthRate: number | null;
};

export type MortgageLoan =
  | {
      id: string;
      name: string;
      kind: "conventional";
      term: number;
      rate: number;
    }
  | {
      id: string;
      name: string;
      kind: "arm";
      term: number;
      fixedYears: number;
      initialRate: number;
      adjustedRate: number;
    }
  | {
      id: string;
      name: string;
      kind: "rent";
      rentPerMonth: number;
      rentGrowthRate: number;
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

export type Mortgage = {
  homePrice: number;
  downPaymentMode: DollarPercentMode;
  downPaymentInput: number;
  downPaymentAmount: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  maintenanceRate: number;
  purchaseClosingCost: number;
  saleClosingCostMode: DollarPercentMode;
  saleClosingCostInput: number;
  activeLoanId: string;
  options: MortgageLoan[];
};

const CONVENTIONAL_DEFAULTS = {
  name: "Conventional",
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
  name: "ARM",
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
  name: "Rent",
  kind: "rent" as const,
  rate: null,
  term: null,
  initialRate: null,
  adjustedRate: null,
  fixedYears: null,
  rentPerMonth: 3500,
  rentGrowthRate: 3,
};

export const MORTGAGE_DEFAULTS = {
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
    name: overrides.name ?? defaults.name,
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
  const primary = createMortgageOption({ name: "Primary", kind: "conventional" });

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
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : (fallback?.name ?? defaults.name),
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
  const options = normalizedOptions.length > 0 ? normalizedOptions : fallback.options;
  const optionIds = new Set(options.map((option) => option.id));
  const fallbackActiveLoanId = options[0]?.id ?? fallback.activeLoanId;
  const activeLoanIdCandidate =
    typeof state.activeLoanId === "string" && state.activeLoanId ? state.activeLoanId : null;
  const activeLoanId =
    activeLoanIdCandidate && optionIds.has(activeLoanIdCandidate) ? activeLoanIdCandidate : fallbackActiveLoanId;

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

function resolveAmountFromMode(input: ValueModePair, homePrice: number) {
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

function createMortgageLoan(option: MortgageOptionState): MortgageLoan {
  if (option.kind === "rent") {
    return {
      id: option.id,
      name: option.name || RENT_DEFAULTS.name,
      kind: "rent",
      rentPerMonth: Math.max(0, option.rentPerMonth ?? RENT_DEFAULTS.rentPerMonth),
      rentGrowthRate: option.rentGrowthRate ?? RENT_DEFAULTS.rentGrowthRate,
    };
  }

  if (option.kind === "arm") {
    const initialRate = option.initialRate ?? ARM_DEFAULTS.initialRate;

    return {
      id: option.id,
      name: option.name || ARM_DEFAULTS.name,
      kind: "arm",
      term: Math.max(1, Math.round(option.term ?? ARM_DEFAULTS.term)),
      fixedYears: Math.max(1, Math.round(option.fixedYears ?? ARM_DEFAULTS.fixedYears)),
      initialRate,
      adjustedRate: option.adjustedRate ?? initialRate,
    };
  }

  return {
    id: option.id,
    name: option.name || CONVENTIONAL_DEFAULTS.name,
    kind: "conventional",
    term: Math.max(1, Math.round(option.term ?? CONVENTIONAL_DEFAULTS.term)),
    rate: option.rate ?? CONVENTIONAL_DEFAULTS.rate,
  };
}

export function createMortgage(state: MortgageState = DEFAULT_MORTGAGE_STATE): Mortgage {
  const homePrice = Math.max(0, state.homePrice ?? MORTGAGE_DEFAULTS.homePrice);
  const downPayment = normalizeValueModePair(state.downPayment, DEFAULT_MORTGAGE_STATE.downPayment);
  const purchaseClosingCost = normalizeValueModePair(
    state.purchaseClosingCost,
    DEFAULT_MORTGAGE_STATE.purchaseClosingCost,
  );
  const saleClosingCost = normalizeValueModePair(state.saleClosingCost, DEFAULT_MORTGAGE_STATE.saleClosingCost);
  const options =
    state.options.length > 0
      ? state.options.map((option) => createMortgageLoan(option))
      : DEFAULT_MORTGAGE_STATE.options.map(createMortgageLoan);
  const optionIds = new Set(options.map((option) => option.id));
  const activeLoanId = optionIds.has(state.activeLoanId) ? state.activeLoanId : options[0].id;

  return {
    homePrice,
    downPaymentMode: downPayment.mode,
    downPaymentInput: Math.max(0, downPayment.value),
    downPaymentAmount: resolveAmountFromMode(downPayment, homePrice),
    propertyTaxRate: Math.max(0, state.propertyTaxRate ?? MORTGAGE_DEFAULTS.propertyTaxRate),
    insurancePerYear: Math.max(0, state.insurancePerYear ?? MORTGAGE_DEFAULTS.insurancePerYear),
    hoaPerMonth: Math.max(0, state.hoaPerMonth ?? MORTGAGE_DEFAULTS.hoaPerMonth),
    maintenanceRate: Math.max(0, state.maintenanceRate ?? MORTGAGE_DEFAULTS.maintenanceRate),
    purchaseClosingCost: resolveAmountFromMode(purchaseClosingCost, homePrice),
    saleClosingCostMode: saleClosingCost.mode,
    saleClosingCostInput: Math.max(0, saleClosingCost.value),
    activeLoanId,
    options,
  };
}
