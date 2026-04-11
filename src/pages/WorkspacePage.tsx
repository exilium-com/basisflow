import React, { useEffect, useState } from "react";
import { AssetsSection } from "../components/workspace/AssetsSection";
import { ExpensesSection } from "../components/workspace/ExpensesSection";
import { IncomeSection } from "../components/workspace/IncomeSection";
import { MortgageSection } from "../components/workspace/MortgageSection";
import { ProjectionSection } from "../components/workspace/ProjectionSection";
import { TaxesSection } from "../components/workspace/TaxesSection";
import { WorkspaceSummaryPanel } from "../components/workspace/WorkspaceSummaryPanel";
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
} from "../lib/assetsModel";
import {
  calculateExpenseSnapshot,
  createExpenses,
  DEFAULT_EXPENSES_STATE,
  normalizeExpensesState,
  type ExpenseStateItem,
} from "../lib/expensesModel";
import { roundTo } from "../lib/format";
import {
  buildIncomeSummary,
  calculateIncome,
  computeRsuGrossForItems,
  createIncome,
  createRsuItem,
  createSalaryItem,
  DEFAULT_INCOME_STATE,
  getAnnualSalaryTotal,
  normalizeIncomeState,
  toRsuInputs,
  toSalaryInputs,
  type IncomeState,
  type IncomeStateItem,
} from "../lib/incomeModel";
import {
  createMortgage,
  createMortgageOption,
  DEFAULT_MORTGAGE_STATE,
  normalizeMortgageState,
  type MortgageDownPaymentMode,
  type MortgageLoanField,
  type MortgageOptionKind,
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

  const salaryItems = toSalaryInputs(incomeState.incomeItems);
  const rsuItems = toRsuInputs(incomeState.incomeItems);

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

  function updateLoanKind(optionId: string, kind: MortgageOptionKind) {
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
            <WorkspaceSummaryPanel
              currentRow={currentRow}
              projection={projection}
              projectionAssets={projectionAssets}
              projectionState={projectionState}
              selectedYearLabel={selectedYearLabel}
              topLevelSummaryRows={topLevelSummaryRows}
              matchRate={incomeState.matchRate}
              onUpdateIncomeField={(field, value) => updateIncomeField(field, value)}
              onUpdateProjectionState={updateProjectionState}
            />
          }
        >
          <IncomeSection
            income={income}
            incomeResults={incomeResults}
            incomeState={incomeState}
            retirementSavingTotal={retirementSavingTotal}
            onAddSalaryItem={addSalaryItem}
            onAddRsuItem={addRsuItem}
            onRemoveIncomeItem={removeIncomeItem}
            onUpdateIncomeField={updateIncomeField}
            onUpdateIncomeItem={updateIncomeItem}
          />

          <MortgageSection
            compareScenario={compareScenario}
            currentYear={projection.currentYear}
            expandedLoanId={expandedLoanId}
            mortgage={mortgage}
            mortgageComparisonRows={mortgageComparisonRows}
            mortgageScenario={mortgageScenario}
            mortgageState={mortgageState}
            mortgageSummaryItems={mortgageSummaryItems}
            scenariosById={scenariosById}
            onAddMortgageOption={addMortgageOption}
            onHandleDownPaymentMode={handleDownPaymentMode}
            onRemoveLoan={removeMortgageOption}
            onSelectLoan={selectLoan}
            onSetCompareLoanId={(optionId) => updateMortgageState({ compareLoanId: optionId })}
            onSetExpandedLoanId={setExpandedLoanId}
            onUpdateLoanField={updateLoanField}
            onUpdateLoanKind={updateLoanKind}
            onUpdateLoanName={updateLoanName}
            onUpdateMortgageState={updateMortgageState}
          />

          <TaxesSection
            federalBrackets={federalBrackets}
            income={income}
            incomeResults={incomeResults}
            longTermCapitalGains={longTermCapitalGains}
            mortgageState={mortgageState}
            stateBrackets={stateBrackets}
            taxConfig={taxConfig}
            taxEditorStatus={taxEditorStatus}
            taxLimitsOpen={taxLimitsOpen}
            taxTablesOpen={taxTablesOpen}
            onApplyTaxTables={applyTaxTables}
            onSetFederalBrackets={setFederalBrackets}
            onSetLongTermCapitalGains={setLongTermCapitalGains}
            onSetStateBrackets={setStateBrackets}
            onSetTaxLimitsOpen={setTaxLimitsOpen}
            onSetTaxTablesOpen={setTaxTablesOpen}
            onUpdateMortgageState={updateMortgageState}
            onUpdateTaxConfig={updateTaxConfig}
          />

          <ExpensesSection
            expenseState={expenseState}
            onAddExpense={addExpense}
            onRemoveExpense={removeExpense}
            onUpdateExpense={updateExpense}
          />

          <AssetsSection
            assetsView={assetsView}
            onAddAssetBucket={addAssetBucket}
            onRemoveAssetBucket={removeAssetBucket}
            onUpdateAssetBucket={updateAssetBucket}
          />

          <ProjectionSection
            currentRow={currentRow}
            monthlyCashFlow={monthlyCashFlow}
            pinnedProjectionBucketIds={pinnedProjectionBucketIds}
            projection={projection}
            projectionAssets={projectionAssets}
            projectionExpenses={projectionExpenses}
            projectionResults={projectionResults}
            projectionState={projectionState}
            selectedYearLabel={selectedYearLabel}
            onUpdateAllocation={updateAllocation}
            onUpdateAllocationMode={updateAllocationMode}
            onUpdateAssetOverride={updateAssetOverride}
            onUpdateExpenseOverride={updateExpenseOverride}
          />
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
