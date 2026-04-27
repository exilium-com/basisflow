import { useState } from "react";
import { AdvancedPanel } from "../AdvancedPanel";
import { ChartPanel } from "../ChartPanel";
import { CheckboxField, NumberField, SelectField, SliderField } from "../Field";
import { MonthlyCashFlowPanel } from "../ProjectionCashFlowPanel";
import { NetWorthChart } from "../ProjectionLineCharts";
import { SegmentedToggle } from "../SegmentedToggle";
import { metricDeltaBetween, MetricDelta } from "../MetricDelta";
import { netWorthChartLegend } from "../../lib/colors";
import { usd } from "../../lib/format";
import { type ProjectionResults } from "../../lib/projectionCalculation";
import {
  toDisplayValue,
  type Projection,
  type ProjectionDisplayMode,
  type ProjectionState,
} from "../../lib/projectionState";
import { type MonthlyCashFlow, type ProjectionRow } from "../../lib/projectionUtils";
import { buttonTextClass, labelTextClass, smallCapsTextClass } from "../../lib/text";

const displayModeOptions: Array<{ value: ProjectionDisplayMode; label: string }> = [
  { value: "nominal", label: "Nominal" },
  { value: "real", label: "Real" },
];

type SummaryRow = {
  better: "higher" | "lower";
  href: string;
  label: string;
  annualValue: number;
};

type WorkspaceSummaryComparison = {
  currentRow: ProjectionRow;
  monthlyCashFlow: MonthlyCashFlow;
  profileName: string;
  projection: Projection;
  projectionResults: ProjectionResults;
  topLevelSummaryRows: SummaryRow[];
};

type WorkspaceSummaryPanelProps = {
  comparison?: WorkspaceSummaryComparison | null;
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

function SummaryLinkRow({
  annualComparisonValue,
  better,
  href,
  label,
  annualValue,
}: SummaryRow & { annualComparisonValue?: number }) {
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  const displayValue = period === "monthly" ? annualValue / 12 : annualValue;
  const comparisonValue =
    annualComparisonValue == null ? null : period === "monthly" ? annualComparisonValue / 12 : annualComparisonValue;
  const delta = metricDeltaBetween(displayValue, comparisonValue, better);

  return (
    <div className="flex items-start gap-2 border-t border-(--line) py-4">
      <a href={href} className={`${labelTextClass} flex-1 hover:text-(--ink)`}>
        {label}
      </a>
      <div className="grid justify-items-end">
        <div className="flex items-baseline gap-2">
          <a href={href} className="font-bold">
            {usd(displayValue)}
          </a>
          <button
            type="button"
            className={`${labelTextClass} transition hover:text-(--ink)`}
            onClick={() => setPeriod(period === "annual" ? "monthly" : "annual")}
          >
            {period === "monthly" ? "/ month" : "/ year"}
          </button>
        </div>
        {delta == null ? null : <MetricDelta delta={delta} />}
      </div>
    </div>
  );
}

export function WorkspaceSummaryPanel({
  comparison,
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
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const netWorth = toDisplayValue(currentRow.netWorth, projection.currentYear, projection);
  const comparisonNetWorth = comparison
    ? toDisplayValue(comparison.currentRow.netWorth, comparison.projection.currentYear, comparison.projection)
    : undefined;
  const netWorthDelta = metricDeltaBetween(netWorth, comparisonNetWorth);
  const comparisonRowsByHref = new Map((comparison?.topLevelSummaryRows ?? []).map((row) => [row.href, row]));
  const cashFlowTitle =
    projection.currentYear === 0 ? "Monthly Cash Flow Today" : `Monthly Cash Flow in Year ${projection.currentYear}`;

  const summaryBody = (
    <>
      {topLevelSummaryRows.map((row) => (
        <SummaryLinkRow
          key={row.href}
          {...row}
          annualComparisonValue={comparison ? (comparisonRowsByHref.get(row.href)?.annualValue ?? 0) : undefined}
        />
      ))}

      <div className="grid gap-4 py-4">
        <ChartPanel title={cashFlowTitle}>
          <MonthlyCashFlowPanel
            comparison={comparison?.monthlyCashFlow}
            items={monthlyCashFlow.items}
            netFlow={monthlyCashFlow.netFlow}
          />
        </ChartPanel>

        <ChartPanel
          title="Net worth"
          legend={[
            ...netWorthChartLegend.filter((item) => item.label !== "RSUs" || projection.includeVestedRsusInNetWorth),
            ...(comparison ? [{ label: `"${comparison.profileName}"`, color: "var(--ink)" }] : []),
          ]}
        >
          <NetWorthChart
            comparison={
              comparison
                ? {
                    projection: comparison.projection,
                    results: comparison.projectionResults,
                  }
                : null
            }
            projection={projection}
            results={projectionResults}
            currentYear={projection.currentYear}
          />
        </ChartPanel>
      </div>

      <AdvancedPanel id="workspaceParameters" title="Parameters" defaultOpen={false}>
        <div className="grid gap-4 sm:grid-cols-2">
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
            className="sm:col-span-2"
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

  return (
    <div>
      <div className="grid gap-4 bg-(--white) py-4 lg:border-b lg:border-(--line)">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className={smallCapsTextClass}>
              {`Net Worth ${selectedYearLabel === "Today" ? "Today" : `In ${selectedYearLabel}`}`}
            </div>
            <strong className="font-serif text-3xl text-(--teal) sm:text-4xl">{usd(netWorth)}</strong>
            {comparison && netWorthDelta ? (
              <div>
                <MetricDelta delta={netWorthDelta} />
                <span className={labelTextClass}> compared to {comparison.profileName}</span>
              </div>
            ) : null}
          </div>
          <div className="shrink-0 lg:hidden">
            <SegmentedToggle
              size="compact"
              ariaLabel="Display mode"
              value={projectionState.displayMode}
              onChange={(displayMode) => onUpdateProjectionState({ displayMode })}
              options={displayModeOptions}
            />
          </div>
          <div className="hidden shrink-0 lg:block">
            <SegmentedToggle
              ariaLabel="Display mode"
              value={projectionState.displayMode}
              onChange={(displayMode) => onUpdateProjectionState({ displayMode })}
              options={displayModeOptions}
            />
          </div>
        </div>

        <div className="flex items-end gap-4">
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
            className="w-24 shrink-0"
            label="Horizon"
            suffix="yr"
            step="1"
            value={projectionState.horizonYears}
            onValueChange={(value) => onUpdateProjectionState({ horizonYears: value ?? 1 })}
          />
        </div>

        <div className="lg:hidden">
          <button
            type="button"
            className={`action-button w-full ${buttonTextClass}`}
            onClick={() => setMobileSummaryOpen((open) => !open)}
          >
            {mobileSummaryOpen ? "Hide Summary" : "Show Summary"}
          </button>
        </div>
      </div>

      <div className="hidden lg:block">{summaryBody}</div>
      {mobileSummaryOpen ? <div className="border-b border-(--line) bg-(--white) lg:hidden">{summaryBody}</div> : null}
    </div>
  );
}
