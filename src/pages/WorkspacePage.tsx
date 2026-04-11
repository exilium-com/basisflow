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
  createExpenses,
  DEFAULT_EXPENSES_STATE,
  normalizeExpensesState,
  type ExpenseStateItem,
} from "../lib/expensesModel";
import { roundTo } from "../lib/format";
import {
  buildIncomeSummary,
  calculateIncome,
  DEFAULT_INCOME,
  normalizeIncome,
  resolveIncome,
  type Income,
  type IncomeItem,
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
  buildMortgageSummaryItems,
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
  const [income, setIncome] = useStoredState<Income>(INCOME_STATE_KEY, DEFAULT_INCOME, {
    normalize: normalizeIncome,
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

  const mortgage = createMortgage(mortgageState);
  const scenariosById = Object.fromEntries(
    mortgage.options.map((option) => [option.id, buildMortgageScenario(mortgage, option.id)]),
  ) as Record<string, MortgageScenario>;
  const mortgageScenario = scenariosById[mortgage.activeLoanId];
  const mortgageSummary = serializeMortgageSummary(mortgageScenario);
  const mortgageSummaryItems = buildMortgageSummaryItems(mortgageScenario, projectionState.currentYear);

  const resolvedIncome = resolveIncome(income, {
    mortgageInterest: getMortgageYearInterest(mortgageSummary, 0),
    propertyTax: getMortgageYearPropertyTax(mortgageSummary),
  });
  const incomeResults = calculateIncome(resolvedIncome, taxConfig);
  const incomeSummary = buildIncomeSummary(resolvedIncome, incomeResults);
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);

  const assetsView = deriveAssetsState(assetState, undefined, incomeDirectedContributions);

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
  const projection = createProjection(projectionState);
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
  const monthlyCashFlow = buildMonthlyCashFlow({
    incomeSummary,
    projection,
    currentRow,
  });
  const retirementSavingTotal =
    resolvedIncome.employee401k +
    incomeResults.employerMatch +
    resolvedIncome.iraContribution +
    incomeResults.megaBackdoor +
    resolvedIncome.hsaContribution;
  const annualRetirementContributions =
    resolvedIncome.employee401k +
    resolvedIncome.iraContribution +
    incomeResults.megaBackdoor +
    resolvedIncome.hsaContribution;
  const projectedAnnualGrossIncome =
    incomeResults.grossSalary * Math.pow(1 + projection.incomeGrowthRate, projection.currentYear) + currentRow.rsuGross;
  const projectedAnnualTax =
    projectedAnnualGrossIncome - annualRetirementContributions - currentRow.takeHome - currentRow.rsuNet;
  const assetOptions = projectionAssets.buckets.map((bucket) => ({
    id: bucket.id,
    name: bucket.name,
  }));
  const freeCashFlowOptions = projectionAssets.buckets
    .filter(
      (bucket) => bucket.id !== reserveCashBucketId && (incomeDirectedContributions[bucket.id] ?? 0) === 0,
    )
    .map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
    }));

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
    field: keyof Omit<Income, "incomeItems">,
    value: Income[keyof Omit<Income, "incomeItems">],
  ) {
    setIncome((draft) => {
      Object.assign(draft, { [field]: value } as Partial<Income>);
    });
  }

  function updateIncomeItem(itemId: string, patch: Partial<IncomeItem>) {
    setIncome((draft) => {
      const item = draft.incomeItems.find((entry) => entry.id === itemId);
      if (item) {
        Object.assign(item, patch);
      }
    });
  }

  function removeIncomeItem(itemId: string) {
    setIncome((draft) => {
      draft.incomeItems = draft.incomeItems.filter((item) => item.id !== itemId);
    });
  }

  function addSalaryItem() {
    setIncome((draft) => {
      draft.incomeItems.push({
        id: crypto.randomUUID(),
        type: "salary",
        name: "Salary",
        amount: null,
        frequency: "annual",
        detailsOpen: false,
      });
    });
  }

  function addRsuItem() {
    setIncome((draft) => {
      draft.incomeItems.push({
        id: crypto.randomUUID(),
        type: "rsu",
        name: "RSU grant",
        grantAmount: 0,
        refresherAmount: 0,
        vestingYears: 4,
        detailsOpen: false,
      });
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
      if (kind === "rent") {
        option.rentPerMonth ??= 3500;
        option.rentGrowthRate ??= 3;
        return;
      }

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
      draft.activeLoanId = optionId;
    });
  }

  function addMortgageOption() {
    setMortgageState((draft) => {
      const nextOption = createMortgageOption({ name: `Mortgage option ${draft.options.length + 1}` });
      draft.options.push(nextOption);
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

    if (expandedLoanId === optionId) {
      setExpandedLoanId(null);
    }

    setMortgageState((draft) => {
      draft.options = draft.options.filter((option) => option.id !== optionId);
      draft.activeLoanId = nextActiveLoanId;
    });
  }

  function updateAssetBucket(bucketId: string, patch: Partial<AssetBucketState>) {
    setAssetState((draft) => {
      const bucket = draft.buckets.find((entry) => entry.id === bucketId);
      if (bucket) {
        Object.assign(bucket, patch);
        return;
      }

      const derivedBucket = resolvePinnedBuckets(draft, incomeDirectedContributions).state.buckets.find(
        (entry) => entry.id === bucketId,
      );
      if (derivedBucket) {
        draft.buckets.push({ ...derivedBucket, ...patch });
      }
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
      annualValue: toDisplayValue(projectedAnnualGrossIncome, projection.currentYear, projection),
    },
    {
      href: "#mortgage",
      label: "Housing cost",
      annualValue: toDisplayValue(currentRow.mortgageLineItem, projection.currentYear, projection),
    },
    {
      href: "#taxes",
      label: "Tax",
      annualValue: toDisplayValue(projectedAnnualTax, projection.currentYear, projection),
    },
    {
      href: "#expenses",
      label: "Spending",
      annualValue: toDisplayValue(currentRow.nonHousingExpenses, projection.currentYear, projection),
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
              projectionState={projectionState}
              selectedYearLabel={selectedYearLabel}
              topLevelSummaryRows={topLevelSummaryRows}
              matchRate={income.matchRate}
              assetOptions={assetOptions}
              freeCashFlowOptions={freeCashFlowOptions}
              onUpdateIncomeField={(field, value) => updateIncomeField(field, value)}
              onUpdateProjectionState={updateProjectionState}
            />
          }
        >
          <IncomeSection
            income={income}
            incomeResults={incomeResults}
            projection={projection}
            selectedYearLabel={selectedYearLabel}
            retirementSavingTotal={retirementSavingTotal}
            onAddSalaryItem={addSalaryItem}
            onAddRsuItem={addRsuItem}
            onRemoveIncomeItem={removeIncomeItem}
            onUpdateIncomeField={updateIncomeField}
            onUpdateIncomeItem={updateIncomeItem}
          />

          <MortgageSection
            currentYear={projection.currentYear}
            expandedLoanId={expandedLoanId}
            mortgage={mortgage}
            mortgageScenario={mortgageScenario}
            mortgageState={mortgageState}
            mortgageSummaryItems={mortgageSummaryItems}
            scenariosById={scenariosById}
            onAddMortgageOption={addMortgageOption}
            onHandleDownPaymentMode={handleDownPaymentMode}
            onRemoveLoan={removeMortgageOption}
            onSelectLoan={selectLoan}
            onSetExpandedLoanId={setExpandedLoanId}
            onUpdateLoanField={updateLoanField}
            onUpdateLoanKind={updateLoanKind}
            onUpdateLoanName={updateLoanName}
            onUpdateMortgageState={updateMortgageState}
          />

          <TaxesSection
            federalBrackets={federalBrackets}
            income={resolvedIncome}
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
            expenseGrowthRate={projectionState.expenseGrowthRate}
            expenseOverrides={projectionState.expenseOverrides}
            currentRow={currentRow}
            projection={projection}
            selectedYearLabel={selectedYearLabel}
            onAddExpense={addExpense}
            onRemoveExpense={removeExpense}
            onUpdateExpense={updateExpense}
            onUpdateExpenseOverride={updateExpenseOverride}
          />

          <AssetsSection
            assetsView={assetsView}
            assetGrowthRate={projectionState.assetGrowthRate}
            assetOverrides={projectionState.assetOverrides}
            currentRow={currentRow}
            projection={projection}
            selectedYearLabel={selectedYearLabel}
            onAddAssetBucket={addAssetBucket}
            onRemoveAssetBucket={removeAssetBucket}
            onUpdateAssetBucket={updateAssetBucket}
            onUpdateAssetOverride={updateAssetOverride}
          />

          <ProjectionSection
            monthlyCashFlow={monthlyCashFlow}
            projection={projection}
            projectionResults={projectionResults}
          />
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
