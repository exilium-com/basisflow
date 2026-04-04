import React from "react";
import { ChartPanel } from "../components/ChartPanel";
import { MonthlyCashFlowPanel } from "../components/ProjectionCashFlowPanel";
import { AssetTaxChart, NetWorthChart } from "../components/ProjectionLineCharts";
import { ProjectionAssetRows, ProjectionExpenseRows } from "../components/ProjectionOverrides";
import { PageShell } from "../components/PageShell";
import { ProjectionSummaryPanel } from "../components/ProjectionSummaryPanel";
import { ProjectionTable } from "../components/ProjectionTable";
import { Section } from "../components/Section";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { useProjectionWorkspace } from "../hooks/useProjectionWorkspace";
import { surfaceClass } from "../lib/ui";

export function ProjectionPage() {
  const {
    assetInputs,
    expenseInputs,
    monthlyCashFlow,
    pinnedProjectionBucketIds,
    projectionInputs,
    results,
    selectedRow,
    selectedYearLabel,
    state,
    summaryItems,
    updateAllocation,
    updateAllocationMode,
    updateAssetOverride,
    updateExpenseOverride,
    updateState,
  } = useProjectionWorkspace();
  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <ProjectionSummaryPanel
              assetInputs={assetInputs}
              projectionInputs={projectionInputs}
              results={results}
              selectedRow={selectedRow}
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
              selectedRow={selectedRow}
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
              selectedRow={selectedRow}
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
