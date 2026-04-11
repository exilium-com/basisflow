import React from "react";
import { ChartPanel } from "../ChartPanel";
import { MonthlyCashFlowPanel } from "../ProjectionCashFlowPanel";
import { NetWorthChart } from "../ProjectionLineCharts";
import { ProjectionAssetRows, ProjectionExpenseRows } from "../ProjectionRows";
import { ProjectionTable } from "../ProjectionTable";
import { WorkspaceSection } from "./WorkspaceSection";
import { type Assets } from "../../lib/assetsModel";
import { type Expenses } from "../../lib/expensesModel";
import { type Projection, type ProjectionState, type ProjectionAssetOverride, type ProjectionExpenseOverride, type AllocationMode } from "../../lib/projectionState";
import { type ProjectionResults } from "../../lib/projectionCalculation";
import { type MonthlyCashFlow, type ProjectionRow } from "../../lib/projectionUtils";

type ProjectionSectionProps = {
  currentRow: ProjectionRow;
  monthlyCashFlow: MonthlyCashFlow;
  pinnedProjectionBucketIds: Set<string>;
  projection: Projection;
  projectionAssets: Assets;
  projectionExpenses: Expenses;
  projectionResults: ProjectionResults;
  projectionState: ProjectionState;
  selectedYearLabel: string;
  onUpdateAllocation: (bucketId: string, value: number | null) => void;
  onUpdateAllocationMode: (bucketId: string, mode: AllocationMode) => void;
  onUpdateAssetOverride: (bucketId: string, patch: ProjectionAssetOverride) => void;
  onUpdateExpenseOverride: (expenseId: string, patch: ProjectionExpenseOverride) => void;
};

export function ProjectionSection({
  currentRow,
  monthlyCashFlow,
  pinnedProjectionBucketIds,
  projection,
  projectionAssets,
  projectionExpenses,
  projectionResults,
  projectionState,
  selectedYearLabel,
  onUpdateAllocation,
  onUpdateAllocationMode,
  onUpdateAssetOverride,
  onUpdateExpenseOverride,
}: ProjectionSectionProps) {
  return (
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
              onUpdateAllocation={onUpdateAllocation}
              onUpdateAllocationMode={onUpdateAllocationMode}
              onUpdateAssetOverride={onUpdateAssetOverride}
              onToggleAssetOverrideDetails={(bucketId, detailsOpen) =>
                onUpdateAssetOverride(bucketId, { detailsOpen })
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
              onToggleExpenseOverrideDetails={(expenseId, detailsOpen) =>
                onUpdateExpenseOverride(expenseId, { detailsOpen })
              }
              onUpdateExpenseOverride={onUpdateExpenseOverride}
            />
          </div>
        </div>

        <ProjectionTable projection={projection} rows={projectionResults.projection} />
      </div>
    </WorkspaceSection>
  );
}
