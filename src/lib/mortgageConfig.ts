import { percent, readNumber } from "./format";

export type MortgageDownPaymentMode = "percent" | "dollar";
export type MortgageOptionKind = "conventional" | "arm";
export type MortgageLoanField = "rate" | "term" | "initialRate" | "adjustedRate" | "fixedYears";

export type MortgageOptionState = {
  id: string;
  name: string;
  kind: MortgageOptionKind;
  rate: number | null;
  term: number | null;
  initialRate: number | null;
  adjustedRate: number | null;
  fixedYears: number | null;
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
    };

export type MortgageState = {
  homePrice: number;
  downPaymentMode: MortgageDownPaymentMode;
  downPayment: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  activeLoanId: string;
  compareLoanId: string;
  options: MortgageOptionState[];
};

export type Mortgage = {
  homePrice: number;
  downPaymentMode: MortgageDownPaymentMode;
  downPaymentInput: number;
  downPaymentAmount: number;
  propertyTaxRate: number;
  insurancePerYear: number;
  hoaPerMonth: number;
  activeLoanId: string;
  compareLoanId: string;
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
};

const ARM_DEFAULTS = {
  name: "ARM",
  kind: "arm" as const,
  rate: null,
  term: 30,
  initialRate: 5.635,
  adjustedRate: 7.135,
  fixedYears: 7,
};

const LEGACY_LOAN_ORDER = ["fixed30", "arm76", "arm106"] as const;

type LegacyLoanType = (typeof LEGACY_LOAN_ORDER)[number];

export const MORTGAGE_DEFAULTS = {
  homePrice: 800000,
  downPaymentPercent: 20,
  propertyTaxRate: 1.18,
  insurancePerYear: 1800,
  hoaPerMonth: 0,
};

const MORTGAGE_NUMBER_FIELDS = [
  "homePrice",
  "downPayment",
  "propertyTaxRate",
  "insurancePerYear",
  "hoaPerMonth",
] as const satisfies ReadonlyArray<keyof MortgageState>;

function defaultOptionValues(kind: MortgageOptionKind) {
  return kind === "arm" ? ARM_DEFAULTS : CONVENTIONAL_DEFAULTS;
}

function createLegacyMortgageOption(type: LegacyLoanType, rawState: Record<string, unknown>): MortgageOptionState {
  if (type === "fixed30") {
    return createMortgageOption({
      id: type,
      name: "Conventional",
      kind: "conventional",
      rate: readNumber(rawState.rate, CONVENTIONAL_DEFAULTS.rate),
      term: readNumber(rawState.term, CONVENTIONAL_DEFAULTS.term),
    });
  }

  const fixedYears = type === "arm106" ? 10 : 7;
  const initialRate = readNumber(rawState.initialRate, ARM_DEFAULTS.initialRate);

  return createMortgageOption({
    id: type,
    name: type === "arm106" ? "ARM 10/1" : "ARM 7/1",
    kind: "arm",
    term: readNumber(rawState.term, ARM_DEFAULTS.term),
    initialRate,
    adjustedRate: readNumber(rawState.adjustedRate, initialRate),
    fixedYears,
  });
}

export function createMortgageOption(overrides: Partial<MortgageOptionState> = {}): MortgageOptionState {
  const kind = overrides.kind === "arm" ? "arm" : "conventional";
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
  };
}

function buildDefaultOptions() {
  const primary = createMortgageOption({ name: "Primary", kind: "conventional" });
  const compare = createMortgageOption({ name: "Compare", kind: "arm" });

  return {
    options: [primary, compare],
    activeLoanId: primary.id,
    compareLoanId: compare.id,
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
  activeLoanId: DEFAULT_MORTGAGE_OPTIONS.activeLoanId,
  compareLoanId: DEFAULT_MORTGAGE_OPTIONS.compareLoanId,
  options: DEFAULT_MORTGAGE_OPTIONS.options,
};

function normalizeMortgageOption(parsed: unknown, fallback?: MortgageOptionState): MortgageOptionState {
  const raw = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const kind = raw.kind === "arm" ? "arm" : raw.kind === "conventional" ? "conventional" : fallback?.kind ?? "conventional";
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
  };
}

