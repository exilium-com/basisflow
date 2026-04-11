import React, { useEffect, useState } from "react";
import { AdvancedPanel } from "../components/AdvancedPanel";
import { ActionButton } from "../components/ActionButton";
import { ChartPanel } from "../components/ChartPanel";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "../components/Field";
import { MetricGrid } from "../components/MetricGrid";
import { MortgageComparisonTable, MortgageLoanOptionList } from "../components/MortgageLoanOptions";
import { MortgageBalanceChart, MortgageCompositionChart } from "../components/MortgageCharts";
import { MonthlyCashFlowPanel } from "../components/ProjectionCashFlowPanel";
import { NetWorthChart } from "../components/ProjectionLineCharts";
import { ProjectionAssetRows, ProjectionExpenseRows } from "../components/ProjectionRows";
import { ProjectionTable } from "../components/ProjectionTable";
import { RowItem } from "../components/RowItem";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SliderField } from "../components/SliderField";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { PageShell } from "../components/PageShell";
import { useStoredState } from "../hooks/useStoredState";
import {
  DEFAULT_ASSETS_STATE,
  PINNED_BUCKETS,
  buildIncomeDirectedContributions,
  createAssetBucket,
  createAssets,
  deriveAssetsState,
  normalizeAssetsState,
  resolvePinnedBuckets,
  type AssetBucketState,
  type AssetTaxTreatment,
} from "../lib/assetsModel";
import {
  calculateExpenseSnapshot,
  createExpenses,
  DEFAULT_EXPENSES_STATE,
  normalizeExpensesState,
  type ExpenseStateItem,
} from "../lib/expensesModel";
import { readNumber, roundTo, usd } from "../lib/format";
import {
  buildIncomeSummary,
  calculateIncome,
  computeRsuGrossForItems,
  createIncome,
  getAnnualSalaryTotal,
  type RsuInputItem,
  type SalaryFrequency,
  type SalaryInputItem,
} from "../lib/incomeModel";
import {
  createMortgage,
  createMortgageOption,
  DEFAULT_MORTGAGE_STATE,
  normalizeMortgageState,
  type MortgageDownPaymentMode,
  type MortgageLoanField,
  type MortgageState,
} from "../lib/mortgageConfig";
import {
  buildMortgageComparisonRows,
  buildMortgageSummaryItems,
  getMortgageMonthlyPaymentForYear,
  getMortgageYearInterest,
  getMortgageYearPropertyTax,
  serializeMortgageSummary,
} from "../lib/mortgagePage";
import { buildMortgageScenario, type MortgageScenario } from "../lib/mortgageSchedule";
import { calculateProjection } from "../lib/projectionCalculation";
import {
  DEFAULT_PROJECTION_STATE,
  createProjection,
  normalizeProjectionState,
  toDisplayValue,
  type AllocationMode,
  type ProjectionState,
  type ProjectionAssetOverride,
  type ProjectionExpenseOverride,
} from "../lib/projectionState";
import { buildMonthlyCashFlow } from "../lib/projectionUtils";
import { saveJson } from "../lib/storage";
import {
  ASSETS_STATE_KEY,
  EXPENSES_STATE_KEY,
  INCOME_STATE_KEY,
  INCOME_SUMMARY_KEY,
  MORTGAGE_STATE_KEY,
  MORTGAGE_SUMMARY_KEY,
  PROJECTION_STATE_KEY,
} from "../lib/storageKeys";
import { loadTaxConfig, saveTaxConfig, type TaxConfig } from "../lib/taxConfig";
import { surfaceClass } from "../lib/ui";

type SalaryStateItem = {
  id: string;
  type: "salary";
  name: string;
  amount: number | null;
  frequency: SalaryFrequency;
  detailsOpen: boolean;
};

type RsuStateItem = {
  id: string;
  type: "rsu";
  name: string;
  grantAmount: number | null;
  refresherAmount: number | null;
  vestingYears: number | null;
  detailsOpen: boolean;
};

type IncomeStateItem = SalaryStateItem | RsuStateItem;

type IncomeState = {
  incomeItems: IncomeStateItem[];
  employee401k: number;
  matchRate: number;
  iraContribution: number;
  megaBackdoor: number;
  hsaContribution: number;
};

