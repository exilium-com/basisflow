import React from "react";
import { RowItem } from "./RowItem";
import { NumberField, fieldLabelClass } from "./Field";
import { SegmentedToggle } from "./SegmentedToggle";
import { usd } from "../lib/format";
import { toDisplayValue, type AllocationMode, type Projection, type ProjectionState } from "../lib/projectionState";
import { PINNED_BUCKETS, type Assets } from "../lib/assetsModel";
import { type Expenses } from "../lib/expensesModel";
import { type ProjectionResults } from "../lib/projectionCalculation";
import { type ProjectionRow } from "../lib/projectionUtils";

const snapshotLabelClass = "font-bold text-(--ink)";
const snapshotValueClass = "mt-1 font-bold text-(--ink)";

function ProjectionSnapshot({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-extrabold tracking-wide text-(--ink-soft) uppercase">{label}</div>
      <div className={snapshotValueClass}>{value}</div>
    </div>
  );
}

function SelectedYearSnapshot({
  currentYear,
  label,
  value,
}: {
  currentYear: number;
  label: string;
  value: React.ReactNode;
}) {
  if (currentYear === 0) {
    return <div aria-hidden="true" />;
  }

  return <ProjectionSnapshot label={label} value={value} />;
}

type ProjectionAssetRowsProps = {
  assets: Assets;
  pinnedProjectionBucketIds: Set<string>;
  projection: Projection;
  results: ProjectionResults;
  currentRow: ProjectionRow;
  selectedYearLabel: string;
  state: ProjectionState;
  onUpdateAllocation: (bucketId: string, value: number | null) => void;
  onUpdateAllocationMode: (bucketId: string, mode: AllocationMode) => void;
  onUpdateAssetOverride: (bucketId: string, patch: ProjectionState["assetOverrides"][string]) => void;
  onToggleAssetOverrideDetails: (bucketId: string, open: boolean) => void;
};

type ProjectionExpenseRowsProps = {
  expenses: Expenses;
  projection: Projection;
  currentRow: ProjectionRow;
  selectedYearLabel: string;
  state: ProjectionState;
  onToggleExpenseOverrideDetails: (expenseId: string, open: boolean) => void;
  onUpdateExpenseOverride: (expenseId: string, patch: ProjectionState["expenseOverrides"][string]) => void;
};

