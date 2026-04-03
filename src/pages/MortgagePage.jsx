import React, { useEffect, useMemo } from "react";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { ActionButton } from "../components/ActionButton";
import { ChartPanel } from "../components/ChartPanel";
import { NumberField, fieldLabelClass } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { Section } from "../components/Section";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { buildLinePath, getChartFrame } from "../lib/chart";
import { cx } from "../lib/cx";
import {
  clamp,
  numberToEditableString,
  percent,
  stripToNumber,
  usd,
  years,
} from "../lib/format";
import { saveJson } from "../lib/storage";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";

const COOKIE_NAME = "finance_tools_mortgage_v1";
const SUMMARY_COOKIE_NAME = "finance_tools_mortgage_summary_v1";
const LOAN_ORDER = ["fixed30", "arm76", "arm106"];

const LOAN_DEFAULTS = {
  fixed30: { label: "30-year fixed", kind: "fixed", term: 30, rate: 6.475 },
  arm76: {
    label: "7/1 ARM",
    kind: "arm",
    fixedYears: 7,
    term: 30,
    initialRate: 5.635,
    adjustedRate: 7.135,
  },
  arm106: {
    label: "10/1 ARM",
    kind: "arm",
    fixedYears: 10,
    term: 30,
    initialRate: 5.875,
    adjustedRate: 7.375,
  },
};

const FIELD_CONFIGS = {
  homePrice: { kind: "currency", decimals: 0, min: 1, max: 100000000 },
  propertyTaxRate: { kind: "percent", decimals: 3, min: 0, max: 10 },
  insurancePerYear: { kind: "currency", decimals: 0, min: 0, max: 1000000 },
  hoaPerMonth: { kind: "currency", decimals: 0, min: 0, max: 100000 },
};

const LOAN_FIELD_CONFIGS = {
  fixed30: {
    rate: { kind: "percent", decimals: 3, min: 0, max: 25 },
    term: { kind: "integer", decimals: 0, min: 1, max: 50 },
  },
  arm76: {
    initialRate: { kind: "percent", decimals: 3, min: 0, max: 25 },
    adjustedRate: { kind: "percent", decimals: 3, min: 0, max: 25 },
    term: { kind: "integer", decimals: 0, min: 1, max: 50 },
  },
  arm106: {
    initialRate: { kind: "percent", decimals: 3, min: 0, max: 25 },
    adjustedRate: { kind: "percent", decimals: 3, min: 0, max: 25 },
    term: { kind: "integer", decimals: 0, min: 1, max: 50 },
  },
};

const NUMERIC_DEFAULTS = {
  homePrice: 1250000,
  downPaymentPercent: 20,
  propertyTaxRate: 1.18,
  insurancePerYear: 1800,
  hoaPerMonth: 0,
};

const LOAN_FORM_FIELDS = {
  fixed30: [
    {
      field: "rate",
      label: "Interest rate",
      htmlFor: "rate_fixed30",
      suffix: "%",
      step: "0.001",
    },
    {
      field: "term",
      label: "Loan term",
      htmlFor: "term_fixed30",
      suffix: "years",
      step: "1",
    },
  ],
  arm76: [
    {
      field: "initialRate",
      label: "Initial rate",
      htmlFor: "rate_arm76_initial",
      suffix: "%",
      step: "0.001",
    },
    {
      field: "adjustedRate",
      label: "Reset rate",
      htmlFor: "rate_arm76_adjusted",
      suffix: "%",
      step: "0.001",
      placeholderFrom: "initialRate",
    },
    {
      field: "term",
      label: "Loan term",
      htmlFor: "term_arm76",
      suffix: "years",
      step: "1",
    },
  ],
  arm106: [
    {
      field: "initialRate",
      label: "Initial rate",
      htmlFor: "rate_arm106_initial",
      suffix: "%",
      step: "0.001",
    },
    {
      field: "adjustedRate",
      label: "Reset rate",
      htmlFor: "rate_arm106_adjusted",
      suffix: "%",
      step: "0.001",
      placeholderFrom: "initialRate",
    },
    {
      field: "term",
      label: "Loan term",
      htmlFor: "term_arm106",
      suffix: "years",
      step: "1",
    },
  ],
};

