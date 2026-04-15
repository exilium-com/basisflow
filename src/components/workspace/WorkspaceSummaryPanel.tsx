import React, { useState } from "react";
import { AdvancedPanel } from "../AdvancedPanel";
import { ChartPanel } from "../ChartPanel";
import { CheckboxField, NumberField, SelectField } from "../Field";
import { MonthlyCashFlowPanel } from "../ProjectionCashFlowPanel";
import { NetWorthChart } from "../ProjectionLineCharts";
import { SegmentedToggle } from "../SegmentedToggle";
import { SliderField } from "../Field";
import { netWorthChartLegend } from "../../lib/colors";
import { usd } from "../../lib/format";
import { type ProjectionResults } from "../../lib/projectionCalculation";
import { toDisplayValue, type Projection, type ProjectionState } from "../../lib/projectionState";
import { type MonthlyCashFlow, type ProjectionRow } from "../../lib/projectionUtils";
import { labelTextClass, primaryNumberTextClass, smallCapsTextClass } from "../../lib/text";

type SummaryRow = {
  href: string;
  label: string;
  annualValue: number;
};

type WorkspaceSummaryPanelProps = {
  currentRow: ProjectionRow;
  monthlyCashFlow: MonthlyCashFlow;
  projection: Projection;
  projectionResults: ProjectionResults;
  projectionState: ProjectionState;
  selectedYearLabel: string;
  topLevelSummaryRows: SummaryRow[];
  matchRate: number;
  freeCashFlowBucketId: string;
  reserveCashBucketId: string;
  freeCashFlowOptions: Array<{ id: string; name: string }>;
  onUpdateIncomeField: (field: "matchRate", value: number) => void;
  onUpdateProjectionState: (patch: Partial<ProjectionState>) => void;
};

function SummaryLinkRow({ href, label, annualValue }: SummaryRow) {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const value = usd(period === "monthly" ? annualValue / 12 : annualValue);

  return (
    <div className="flex gap-2 border-t border-(--line) py-4">
      <a href={href} className={`flex-1 ${labelTextClass} hover:text-(--ink)`}>
        {label}
      </a>
      <a href={href} className="font-bold">
        {value}
      </a>
      <button
        type="button"
        className={`${labelTextClass} transition hover:text-(--ink)`}
        onClick={() => setPeriod(period === "annual" ? "monthly" : "annual")}
      >
        {period === "monthly" ? "/ month" : "/ year"}
      </button>
    </div>
  );
}

export function WorkspaceSummaryPanel({
  currentRow,
  monthlyCashFlow,
  projection,
  projectionResults,
  projectionState,
  selectedYearLabel,
  topLevelSummaryRows,
  matchRate,
  freeCashFlowBucketId,
  reserveCashBucketId,
  freeCashFlowOptions,
  onUpdateIncomeField,
  onUpdateProjectionState,
}: WorkspaceSummaryPanelProps) {
  return (
    <>
      <div className="sticky top-0 z-10 grid gap-4 border-b border-(--line) bg-(--white) pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className={smallCapsTextClass}>
              {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
            </div>
            <strong className={primaryNumberTextClass}>
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
            step="1"
            value={projectionState.horizonYears}
            onValueChange={(value) => onUpdateProjectionState({ horizonYears: value ?? 1 })}
          />
        </div>
      </div>

      {topLevelSummaryRows.map((row) => (
        <SummaryLinkRow key={row.href} {...row} />
      ))}

      <div className="grid gap-4 pt-4 pb-4">
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
          />
        </ChartPanel>

        <ChartPanel
          title="Net worth"
          legend={netWorthChartLegend.filter(
            (item) => item.label !== "RSUs" || projection.includeVestedRsusInNetWorth,
          )}
        >
          <NetWorthChart
            projection={projection}
            results={projectionResults}
            currentYear={projection.currentYear}
          />
        </ChartPanel>
      </div>

      <AdvancedPanel
        id="workspaceParameters"
        title="Parameters"
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Match rate"
            suffix="%"
            step="1"
            value={matchRate}
            onValueChange={(value) => onUpdateIncomeField("matchRate", value ?? 0)}
          />
          <NumberField
            label="Inflation"
            suffix="%"
            step="0.5"
            value={projectionState.inflationRate}
            onValueChange={(value) => onUpdateProjectionState({ inflationRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline asset growth"
            suffix="%"
            step="0.5"
            value={projectionState.assetGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ assetGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Gross income growth"
            suffix="%"
            step="0.5"
            value={projectionState.incomeGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ incomeGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Baseline expense growth"
            suffix="%"
            step="0.5"
            value={projectionState.expenseGrowthRate}
            onValueChange={(value) => onUpdateProjectionState({ expenseGrowthRate: value ?? 0 })}
          />
          <NumberField
            label="Home appreciation"
            suffix="%"
            step="0.5"
            value={projectionState.homeAppreciationRate}
            onValueChange={(value) => onUpdateProjectionState({ homeAppreciationRate: value ?? 0 })}
          />
          <NumberField
            label="Target cash"
            prefix="$"
            step="1000"
            value={projectionState.targetCash}
            onValueChange={(value) => onUpdateProjectionState({ targetCash: value ?? 0 })}
          />
          <CheckboxField
            label="Include vested RSUs"
            checked={projectionState.includeVestedRsusInNetWorth}
            onChange={(event) => onUpdateProjectionState({ includeVestedRsusInNetWorth: event.target.checked })}
          />
          <SelectField
            label="Free cash goes to"
            value={freeCashFlowBucketId}
            onChange={(event) => onUpdateProjectionState({ freeCashFlowBucketId: event.target.value })}
          >
            <option value={reserveCashBucketId}>Reserve cash</option>
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
