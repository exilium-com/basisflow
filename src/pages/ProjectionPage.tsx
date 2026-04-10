import { produce } from "immer";
import React from "react";
import { ChartPanel } from "../components/ChartPanel";
import { MonthlyCashFlowPanel } from "../components/ProjectionCashFlowPanel";
import { AssetTaxChart, NetWorthChart } from "../components/ProjectionLineCharts";
import { ProjectionAssetRows, ProjectionExpenseRows } from "../components/ProjectionRows";
import { PageShell } from "../components/PageShell";
import { ProjectionSummaryPanel } from "../components/ProjectionSummaryPanel";
import { ProjectionTable } from "../components/ProjectionTable";
import { Section } from "../components/Section";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { useStoredState } from "../hooks/useStoredState";
import {
  DEFAULT_ASSETS_STATE,
  PINNED_BUCKETS,
  buildIncomeDirectedContributions,
  normalizeAssetInputs,
  normalizeAssetsState,
  resolvePinnedBuckets,
} from "../lib/assetsModel";
import { calculateProjection } from "../lib/projectionCalculation";
import { DEFAULT_EXPENSES_STATE, normalizeExpenseInputs, normalizeExpensesState } from "../lib/expensesModel";
import { usd } from "../lib/format";
import {
  type AllocationMode,
  type ProjectionAssetOverride,
  type ProjectionExpenseOverride,
  type ProjectionState,
  DEFAULT_PROJECTION_STATE,
  normalizeProjectionInputs,
  normalizeProjectionState,
  toDisplayValue,
} from "../lib/projectionState";
import { buildMonthlyCashFlow } from "../lib/projectionUtils";
import { loadStoredJson } from "../lib/storage";
import {
  ASSETS_STATE_KEY,
  EXPENSES_STATE_KEY,
  INCOME_SUMMARY_KEY,
  MORTGAGE_SUMMARY_KEY,
  PROJECTION_STATE_KEY,
} from "../lib/storageKeys";
import { loadTaxConfig } from "../lib/taxConfig";
import { surfaceClass } from "../lib/ui";
import { createIncomeSummary, type IncomeSummary } from "../lib/incomeModel";

