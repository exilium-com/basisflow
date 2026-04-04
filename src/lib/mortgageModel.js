import { clamp, numberToEditableString, percent, stripToNumber } from "./format";

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

const DEFAULT_ACTIVE_LOAN = LOAN_OPTIONS[0].type;
const DEFAULT_COMPARE_LOAN = LOAN_OPTIONS[1].type;

const RATE_CONFIG = { kind: "percent", decimals: 3, min: 0, max: 25 };
const TERM_CONFIG = { kind: "integer", decimals: 0, min: 1, max: 50 };

export const LOAN_FIELD_CONFIGS = Object.fromEntries(
  LOAN_OPTIONS.map((option) => [
    option.type,
    Object.fromEntries(
      option.fields.map((field) => [
        field.field,
        field.field === "term" ? TERM_CONFIG : RATE_CONFIG,
      ]),
    ),
  ]),
);

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

function getLoanDefinition(type) {
  return LOAN_OPTIONS.find((option) => option.type === type) ?? LOAN_OPTIONS[0];
}

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
            field.field === "adjustedRate"
              ? ""
              : String(option.defaults[field.field]),
          ]),
        ),
      ]),
    ),
  };
}

export function getLoanFieldFallback(type, field) {
  const definition = getLoanDefinition(type);

  if (field === "adjustedRate") {
    return definition.defaults.initialRate ?? 0;
  }

  return definition.defaults[field] ?? 0;
}

export function sanitizeMortgageValue(rawValue, config, fallback, options = {}) {
  const value =
    typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
  if (options.allowBlank && value.trim() === "") {
    return "";
  }

  const parsed = stripToNumber(value);
  const safeValue = Number.isFinite(parsed)
    ? clamp(parsed, config.min, config.max)
    : fallback;
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

export function isMortgageValueValid(rawValue, config, options = {}) {
  const value =
    typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
  if (options.allowBlank && value.trim() === "") {
    return true;
  }

  const parsed = stripToNumber(value);
  return (
    Number.isFinite(parsed) && parsed >= config.min && parsed <= config.max
  );
}

export function getDownPaymentNumericValue(homePrice, rawValue, mode) {
  const fallback =
    mode === "percent"
      ? NUMERIC_DEFAULTS.downPaymentPercent
      : (NUMERIC_DEFAULTS.homePrice * NUMERIC_DEFAULTS.downPaymentPercent) /
        100;
  const parsed = stripToNumber(rawValue);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;

  if (mode === "percent") {
    return clamp(safeValue, 0, 100);
  }

  return clamp(safeValue, 0, homePrice);
}

export function sanitizeMortgageDownPayment(rawValue, homePrice, mode) {
  const safeValue = getDownPaymentNumericValue(homePrice, rawValue, mode);
  return mode === "percent"
    ? numberToEditableString(safeValue, 3)
    : numberToEditableString(safeValue, 0);
}

export function isDownPaymentValid(rawValue, homePrice, mode) {
  const parsed = stripToNumber(rawValue);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return mode === "percent"
    ? parsed >= 0 && parsed <= 100
    : parsed >= 0 && parsed <= homePrice;
}

export function normalizeMortgageState(parsed, fallback) {
  const defaults = fallback;

  const loanOptions = Object.fromEntries(
    LOAN_OPTIONS.map((option) => [
      option.type,
      Object.fromEntries(
        option.fields.map((field) => {
          const nestedValue = parsed?.loanOptions?.[option.type]?.[field.field];
          const legacyValue = parsed?.[field.htmlFor];
          const fallbackValue = defaults.loanOptions[option.type][field.field];

          return [
            field.field,
            typeof nestedValue === "string"
              ? nestedValue
              : typeof legacyValue === "string"
                ? legacyValue
                : fallbackValue,
          ];
        }),
      ),
    ]),
  );

  return {
    homePrice:
      typeof parsed?.homePrice === "string"
        ? parsed.homePrice
        : defaults.homePrice,
    downPaymentMode:
      parsed?.downPaymentMode === "dollar"
        ? "dollar"
        : defaults.downPaymentMode,
    downPayment:
      typeof parsed?.downPayment === "string"
        ? parsed.downPayment
        : defaults.downPayment,
    propertyTaxRate:
      typeof parsed?.propertyTaxRate === "string"
        ? parsed.propertyTaxRate
        : defaults.propertyTaxRate,
    insurancePerYear:
      typeof parsed?.insurancePerYear === "string"
        ? parsed.insurancePerYear
        : defaults.insurancePerYear,
    hoaPerMonth:
      typeof parsed?.hoaPerMonth === "string"
        ? parsed.hoaPerMonth
        : defaults.hoaPerMonth,
    advancedOpen: Boolean(parsed?.advancedOpen),
    activeLoanType: LOAN_DEFAULTS[parsed?.activeLoanType]
      ? parsed.activeLoanType
      : defaults.activeLoanType,
    compareLoanType: LOAN_DEFAULTS[parsed?.compareLoanType]
      ? parsed.compareLoanType
      : defaults.compareLoanType,
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
  const homePrice = readSafeMortgageValue(
    state.homePrice,
    FIELD_CONFIGS.homePrice,
    NUMERIC_DEFAULTS.homePrice,
  );
  const downPaymentInput = getDownPaymentNumericValue(
    homePrice,
    state.downPayment,
    state.downPaymentMode,
  );
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
    hoaPerMonth: readSafeMortgageValue(
      state.hoaPerMonth,
      FIELD_CONFIGS.hoaPerMonth,
      NUMERIC_DEFAULTS.hoaPerMonth,
    ),
    activeLoanType: LOAN_DEFAULTS[state.activeLoanType]
      ? state.activeLoanType
      : DEFAULT_ACTIVE_LOAN,
    compareLoanType: LOAN_DEFAULTS[state.compareLoanType]
      ? state.compareLoanType
      : DEFAULT_COMPARE_LOAN,
    loanOptions: readLoanOptions(state),
  };
}

function calculateMonthlyPayment(principal, annualRate, totalMonths) {
  if (principal <= 0 || totalMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return principal / totalMonths;
  }

  return (
    principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -totalMonths)))
  );
}

