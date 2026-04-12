import React, { useState } from "react";
import { AdvancedPanel } from "../AdvancedPanel";
import { CheckboxField, NumberField, SelectField } from "../Field";
import { SegmentedToggle } from "../SegmentedToggle";
import { SliderField } from "../SliderField";
import { usd } from "../../lib/format";
import { toDisplayValue, type Projection, type ProjectionState } from "../../lib/projectionState";
import { type ProjectionRow } from "../../lib/projectionUtils";

type SummaryRow = {
  href: string;
  label: string;
  annualValue: number;
};

type WorkspaceSummaryPanelProps = {
  currentRow: ProjectionRow;
  projection: Projection;
  projectionState: ProjectionState;
  selectedYearLabel: string;
  topLevelSummaryRows: SummaryRow[];
  matchRate: number;
  assetOptions: Array<{ id: string; name: string }>;
  freeCashFlowOptions: Array<{ id: string; name: string }>;
  onUpdateIncomeField: (field: "matchRate", value: number) => void;
  onUpdateProjectionState: (patch: Partial<ProjectionState>) => void;
};

function SummaryLinkRow({ href, label, annualValue }: SummaryRow) {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const value = usd(period === "monthly" ? annualValue / 12 : annualValue);

  return (
    <div className="flex gap-2 border-t border-(--line) py-4">
      <a href={href} className="flex-1 text-sm text-(--ink-soft) hover:text-(--ink)">
        {label}
      </a>
      <a href={href} className="font-bold">
        {value}
      </a>
      <button
        type="button"
        className="text-sm text-(--ink-soft) transition hover:text-(--ink)"
        onClick={() => setPeriod(period === "annual" ? "monthly" : "annual")}
      >
        {period === "monthly" ? "/ month" : "/ year"}
      </button>
    </div>
  );
}

export function WorkspaceSummaryPanel({
  currentRow,
  projection,
  projectionState,
  selectedYearLabel,
  topLevelSummaryRows,
  matchRate,
  assetOptions,
  freeCashFlowOptions,
  onUpdateIncomeField,
  onUpdateProjectionState,
}: WorkspaceSummaryPanelProps) {
  return (
    <>
      <div className="grid gap-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
              {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
            </div>
            <strong className="font-serif text-4xl text-(--teal)">
              {usd(toDisplayValue(currentRow.netWorth, projection.currentYear, projection))}
            </strong>
          </div>
          <SegmentedToggle
            ariaLabel="Display mode"
            value={projectionState.displayMode}
            onChange={(displayMode) => onUpdateProjectionState({ displayMode })}
            options={[
              { value: "nominal", label: "Nominal" },
              { value: "real", label: "Real" },
            ]}
          />
        </div>

        <div className="flex justify-between gap-4">
          <SliderField
            label="Selected year"
            valueLabel={selectedYearLabel}
            min="0"
            max={projection.horizonYears}
            step="1"
            value={projection.currentYear}
            onChange={(event) => onUpdateProjectionState({ currentYear: Number(event.target.value) })}
            className="flex-1"
          />
          <NumberField
            label="Horizon"
            suffix="yr"
            min="1"
            max="60"
            step="1"
            value={projectionState.horizonYears}
            onValueChange={(value) => onUpdateProjectionState({ horizonYears: value ?? 1 })}
          />
        </div>
      </div>

      {topLevelSummaryRows.map((row) => (
        <SummaryLinkRow key={row.href} {...row} />
      ))}

      <AdvancedPanel
        id="workspaceParameters"
        title="Parameters"
        open={projectionState.advancedOpen}
        onToggle={(advancedOpen) => onUpdateProjectionState({ advancedOpen })}
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Match rate"
            suffix="%"
            min="0"
            max="100"
            step="1"
            value={matchRate}
            onValueChange={(value) => onUpdateIncomeField("matchRate", value ?? 0)}
          />
          <NumberField
            label="Inflation"
            suffix="%"
            min="0"
            step="0.5"
            value={projectionState.inflationRate}
            onValueChange={(value) => onUpdateProjectionState({ inflationRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline asset growth"
            suffix="%"
            min="0"
            step="0.5"
            value={projectionState.assetGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ assetGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Gross income growth"
            suffix="%"
            min="-10"
            step="0.5"
            value={projectionState.incomeGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ incomeGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline expense growth"
            suffix="%"
            min="-20"
            step="0.5"
            value={projectionState.expenseGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ expenseGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="RSU stock growth"
            suffix="%"
            min="-50"
            step="0.5"
            value={projectionState.rsuStockGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ rsuStockGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Home appreciation"
            suffix="%"
            min="-10"
            step="0.5"
            value={projectionState.homeAppreciationRate}
            onValueChange={(value) => onUpdateProjectionState({ homeAppreciationRate: value ?? 0 })}
          />
          <CheckboxField
            className="col-span-2"
            label="Include vested RSUs"
            checked={projectionState.includeVestedRsusInNetWorth}
            onChange={(event) => onUpdateProjectionState({ includeVestedRsusInNetWorth: event.target.checked })}
          />
          <SelectField
            label="Down payment funded by"
            value={projectionState.mortgageFundingBucketId}
            onChange={(event) => onUpdateProjectionState({ mortgageFundingBucketId: event.target.value })}
          >
            <option value="">None</option>
            {assetOptions.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Free cash goes to"
            value={projectionState.freeCashFlowBucketId}
            onChange={(event) => onUpdateProjectionState({ freeCashFlowBucketId: event.target.value })}
          >
            <option value="">Reserve cash</option>
            {freeCashFlowOptions.map((bucket) => (
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
