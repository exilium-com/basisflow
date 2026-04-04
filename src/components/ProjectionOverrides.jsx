import React from "react";
import { RowItem } from "./RowItem";
import { NumberField, fieldLabelClass } from "./Field";
import { SegmentedToggle } from "./SegmentedToggle";
import { usd } from "../lib/format";
import { CASH_BUCKET_ID, toDisplayValue } from "../lib/projectionState";

const snapshotLabelClass = "font-bold text-(--ink)";
const snapshotValueClass = "mt-1 font-bold text-(--ink)";

function ProjectionSnapshot({ label, value }) {
  return (
    <div>
      <div className="text-xs font-extrabold tracking-wide text-(--ink-soft) uppercase">{label}</div>
      <div className={snapshotValueClass}>{value}</div>
    </div>
  );
}

export function ProjectionAssetRows({
  assetInputs,
  pinnedProjectionBucketIds,
  projectionInputs,
  results,
  selectedRow,
  selectedYearLabel,
  state,
  onUpdateAllocation,
  onUpdateAllocationMode,
  onUpdateAssetOverride,
  onToggleAssetOverrideDetails,
}) {
  function getAssetOverrideSummary(bucket) {
    const override = state.assetOverrides?.[bucket.id] ?? {};
    const parts = [];
    if ((override.growth ?? "") !== "") {
      parts.push(`Growth ${override.growth}%`);
    }
    return parts.length ? parts.join(" · ") : null;
  }

  return (
    <div className="grid gap-2.5">
      {assetInputs.buckets.map((bucket) => (
        <RowItem
          key={bucket.id}
          pinned={pinnedProjectionBucketIds.has(bucket.id)}
          headerClassName="grid items-start gap-4 lg:grid-cols-4"
          detailsTitle="Asset overrides"
          detailsSummary={getAssetOverrideSummary(bucket)}
          detailsOpen={Boolean(state.assetOverrides?.[bucket.id]?.detailsOpen)}
          onToggleDetails={(open) => onToggleAssetOverrideDetails(bucket.id, open)}
          detailsContentClassName="grid gap-3 sm:grid-cols-2"
          header={
            <>
              <div className="min-w-0">
                <div className={snapshotLabelClass}>{bucket.label}</div>
              </div>
              <ProjectionSnapshot label="Current value" value={usd(bucket.current)} />
              {projectionInputs.currentYear !== 0 ? (
                <ProjectionSnapshot
                  label={selectedYearLabel}
                  value={usd(
                    toDisplayValue(
                      selectedRow.bucketSnapshotsById?.[bucket.id]?.balance ?? bucket.current,
                      projectionInputs.currentYear,
                      projectionInputs,
                    ),
                  )}
                />
              ) : (
                <div aria-hidden="true" />
              )}
              <div className="grid min-w-0 gap-1">
                <div className={fieldLabelClass}>Allocation</div>
                {bucket.id === CASH_BUCKET_ID ? (
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
                      ariaLabel={`${bucket.label} allocation mode`}
                      className="shrink-0"
                      value={state.allocations?.[bucket.id]?.mode ?? "percent"}
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
                      max={(state.allocations?.[bucket.id]?.mode ?? "percent") === "percent" ? "100" : undefined}
                      step={(state.allocations?.[bucket.id]?.mode ?? "percent") === "percent" ? "1" : "500"}
                      value={state.allocations?.[bucket.id]?.value ?? "0"}
                      onChange={(event) => onUpdateAllocation(bucket.id, event.target.value)}
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
            value={state.assetOverrides?.[bucket.id]?.growth ?? ""}
            placeholder={state.assetGrowthRate}
            onChange={(event) =>
              onUpdateAssetOverride(bucket.id, {
                growth: event.target.value,
              })
            }
          />
        </RowItem>
      ))}
    </div>
  );
}

export function ProjectionExpenseRows({
  expenseInputs,
  projectionInputs,
  selectedRow,
  selectedYearLabel,
  state,
  onToggleExpenseOverrideDetails,
  onUpdateExpenseOverride,
}) {
  function getExpenseOverrideSummary(expense) {
    const growthRate = state.expenseOverrides?.[expense.id]?.growthRate ?? "";
    return growthRate !== "" ? `Growth ${growthRate}%` : null;
  }

  return (
    <div className="grid gap-2.5">
      {expenseInputs.expenses.map((expense) => (
        <RowItem
          key={expense.id}
          headerClassName="grid items-start gap-4 lg:grid-cols-4"
          detailsTitle="Expense overrides"
          detailsSummary={getExpenseOverrideSummary(expense)}
          detailsOpen={Boolean(state.expenseOverrides?.[expense.id]?.detailsOpen)}
          onToggleDetails={(open) => onToggleExpenseOverrideDetails(expense.id, open)}
          detailsContentClassName="grid gap-3"
          header={
            <>
              <div className="min-w-0">
                <div className={snapshotLabelClass}>{expense.label}</div>
              </div>
              <ProjectionSnapshot label="Current amount" value={usd(expense.amount)} />
              {projectionInputs.currentYear !== 0 ? (
                <ProjectionSnapshot
                  label={selectedYearLabel}
                  value={usd(
                    toDisplayValue(
                      selectedRow.expenseSnapshotsById?.[expense.id]?.amount ?? expense.amount,
                      projectionInputs.currentYear,
                      projectionInputs,
                    ),
                  )}
                />
              ) : (
                <div aria-hidden="true" />
              )}
              <ProjectionSnapshot
                label="Cadence"
                value={
                  selectedRow.expenseSnapshotsById?.[expense.id]?.cadenceLabel ??
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
            value={state.expenseOverrides?.[expense.id]?.growthRate ?? ""}
            placeholder={state.expenseGrowthRate}
            onChange={(event) =>
              onUpdateExpenseOverride(expense.id, {
                growthRate: event.target.value,
              })
            }
          />
        </RowItem>
      ))}
    </div>
  );
}