function appendScheduleSegment(schedule, options) {
  const {
    balance: startingBalance,
    annualRate,
    payment,
    segmentMonths,
    startMonth,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  } = options;

  let balance = startingBalance;
  let totalInterest = 0;
  const monthlyRate = annualRate / 100 / 12;

  for (let offset = 0; offset < segmentMonths && balance > 0.005; offset += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    let principal = payment - interest;

    if (principal > balance) {
      principal = balance;
    }
    if (principal < 0) {
      principal = 0;
    }

    const fullPayment =
      principal + interest + monthlyTax + monthlyInsurance + monthlyHoa;
    balance = Math.max(0, balance - principal);
    totalInterest += interest;

    schedule.push({
      month: startMonth + offset,
      payment: fullPayment,
      principal,
      interest,
      balance,
    });
  }

  return {
    balance,
    totalInterest,
  };
}

function generateFixedSchedule(params) {
  const {
    loanAmount,
    annualRate,
    totalMonths,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  } = params;

  const schedule = [];
  const payment = calculateMonthlyPayment(loanAmount, annualRate, totalMonths);
  const result = appendScheduleSegment(schedule, {
    balance: loanAmount,
    annualRate,
    payment,
    segmentMonths: totalMonths,
    startMonth: 1,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  });

  return {
    schedule,
    payment,
    totalInterest: result.totalInterest,
    modeledMonths: schedule.length,
  };
}

function generateArmSchedule(params) {
  const {
    loanAmount,
    totalMonths,
    initialRate,
    adjustedRate,
    resetYears,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  } = params;

  const schedule = [];
  const initialMonths = Math.min(resetYears * 12, totalMonths);
  const initialPayment = calculateMonthlyPayment(
    loanAmount,
    initialRate,
    totalMonths,
  );

  const initialResult = appendScheduleSegment(schedule, {
    balance: loanAmount,
    annualRate: initialRate,
    payment: initialPayment,
    segmentMonths: initialMonths,
    startMonth: 1,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
  });

  let totalInterest = initialResult.totalInterest;
  let resetPayment = initialPayment;
  let finalBalance = initialResult.balance;

  const remainingMonths = Math.max(totalMonths - schedule.length, 0);
  if (remainingMonths > 0 && finalBalance > 0.005) {
    resetPayment = calculateMonthlyPayment(
      finalBalance,
      adjustedRate,
      remainingMonths,
    );

    const adjustedResult = appendScheduleSegment(schedule, {
      balance: finalBalance,
      annualRate: adjustedRate,
      payment: resetPayment,
      segmentMonths: remainingMonths,
      startMonth: initialMonths + 1,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
    });

    totalInterest += adjustedResult.totalInterest;
    finalBalance = adjustedResult.balance;
  }

  return {
    schedule,
    payment: initialPayment,
    resetPayment,
    totalInterest,
    modeledMonths: schedule.length,
    finalBalance,
  };
}