const ADVANCED_FIELDS = [
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

function createDefaultState() {
  return {
    homePrice: String(NUMERIC_DEFAULTS.homePrice),
    downPaymentMode: "percent",
    downPayment: String(NUMERIC_DEFAULTS.downPaymentPercent),
    propertyTaxRate: String(NUMERIC_DEFAULTS.propertyTaxRate),
    insurancePerYear: String(NUMERIC_DEFAULTS.insurancePerYear),
    hoaPerMonth: String(NUMERIC_DEFAULTS.hoaPerMonth),
    advancedOpen: false,
    activeLoanType: "fixed30",
    compareLoanType: "arm76",
    loanOptions: {
      fixed30: {
        rate: String(LOAN_DEFAULTS.fixed30.rate),
        term: String(LOAN_DEFAULTS.fixed30.term),
      },
      arm76: {
        initialRate: String(LOAN_DEFAULTS.arm76.initialRate),
        adjustedRate: "",
        term: String(LOAN_DEFAULTS.arm76.term),
      },
      arm106: {
        initialRate: String(LOAN_DEFAULTS.arm106.initialRate),
        adjustedRate: "",
        term: String(LOAN_DEFAULTS.arm106.term),
      },
    },
  };
}

function getLoanFieldFallback(type, field) {
  if (type === "fixed30" && field === "rate") {
    return LOAN_DEFAULTS.fixed30.rate;
  }
  if (field === "term") {
    return LOAN_DEFAULTS[type].term;
  }
  if (field === "initialRate") {
    return LOAN_DEFAULTS[type].initialRate;
  }
  if (field === "adjustedRate") {
    return LOAN_DEFAULTS[type].initialRate;
  }
  return 0;
}

function sanitizeValue(rawValue, config, fallback, options = {}) {
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

function readSafeValue(rawValue, config, fallback) {
  const parsed = stripToNumber(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, config.min, config.max);
}

function isValueValid(rawValue, config, options = {}) {
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

function getDownPaymentNumericValue(homePrice, rawValue, mode) {
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

function sanitizeDownPayment(rawValue, homePrice, mode) {
  const safeValue = getDownPaymentNumericValue(homePrice, rawValue, mode);
  return mode === "percent"
    ? numberToEditableString(safeValue, 3)
    : numberToEditableString(safeValue, 0);
}

function isDownPaymentValid(rawValue, homePrice, mode) {
  const parsed = stripToNumber(rawValue);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  return mode === "percent"
    ? parsed >= 0 && parsed <= 100
    : parsed >= 0 && parsed <= homePrice;
}

function normalizeState(parsed, fallback) {
  const defaults = fallback;

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
    loanOptions: {
      fixed30: {
        rate:
          typeof parsed?.loanOptions?.fixed30?.rate === "string"
            ? parsed.loanOptions.fixed30.rate
            : typeof parsed?.rate_fixed30 === "string"
              ? parsed.rate_fixed30
              : defaults.loanOptions.fixed30.rate,
        term:
          typeof parsed?.loanOptions?.fixed30?.term === "string"
            ? parsed.loanOptions.fixed30.term
            : typeof parsed?.term_fixed30 === "string"
              ? parsed.term_fixed30
              : defaults.loanOptions.fixed30.term,
      },
      arm76: {
        initialRate:
          typeof parsed?.loanOptions?.arm76?.initialRate === "string"
            ? parsed.loanOptions.arm76.initialRate
            : typeof parsed?.rate_arm76_initial === "string"
              ? parsed.rate_arm76_initial
              : defaults.loanOptions.arm76.initialRate,
        adjustedRate:
          typeof parsed?.loanOptions?.arm76?.adjustedRate === "string"
            ? parsed.loanOptions.arm76.adjustedRate
            : typeof parsed?.rate_arm76_adjusted === "string"
              ? parsed.rate_arm76_adjusted
              : defaults.loanOptions.arm76.adjustedRate,
        term:
          typeof parsed?.loanOptions?.arm76?.term === "string"
            ? parsed.loanOptions.arm76.term
            : typeof parsed?.term_arm76 === "string"
              ? parsed.term_arm76
              : defaults.loanOptions.arm76.term,
      },
      arm106: {
        initialRate:
          typeof parsed?.loanOptions?.arm106?.initialRate === "string"
            ? parsed.loanOptions.arm106.initialRate
            : typeof parsed?.rate_arm106_initial === "string"
              ? parsed.rate_arm106_initial
              : defaults.loanOptions.arm106.initialRate,
        adjustedRate:
          typeof parsed?.loanOptions?.arm106?.adjustedRate === "string"
            ? parsed.loanOptions.arm106.adjustedRate
            : typeof parsed?.rate_arm106_adjusted === "string"
              ? parsed.rate_arm106_adjusted
              : defaults.loanOptions.arm106.adjustedRate,
        term:
          typeof parsed?.loanOptions?.arm106?.term === "string"
            ? parsed.loanOptions.arm106.term
            : typeof parsed?.term_arm106 === "string"
              ? parsed.term_arm106
              : defaults.loanOptions.arm106.term,
      },
    },
  };
}

function readLoanOptions(state) {
  const arm76InitialRate = readSafeValue(
    state.loanOptions.arm76.initialRate,
    LOAN_FIELD_CONFIGS.arm76.initialRate,
    LOAN_DEFAULTS.arm76.initialRate,
  );
  const arm76AdjustedRaw = stripToNumber(state.loanOptions.arm76.adjustedRate);
  const arm106InitialRate = readSafeValue(
    state.loanOptions.arm106.initialRate,
    LOAN_FIELD_CONFIGS.arm106.initialRate,
    LOAN_DEFAULTS.arm106.initialRate,
  );
  const arm106AdjustedRaw = stripToNumber(
    state.loanOptions.arm106.adjustedRate,
  );

  return {
    fixed30: {
      kind: "fixed",
      label: LOAN_DEFAULTS.fixed30.label,
      rate: readSafeValue(
        state.loanOptions.fixed30.rate,
        LOAN_FIELD_CONFIGS.fixed30.rate,
        LOAN_DEFAULTS.fixed30.rate,
      ),
      term: readSafeValue(
        state.loanOptions.fixed30.term,
        LOAN_FIELD_CONFIGS.fixed30.term,
        LOAN_DEFAULTS.fixed30.term,
      ),
    },
    arm76: {
      kind: "arm",
      label: LOAN_DEFAULTS.arm76.label,
      fixedYears: LOAN_DEFAULTS.arm76.fixedYears,
      initialRate: arm76InitialRate,
      adjustedRate: Number.isFinite(arm76AdjustedRaw)
        ? clamp(
            arm76AdjustedRaw,
            LOAN_FIELD_CONFIGS.arm76.adjustedRate.min,
            LOAN_FIELD_CONFIGS.arm76.adjustedRate.max,
          )
        : arm76InitialRate,
      term: readSafeValue(
        state.loanOptions.arm76.term,
        LOAN_FIELD_CONFIGS.arm76.term,
        LOAN_DEFAULTS.arm76.term,
      ),
    },
    arm106: {
      kind: "arm",
      label: LOAN_DEFAULTS.arm106.label,
      fixedYears: LOAN_DEFAULTS.arm106.fixedYears,
      initialRate: arm106InitialRate,
      adjustedRate: Number.isFinite(arm106AdjustedRaw)
        ? clamp(
            arm106AdjustedRaw,
            LOAN_FIELD_CONFIGS.arm106.adjustedRate.min,
            LOAN_FIELD_CONFIGS.arm106.adjustedRate.max,
          )
        : arm106InitialRate,
      term: readSafeValue(
        state.loanOptions.arm106.term,
        LOAN_FIELD_CONFIGS.arm106.term,
        LOAN_DEFAULTS.arm106.term,
      ),
    },
  };
}

function normalizeInputs(state) {
  const homePrice = readSafeValue(
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
    propertyTaxRate: readSafeValue(
      state.propertyTaxRate,
      FIELD_CONFIGS.propertyTaxRate,
      NUMERIC_DEFAULTS.propertyTaxRate,
    ),
    insurancePerYear: readSafeValue(
      state.insurancePerYear,
      FIELD_CONFIGS.insurancePerYear,
      NUMERIC_DEFAULTS.insurancePerYear,
    ),
    hoaPerMonth: readSafeValue(
      state.hoaPerMonth,
      FIELD_CONFIGS.hoaPerMonth,
      NUMERIC_DEFAULTS.hoaPerMonth,
    ),
    activeLoanType: LOAN_DEFAULTS[state.activeLoanType]
      ? state.activeLoanType
      : "fixed30",
    compareLoanType: LOAN_DEFAULTS[state.compareLoanType]
      ? state.compareLoanType
      : "arm76",
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

function buildScenario(inputs, selectedType = inputs.activeLoanType) {
  const loanOption =
    inputs.loanOptions[selectedType] || inputs.loanOptions.fixed30;
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

function getLoanMeta(loanOption) {
  if (loanOption.kind === "arm") {
    return Math.abs(loanOption.adjustedRate - loanOption.initialRate) < 0.0005
      ? `${percent(loanOption.initialRate, 3)} / ${Math.round(loanOption.term)}y`
      : `${percent(loanOption.initialRate, 3)} to ${percent(loanOption.adjustedRate, 3)} / ${Math.round(loanOption.term)}y`;
  }

  return `${percent(loanOption.rate, 3)} / ${Math.round(loanOption.term)}y`;
}

function EmptyChart({ message, label }) {
  return (
    <svg viewBox="0 0 720 320" role="img" aria-label={label}>
      <rect
        x="18"
        y="18"
        width="684"
        height="284"
        fill="var(--white-soft)"
        stroke="var(--line-soft)"
      />
      <text
        x="360"
        y="168"
        textAnchor="middle"
        fill="var(--ink-soft)"
        fontSize="18"
        fontFamily="Avenir Next, Segoe UI, sans-serif"
      >
        {message}
      </text>
    </svg>
  );
}

function BalanceChart({ scenario }) {
  const schedule = scenario.schedule;

  if (!schedule.length || scenario.loanAmount <= 0) {
    return (
      <EmptyChart
        label="Remaining balance over time chart"
        message="Enter a loan amount to draw the balance curve."
      />
    );
  }

  const {
    height,
    innerWidth,
    innerHeight,
    plotLeft,
    plotTop,
    plotRight,
    plotBottom,
  } = getChartFrame();
  const totalMonths = schedule.length;
  const maxBalance = scenario.loanAmount;
  const points = [
    { month: 0, balance: scenario.loanAmount },
    ...schedule.map((row) => ({ month: row.month, balance: row.balance })),
  ].map((point) => ({
    x: plotLeft + (point.month / totalMonths) * innerWidth,
    y: plotTop + ((maxBalance - point.balance) / maxBalance) * innerHeight,
  }));
  const areaPath = `${buildLinePath(points)} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
  const linePath = buildLinePath(points);
  const tickValues = [
    ...new Set(
      [0, 0.25, 0.5, 0.75, 1].map((fraction) =>
        Math.round(totalMonths * fraction),
      ),
    ),
  ];

  return (
    <svg
      viewBox="0 0 720 320"
      role="img"
      aria-label="Remaining balance over time chart"
    >
      <defs>
        <linearGradient id="balanceAreaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--teal-soft)" />
          <stop offset="100%" stopColor="var(--white)" />
        </linearGradient>
      </defs>
      <rect
        x={plotLeft}
        y={plotTop}
        width={innerWidth}
        height={innerHeight}
        fill="var(--white)"
        stroke="var(--line-soft)"
      />
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const y = plotTop + innerHeight * fraction;
        const balance = maxBalance * (1 - fraction);
        return (
          <g key={fraction}>
            <line
              x1={plotLeft}
              y1={y}
              x2={plotRight}
              y2={y}
              stroke="var(--line-soft)"
              strokeDasharray="4 8"
            />
            <text
              x={plotLeft - 12}
              y={y + 5}
              textAnchor="end"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {usd(balance)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#balanceAreaGradient)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={plotRight}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Remaining balance
      </text>
      {tickValues.map((month) => {
        const x = plotLeft + (month / totalMonths) * innerWidth;
        const yearValue = month / 12;
        const label = Number.isInteger(yearValue)
          ? String(yearValue)
          : yearValue.toFixed(1);
        return (
          <g key={month}>
            <line
              x1={x}
              y1={plotBottom}
              x2={x}
              y2={plotBottom + 6}
              stroke="var(--line)"
            />
            <text
              x={x}
              y={height - 12}
              textAnchor="middle"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {label}y
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CompositionChart({ scenario }) {
  const breakdown = scenario.yearlyBreakdown;

  if (!breakdown.length) {
    return (
      <EmptyChart
        label="Principal versus interest by year chart"
        message="Enter a loan amount to draw the payment mix."
      />
    );
  }

  const {
    height,
    innerWidth,
    innerHeight,
    plotLeft,
    plotTop,
    plotRight,
    plotBottom,
  } = getChartFrame();
  const maxTotal = Math.max(
    ...breakdown.map((year) => year.principal + year.interest),
    1,
  );
  const step = innerWidth / breakdown.length;
  const barWidth = Math.max(Math.min(step * 0.72, 42), 8);

  return (
    <svg
      viewBox="0 0 720 320"
      role="img"
      aria-label="Principal versus interest by year chart"
    >
      <rect
        x={plotLeft}
        y={plotTop}
        width={innerWidth}
        height={innerHeight}
        fill="var(--white)"
        stroke="var(--line-soft)"
      />
      {[0, 0.5, 1].map((fraction) => {
        const value = maxTotal * fraction;
        const y = plotBottom - innerHeight * fraction;
        return (
          <g key={fraction}>
            <line
              x1={plotLeft}
              y1={y}
              x2={plotRight}
              y2={y}
              stroke="var(--line-soft)"
              strokeDasharray="4 8"
            />
            <text
              x={plotLeft - 12}
              y={y + 5}
              textAnchor="end"
              fill="var(--ink-soft)"
              fontSize="12"
            >
              {usd(value)}
            </text>
          </g>
        );
      })}
      <line
        x1={plotLeft}
        y1={plotBottom}
        x2={plotRight}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <line
        x1={plotLeft}
        y1={plotTop}
        x2={plotLeft}
        y2={plotBottom}
        stroke="var(--line)"
      />
      <text x={plotLeft} y={plotTop - 6} fill="var(--ink-soft)" fontSize="12">
        Annual payment mix
      </text>
      {breakdown.map((year, index) => {
        const x = plotLeft + index * step + (step - barWidth) / 2;
        const total = year.principal + year.interest;
        const totalHeight = (total / maxTotal) * innerHeight;
        const principalHeight =
          total > 0 ? (year.principal / maxTotal) * innerHeight : 0;
        const interestHeight = totalHeight - principalHeight;
        const y = plotBottom - totalHeight;
        const principalY = plotBottom - principalHeight;
        const shouldLabel =
          breakdown.length <= 12 ||
          index === 0 ||
          year.year % 5 === 0 ||
          index === breakdown.length - 1;

        return (
          <g key={year.year}>
            <title>{`Year ${year.year}: ${usd(year.principal)} principal, ${usd(year.interest)} interest`}</title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(interestHeight, 0)}
              fill="var(--clay)"
            />
            <rect
              x={x}
              y={principalY}
              width={barWidth}
              height={Math.max(principalHeight, 0)}
              fill="var(--teal)"
            />
            {shouldLabel ? (
              <text
                x={x + barWidth / 2}
                y={height - 14}
                textAnchor="middle"
                fill="var(--ink-soft)"
                fontSize="12"
              >
                {year.year}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function LoanOptionCard({
  option,
  active,
  compareSelected,
  meta,
  onSelect,
  onCompare,
  children,
}) {
  const selectButtonClassName =
    "grid w-full items-center gap-4 border-0 bg-transparent px-4 py-3 text-left text-(--ink)";
  const metaTextClassName =
    "whitespace-nowrap text-sm font-bold text-(--ink-soft)";
  const compareButtonClassName =
    "min-w-24 border-0 border-l border-l-(--line-soft) bg-transparent px-4 py-0 text-sm font-bold text-(--ink-soft)";
  const detailBodyClassName =
    "border-t border-t-(--line-soft) px-4 pt-3 pb-4";

  return (
    <article
      className={cx(
        "border border-(--line) bg-(--white-soft)",
        active && "border-(--teal) bg-(--white)",
        compareSelected && !active && "border-(--clay) bg-(--paper-soft)",
      )}
    >
      <div className="flex items-stretch gap-3">
        <button
          className={cx(selectButtonClassName, "flex-1")}
          type="button"
          aria-expanded={active}
          onClick={onSelect}
        >
          <span className="text-base font-bold">
            {option.label}
          </span>
          <span className={metaTextClassName}>{meta}</span>
        </button>
        <button
          className={cx(
            compareButtonClassName,
            compareSelected && "bg-(--teal-soft) text-(--teal)",
          )}
          type="button"
          aria-pressed={compareSelected}
          onClick={onCompare}
        >
          Compare
        </button>
      </div>
      <div className={detailBodyClassName} hidden={!active}>
        {children}
      </div>
    </article>
  );
}

export function MortgagePage() {
  const [state, setState] = useStoredState(COOKIE_NAME, createDefaultState, {
    normalize: normalizeState,
  });
  const inputs = useMemo(() => normalizeInputs(state), [state]);
  const scenario = useMemo(() => buildScenario(inputs), [inputs]);
  const compareScenario = useMemo(
    () => buildScenario(inputs, inputs.compareLoanType),
    [inputs],
  );

  useEffect(() => {
    const yearlyLoan = scenario.yearlyBreakdown.map((row) => {
      const monthIndex = Math.min(row.year * 12, scenario.schedule.length) - 1;
      const endingBalance =
        monthIndex >= 0
          ? scenario.schedule[monthIndex].balance
          : scenario.loanAmount;

      return {
        year: row.year,
        principal: row.principal,
        interest: row.interest,
        endingBalance,
      };
    });

    saveJson(SUMMARY_COOKIE_NAME, {
      type: scenario.type,
      typeLabel: scenario.typeLabel,
      isArm: scenario.isArm,
      homePrice: scenario.inputs.homePrice,
      currentEquity: scenario.inputs.homePrice - scenario.loanAmount,
      loanAmount: scenario.loanAmount,
      totalMonthlyPayment: scenario.totalMonthlyPayment,
      principalInterest: scenario.principalInterest,
      monthlyTax: scenario.monthlyTax,
      monthlyInsurance: scenario.monthlyInsurance,
      monthlyHoa: scenario.monthlyHoa,
      totalInterest: scenario.totalInterest,
      yearlyLoan,
    });
  }, [scenario]);

  const validation = useMemo(() => {
    const homePrice = readSafeValue(
      state.homePrice,
      FIELD_CONFIGS.homePrice,
      NUMERIC_DEFAULTS.homePrice,
    );

    return {
      homePrice: !isValueValid(state.homePrice, FIELD_CONFIGS.homePrice),
      downPayment: !isDownPaymentValid(
        state.downPayment,
        homePrice,
        state.downPaymentMode,
      ),
      propertyTaxRate: !isValueValid(
        state.propertyTaxRate,
        FIELD_CONFIGS.propertyTaxRate,
      ),
      insurancePerYear: !isValueValid(
        state.insurancePerYear,
        FIELD_CONFIGS.insurancePerYear,
      ),
      hoaPerMonth: !isValueValid(state.hoaPerMonth, FIELD_CONFIGS.hoaPerMonth),
      loanOptions: {
        fixed30: {
          rate: !isValueValid(
            state.loanOptions.fixed30.rate,
            LOAN_FIELD_CONFIGS.fixed30.rate,
          ),
          term: !isValueValid(
            state.loanOptions.fixed30.term,
            LOAN_FIELD_CONFIGS.fixed30.term,
          ),
        },
        arm76: {
          initialRate: !isValueValid(
            state.loanOptions.arm76.initialRate,
            LOAN_FIELD_CONFIGS.arm76.initialRate,
          ),
          adjustedRate: !isValueValid(
            state.loanOptions.arm76.adjustedRate,
            LOAN_FIELD_CONFIGS.arm76.adjustedRate,
            { allowBlank: true },
          ),
          term: !isValueValid(
            state.loanOptions.arm76.term,
            LOAN_FIELD_CONFIGS.arm76.term,
          ),
        },
        arm106: {
          initialRate: !isValueValid(
            state.loanOptions.arm106.initialRate,
            LOAN_FIELD_CONFIGS.arm106.initialRate,
          ),
          adjustedRate: !isValueValid(
            state.loanOptions.arm106.adjustedRate,
            LOAN_FIELD_CONFIGS.arm106.adjustedRate,
            { allowBlank: true },
          ),
          term: !isValueValid(
            state.loanOptions.arm106.term,
            LOAN_FIELD_CONFIGS.arm106.term,
          ),
        },
      },
    };
  }, [state]);

  const comparisonRows = [
    {
      label: "Monthly payment",
      left: usd(scenario.totalMonthlyPayment),
      right: usd(compareScenario.totalMonthlyPayment),
    },
    {
      label: "Principal and interest",
      left: usd(scenario.principalInterest),
      right: usd(compareScenario.principalInterest),
    },
    {
      label: "Rate",
      left: percent(scenario.primaryRate, 3),
      right: percent(compareScenario.primaryRate, 3),
    },
    {
      label: "Total interest",
      left: usd(scenario.totalInterest),
      right: usd(compareScenario.totalInterest),
    },
  ];

  const summaryItems = [
    { label: "Loan amount", value: usd(scenario.loanAmount) },
    {
      label: "Monthly principal and interest",
      value: usd(scenario.principalInterest),
    },
    { label: "Monthly property tax", value: usd(scenario.monthlyTax) },
    { label: "Monthly insurance", value: usd(scenario.monthlyInsurance) },
    { label: "Monthly HOA", value: usd(scenario.monthlyHoa) },
    {
      label: "Total interest over modeled period",
      value: usd(scenario.totalInterest),
    },
    {
      label: "Modeled payoff horizon",
      value: years(Math.ceil(scenario.modeledMonths / 12)),
    },
  ];

  const comparisonLabelClassName =
    "border-b border-b-(--line-soft) py-3 text-left text-sm text-(--ink)";
  const loanOptionFieldsClassName = "grid grid-cols-3 gap-4 max-md:grid-cols-1";
  const advancedGridClassName =
    "grid grid-cols-2 gap-x-4 gap-y-5 max-md:grid-cols-1";
  const sidebarControlsClassName = "grid gap-4";
  const downPaymentFieldClassName = "grid min-w-0 gap-1";
  const chartSectionBodyClassName = "grid gap-4";
  const comparisonArticleClassName =
    "border border-(--line-soft) bg-(--white-soft) px-4 pt-4 pb-2";
  const comparisonValueClassName =
    "border-b border-b-(--line-soft) py-3 text-right text-base font-semibold text-(--ink)";

  function updateState(patch) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateLoanField(type, field, value) {
    setState((current) => ({
      ...current,
      loanOptions: {
        ...current.loanOptions,
        [type]: {
          ...current.loanOptions[type],
          [field]: value,
        },
      },
    }));
  }

  function commitTopField(field) {
    setState((current) => ({
      ...current,
      [field]: sanitizeValue(
        current[field],
        FIELD_CONFIGS[field],
        NUMERIC_DEFAULTS[field],
      ),
    }));
  }

  function commitDownPayment() {
    setState((current) => {
      const homePrice = readSafeValue(
        current.homePrice,
        FIELD_CONFIGS.homePrice,
        NUMERIC_DEFAULTS.homePrice,
      );
      return {
        ...current,
        downPayment: sanitizeDownPayment(
          current.downPayment,
          homePrice,
          current.downPaymentMode,
        ),
      };
    });
  }

  function commitLoanField(type, field) {
    setState((current) => {
      const config = LOAN_FIELD_CONFIGS[type][field];
      const allowBlank = field === "adjustedRate";
      const nextValue = sanitizeValue(
        current.loanOptions[type][field],
        config,
        getLoanFieldFallback(type, field),
        { allowBlank },
      );

      return {
        ...current,
        loanOptions: {
          ...current.loanOptions,
          [type]: {
            ...current.loanOptions[type],
            [field]: nextValue,
          },
        },
      };
    });
  }

  function handleDownPaymentMode(mode) {
    setState((current) => {
      if (current.downPaymentMode === mode) {
        return current;
      }

      const homePrice = readSafeValue(
        current.homePrice,
        FIELD_CONFIGS.homePrice,
        NUMERIC_DEFAULTS.homePrice,
      );
      const currentRaw = getDownPaymentNumericValue(
        homePrice,
        current.downPayment,
        current.downPaymentMode,
      );
      const currentAmount =
        current.downPaymentMode === "percent"
          ? (homePrice * currentRaw) / 100
          : currentRaw;
      const convertedValue =
        mode === "percent"
          ? homePrice > 0
            ? (currentAmount / homePrice) * 100
            : 0
          : currentAmount;

      return {
        ...current,
        downPaymentMode: mode,
        downPayment:
          mode === "percent"
            ? numberToEditableString(convertedValue, 3)
            : numberToEditableString(convertedValue, 0),
      };
    });
  }

  function reset() {
    setState(createDefaultState());
  }

  function renderLoanOptionCard(loanType) {
    const loanConfig = LOAN_DEFAULTS[loanType];
    const loanInputs = inputs.loanOptions[loanType];
    const loanState = state.loanOptions[loanType];
    const loanValidation = validation.loanOptions[loanType];

    return (
      <LoanOptionCard
        key={loanType}
        option={loanConfig}
        active={state.activeLoanType === loanType}
        compareSelected={state.compareLoanType === loanType}
        meta={getLoanMeta(loanInputs)}
        onSelect={() => updateState({ activeLoanType: loanType })}
        onCompare={() => updateState({ compareLoanType: loanType })}
      >
        <div className={loanOptionFieldsClassName}>
          {LOAN_FORM_FIELDS[loanType].map((config) => (
            <NumberField
              key={config.field}
              label={config.label}
              htmlFor={config.htmlFor}
              prefix={config.prefix}
              suffix={config.suffix}
              invalid={loanValidation[config.field]}
              value={loanState[config.field]}
              min={LOAN_FIELD_CONFIGS[loanType][config.field].min}
              max={LOAN_FIELD_CONFIGS[loanType][config.field].max}
              step={config.step}
              placeholder={
                config.placeholderFrom
                  ? String(loanInputs[config.placeholderFrom])
                  : undefined
              }
              onChange={(event) =>
                updateLoanField(loanType, config.field, event.target.value)
              }
              onBlur={commitLoanField.bind(null, loanType, config.field)}
            />
          ))}
        </div>
      </LoanOptionCard>
    );
  }

  return (
    <PageShell
      actions={
        <ActionButton onClick={reset}>
          Reset
        </ActionButton>
      }
    >
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip
                kicker="Estimated monthly payment"
                value={usd(scenario.totalMonthlyPayment)}
              />
              <div className="mt-4 border-b border-(--line) pb-4">
                <div className={sidebarControlsClassName}>
                  <NumberField
                    label="Home price"
                    htmlFor="homePrice"
                    prefix="$"
                    invalid={validation.homePrice}
                    value={state.homePrice}
                    min={FIELD_CONFIGS.homePrice.min}
                    max={FIELD_CONFIGS.homePrice.max}
                    step="1"
                    onChange={(event) =>
                      updateState({ homePrice: event.target.value })
                    }
                    onBlur={commitTopField.bind(null, "homePrice")}
                  />

                  <div className={downPaymentFieldClassName}>
                    <div className={fieldLabelClass}>Down payment</div>
                    <div className="flex items-start gap-2">
                      <SegmentedToggle
                        ariaLabel="Down payment mode"
                        className="shrink-0"
                        value={state.downPaymentMode}
                        onChange={handleDownPaymentMode}
                        options={[
                          { value: "dollar", label: "$" },
                          { value: "percent", label: "%" },
                        ]}
                      />
                      <NumberField
                        label={null}
                        htmlFor="downPayment"
                        className="min-w-0 flex-1"
                        invalid={validation.downPayment}
                        value={state.downPayment}
                        min="0"
                        max={
                          state.downPaymentMode === "dollar"
                            ? inputs.homePrice
                            : 100
                        }
                        step={
                          state.downPaymentMode === "dollar" ? "1" : "0.001"
                        }
                        onChange={(event) =>
                          updateState({ downPayment: event.target.value })
                        }
                        onBlur={commitDownPayment}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <ResultList items={summaryItems} live />
            </>
          }
        >
          <Section title="Loan Options">
            <div className="grid gap-2.5" role="list">
              {LOAN_ORDER.map(renderLoanOptionCard)}
            </div>
          </Section>

          <AdvancedPanel
            id="advancedDetails"
            title="Advanced assumptions"
            open={state.advancedOpen}
            onToggle={(open) => updateState({ advancedOpen: open })}
          >
            <div className={advancedGridClassName}>
              {ADVANCED_FIELDS.map((config) => (
                <NumberField
                  key={config.field}
                  label={config.label}
                  htmlFor={config.field}
                  prefix={config.prefix}
                  suffix={config.suffix}
                  invalid={validation[config.field]}
                  value={state[config.field]}
                  min={FIELD_CONFIGS[config.field].min}
                  max={FIELD_CONFIGS[config.field].max}
                  step={config.step}
                  onChange={(event) =>
                    updateState({ [config.field]: event.target.value })
                  }
                  onBlur={commitTopField.bind(null, config.field)}
                />
              ))}
            </div>
          </AdvancedPanel>

          <Section title="Charts" divider>
            <div className={chartSectionBodyClassName}>
              <ChartPanel
                title="Balance Over Time"
                legend={[{ label: "Remaining balance", color: "#0c6a7c" }]}
              >
                <BalanceChart scenario={scenario} />
              </ChartPanel>
              <ChartPanel
                title="Principal vs Interest"
                legend={[
                  { label: "Principal", color: "#0c6a7c" },
                  { label: "Interest", color: "#d28a47" },
                ]}
              >
                <CompositionChart scenario={scenario} />
              </ChartPanel>
            </div>
          </Section>

          {state.activeLoanType !== state.compareLoanType ? (
            <Section title="Comparison" divider>
              <article className={comparisonArticleClassName}>
                <p className="mb-3 text-sm leading-relaxed text-(--ink-soft)">
                  {`${scenario.typeLabel} against ${compareScenario.typeLabel}`}
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="border-b border-b-(--line-soft) py-2.5 text-left text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)"
                      >
                        Metric
                      </th>
                      <th
                        scope="col"
                        className="border-b border-b-(--line-soft) py-2.5 text-right text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)"
                      >
                        {scenario.typeLabel}
                      </th>
                      <th
                        scope="col"
                        className="border-b border-b-(--line-soft) py-2.5 text-right text-xs font-extrabold uppercase tracking-wide text-(--ink-soft)"
                      >
                        {compareScenario.typeLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label}>
                        <td className={comparisonLabelClassName}>{row.label}</td>
                        <td className={comparisonValueClassName}>{row.left}</td>
                        <td className={comparisonValueClassName}>{row.right}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </Section>
          ) : null}
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