type WorkspaceSectionProps = {
  id: string;
  index: string;
  title: string;
  summary: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const DEFAULT_INCOME_STATE: IncomeState = {
  incomeItems: [createSalaryItem()],
  employee401k: 0,
  matchRate: 50,
  iraContribution: 0,
  megaBackdoor: 0,
  hsaContribution: 0,
};

const INCOME_NUMBER_FIELDS = [
  "employee401k",
  "matchRate",
  "iraContribution",
  "megaBackdoor",
  "hsaContribution",
] as const satisfies ReadonlyArray<keyof IncomeState>;

function createSalaryItem(overrides: Partial<SalaryStateItem> = {}): SalaryStateItem {
  return {
    id: crypto.randomUUID(),
    type: "salary",
    name: "Salary",
    amount: 150000,
    frequency: "annual",
    detailsOpen: false,
    ...overrides,
  };
}

function createRsuItem(overrides: Partial<RsuStateItem> = {}): RsuStateItem {
  return {
    id: crypto.randomUUID(),
    type: "rsu",
    name: "RSU grant",
    grantAmount: 0,
    refresherAmount: 0,
    vestingYears: 4,
    detailsOpen: false,
    ...overrides,
  };
}

function normalizeIncomeItem(item: unknown): IncomeStateItem {
  const candidate = typeof item === "object" && item ? (item as Record<string, unknown>) : {};

  if (candidate.type === "rsu") {
    return createRsuItem({
      id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
      name: typeof candidate.name === "string" ? candidate.name : "RSU grant",
      grantAmount: readNumber(candidate.grantAmount, null),
      refresherAmount: readNumber(candidate.refresherAmount, null),
      vestingYears: readNumber(candidate.vestingYears, null) ?? 4,
      detailsOpen: Boolean(candidate.detailsOpen),
    });
  }

  return createSalaryItem({
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    name: typeof candidate.name === "string" ? candidate.name : "Salary",
    amount: readNumber(candidate.amount, null),
    frequency: candidate.frequency === "monthly" ? "monthly" : "annual",
    detailsOpen: Boolean(candidate.detailsOpen),
  });
}

function normalizeIncomeState(parsed: unknown, fallback: IncomeState): IncomeState {
  const state = typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {};
  const numericState = Object.fromEntries(
    INCOME_NUMBER_FIELDS.map((field) =>
      field === "megaBackdoor"
        ? [field, readNumber(state.megaBackdoor ?? state.megaBackdoorInput, fallback.megaBackdoor)]
        : [field, readNumber(state[field], fallback[field])],
    ),
  ) as Pick<IncomeState, (typeof INCOME_NUMBER_FIELDS)[number]>;

  return {
    ...fallback,
    ...numericState,
    incomeItems:
      Array.isArray(state.incomeItems) && state.incomeItems.length > 0
        ? state.incomeItems.map((item) => normalizeIncomeItem(item))
        : fallback.incomeItems.map((item) => normalizeIncomeItem(item)),
  };
}

function WorkspaceSection({ id, index, title, summary, actions = null, children }: WorkspaceSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-(--line) pt-8 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-end justify-between gap-6">
        <div className="grid gap-2">
          <div className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">{`${index} ${summary}`}</div>
          <h2 className="font-serif text-4xl leading-none tracking-tight text-(--ink)">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function SummaryLinkRow({ href, label, annualValue }: { href: string; label: string; annualValue: number }) {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const value = usd(period === "monthly" ? annualValue / 12 : annualValue, 2);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--line) py-3">
      <a href={href} className="min-w-0 flex-1 text-sm text-(--ink-soft) no-underline transition hover:text-(--ink)">
        {label}
      </a>
      <div className="flex items-baseline gap-1.5">
        <a href={href} className="text-right text-(--ink) no-underline">
          <strong>{value}</strong>
        </a>
        <button
          type="button"
          className="text-xs font-extrabold tracking-wide text-(--ink-soft) transition hover:text-(--ink)"
          onClick={() => setPeriod(period === "annual" ? "monthly" : "annual")}
        >
          {period === "monthly" ? "/ month" : "/ year"}
        </button>
      </div>
    </div>
  );
}

function renderIncomeSummary(item: IncomeStateItem, annualizedSalary: number) {
  if (item.type === "salary") {
    return item.frequency === "monthly" ? `${usd(annualizedSalary)} / year` : "Annual";
  }

  const vestYears = Math.max(1, Math.round(item.vestingYears ?? 4));
  return `${vestYears} year vest`;
}