function yearlyComposition(schedule) {
  const yearsList = [];

  schedule.forEach((row) => {
    const yearIndex = Math.floor((row.month - 1) / 12);
    if (!yearsList[yearIndex]) {
      yearsList[yearIndex] = {
        year: yearIndex + 1,
        principal: 0,
        interest: 0,
      };
    }

    yearsList[yearIndex].principal += row.principal;
    yearsList[yearIndex].interest += row.interest;
  });

  return yearsList;
}

export function buildMortgageScenario(
  inputs,
  selectedType = inputs.activeLoanType,
) {
  const loanOption =
    inputs.loanOptions[selectedType] || inputs.loanOptions[DEFAULT_ACTIVE_LOAN];
  const loanAmount = Math.max(0, inputs.homePrice - inputs.downPaymentAmount);
  const monthlyTax = (inputs.homePrice * (inputs.propertyTaxRate / 100)) / 12;
  const monthlyInsurance = inputs.insurancePerYear / 12;
  const monthlyHoa = inputs.hoaPerMonth;
  const totalMonths = Math.max(1, Math.round(loanOption.term * 12));
  const isArm = loanOption.kind === "arm";

  let scheduleData;
  let primaryRate = isArm ? loanOption.initialRate : loanOption.rate;
  let armDetails = null;

  if (isArm) {
    scheduleData = generateArmSchedule({
      loanAmount,
      totalMonths,
      initialRate: loanOption.initialRate,
      adjustedRate: loanOption.adjustedRate,
      resetYears: loanOption.fixedYears,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
    });

    armDetails = {
      resetYears: loanOption.fixedYears,
      adjustedRate: loanOption.adjustedRate,
      resetPayment: scheduleData.resetPayment,
    };
  } else {
    scheduleData = generateFixedSchedule({
      loanAmount,
      annualRate: loanOption.rate,
      totalMonths,
      monthlyTax,
      monthlyInsurance,
      monthlyHoa,
    });
  }

  const firstRow = scheduleData.schedule[0];
  const totalMonthlyPayment = firstRow ? firstRow.payment : 0;

  return {
    inputs,
    type: selectedType,
    typeLabel: loanOption.label,
    isArm,
    primaryRate,
    loanAmount,
    monthlyTax,
    monthlyInsurance,
    monthlyHoa,
    principalInterest: scheduleData.payment,
    totalMonthlyPayment,
    totalInterest: scheduleData.totalInterest,
    schedule: scheduleData.schedule,
    modeledMonths: scheduleData.modeledMonths,
    armDetails,
    yearlyBreakdown: yearlyComposition(scheduleData.schedule),
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

export function getMortgageValidation(state) {
  const homePrice = readSafeMortgageValue(
    state.homePrice,
    FIELD_CONFIGS.homePrice,
    NUMERIC_DEFAULTS.homePrice,
  );

  const loanOptions = Object.fromEntries(
    LOAN_OPTIONS.map((option) => [
      option.type,
      Object.fromEntries(
        option.fields.map((field) => [
          field.field,
          !isMortgageValueValid(
            state.loanOptions[option.type][field.field],
            LOAN_FIELD_CONFIGS[option.type][field.field],
            field.field === "adjustedRate" ? { allowBlank: true } : {},
          ),
        ]),
      ),
    ]),
  );

  return {
    homePrice: !isMortgageValueValid(state.homePrice, FIELD_CONFIGS.homePrice),
    downPayment: !isDownPaymentValid(
      state.downPayment,
      homePrice,
      state.downPaymentMode,
    ),
    propertyTaxRate: !isMortgageValueValid(
      state.propertyTaxRate,
      FIELD_CONFIGS.propertyTaxRate,
    ),
    insurancePerYear: !isMortgageValueValid(
      state.insurancePerYear,
      FIELD_CONFIGS.insurancePerYear,
    ),
    hoaPerMonth: !isMortgageValueValid(
      state.hoaPerMonth,
      FIELD_CONFIGS.hoaPerMonth,
    ),
    loanOptions,
  };
}