export function ProjectionAssetRows({
  assets,
  pinnedProjectionBucketIds,
  projection,
  results,
  currentRow,
  selectedYearLabel,
  state,
  onUpdateAllocation,
  onUpdateAllocationMode,
  onUpdateAssetOverride,
  onToggleAssetOverrideDetails,
}: ProjectionAssetRowsProps) {
  const reserveCashBucketId = PINNED_BUCKETS.reserveCashBucketId.id;

  return (
    <div className="grid gap-2.5">
      {assets.buckets.map((bucket) => {
        const allocationMode = state.allocations?.[bucket.id]?.mode ?? "percent";
        const override = state.assetOverrides?.[bucket.id];

        return (
          <RowItem
            key={bucket.id}
            pinned={pinnedProjectionBucketIds.has(bucket.id)}
            headerClassName="grid items-start gap-4 lg:grid-cols-4"
            detailsTitle="Asset overrides"
            detailsSummary={override?.growth != null ? `Growth ${override.growth}%` : null}
            detailsOpen={Boolean(override?.detailsOpen)}
            onToggleDetails={(open) => onToggleAssetOverrideDetails(bucket.id, open)}
            detailsContentClassName="grid gap-3 sm:grid-cols-2"
            header={
              <>
                <div className="min-w-0">
                  <div className={snapshotLabelClass}>{bucket.name}</div>
                </div>
                <ProjectionSnapshot label="Current value" value={usd(bucket.current)} />
                <SelectedYearSnapshot
                  currentYear={projection.currentYear}
                  label={selectedYearLabel}
                  value={usd(
                    toDisplayValue(
                      currentRow.bucketSnapshotsById[bucket.id]?.balance ?? bucket.current,
                      projection.currentYear,
                      projection,
                    ),
                  )}
                />
                <div className="grid min-w-0 gap-1">
                  <div className={fieldLabelClass}>Allocation</div>
                  {bucket.id === reserveCashBucketId ? (
                    <NumberField
                      className="min-w-0"
                      suffix="%"
                      inputClassName="text-(--ink-soft)"
                      min="0"
                      max="100"
                      step="1"
                      value={String(Math.max(0, 100 - Math.min(projection.allocationPercentTotal, 100)))}
                      disabled
                    />
                  ) : (results.incomeDirectedContributions?.[bucket.id] ?? 0) > 0 ? (
                    <NumberField
                      className="min-w-0"
                      prefix="$"
                      inputClassName="text-(--ink-soft)"
                      min="0"
                      step="500"
                      value={String(results.incomeDirectedContributions[bucket.id])}
                      disabled
                    />
                  ) : (
                    <div className="flex items-start gap-2">
                      <SegmentedToggle
                        ariaLabel={`${bucket.name} allocation mode`}
                        className="shrink-0"
                        value={allocationMode}
                        onChange={(mode) => onUpdateAllocationMode(bucket.id, mode)}
                        options={[
                          { value: "amount", label: "$" },
                          { value: "percent", label: "%" },
                        ]}
                      />
                      <NumberField
                        className="min-w-0 flex-1"
                        min="0"
                        max={allocationMode === "percent" ? "100" : undefined}
                        step={allocationMode === "percent" ? "1" : "500"}
                        value={state.allocations?.[bucket.id]?.value ?? 0}
                        onValueChange={(value) => onUpdateAllocation(bucket.id, value)}
                      />
                    </div>
                  )}
                </div>
              </>
            }
          >
            <NumberField
              label="Growth override"
              suffix="%"
              min="0"
              step="0.1"
              compact
              value={override?.growth ?? null}
              placeholder={String(state.assetGrowthRate)}
              onValueChange={(value) =>
                onUpdateAssetOverride(bucket.id, {
                  growth: value,
                })
              }
            />
          </RowItem>
        );
      })}
    </div>
  );
}

export function ProjectionExpenseRows({
  expenses,
  projection,
  currentRow,
  selectedYearLabel,
  state,
  onToggleExpenseOverrideDetails,
  onUpdateExpenseOverride,
}: ProjectionExpenseRowsProps) {
  return (
    <div className="grid gap-2.5">
      {expenses.expenses.map((expense) => {
        const override = state.expenseOverrides?.[expense.id];

        return (
          <RowItem
            key={expense.id}
            headerClassName="grid items-start gap-4 lg:grid-cols-4"
            detailsTitle="Expense overrides"
            detailsSummary={override?.growthRate != null ? `Growth ${override.growthRate}%` : null}
            detailsOpen={Boolean(override?.detailsOpen)}
            onToggleDetails={(open) => onToggleExpenseOverrideDetails(expense.id, open)}
            detailsContentClassName="grid gap-3"
            header={
              <>
                <div className="min-w-0">
                  <div className={snapshotLabelClass}>{expense.label}</div>
                </div>
                <ProjectionSnapshot label="Current amount" value={usd(expense.amount)} />
                <SelectedYearSnapshot
                  currentYear={projection.currentYear}
                  label={selectedYearLabel}
                  value={usd(
                    toDisplayValue(
                      currentRow.expenseSnapshotsById[expense.id]?.amount ?? expense.amount,
                      projection.currentYear,
                      projection,
                    ),
                  )}
                />
                <ProjectionSnapshot
                  label="Cadence"
                  value={
                    currentRow.expenseSnapshotsById[expense.id]?.cadenceLabel ??
                    (expense.frequency === "annual" ? "Annual" : expense.frequency === "one_off" ? "One-off" : "Monthly")
                  }
                />
              </>
            }
          >
            <NumberField
              label="Growth override"
              suffix="%"
              min="-20"
              step="0.1"
              compact
              value={override?.growthRate ?? null}
              placeholder={String(state.expenseGrowthRate)}
              onValueChange={(value) =>
                onUpdateExpenseOverride(expense.id, {
                  growthRate: value,
                })
              }
            />
          </RowItem>
        );
      })}
    </div>
  );
}