export function WorkspacePage() {
  const [incomeState, setIncomeState] = useStoredState<IncomeState>(INCOME_STATE_KEY, DEFAULT_INCOME_STATE, {
    normalize: normalizeIncomeState,
  });
  const [mortgageState, setMortgageState] = useStoredState<MortgageState>(MORTGAGE_STATE_KEY, DEFAULT_MORTGAGE_STATE, {
    normalize: normalizeMortgageState,
  });
  const [assetState, setAssetState] = useStoredState(ASSETS_STATE_KEY, DEFAULT_ASSETS_STATE, {
    normalize: normalizeAssetsState,
  });
  const [expenseState, setExpenseState] = useStoredState(EXPENSES_STATE_KEY, DEFAULT_EXPENSES_STATE, {
    normalize: normalizeExpensesState,
  });
  const [projectionState, setProjectionState] = useStoredState<ProjectionState>(
    PROJECTION_STATE_KEY,
    DEFAULT_PROJECTION_STATE,
    {
      normalize: normalizeProjectionState,
    },
  );
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [taxConfig, setTaxConfig] = useState(loadTaxConfig);
  const [federalBrackets, setFederalBrackets] = useState(() => JSON.stringify(taxConfig.federalBrackets, null, 2));
  const [stateBrackets, setStateBrackets] = useState(() => JSON.stringify(taxConfig.stateBrackets, null, 2));
  const [longTermCapitalGains, setLongTermCapitalGains] = useState(() =>
    JSON.stringify(taxConfig.longTermCapitalGains, null, 2),
  );
  const [taxLimitsOpen, setTaxLimitsOpen] = useState(false);
  const [taxTablesOpen, setTaxTablesOpen] = useState(false);
  const [taxEditorStatus, setTaxEditorStatus] = useState("");
  useEffect(() => {
    setFederalBrackets(JSON.stringify(taxConfig.federalBrackets, null, 2));
    setStateBrackets(JSON.stringify(taxConfig.stateBrackets, null, 2));
    setLongTermCapitalGains(JSON.stringify(taxConfig.longTermCapitalGains, null, 2));
  }, [taxConfig]);

  const salaryItems: SalaryInputItem[] = incomeState.incomeItems
    .filter((item): item is SalaryStateItem => item.type === "salary")
    .map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount ?? 0,
      frequency: item.frequency,
    }));
  const rsuItems: RsuInputItem[] = incomeState.incomeItems
    .filter((item): item is RsuStateItem => item.type === "rsu")
    .map((item) => ({
      id: item.id,
      name: item.name,
      grantAmount: item.grantAmount ?? 0,
      refresherAmount: item.refresherAmount ?? 0,
      vestingYears: item.vestingYears ?? 4,
    }));

  const mortgage = createMortgage(mortgageState);
  const scenariosById = Object.fromEntries(
    mortgage.options.map((option) => [option.id, buildMortgageScenario(mortgage, option.id)]),
  ) as Record<string, MortgageScenario>;
  const mortgageScenario = scenariosById[mortgage.activeLoanId];
  const compareScenario = scenariosById[mortgage.compareLoanId];
  const mortgageSummary = serializeMortgageSummary(mortgageScenario);
  const mortgageSummaryItems = buildMortgageSummaryItems(mortgageScenario, projectionState.currentYear);
  const mortgageComparisonRows = buildMortgageComparisonRows(
    mortgageScenario,
    compareScenario,
    projectionState.currentYear,
  );

  const income = createIncome({
    grossSalary: getAnnualSalaryTotal(salaryItems),
    rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
    employee401k: incomeState.employee401k,
    matchRate: incomeState.matchRate,
    iraContribution: incomeState.iraContribution,
    megaBackdoor: incomeState.megaBackdoor,
    hsaContribution: incomeState.hsaContribution,
    mortgageInterest: getMortgageYearInterest(mortgageSummary, 1),
    propertyTax: getMortgageYearPropertyTax(mortgageSummary),
    rsuItems,
  });
  const incomeResults = calculateIncome(income, taxConfig);
  const incomeSummary = buildIncomeSummary(income, incomeResults);
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);

  const assetsView = deriveAssetsState(assetState, undefined, incomeDirectedContributions);
  const expensesView = createExpenses(expenseState);
  const expenseSnapshot = calculateExpenseSnapshot(expensesView);

  const pinnedAssets = resolvePinnedBuckets(assetState, incomeDirectedContributions);
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;
  const projectionAssetState = structuredClone(pinnedAssets.state);
  projectionAssetState.buckets.forEach((bucket) => {
    if (bucket.id === reserveCashBucketId) {
      bucket.contribution = 0;
      bucket.growth = 0;
      bucket.basis = bucket.current ?? 0;
      return;
    }

    bucket.growth = projectionState.assetOverrides?.[bucket.id]?.growth ?? null;
  });

  const projectionExpenseState = structuredClone(expenseState);
  projectionExpenseState.expenses.forEach((expense) => {
    expense.growthRate = projectionState.expenseOverrides?.[expense.id]?.growthRate ?? null;
  });

  const projectionAssets = createAssets(projectionAssetState, projectionState.assetGrowthRate);
  const projectionExpenses = createExpenses(projectionExpenseState, projectionState.expenseGrowthRate);
  const projection = createProjection(projectionState, projectionAssets, incomeDirectedContributions);
  const projectionResults = calculateProjection({
    incomeSummary,
    mortgageSummary,
    assets: projectionAssets,
    expenses: projectionExpenses,
    projection,
    taxConfig,
  });
  const currentRow =
    projectionResults.projection.find((row) => row.year === projection.currentYear) ?? projectionResults.ending;
  const selectedYearLabel = projection.currentYear === 0 ? "Today" : `Year ${projection.currentYear}`;
  const pinnedProjectionBucketIds = pinnedAssets.pinnedBucketIds;
  const monthlyCashFlow = buildMonthlyCashFlow({
    incomeSummary,
    projection,
    currentRow,
  });
  const retirementSavingTotal =
    income.employee401k +
    incomeResults.employerMatch +
    income.iraContribution +
    incomeResults.megaBackdoor +
    income.hsaContribution;
  const annualGrossIncome = incomeResults.grossSalary + incomeResults.rsuGrossNextYear;

  useEffect(() => {
    saveJson(MORTGAGE_SUMMARY_KEY, mortgageSummary);
  }, [mortgageSummary]);

  useEffect(() => {
    saveJson(INCOME_SUMMARY_KEY, incomeSummary);
  }, [incomeSummary]);

  function updateTaxConfig(patch: Partial<TaxConfig>) {
    setTaxEditorStatus("");
    const nextConfig = saveTaxConfig({ ...taxConfig, ...patch });
    setTaxConfig(nextConfig);
  }

  function applyTaxTables() {
    try {
      const nextConfig = saveTaxConfig({
        ...taxConfig,
        federalBrackets: JSON.parse(federalBrackets),
        stateBrackets: JSON.parse(stateBrackets),
        longTermCapitalGains: JSON.parse(longTermCapitalGains),
      });
      setTaxConfig(nextConfig);
      setTaxEditorStatus("Saved tax tables.");
    } catch (error) {
      setTaxEditorStatus(`Config error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  function updateIncomeField(
    field: keyof Omit<IncomeState, "incomeItems">,
    value: IncomeState[keyof Omit<IncomeState, "incomeItems">],
  ) {
    setIncomeState((draft) => {
      Object.assign(draft, { [field]: value } as Partial<IncomeState>);
    });
  }

  function updateIncomeItem(itemId: string, patch: Partial<IncomeStateItem>) {
    setIncomeState((draft) => {
      const item = draft.incomeItems.find((entry) => entry.id === itemId);
      if (item) {
        Object.assign(item, patch);
      }
    });
  }

  function removeIncomeItem(itemId: string) {
    setIncomeState((draft) => {
      draft.incomeItems = draft.incomeItems.filter((item) => item.id !== itemId);
    });
  }

  function addSalaryItem() {
    setIncomeState((draft) => {
      draft.incomeItems.push(createSalaryItem({ amount: null }));
    });
  }

  function addRsuItem() {
    setIncomeState((draft) => {
      draft.incomeItems.push(createRsuItem());
    });
  }

  function updateMortgageState(patch: Partial<MortgageState>) {
    setMortgageState((draft) => {
      Object.assign(draft, patch);
    });
  }

  function updateLoanField(optionId: string, field: MortgageLoanField, value: number | null) {
    setMortgageState((draft) => {
      const option = draft.options.find((entry) => entry.id === optionId);
      if (option) {
        option[field] = value;
      }
    });
  }

  function updateLoanName(optionId: string, name: string) {
    setMortgageState((draft) => {
      const option = draft.options.find((entry) => entry.id === optionId);
      if (option) {
        option.name = name;
      }
    });
  }

  function updateLoanKind(optionId: string, kind: "conventional" | "arm") {
    setMortgageState((draft) => {
      const option = draft.options.find((entry) => entry.id === optionId);
      if (!option) {
        return;
      }

      option.kind = kind;
      if (kind === "arm") {
        option.rate = null;
        option.initialRate ??= 5.635;
        option.adjustedRate ??= 7.135;
        option.fixedYears ??= 7;
        option.term ??= 30;
        return;
      }

      option.rate ??= 6.475;
      option.term ??= 30;
    });
  }

  function handleDownPaymentMode(mode: MortgageDownPaymentMode) {
    setMortgageState((draft) => {
      if (draft.downPaymentMode === mode) {
        return;
      }

      const currentMortgage = createMortgage(draft);
      const currentAmount =
        draft.downPaymentMode === "percent"
          ? (currentMortgage.homePrice * currentMortgage.downPaymentInput) / 100
          : currentMortgage.downPaymentInput;
      const convertedValue =
        mode === "percent"
          ? currentMortgage.homePrice > 0
            ? (currentAmount / currentMortgage.homePrice) * 100
            : 0
          : currentAmount;

      draft.downPaymentMode = mode;
      draft.downPayment = mode === "percent" ? roundTo(convertedValue, 3) : Math.round(convertedValue);
    });
  }

  function selectLoan(optionId: string) {
    if (mortgageState.activeLoanId !== optionId && expandedLoanId === mortgageState.activeLoanId) {
      setExpandedLoanId(null);
    }

    setMortgageState((draft) => {
      if (draft.compareLoanId !== optionId) {
        draft.activeLoanId = optionId;
        return;
      }

      const fallbackCompareId = draft.options.find((option) => option.id !== optionId)?.id ?? optionId;
      draft.activeLoanId = optionId;
      draft.compareLoanId = fallbackCompareId;
    });
  }

  function addMortgageOption() {
    setMortgageState((draft) => {
      const nextOption = createMortgageOption({ name: `Mortgage option ${draft.options.length + 1}` });
      draft.options.push(nextOption);
      draft.compareLoanId = nextOption.id;
    });
  }

  function removeMortgageOption(optionId: string) {
    if (mortgageState.options.length <= 1) {
      return;
    }

    const remainingOptionIds = mortgageState.options
      .filter((option) => option.id !== optionId)
      .map((option) => option.id);
    const nextActiveLoanId =
      mortgageState.activeLoanId === optionId ? remainingOptionIds[0] : mortgageState.activeLoanId;
    const nextCompareLoanId =
      mortgageState.compareLoanId === optionId || mortgageState.compareLoanId === nextActiveLoanId
        ? (remainingOptionIds.find((entry) => entry !== nextActiveLoanId) ?? nextActiveLoanId)
        : mortgageState.compareLoanId;

    if (expandedLoanId === optionId) {
      setExpandedLoanId(null);
    }

    setMortgageState((draft) => {
      draft.options = draft.options.filter((option) => option.id !== optionId);
      draft.activeLoanId = nextActiveLoanId;
      draft.compareLoanId = nextCompareLoanId;
    });
  }

  function updateAssetBucket(bucketId: string, patch: Partial<AssetBucketState>) {
    setAssetState((draft) => {
      const bucket = draft.buckets.find((entry) => entry.id === bucketId);
      if (!bucket) {
        return;
      }

      Object.assign(bucket, patch);
    });
  }

  function addAssetBucket() {
    setAssetState((draft) => {
      draft.buckets.push(createAssetBucket());
    });
  }

  function removeAssetBucket(bucketId: string) {
    if (assetsView.pinnedBucketIds.has(bucketId)) {
      return;
    }

    setAssetState((draft) => {
      draft.buckets = draft.buckets.filter((bucket) => bucket.id !== bucketId);
    });
  }

  function updateExpense(expenseId: string, patch: Partial<ExpenseStateItem>) {
    setExpenseState((draft) => {
      const expense = draft.expenses.find((entry) => entry.id === expenseId);
      if (expense) {
        Object.assign(expense, patch);
      }
    });
  }

  function addExpense() {
    setExpenseState((draft) => {
      draft.expenses.push({
        id: crypto.randomUUID(),
        name: "",
        amount: null,
        frequency: "monthly",
        oneOffYear: null,
        growthRate: null,
        detailsOpen: false,
      });
    });
  }

  function removeExpense(expenseId: string) {
    setExpenseState((draft) => {
      draft.expenses = draft.expenses.filter((expense) => expense.id !== expenseId);
    });
  }

  function updateProjectionState(patch: Partial<ProjectionState>) {
    setProjectionState((draft) => {
      Object.assign(draft, patch);
    });
  }

  function updateAllocation(bucketId: string, value: number | null) {
    setProjectionState((draft) => {
      draft.allocations[bucketId] = {
        mode: draft.allocations?.[bucketId]?.mode === "amount" ? "amount" : "percent",
        value: Math.max(0, value ?? 0),
      };
    });
  }

  function updateAllocationMode(bucketId: string, mode: AllocationMode) {
    setProjectionState((draft) => {
      draft.allocations[bucketId] = {
        mode: mode === "amount" ? "amount" : "percent",
        value: draft.allocations?.[bucketId]?.value ?? 0,
      };
    });
  }

  function updateAssetOverride(bucketId: string, patch: ProjectionAssetOverride) {
    setProjectionState((draft) => {
      Object.assign((draft.assetOverrides[bucketId] ??= {}), patch);
    });
  }

  function updateExpenseOverride(expenseId: string, patch: ProjectionExpenseOverride) {
    setProjectionState((draft) => {
      Object.assign((draft.expenseOverrides[expenseId] ??= {}), patch);
    });
  }

  const topLevelSummaryRows = [
    {
      href: "#income",
      label: "Gross income",
      annualValue: annualGrossIncome,
    },
    {
      href: "#mortgage",
      label: "Housing cost",
      annualValue: getMortgageMonthlyPaymentForYear(mortgageScenario, projection.currentYear) * 12,
    },
    {
      href: "#taxes",
      label: "Tax",
      annualValue: incomeResults.totalTaxes,
    },
    {
      href: "#expenses",
      label: "Spending",
      annualValue: expenseSnapshot.annualExpenseTotal,
    },
  ];

  return (
    <PageShell showToolNav={false} title="Basisflow">
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <div className="grid gap-4 border-b border-(--line) pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <div className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
                      {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
                    </div>
                    <strong className="font-serif text-5xl leading-none tracking-tight text-(--teal)">
                      {usd(toDisplayValue(currentRow.netWorth, projection.currentYear, projection))}
                    </strong>
                  </div>
                  <div className="grid gap-1">
                    <SegmentedToggle
                      ariaLabel="Display mode"
                      value={projectionState.displayMode}
                      onChange={(mode) => updateProjectionState({ displayMode: mode })}
                      options={[
                        { value: "nominal", label: "Nominal" },
                        { value: "real", label: "Real" },
                      ]}
                    />
                  </div>
                </div>

                <div className="summary-year-grid">
                  <SliderField
                    label="Selected year"
                    valueLabel={selectedYearLabel}
                    min="0"
                    max={projection.horizonYears}
                    step="1"
                    value={projection.currentYear}
                    onChange={(event) => updateProjectionState({ currentYear: Number(event.target.value) })}
                  />
                  <NumberField
                    label="Horizon"
                    suffix="yr"
                    min="1"
                    max="60"
                    step="1"
                    value={projectionState.horizonYears}
                    onValueChange={(value) => updateProjectionState({ horizonYears: value ?? 1 })}
                  />
                </div>
              </div>

              <div className="mt-4">
                {topLevelSummaryRows.map((row) => (
                  <SummaryLinkRow key={row.href} href={row.href} label={row.label} annualValue={row.annualValue} />
                ))}
              </div>

              <AdvancedPanel
                id="workspaceParameters"
                title="Parameters"
                open={projectionState.advancedOpen}
                onToggle={(open) => updateProjectionState({ advancedOpen: open })}
              >
                <div className="grid gap-3">
                  <NumberField
                    label="Match rate"
                    suffix="%"
                    min="0"
                    max="100"
                    step="1"
                    value={incomeState.matchRate}
                    onValueChange={(value) => updateIncomeField("matchRate", value ?? 0)}
                  />
                  <NumberField
                    label="Inflation"
                    suffix="%"
                    min="0"
                    step="0.1"
                    value={projectionState.inflationRate}
                    onValueChange={(value) => updateProjectionState({ inflationRate: value ?? 0 })}
                  />
                  <NumberField
                    label="Baseline asset growth"
                    suffix="%"
                    min="0"
                    step="0.1"
                    value={projectionState.assetGrowthRate}
                    onValueChange={(value) => updateProjectionState({ assetGrowthRate: value ?? 0 })}
                  />
                  <NumberField
                    label="Gross income growth"
                    suffix="%"
                    min="-10"
                    step="0.1"
                    value={projectionState.incomeGrowthRate}
                    onValueChange={(value) => updateProjectionState({ incomeGrowthRate: value ?? 0 })}
                  />
                  <NumberField
                    label="Baseline expense growth"
                    suffix="%"
                    min="-20"
                    step="0.1"
                    value={projectionState.expenseGrowthRate}
                    onValueChange={(value) => updateProjectionState({ expenseGrowthRate: value ?? 0 })}
                  />
                  <NumberField
                    label="RSU stock growth"
                    suffix="%"
                    min="-50"
                    step="0.1"
                    value={projectionState.rsuStockGrowthRate}
                    onValueChange={(value) => updateProjectionState({ rsuStockGrowthRate: value ?? 0 })}
                  />
                  <NumberField
                    label="Home appreciation"
                    suffix="%"
                    min="-10"
                    step="0.1"
                    value={projectionState.homeAppreciationRate}
                    onValueChange={(value) => updateProjectionState({ homeAppreciationRate: value ?? 0 })}
                  />
                  <CheckboxField
                    label="Include vested RSUs"
                    checked={projectionState.includeVestedRsusInNetWorth}
                    onChange={(event) => updateProjectionState({ includeVestedRsusInNetWorth: event.target.checked })}
                  />
                  <SelectField
                    label="Down payment funded by"
                    value={projectionState.mortgageFundingBucketId}
                    onChange={(event) => updateProjectionState({ mortgageFundingBucketId: event.target.value })}
                  >
                    <option value="">None</option>
                    {projectionAssets.buckets.map((bucket) => (
                      <option key={bucket.id} value={bucket.id}>
                        {bucket.name}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </AdvancedPanel>
            </>
          }
        >
          <WorkspaceSection
            id="income"
            index="01"
            title="Income"
            summary="Cash In"
            actions={
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={addSalaryItem}>Add salary</ActionButton>
                <ActionButton onClick={addRsuItem}>Add RSU</ActionButton>
              </div>
            }
          >
            <div className="grid gap-3">
              {incomeState.incomeItems.map((item) => {
                if (item.type === "salary") {
                  const annualizedSalary = getAnnualSalaryTotal([
                    { amount: item.amount ?? 0, frequency: item.frequency },
                  ]);

                  return (
                    <RowItem
                      key={item.id}
                      headerClassName="grid gap-3 md:grid-cols-2"
                      removeLabel={`Remove ${item.name || "salary"}`}
                      onRemove={(event) => {
                        event.stopPropagation();
                        removeIncomeItem(item.id);
                      }}
                      detailsTitle="Salary details"
                      detailsSummary={renderIncomeSummary(item, annualizedSalary)}
                      detailsOpen={Boolean(item.detailsOpen)}
                      onToggleDetails={(open) => updateIncomeItem(item.id, { detailsOpen: open })}
                      header={
                        <>
                          <TextField
                            label="Income name"
                            value={item.name}
                            onChange={(event) => updateIncomeItem(item.id, { name: event.target.value })}
                          />
                          <NumberField
                            label="Amount"
                            prefix="$"
                            min="0"
                            step="1000"
                            value={item.amount}
                            onValueChange={(value) => updateIncomeItem(item.id, { amount: value })}
                          />
                        </>
                      }
                    >
                      <SegmentedToggle
                        label="Frequency"
                        ariaLabel={`${item.name || "Salary"} frequency`}
                        className="w-fit"
                        value={item.frequency}
                        onChange={(frequency) => updateIncomeItem(item.id, { frequency })}
                        options={[
                          { value: "annual", label: "Annual" },
                          { value: "monthly", label: "Monthly" },
                        ]}
                      />
                    </RowItem>
                  );
                }

                return (
                  <RowItem
                    key={item.id}
                    headerClassName="grid gap-3 md:grid-cols-2"
                    removeLabel={`Remove ${item.name || "RSU grant"}`}
                    onRemove={(event) => {
                      event.stopPropagation();
                      removeIncomeItem(item.id);
                    }}
                    detailsTitle="RSU details"
                    detailsOpen={Boolean(item.detailsOpen)}
                    onToggleDetails={(open) => updateIncomeItem(item.id, { detailsOpen: open })}
                    header={
                      <>
                        <TextField
                          label="Income name"
                          value={item.name}
                          onChange={(event) => updateIncomeItem(item.id, { name: event.target.value })}
                        />
                        <NumberField
                          label="Unvested remaining"
                          prefix="$"
                          min="0"
                          step="1000"
                          value={item.grantAmount}
                          onValueChange={(value) => updateIncomeItem(item.id, { grantAmount: value })}
                        />
                      </>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <NumberField
                        label="Annual refresher"
                        prefix="$"
                        min="0"
                        step="1000"
                        value={item.refresherAmount}
                        onValueChange={(value) => updateIncomeItem(item.id, { refresherAmount: value })}
                      />
                      <NumberField
                        label="Years left to vest"
                        suffix="years"
                        min="1"
                        step="1"
                        value={item.vestingYears}
                        onValueChange={(value) => updateIncomeItem(item.id, { vestingYears: value })}
                      />
                    </div>
                  </RowItem>
                );
              })}
            </div>

            <div className="split-main-sidebar-wide mt-8">
              <div>
                <div className="mb-4 text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
                  Retirement saving
                </div>
                <div className="grid gap-4 divide-y divide-(--line-soft) pb-4">
                  <SliderField
                    id="employee401k"
                    label="Traditional 401(k)"
                    valueLabel={usd(income.employee401k)}
                    min="0"
                    max="24500"
                    step="50"
                    value={incomeState.employee401k}
                    onChange={(event) => updateIncomeField("employee401k", Number(event.target.value))}
                  />
                  <SliderField
                    id="megaBackdoor"
                    label="Roth 401(k)"
                    valueLabel={usd(incomeResults.megaBackdoor)}
                    min="0"
                    max={Math.max(0, Math.round(incomeResults.availableMegaRoom))}
                    step="50"
                    value={Math.min(incomeState.megaBackdoor, Math.max(0, Math.round(incomeResults.availableMegaRoom)))}
                    onChange={(event) => updateIncomeField("megaBackdoor", Number(event.target.value))}
                  />
                  <SliderField
                    id="iraContribution"
                    label="IRA"
                    valueLabel={usd(income.iraContribution)}
                    min="0"
                    max="7000"
                    step="50"
                    value={incomeState.iraContribution}
                    onChange={(event) => updateIncomeField("iraContribution", Number(event.target.value))}
                  />
                  <SliderField
                    id="hsaContribution"
                    label="HSA"
                    valueLabel={usd(income.hsaContribution)}
                    min="0"
                    max="4400"
                    step="50"
                    value={incomeState.hsaContribution}
                    onChange={(event) => updateIncomeField("hsaContribution", Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-6">
                <div>
                  <MetricGrid
                    primaryItem={{ label: "Monthly take-home", value: usd(incomeResults.monthlyTakeHome, 2) }}
                    items={[
                      { label: "Annual salary", value: usd(incomeResults.grossSalary, 2) },
                      { label: "Total taxes", value: usd(incomeResults.totalTaxes, 2) },
                      { label: "Retirement saving", value: usd(retirementSavingTotal, 2) },
                    ]}
                  />
                </div>
              </div>
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            id="mortgage"
            index="02"
            title="Home & Mortgage"
            summary="Housing Cost"
            actions={<ActionButton onClick={addMortgageOption}>Add mortgage option</ActionButton>}
          >
            <div className="split-main-sidebar">
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField
                    label="Home price"
                    prefix="$"
                    value={mortgageState.homePrice}
                    step="50000"
                    onValueChange={(value) => updateMortgageState({ homePrice: value ?? 0 })}
                  />

                  <div className="flex items-end gap-2">
                    <SegmentedToggle
                      label="Down payment"
                      ariaLabel="Down payment mode"
                      className="shrink-0"
                      value={mortgageState.downPaymentMode}
                      onChange={handleDownPaymentMode}
                      options={[
                        { value: "dollar", label: "$" },
                        { value: "percent", label: "%" },
                      ]}
                    />
                    <NumberField
                      className="min-w-0 flex-1"
                      label={null}
                      value={mortgageState.downPayment}
                      step={mortgageState.downPaymentMode === "dollar" ? "1" : "0.001"}
                      onValueChange={(value) => updateMortgageState({ downPayment: value ?? 0 })}
                    />
                  </div>
                  <NumberField
                    label="Home insurance"
                    prefix="$"
                    suffix="/ year"
                    value={mortgageState.insurancePerYear}
                    step="1"
                    onValueChange={(value) => updateMortgageState({ insurancePerYear: value ?? 0 })}
                  />
                  <NumberField
                    label="HOA"
                    prefix="$"
                    suffix="/ month"
                    value={mortgageState.hoaPerMonth}
                    step="1"
                    onValueChange={(value) => updateMortgageState({ hoaPerMonth: value ?? 0 })}
                  />
                </div>

                <MortgageLoanOptionList
                  expandedLoanId={expandedLoanId}
                  currentYear={projection.currentYear}
                  mortgage={mortgage}
                  optionIds={mortgageState.options.map((option) => option.id)}
                  scenariosById={scenariosById}
                  state={mortgageState}
                  onSelectLoan={selectLoan}
                  onSetCompareLoanId={(optionId) => updateMortgageState({ compareLoanId: optionId })}
                  onSetExpandedLoanId={setExpandedLoanId}
                  onUpdateLoanField={updateLoanField}
                  onUpdateLoanName={updateLoanName}
                  onUpdateLoanKind={updateLoanKind}
                  onRemoveLoan={removeMortgageOption}
                />
              </div>

              <div>
                <MetricGrid
                  primaryItem={{
                    label: "Estimated monthly payment",
                    value: usd(getMortgageMonthlyPaymentForYear(mortgageScenario, projection.currentYear)),
                  }}
                  items={mortgageSummaryItems}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <ChartPanel title="Balance Over Time" legend={[{ label: "Remaining balance", color: "#0c6a7c" }]}>
                <MortgageBalanceChart scenario={mortgageScenario} />
              </ChartPanel>

              <ChartPanel
                title="Principal vs Interest"
                legend={[
                  { label: "Principal", color: "#0c6a7c" },
                  { label: "Interest", color: "#d28a47" },
                ]}
              >
                <MortgageCompositionChart scenario={mortgageScenario} />
              </ChartPanel>
            </div>

            {mortgageState.activeLoanId !== mortgageState.compareLoanId ? (
              <div className="mt-8">
                <MortgageComparisonTable
                  compareScenario={compareScenario}
                  comparisonRows={mortgageComparisonRows}
                  scenario={mortgageScenario}
                />
              </div>
            ) : null}
          </WorkspaceSection>

          <WorkspaceSection id="taxes" index="03" title="Taxes" summary="Deduction Logic">
            <div className="split-main-sidebar-roomy">
              <div className="grid gap-4">
                <SegmentedToggle
                  label="Deduction mode"
                  ariaLabel="Deduction mode"
                  className="w-fit"
                  value={taxConfig.deductionMode}
                  onChange={(deductionMode) => updateTaxConfig({ deductionMode })}
                  options={[
                    { value: "standard", label: "Standard" },
                    { value: "itemized", label: "Itemized" },
                  ]}
                />
              </div>

              <div>
                <MetricGrid
                  primaryItem={{ label: "Total tax", value: usd(incomeResults.totalTaxes) }}
                  items={[
                    { label: "Federal tax", value: usd(incomeResults.federalTax) },
                    { label: "California tax", value: usd(incomeResults.californiaTax) },
                    { label: "FICA + CA SDI", value: usd(incomeResults.fica.total + incomeResults.caSdi) },
                    { label: "Property tax", value: usd(income.propertyTax) },
                  ]}
                />
              </div>
            </div>

            <div className="mt-6">
              <AdvancedPanel id="taxLimits" title="Tax parameters" open={taxLimitsOpen} onToggle={setTaxLimitsOpen}>
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField
                    label="CA SDI rate"
                    suffix="%"
                    min="0"
                    step="0.1"
                    value={taxConfig.caSdiRate}
                    onValueChange={(value) => updateTaxConfig({ caSdiRate: value ?? 0 })}
                  />
                  <NumberField
                    label="Property tax rate"
                    suffix="%"
                    value={mortgageState.propertyTaxRate}
                    step="0.001"
                    onValueChange={(value) => updateMortgageState({ propertyTaxRate: value ?? 0 })}
                  />
                  <NumberField
                    label="401(k) total contribution cap"
                    prefix="$"
                    min="0"
                    step="100"
                    value={taxConfig.annualAdditionsLimit}
                    onValueChange={(value) => updateTaxConfig({ annualAdditionsLimit: value ?? 0 })}
                  />
                  <NumberField
                    label="Federal standard deduction"
                    prefix="$"
                    min="0"
                    step="50"
                    value={taxConfig.federalStandardDeduction}
                    onValueChange={(value) => updateTaxConfig({ federalStandardDeduction: value ?? 0 })}
                  />
                  <NumberField
                    label="California standard deduction"
                    prefix="$"
                    min="0"
                    step="50"
                    value={taxConfig.stateStandardDeduction}
                    onValueChange={(value) => updateTaxConfig({ stateStandardDeduction: value ?? 0 })}
                  />
                  <NumberField
                    label="Federal SALT deduction cap"
                    prefix="$"
                    min="0"
                    step="50"
                    value={taxConfig.federalSaltCap}
                    onValueChange={(value) => updateTaxConfig({ federalSaltCap: value ?? 0 })}
                  />
                </div>
              </AdvancedPanel>
            </div>

            <AdvancedPanel id="taxTables" title="Bracket tables" open={taxTablesOpen} onToggle={setTaxTablesOpen}>
              <div className="grid gap-4 xl:grid-cols-3">
                <TextAreaField
                  label="Federal brackets"
                  value={federalBrackets}
                  onChange={(event) => setFederalBrackets(event.target.value)}
                />
                <TextAreaField
                  label="State brackets"
                  value={stateBrackets}
                  onChange={(event) => setStateBrackets(event.target.value)}
                />
                <TextAreaField
                  label="Long-term capital gains"
                  value={longTermCapitalGains}
                  onChange={(event) => setLongTermCapitalGains(event.target.value)}
                />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ActionButton onClick={applyTaxTables}>Apply tax tables</ActionButton>
                <div className="min-h-6 text-sm text-(--ink-soft)">{taxEditorStatus}</div>
              </div>
            </AdvancedPanel>
          </WorkspaceSection>

          <WorkspaceSection
            id="expenses"
            index="04"
            title="Expenses"
            summary="Cash Out"
            actions={<ActionButton onClick={addExpense}>Add expense</ActionButton>}
          >
            <div className="grid gap-2.5">
              {expenseState.expenses.map((expense) => (
                <RowItem
                  key={expense.id}
                  removeLabel="Remove expense"
                  onRemove={() => removeExpense(expense.id)}
                  detailsTitle="Expense details"
                  detailsOpen={expense.detailsOpen}
                  onToggleDetails={(open) => updateExpense(expense.id, { detailsOpen: open })}
                  headerClassName="grid items-center gap-3 lg:grid-cols-2"
                  detailsContentClassName="grid gap-3"
                  header={
                    <>
                      <TextField
                        label="Expense name"
                        placeholder="Expense name"
                        value={expense.name}
                        onChange={(event) => updateExpense(expense.id, { name: event.target.value })}
                      />
                      <NumberField
                        label="Amount"
                        prefix="$"
                        suffix={
                          expense.frequency === "annual" ? "/ year" : expense.frequency === "one_off" ? "" : "/ month"
                        }
                        min="0"
                        step="50"
                        placeholder="0"
                        value={expense.amount}
                        onValueChange={(value) => updateExpense(expense.id, { amount: value })}
                      />
                    </>
                  }
                >
                  <SegmentedToggle
                    label="Cadence"
                    ariaLabel={`Cadence for ${expense.name || "expense"}`}
                    className="w-fit"
                    value={expense.frequency}
                    onChange={(nextValue) => updateExpense(expense.id, { frequency: nextValue })}
                    options={[
                      { value: "monthly", label: "Monthly" },
                      { value: "annual", label: "Annual" },
                      { value: "one_off", label: "One-off" },
                    ]}
                  />
                  {expense.frequency === "one_off" ? (
                    <NumberField
                      label="Relative year"
                      min="1"
                      step="1"
                      value={expense.oneOffYear ?? ""}
                      onValueChange={(value) => updateExpense(expense.id, { oneOffYear: value })}
                    />
                  ) : null}
                </RowItem>
              ))}
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            id="assets"
            index="05"
            title="Assets"
            summary="Balance Sheet"
            actions={<ActionButton onClick={addAssetBucket}>Add asset</ActionButton>}
          >
            <div className="grid gap-2.5">
              {assetsView.orderedBuckets.map((bucket) => {
                const isPinnedBucket = assetsView.pinnedBucketIds.has(bucket.id);
                return (
                  <RowItem
                    key={bucket.id}
                    pinned={isPinnedBucket}
                    removeLabel={isPinnedBucket ? undefined : "Remove asset"}
                    onRemove={isPinnedBucket ? undefined : () => removeAssetBucket(bucket.id)}
                    detailsTitle="Asset details"
                    detailsOpen={bucket.detailsOpen}
                    onToggleDetails={(open) => updateAssetBucket(bucket.id, { detailsOpen: open })}
                    headerClassName="grid items-center gap-3 lg:grid-cols-2"
                    detailsContentClassName="grid gap-3 sm:grid-cols-2"
                    header={
                      <>
                        <TextField
                          label="Asset name"
                          value={bucket.name}
                          placeholder="Asset name"
                          disabled={isPinnedBucket}
                          inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                          onChange={(event) => updateAssetBucket(bucket.id, { name: event.target.value })}
                        />
                        <NumberField
                          label="Current value"
                          prefix="$"
                          min="0"
                          step="1000"
                          value={bucket.current}
                          placeholder="0"
                          inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                          onValueChange={(value) => updateAssetBucket(bucket.id, { current: value })}
                        />
                      </>
                    }
                  >
                    <SelectField
                      label="Tax treatment"
                      value={bucket.taxTreatment}
                      disabled={isPinnedBucket}
                      onChange={(event) =>
                        updateAssetBucket(bucket.id, { taxTreatment: event.target.value as AssetTaxTreatment })
                      }
                    >
                      <option value="none">None</option>
                      <option value="taxDeductible">Tax-deductible</option>
                      <option value="taxDeferred">Tax-deferred</option>
                    </SelectField>
                    {bucket.taxTreatment === "none" ? (
                      <NumberField
                        label="Current basis"
                        prefix="$"
                        min="0"
                        step="1000"
                        value={bucket.basis}
                        placeholder="0"
                        inputClassName={isPinnedBucket ? "text-(--ink-soft)" : ""}
                        onValueChange={(value) => updateAssetBucket(bucket.id, { basis: value })}
                      />
                    ) : null}
                  </RowItem>
                );
              })}
            </div>
          </WorkspaceSection>

          <WorkspaceSection id="projection" index="06" title="Projection" summary="Long View">
            <div className="grid gap-8">
              <ChartPanel
                title={
                  projection.currentYear === 0
                    ? "Monthly Cash Flow Today"
                    : `Monthly Cash Flow in Year ${projection.currentYear}`
                }
              >
                <MonthlyCashFlowPanel
                  items={monthlyCashFlow.items}
                  netFlow={monthlyCashFlow.netFlow}
                  total={monthlyCashFlow.total}
                />
              </ChartPanel>

              <ChartPanel
                title="Net Worth Curve"
                legend={[
                  { label: "Net worth", color: "#0a4a53" },
                  { label: "Assets", color: "#0d6a73" },
                  { label: "Home equity", color: "#c56b3d" },
                  { label: "Reserve cash", color: "#566773" },
                ]}
              >
                <NetWorthChart
                  projection={projection}
                  results={projectionResults}
                  currentYear={projection.currentYear}
                />
              </ChartPanel>

              <div className="grid gap-8">
                <div>
                  <div className="mb-4 text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
                    Asset allocations
                  </div>
                  <ProjectionAssetRows
                    assets={projectionAssets}
                    pinnedProjectionBucketIds={pinnedProjectionBucketIds}
                    projection={projection}
                    results={projectionResults}
                    currentRow={currentRow}
                    selectedYearLabel={selectedYearLabel}
                    state={projectionState}
                    onUpdateAllocation={updateAllocation}
                    onUpdateAllocationMode={updateAllocationMode}
                    onUpdateAssetOverride={updateAssetOverride}
                    onToggleAssetOverrideDetails={(bucketId, open) =>
                      updateAssetOverride(bucketId, { detailsOpen: open })
                    }
                  />
                </div>

                <div>
                  <div className="mb-4 text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
                    Expense growth
                  </div>
                  <ProjectionExpenseRows
                    expenses={projectionExpenses}
                    projection={projection}
                    currentRow={currentRow}
                    selectedYearLabel={selectedYearLabel}
                    state={projectionState}
                    onToggleExpenseOverrideDetails={(expenseId, open) =>
                      updateExpenseOverride(expenseId, { detailsOpen: open })
                    }
                    onUpdateExpenseOverride={updateExpenseOverride}
                  />
                </div>
              </div>

              <ProjectionTable projection={projection} rows={projectionResults.projection} />
            </div>
          </WorkspaceSection>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
