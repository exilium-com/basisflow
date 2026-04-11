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
  const value = usd(period === "monthly" ? annualValue / 12 : annualValue, 2);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-(--line) py-3">
      <a href={href} className="min-w-0 flex-1 text-sm text-(--ink-soft) no-underline transition hover:text-(--ink)">
        {label}
      </a>
      <div className="flex items-baseline gap-1.5">
        <a href={href} className="text-right text-(--ink) no-underline">
          <strong>{value}</strong>
        </a>
        <button
          type="button"
          className="text-xs font-extrabold tracking-wide text-(--ink-soft) transition hover:text-(--ink)"
          onClick={() => setPeriod(period === "annual" ? "monthly" : "annual")}
        >
          {period === "monthly" ? "/ month" : "/ year"}
        </button>
      </div>
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
      <div className="grid gap-4 border-b border-(--line) pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <div className="text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
              {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
            </div>
            <strong className="font-serif text-5xl leading-none tracking-tight text-(--teal)">
              {usd(toDisplayValue(currentRow.netWorth, projection.currentYear, projection))}
            </strong>
          </div>
          <div className="grid gap-1">
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
        </div>

        <div className="summary-year-grid">
          <SliderField
            label="Selected year"
            valueLabel={selectedYearLabel}
            min="0"
            max={projection.horizonYears}
            step="1"
            value={projection.currentYear}
            onChange={(event) => onUpdateProjectionState({ currentYear: Number(event.target.value) })}
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

      <div className="mt-4">
        {topLevelSummaryRows.map((row) => (
          <SummaryLinkRow key={row.href} {...row} />
        ))}
      </div>

      <AdvancedPanel
        id="workspaceParameters"
        title="Parameters"
        open={projectionState.advancedOpen}
        onToggle={(advancedOpen) => onUpdateProjectionState({ advancedOpen })}
      >
        <div className="grid gap-3 md:grid-cols-2">
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
            step="0.1"
            value={projectionState.inflationRate}
            onValueChange={(value) => onUpdateProjectionState({ inflationRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline asset growth"
            suffix="%"
            min="0"
            step="0.1"
            value={projectionState.assetGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ assetGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Gross income growth"
            suffix="%"
            min="-10"
            step="0.1"
            value={projectionState.incomeGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ incomeGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline expense growth"
            suffix="%"
            min="-20"
            step="0.1"
            value={projectionState.expenseGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ expenseGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="RSU stock growth"
            suffix="%"
            min="-50"
            step="0.1"
            value={projectionState.rsuStockGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ rsuStockGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Home appreciation"
            suffix="%"
            min="-10"
            step="0.1"
            value={projectionState.homeAppreciationRate}
            onValueChange={(value) => onUpdateProjectionState({ homeAppreciationRate: value ?? 0 })}
          />
          <CheckboxField
            className="md:col-span-2"
            label="Include vested RSUs"
            checked={projectionState.includeVestedRsusInNetWorth}
            onChange={(event) =>
              onUpdateProjectionState({ includeVestedRsusInNetWorth: event.target.checked })
            }
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
