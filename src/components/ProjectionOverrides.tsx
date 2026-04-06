import React from "react";
import { RowItem } from "./RowItem";
import { NumberField, fieldLabelClass } from "./Field";
import { SegmentedToggle } from "./SegmentedToggle";
import { usd } from "../lib/format";
import { toDisplayValue, type AllocationMode, type ProjectionInputs, type ProjectionState } from "../lib/projectionState";
import { PINNED_BUCKETS, type AssetInputs } from "../lib/assetsModel";
import { type ExpenseInputs } from "../lib/expensesModel";
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
  assetInputs: AssetInputs;
  pinnedProjectionBucketIds: Set<string>;
  projectionInputs: ProjectionInputs;
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
  expenseInputs: ExpenseInputs;
  projectionInputs: ProjectionInputs;
  currentRow: ProjectionRow;
  selectedYearLabel: string;
  state: ProjectionState;
  onToggleExpenseOverrideDetails: (expenseId: string, open: boolean) => void;
  onUpdateExpenseOverride: (expenseId: string, patch: ProjectionState["expenseOverrides"][string]) => void;
};

export function ProjectionAssetRows({
  assetInputs,
  pinnedProjectionBucketIds,
  projectionInputs,
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
      {assetInputs.buckets.map((bucket) => {
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
                  currentYear={projectionInputs.currentYear}
                  label={selectedYearLabel}
                  value={usd(
                    toDisplayValue(
                      currentRow.bucketSnapshotsById[bucket.id]?.balance ?? bucket.current,
                      projectionInputs.currentYear,
                      projectionInputs,
                    ),
                  )}
                />
                <div className="grid min-w-0 gap-1">
                  <div className={fieldLabelClass}>Allocation</div>
                  {bucket.id === reserveCashBucketId ? (
                    <NumberField
                      label={null}
                      className="min-w-0"
                      suffix="%"
                      inputClassName="text-(--ink-soft)"
                      min="0"
                      max="100"
                      step="1"
                      value={String(Math.max(0, 100 - Math.min(projectionInputs.allocationPercentTotal, 100)))}
                      disabled
                      onChange={() => {}}
                    />
                  ) : (results.incomeDirectedContributions?.[bucket.id] ?? 0) > 0 ? (
                    <NumberField
                      label={null}
                      className="min-w-0"
                      prefix="$"
                      inputClassName="text-(--ink-soft)"
                      min="0"
                      step="500"
                      value={String(results.incomeDirectedContributions[bucket.id])}
                      disabled
                      onChange={() => {}}
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
                        label={null}
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
  expenseInputs,
  projectionInputs,
  currentRow,
  selectedYearLabel,
  state,
  onToggleExpenseOverrideDetails,
  onUpdateExpenseOverride,
}: ProjectionExpenseRowsProps) {
  return (
    <div className="grid gap-2.5">
      {expenseInputs.expenses.map((expense) => {
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
                  currentYear={projectionInputs.currentYear}
                  label={selectedYearLabel}
                  value={usd(
                    toDisplayValue(
                      currentRow.expenseSnapshotsById[expense.id]?.amount ?? expense.amount,
                      projectionInputs.currentYear,
                      projectionInputs,
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