export function ProjectionPage() {
  const [state, setState] = useStoredState(PROJECTION_STATE_KEY, DEFAULT_PROJECTION_STATE, {
    normalize: normalizeProjectionState,
  });
  const taxConfig = loadTaxConfig();
  const incomeSummary = createIncomeSummary((loadStoredJson(INCOME_SUMMARY_KEY) ?? {}) as Partial<IncomeSummary>);
  const mortgageSummary = loadStoredJson(MORTGAGE_SUMMARY_KEY) ?? {};
  const assetState = normalizeAssetsState(
    loadStoredJson(ASSETS_STATE_KEY, true) ?? DEFAULT_ASSETS_STATE,
    DEFAULT_ASSETS_STATE,
  );
  const expenseState = normalizeExpensesState(
    loadStoredJson(EXPENSES_STATE_KEY, true) ?? DEFAULT_EXPENSES_STATE,
    DEFAULT_EXPENSES_STATE,
  );
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);
  const pinnedAssets = resolvePinnedBuckets(assetState, incomeDirectedContributions);
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;
  const projectionAssetState = produce(
    pinnedAssets.state,
    (draft) => {
      draft.buckets.forEach((bucket) => {
        if (bucket.id === reserveCashBucketId) {
          bucket.contribution = 0;
          bucket.growth = 0;
          bucket.basis = bucket.current ?? 0;
          return;
        }
        bucket.growth = state.assetOverrides?.[bucket.id]?.growth ?? null;
      });
    },
  );
  const projectionExpenseState = produce(expenseState, (draft) => {
    draft.expenses.forEach((expense) => {
      expense.growthRate = state.expenseOverrides?.[expense.id]?.growthRate ?? null;
    });
  });
  const assetInputs = normalizeAssetInputs(projectionAssetState, state.assetGrowthRate);
  const expenseInputs = normalizeExpenseInputs(projectionExpenseState, state.expenseGrowthRate);
  const projectionInputs = normalizeProjectionInputs(state, assetInputs, incomeDirectedContributions);
  const results = calculateProjection({
    incomeSummary,
    mortgageSummary,
    assetInputs,
    expenseInputs,
    projectionInputs,
    taxConfig,
  });
  const currentRow = results.projection.find((row) => row.year === projectionInputs.currentYear) ?? results.ending;
  const selectedYearLabel = projectionInputs.currentYear === 0 ? "Today" : `Year ${projectionInputs.currentYear}`;
  const summaryItems = [
    {
      label: "Gross assets",
      value: usd(toDisplayValue(currentRow.assetsGross, projectionInputs.currentYear, projectionInputs)),
    },
    {
      label: "Home equity",
      value: usd(toDisplayValue(currentRow.homeEquity, projectionInputs.currentYear, projectionInputs)),
    },
    {
      label: "Capital gains tax",
      value: usd(toDisplayValue(currentRow.capitalGainsTax, projectionInputs.currentYear, projectionInputs)),
    },
    {
      label: "Total capital gains",
      value: usd(toDisplayValue(currentRow.totalCapitalGains, projectionInputs.currentYear, projectionInputs)),
    },
    {
      label: "Vested RSUs",
      value: usd(toDisplayValue(currentRow.vestedRsuBalance, projectionInputs.currentYear, projectionInputs)),
    },
  ];
  const monthlyCashFlow = buildMonthlyCashFlow({
    incomeSummary,
    projectionInputs,
    currentRow,
  });
  const pinnedProjectionBucketIds = pinnedAssets.pinnedBucketIds;

  function updateState(patch: Partial<ProjectionState>) {
    setState((draft) => {
      Object.assign(draft, patch);
    });
  }

  function updateAllocation(bucketId: string, value: number | null) {
    setState((draft) => {
      draft.allocations[bucketId] = {
        mode: draft.allocations?.[bucketId]?.mode === "amount" ? "amount" : "percent",
        value: Math.max(0, value ?? 0),
      };
    });
  }

  function updateAllocationMode(bucketId: string, mode: AllocationMode) {
    setState((draft) => {
      draft.allocations[bucketId] = {
        mode: mode === "amount" ? "amount" : "percent",
        value: draft.allocations?.[bucketId]?.value ?? 0,
      };
    });
  }

  function updateAssetOverride(bucketId: string, patch: ProjectionAssetOverride) {
    setState((draft) => {
      Object.assign((draft.assetOverrides[bucketId] ??= {}), patch);
    });
  }

  function updateExpenseOverride(expenseId: string, patch: ProjectionExpenseOverride) {
    setState((draft) => {
      Object.assign((draft.expenseOverrides[expenseId] ??= {}), patch);
    });
  }

  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <ProjectionSummaryPanel
              assetInputs={assetInputs}
              projectionInputs={projectionInputs}
              currentRow={currentRow}
              selectedYearLabel={selectedYearLabel}
              state={state}
              summaryItems={summaryItems}
              onUpdateState={updateState}
            />
          }
        >
          <Section title="Assets">
            <ProjectionAssetRows
              assetInputs={assetInputs}
              pinnedProjectionBucketIds={pinnedProjectionBucketIds}
              projectionInputs={projectionInputs}
              results={results}
              currentRow={currentRow}
              selectedYearLabel={selectedYearLabel}
              state={state}
              onUpdateAllocation={updateAllocation}
              onUpdateAllocationMode={updateAllocationMode}
              onUpdateAssetOverride={updateAssetOverride}
              onToggleAssetOverrideDetails={(bucketId, open) => updateAssetOverride(bucketId, { detailsOpen: open })}
            />
          </Section>

          <Section title="Expenses" divider>
            <ProjectionExpenseRows
              expenseInputs={expenseInputs}
              projectionInputs={projectionInputs}
              currentRow={currentRow}
              selectedYearLabel={selectedYearLabel}
              state={state}
              onToggleExpenseOverrideDetails={(expenseId, open) =>
                updateExpenseOverride(expenseId, { detailsOpen: open })}
              onUpdateExpenseOverride={updateExpenseOverride}
            />
          </Section>

          <Section divider>
            <ChartPanel title={`Monthly Cash Flow For ${selectedYearLabel}`}>
              <MonthlyCashFlowPanel
                items={monthlyCashFlow.items}
                netFlow={monthlyCashFlow.netFlow}
                total={monthlyCashFlow.total}
              />
            </ChartPanel>
          </Section>

          <Section divider>
            <ChartPanel
              title="Net Worth Curve"
              legend={[
                { label: "Net worth", color: "#0a4a53" },
                { label: "Assets", color: "#0d6a73" },
                { label: "Home equity", color: "#c56b3d" },
                { label: "Reserve cash", color: "#566773" },
              ]}
            >
              <NetWorthChart inputs={projectionInputs} results={results} currentYear={projectionInputs.currentYear} />
            </ChartPanel>
          </Section>

          <Section divider>
            <ChartPanel
              title="Asset Growth And Capital Gains"
              legend={[
                { label: "Gross assets", color: "#0c6a7c" },
                { label: "Capital gains tax", color: "#d28a47" },
              ]}
            >
              <AssetTaxChart inputs={projectionInputs} results={results} currentYear={projectionInputs.currentYear} />
            </ChartPanel>
          </Section>

          <Section title="Year-by-Year Projection" divider>
            <ProjectionTable projectionInputs={projectionInputs} rows={results.projection} />
          </Section>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
