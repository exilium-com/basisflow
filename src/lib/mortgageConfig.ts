import { readNumber, roundTo } from "./format";

export type DollarPercentMode = "percent" | "dollar";
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
  downPaymentMode: DollarPercentMode;
  downPayment: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  maintenanceRate: number;
  purchaseClosingCostMode: DollarPercentMode;
  purchaseClosingCost: number;
  saleClosingCostMode: DollarPercentMode;
  saleClosingCost: number;
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
  "downPayment",
  "propertyTaxRate",
  "insurancePerYear",
  "hoaPerMonth",
  "maintenanceRate",
  "purchaseClosingCost",
  "saleClosingCost",
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
  const kind =
    overrides.kind === "arm" ? "arm" : overrides.kind === "rent" ? "rent" : "conventional";
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
  downPaymentMode: "percent",
  downPayment: MORTGAGE_DEFAULTS.downPaymentPercent,
  propertyTaxRate: MORTGAGE_DEFAULTS.propertyTaxRate,
  insurancePerYear: MORTGAGE_DEFAULTS.insurancePerYear,
  hoaPerMonth: MORTGAGE_DEFAULTS.hoaPerMonth,
  maintenanceRate: MORTGAGE_DEFAULTS.maintenanceRate,
  purchaseClosingCostMode: "dollar",
  purchaseClosingCost: MORTGAGE_DEFAULTS.purchaseClosingCost,
  saleClosingCostMode: "percent",
  saleClosingCost: MORTGAGE_DEFAULTS.saleClosingCostPercent,
  activeLoanId: DEFAULT_MORTGAGE_OPTIONS.activeLoanId,
  options: DEFAULT_MORTGAGE_OPTIONS.options,
};

function normalizeMortgageOption(parsed: unknown, fallback?: MortgageOptionState): MortgageOptionState {
  const raw = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const kind =
    raw.kind === "arm"
      ? "arm"
      : raw.kind === "rent"
        ? "rent"
        : raw.kind === "conventional"
          ? "conventional"
          : fallback?.kind ?? "conventional";
  const defaults = defaultOptionValues(kind);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallback?.id ?? crypto.randomUUID(),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : fallback?.name ?? defaults.name,
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
  const activeLoanIdCandidate = typeof state.activeLoanId === "string" && state.activeLoanId ? state.activeLoanId : null;
  const activeLoanId = activeLoanIdCandidate && optionIds.has(activeLoanIdCandidate) ? activeLoanIdCandidate : fallbackActiveLoanId;

  return {
    ...fallback,
    ...numericState,
    downPaymentMode: state.downPaymentMode === "dollar" ? "dollar" : "percent",
    purchaseClosingCostMode: state.purchaseClosingCostMode === "percent" ? "percent" : "dollar",
    saleClosingCostMode: state.saleClosingCostMode === "dollar" ? "dollar" : "percent",
    saleClosingCost: readNumber(state.saleClosingCost, fallback.saleClosingCost),
    activeLoanId,
    options,
  };
}

function resolveAmountFromMode(input: number, mode: DollarPercentMode, homePrice: number) {
  return mode === "percent" ? (homePrice * input) / 100 : input;
}

function convertModeValue(input: number, currentMode: DollarPercentMode, nextMode: DollarPercentMode, homePrice: number) {
  if (currentMode === nextMode) {
    return input;
  }

  const amount = resolveAmountFromMode(input, currentMode, homePrice);
  return nextMode === "percent" ? (homePrice > 0 ? (amount / homePrice) * 100 : 0) : amount;
}

export function toggleMortgageValueMode(state: MortgageState, field: MortgageValueModeField) {
  if (field === "downPayment") {
    const nextMode = state.downPaymentMode === "dollar" ? "percent" : "dollar";
    state.downPayment = nextMode === "percent"
      ? roundTo(convertModeValue(state.downPayment, state.downPaymentMode, nextMode, state.homePrice), 3)
      : Math.round(convertModeValue(state.downPayment, state.downPaymentMode, nextMode, state.homePrice));
    state.downPaymentMode = nextMode;
    return;
  }

  if (field === "purchaseClosingCost") {
    const nextMode = state.purchaseClosingCostMode === "dollar" ? "percent" : "dollar";
    state.purchaseClosingCost = nextMode === "percent"
      ? roundTo(
          convertModeValue(state.purchaseClosingCost, state.purchaseClosingCostMode, nextMode, state.homePrice),
          3,
        )
      : Math.round(
          convertModeValue(state.purchaseClosingCost, state.purchaseClosingCostMode, nextMode, state.homePrice),
        );
    state.purchaseClosingCostMode = nextMode;
    return;
  }

  const nextMode = state.saleClosingCostMode === "dollar" ? "percent" : "dollar";
  state.saleClosingCost = nextMode === "percent"
    ? roundTo(convertModeValue(state.saleClosingCost, state.saleClosingCostMode, nextMode, state.homePrice), 3)
    : Math.round(convertModeValue(state.saleClosingCost, state.saleClosingCostMode, nextMode, state.homePrice));
  state.saleClosingCostMode = nextMode;
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
  const downPaymentMode = state.downPaymentMode === "dollar" ? "dollar" : "percent";
  const downPaymentInput = Math.max(0, state.downPayment ?? MORTGAGE_DEFAULTS.downPaymentPercent);
  const purchaseClosingCostMode = state.purchaseClosingCostMode === "percent" ? "percent" : "dollar";
  const purchaseClosingCostInput = Math.max(0, state.purchaseClosingCost ?? MORTGAGE_DEFAULTS.purchaseClosingCost);
  const saleClosingCostMode = state.saleClosingCostMode === "dollar" ? "dollar" : "percent";
  const saleClosingCostInput = Math.max(0, state.saleClosingCost ?? MORTGAGE_DEFAULTS.saleClosingCostPercent);
  const options = state.options.length > 0 ? state.options.map((option) => createMortgageLoan(option)) : DEFAULT_MORTGAGE_STATE.options.map(createMortgageLoan);
  const optionIds = new Set(options.map((option) => option.id));
  const activeLoanId = optionIds.has(state.activeLoanId) ? state.activeLoanId : options[0].id;

  return {
    homePrice,
    downPaymentMode,
    downPaymentInput,
    downPaymentAmount: resolveAmountFromMode(downPaymentInput, downPaymentMode, homePrice),
    propertyTaxRate: Math.max(0, state.propertyTaxRate ?? MORTGAGE_DEFAULTS.propertyTaxRate),
    insurancePerYear: Math.max(0, state.insurancePerYear ?? MORTGAGE_DEFAULTS.insurancePerYear),
    hoaPerMonth: Math.max(0, state.hoaPerMonth ?? MORTGAGE_DEFAULTS.hoaPerMonth),
    maintenanceRate: Math.max(0, state.maintenanceRate ?? MORTGAGE_DEFAULTS.maintenanceRate),
    purchaseClosingCost: resolveAmountFromMode(purchaseClosingCostInput, purchaseClosingCostMode, homePrice),
    saleClosingCostMode,
    saleClosingCostInput,
    activeLoanId,
    options,
  };
}
