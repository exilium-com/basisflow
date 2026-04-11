import React from "react";
import { AdvancedPanel } from "./AdvancedPanel";
import { CheckboxField, NumberField, SelectField, fieldLabelClass } from "./Field";
import { SegmentedToggle } from "./SegmentedToggle";
import { ResultList } from "./ResultList";
import { usd } from "../lib/format";
import { toDisplayValue, type ProjectionState, type Projection } from "../lib/projectionState";
import { type Assets } from "../lib/assetsModel";
import { type ProjectionRow } from "../lib/projectionUtils";

type ProjectionSummaryItem = {
  label: string;
  value: React.ReactNode;
};

type ProjectionSummaryPanelProps = {
  assets: Assets;
  projection: Projection;
  currentRow: ProjectionRow;
  selectedYearLabel: string;
  state: ProjectionState;
  summaryItems: ProjectionSummaryItem[];
  onUpdateState: (patch: Partial<ProjectionState>) => void;
};

export function ProjectionSummaryPanel({
  assets,
  projection,
  currentRow,
  selectedYearLabel,
  state,
  summaryItems,
  onUpdateState,
}: ProjectionSummaryPanelProps) {
  return (
    <>
      <div className="grid gap-2 border-b border-(--line) pb-4">
        <p className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
          {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
        </p>
        <div className="flex items-end justify-between gap-4">
          <strong className="block font-serif text-5xl leading-none tracking-tight text-(--teal) md:text-6xl">
            {usd(toDisplayValue(currentRow.netWorth, projection.currentYear, projection))}
          </strong>
          <SegmentedToggle
            ariaLabel="Display mode"
            value={state.displayMode}
            onChange={(mode) => onUpdateState({ displayMode: mode })}
            options={[
              { value: "nominal", label: "Nominal" },
              { value: "real", label: "Real" },
            ]}
          />
        </div>
      </div>
      <div className="mt-4 border-b border-(--line) pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex flex-1 justify-center">
            <div className="grid w-full max-w-md gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className={fieldLabelClass}>Current year</span>
                <span className={fieldLabelClass}>{selectedYearLabel}</span>
              </div>
              <div
                className="flex min-h-10 items-center border border-l-4 border-(--line) border-l-(--teal-soft)
                  bg-(--white) px-3"
              >
                <input
                  type="range"
                  min="0"
                  max={projection.horizonYears}
                  step="1"
                  value={projection.currentYear}
                  onChange={(event) => onUpdateState({ currentYear: Number(event.target.value) })}
                  className="slider-input w-full"
                />
              </div>
            </div>
          </div>
          <NumberField
            label="Horizon"
            className="md:w-32"
            suffix="years"
            min="1"
            max="60"
            step="1"
            value={state.horizonYears}
            onValueChange={(value) => onUpdateState({ horizonYears: value ?? 1 })}
          />
        </div>
      </div>
      <ResultList items={summaryItems} />
      <AdvancedPanel
        id="advancedDetails"
        title="Projection parameters"
        open={state.advancedOpen}
        onToggle={(open) => onUpdateState({ advancedOpen: open })}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <NumberField
            label="Inflation"
            suffix="%"
            min="0"
            step="0.1"
            value={state.inflationRate}
            onValueChange={(value) => onUpdateState({ inflationRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline asset growth"
            suffix="%"
            min="0"
            step="0.1"
            value={state.assetGrowthRate}
            onValueChange={(value) => onUpdateState({ assetGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="RSU stock growth"
            suffix="%"
            min="-50"
            step="0.1"
            value={state.rsuStockGrowthRate}
            onValueChange={(value) => onUpdateState({ rsuStockGrowthRate: value ?? 0 })}
          />
          <CheckboxField
            label="Include vested RSUs"
            checked={state.includeVestedRsusInNetWorth}
            onChange={(event) =>
              onUpdateState({
                includeVestedRsusInNetWorth: event.target.checked,
              })
            }
          />
          <NumberField
            label="Baseline expense growth"
            suffix="%"
            min="-20"
            step="0.1"
            value={state.expenseGrowthRate}
            onValueChange={(value) => onUpdateState({ expenseGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Gross income growth"
            suffix="%"
            min="-10"
            step="0.1"
            value={state.incomeGrowthRate}
            onValueChange={(value) => onUpdateState({ incomeGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Home appreciation"
            suffix="%"
            min="-10"
            step="0.1"
            value={state.homeAppreciationRate}
            onValueChange={(value) => onUpdateState({ homeAppreciationRate: value ?? 0 })}
          />
          <SelectField
            label="Down payment funded by"
            value={state.mortgageFundingBucketId}
            onChange={(event) =>
              onUpdateState({
                mortgageFundingBucketId: event.target.value,
              })
            }
          >
            <option value="">None</option>
            {assets.buckets.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.name}
              </option>
            ))}
          </SelectField>
        </div>
      </AdvancedPanel>
    </>
  );
}
