import React, { useEffect, useState } from "react";
import { AssetsSection } from "../components/workspace/AssetsSection";
import { ExpensesSection } from "../components/workspace/ExpensesSection";
import { IncomeSection } from "../components/workspace/IncomeSection";
import { MortgageSection } from "../components/workspace/MortgageSection";
import { TaxesSection } from "../components/workspace/TaxesSection";
import { WorkspaceSummaryPanel } from "../components/workspace/WorkspaceSummaryPanel";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { PageShell } from "../components/PageShell";
import { useStoredState } from "../hooks/useStoredState";
import { usd } from "../lib/format";
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
  createMortgageOption,
  DEFAULT_MORTGAGE_STATE,
  normalizeMortgageState,
  type MortgageLoanField,
  type MortgageOptionKind,
  type MortgageState,
} from "../lib/mortgageConfig";
import {
  getMortgageInterestForYear,
  getMortgagePrincipalForYear,
  getMortgageYearAverageBalance,
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
  const [taxConfig, setTaxConfig] = useState(loadTaxConfig);
  const [federalBrackets, setFederalBrackets] = useState(() => JSON.stringify(taxConfig.federalBrackets, null, 2));
  const [stateBrackets, setStateBrackets] = useState(() => JSON.stringify(taxConfig.stateBrackets, null, 2));
  const [longTermCapitalGains, setLongTermCapitalGains] = useState(() =>
    JSON.stringify(taxConfig.longTermCapitalGains, null, 2),
  );
  const [taxEditorStatus, setTaxEditorStatus] = useState("");
  useEffect(() => {
    setFederalBrackets(JSON.stringify(taxConfig.federalBrackets, null, 2));
    setStateBrackets(JSON.stringify(taxConfig.stateBrackets, null, 2));
    setLongTermCapitalGains(JSON.stringify(taxConfig.longTermCapitalGains, null, 2));
  }, [taxConfig]);

  const scenariosById = Object.fromEntries(
    mortgageState.options.map((option) => [option.id, buildMortgageScenario(mortgageState, option.id)]),
  ) as Record<string, MortgageScenario>;
  const mortgageScenario = scenariosById[mortgageState.activeLoanId];
  const mortgageSummary = serializeMortgageSummary(mortgageScenario);
  const annualPropertyTax = mortgageSummary.kind === "rent" ? 0 : getMortgageYearPropertyTax(mortgageSummary);

  const resolvedIncome = resolveIncome(income, {
    mortgageAverageBalance: getMortgageYearAverageBalance(mortgageSummary, 0),
    mortgageInterest: getMortgageYearInterest(mortgageSummary, 0),
    propertyTax: getMortgageYearPropertyTax(mortgageSummary),
  });
  const incomeResults = calculateIncome(resolvedIncome, taxConfig);
  const incomeSummary = buildIncomeSummary(resolvedIncome, incomeResults);
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);

  const assetsView = deriveAssetsState(assetState, undefined, incomeDirectedContributions, incomeSummary.rsuItems);

  const pinnedAssets = resolvePinnedBuckets(assetState, incomeDirectedContributions, incomeSummary.rsuItems);
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
  const rsuGrowthRateById = Object.fromEntries(
    projectionAssetState.buckets
      .filter((bucket) => bucket.linkedRsuId)
      .map((bucket) => [bucket.linkedRsuId as string, (bucket.growth ?? projectionState.assetGrowthRate) / 100]),
  ) as Record<string, number>;

  const projectionExpenseState = structuredClone(expenseState);
  projectionExpenseState.expenses.forEach((expense) => {
    expense.growthRate = projectionState.expenseOverrides?.[expense.id]?.growthRate ?? null;
  });

  const projectionAssets = createAssets(projectionAssetState, projectionState.assetGrowthRate);
  const projectionExpenses = createExpenses(projectionExpenseState, projectionState.expenseGrowthRate);
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
  const effectiveMortgageFundingBucketId = projectionState.mortgageFundingBucketId || reserveCashBucketId;
  const effectiveFreeCashFlowBucketId =
    projectionState.freeCashFlowBucketId ||
    projectionAssets.buckets.find(
      (bucket) =>
        bucket.id !== reserveCashBucketId &&
        bucket.taxTreatment === "none" &&
        (incomeDirectedContributions[bucket.id] ?? 0) === 0,
    )?.id ||
    freeCashFlowOptions[0]?.id ||
    "";
  const projection = createProjection({
    ...projectionState,
    mortgageFundingBucketId: effectiveMortgageFundingBucketId,
    freeCashFlowBucketId: effectiveFreeCashFlowBucketId,
  });
  const projectionResults = calculateProjection({
    incomeSummary,
    mortgageSummary,
    assets: projectionAssets,
    expenses: projectionExpenses,
    projection,
    rsuGrowthRateById,
    taxConfig,
  });
  const currentRow =
    projectionResults.projection.find((row) => row.year === projection.currentYear) ?? projectionResults.ending;
  const selectedYearLabel = projection.currentYear === 0 ? "Today" : `Year ${projection.currentYear}`;
  const annualHousingCost = currentRow.mortgageLineItem - annualPropertyTax;
  const monthlyHousingCostValue = toDisplayValue(annualHousingCost / 12, projection.currentYear, projection);
  const mortgageSummaryItems =
    mortgageScenario.kind === "rent"
      ? [
          {
            label: "Annual housing cost",
            value: usd(toDisplayValue(annualHousingCost, projection.currentYear, projection)),
          },
          {
            label: "Yearly increase",
            value: `${mortgageScenario.rentGrowthRate.toFixed(1)}%`,
          },
        ]
      : (() => {
          const monthlyPrincipal = getMortgagePrincipalForYear(mortgageScenario, projection.currentYear);
          const monthlyInterest = getMortgageInterestForYear(mortgageScenario, projection.currentYear);
          const monthlyUpkeep = annualHousingCost / 12 - monthlyPrincipal - monthlyInterest;
          const monthlyLabelSuffix = projection.currentYear > 0 ? `in year ${projection.currentYear}` : "today";

          return [
            {
              label: `Monthly principal ${monthlyLabelSuffix}`,
              value: usd(toDisplayValue(monthlyPrincipal, projection.currentYear, projection)),
            },
            {
              label: `Monthly interest ${monthlyLabelSuffix}`,
              value: usd(toDisplayValue(monthlyInterest, projection.currentYear, projection)),
            },
            {
              label: "Monthly upkeep",
              value: usd(toDisplayValue(monthlyUpkeep, projection.currentYear, projection)),
            },
            {
              label: "Monthly property tax",
              value: usd(toDisplayValue(annualPropertyTax / 12, projection.currentYear, projection)),
            },
            {
              label: "Total interest",
              value: usd(mortgageScenario.totalInterest),
            },
          ];
        })();
  const monthlyHousingCost = usd(monthlyHousingCostValue);
  const monthlyCashFlow = buildMonthlyCashFlow({
    incomeSummary,
    projection,
    currentRow,
    annualPropertyTax,
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
    (resolvedIncome.grossSalary + resolvedIncome.passiveIncome) *
      Math.pow(1 + projection.incomeGrowthRate, projection.currentYear) +
    currentRow.rsuGross;
  const projectedAnnualTax =
    projectedAnnualGrossIncome - annualRetirementContributions - currentRow.takeHome - currentRow.rsuNet + annualPropertyTax;

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
        illiquid: true,
      });
    });
  }

  function addPassiveIncomeItem() {
    setIncome((draft) => {
      draft.incomeItems.push({
        id: crypto.randomUUID(),
        type: "passive",
        name: "Passive income",
        amount: null,
        frequency: "annual",
      });
    });
  }

  function updateLoanField(optionId: string, field: MortgageLoanField, value: number | null) {
    setMortgageState((draft) => {
      const option = draft.options.find((entry) => entry.id === optionId);
      if (option) {
        Object.assign(option, { [field]: value } as Partial<(typeof draft.options)[number]>);
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

  function selectLoan(optionId: string) {
    setMortgageState((draft) => {
      draft.activeLoanId = optionId;
    });
  }

  function addMortgageOption(kind: MortgageOptionKind) {
    setMortgageState((draft) => {
      const nextOption = createMortgageOption({
        kind,
        name: `Scenario ${draft.options.length + 1}`,
      });
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

      const derivedBucket = resolvePinnedBuckets(draft, incomeDirectedContributions, incomeSummary.rsuItems).state.buckets.find(
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
      annualValue: toDisplayValue(annualHousingCost, projection.currentYear, projection),
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
    <PageShell title="Basisflow">
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <WorkspaceSummaryPanel
              currentRow={currentRow}
              monthlyCashFlow={monthlyCashFlow}
              projection={projection}
              projectionResults={projectionResults}
              projectionState={projectionState}
              selectedYearLabel={selectedYearLabel}
              topLevelSummaryRows={topLevelSummaryRows}
              matchRate={income.matchRate}
              freeCashFlowBucketId={effectiveFreeCashFlowBucketId}
              reserveCashBucketId={reserveCashBucketId}
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
            rsuGrowthRateById={rsuGrowthRateById}
            selectedYearLabel={selectedYearLabel}
            retirementSavingTotal={retirementSavingTotal}
            taxConfig={taxConfig}
            onAddSalaryItem={addSalaryItem}
            onAddPassiveIncomeItem={addPassiveIncomeItem}
            onAddRsuItem={addRsuItem}
            onRemoveIncomeItem={removeIncomeItem}
            onUpdateIncomeField={updateIncomeField}
            onUpdateIncomeItem={updateIncomeItem}
          />

          <MortgageSection
            assetOptions={assetOptions}
            currentYear={projection.currentYear}
            mortgageScenario={mortgageScenario}
            mortgageFundingBucketId={effectiveMortgageFundingBucketId}
            mortgageState={mortgageState}
            monthlyHousingCost={monthlyHousingCost}
            mortgageSummaryItems={mortgageSummaryItems}
            scenariosById={scenariosById}
            onAddMortgageOption={addMortgageOption}
            onRemoveLoan={removeMortgageOption}
            onSelectLoan={selectLoan}
            onUpdateLoanField={updateLoanField}
            onUpdateLoanName={updateLoanName}
            onUpdateMortgageFundingBucketId={(mortgageFundingBucketId) =>
              updateProjectionState({ mortgageFundingBucketId })
            }
            setMortgageState={setMortgageState}
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
            onApplyTaxTables={applyTaxTables}
            onSetFederalBrackets={setFederalBrackets}
            onSetLongTermCapitalGains={setLongTermCapitalGains}
            onSetStateBrackets={setStateBrackets}
            setMortgageState={setMortgageState}
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
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