export function normalizeMortgageState(parsed: unknown, fallback: MortgageState): MortgageState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const numericState = Object.fromEntries(
    MORTGAGE_NUMBER_FIELDS.map((field) => [field, readNumber(state[field], fallback[field])]),
  ) as Pick<MortgageState, (typeof MORTGAGE_NUMBER_FIELDS)[number]>;

  const normalizedOptions = Array.isArray(state.options)
    ? state.options.map((option, index) => normalizeMortgageOption(option, fallback.options[index]))
    : typeof state.loanOptions === "object" && state.loanOptions
      ? LEGACY_LOAN_ORDER.map((type) => {
          const rawLoanState = (state.loanOptions as Record<string, unknown>)[type];
          return createLegacyMortgageOption(
            type,
            typeof rawLoanState === "object" && rawLoanState ? (rawLoanState as Record<string, unknown>) : {},
          );
        })
      : fallback.options;

  const options = normalizedOptions.length > 0 ? normalizedOptions : fallback.options;
  const optionIds = new Set(options.map((option) => option.id));
  const fallbackActiveLoanId = options[0]?.id ?? fallback.activeLoanId;
  const fallbackCompareLoanId = options.find((option) => option.id !== fallbackActiveLoanId)?.id ?? fallbackActiveLoanId;
  const legacyActiveLoanId = typeof state.activeLoanType === "string" ? state.activeLoanType : null;
  const legacyCompareLoanId = typeof state.compareLoanType === "string" ? state.compareLoanType : null;
  const activeLoanIdCandidate =
    typeof state.activeLoanId === "string" && state.activeLoanId ? state.activeLoanId : legacyActiveLoanId;
  const activeLoanId = activeLoanIdCandidate && optionIds.has(activeLoanIdCandidate) ? activeLoanIdCandidate : fallbackActiveLoanId;
  const compareLoanIdCandidate =
    typeof state.compareLoanId === "string" && state.compareLoanId ? state.compareLoanId : legacyCompareLoanId;
  const compareLoanId =
    compareLoanIdCandidate && optionIds.has(compareLoanIdCandidate)
      ? compareLoanIdCandidate
      : options.find((option) => option.id !== activeLoanId)?.id ?? fallbackCompareLoanId;

  return {
    ...fallback,
    ...numericState,
    downPaymentMode: state.downPaymentMode === "dollar" ? "dollar" : "percent",
    activeLoanId,
    compareLoanId,
    options,
  };
}

function createMortgageLoan(option: MortgageOptionState): MortgageLoan {
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
  const options = state.options.length > 0 ? state.options.map((option) => createMortgageLoan(option)) : DEFAULT_MORTGAGE_STATE.options.map(createMortgageLoan);
  const optionIds = new Set(options.map((option) => option.id));
  const activeLoanId = optionIds.has(state.activeLoanId) ? state.activeLoanId : options[0].id;
  const compareLoanId =
    optionIds.has(state.compareLoanId) && state.compareLoanId !== activeLoanId
      ? state.compareLoanId
      : options.find((option) => option.id !== activeLoanId)?.id ?? activeLoanId;

  return {
    homePrice,
    downPaymentMode,
    downPaymentInput,
    downPaymentAmount: downPaymentMode === "percent" ? (homePrice * downPaymentInput) / 100 : downPaymentInput,
    propertyTaxRate: Math.max(0, state.propertyTaxRate ?? MORTGAGE_DEFAULTS.propertyTaxRate),
    insurancePerYear: Math.max(0, state.insurancePerYear ?? MORTGAGE_DEFAULTS.insurancePerYear),
    hoaPerMonth: Math.max(0, state.hoaPerMonth ?? MORTGAGE_DEFAULTS.hoaPerMonth),
    activeLoanId,
    compareLoanId,
    options,
  };
}

export function getMortgageLoanMeta(loanOption: MortgageLoan) {
  if (loanOption.kind === "arm") {
    return `${loanOption.fixedYears}y fixed at ${percent(loanOption.initialRate, 3)}, then ${percent(loanOption.adjustedRate, 3)} / ${Math.round(loanOption.term)}y`;
  }

  return `${percent(loanOption.rate, 3)} / ${Math.round(loanOption.term)}y`;
}
