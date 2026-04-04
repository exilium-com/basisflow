import React from "react";
import { AdvancedPanel } from "./AdvancedPanel";
import { CheckboxField, NumberField, SelectField, fieldLabelClass } from "./Field";
import { DisplayToggle } from "./DisplayToggle";
import { ResultList } from "./ResultList";
import { usd } from "../lib/format";
import { toDisplayValue } from "../lib/projectionState";

export function ProjectionSummaryPanel({
  assetInputs,
  projectionInputs,
  results,
  selectedRow,
  selectedYearLabel,
  state,
  summaryItems,
  onUpdateState,
}) {
  return (
    <>
      <div className="grid gap-2 border-b border-(--line) pb-4">
        <p className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
          {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
        </p>
        <div className="flex items-end justify-between gap-4">
          <strong className="block font-serif text-5xl leading-none tracking-tight text-(--teal) md:text-6xl">
            {usd(
              toDisplayValue(
                selectedRow.netWorth ?? results.ending.netWorth,
                projectionInputs.currentYear,
                projectionInputs,
              ),
            )}
          </strong>
          <DisplayToggle value={state.displayMode} onChange={(mode) => onUpdateState({ displayMode: mode })} />
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
                  max={projectionInputs.horizonYears}
                  step="1"
                  value={projectionInputs.currentYear}
                  onChange={(event) => onUpdateState({ currentYear: event.target.value })}
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
            onChange={(event) => onUpdateState({ horizonYears: event.target.value })}
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
            onChange={(event) => onUpdateState({ inflationRate: event.target.value })}
          />
          <NumberField
            label="Baseline asset growth"
            suffix="%"
            min="0"
            step="0.1"
            value={state.assetGrowthRate}
            onChange={(event) => onUpdateState({ assetGrowthRate: event.target.value })}
          />
          <NumberField
            label="RSU stock growth"
            suffix="%"
            min="-50"
            step="0.1"
            value={state.rsuStockGrowthRate}
            onChange={(event) => onUpdateState({ rsuStockGrowthRate: event.target.value })}
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
            onChange={(event) => onUpdateState({ expenseGrowthRate: event.target.value })}
          />
          <NumberField
            label="Take-home growth"
            suffix="%"
            min="-10"
            step="0.1"
            value={state.takeHomeGrowthRate}
            onChange={(event) => onUpdateState({ takeHomeGrowthRate: event.target.value })}
          />
          <NumberField
            label="Home appreciation"
            suffix="%"
            min="-10"
            step="0.1"
            value={state.homeAppreciationRate}
            onChange={(event) => onUpdateState({ homeAppreciationRate: event.target.value })}
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
            {assetInputs.buckets.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.label}
              </option>
            ))}
          </SelectField>
        </div>
      </AdvancedPanel>
    </>
  );
}
