import { AddMenu } from "../AddMenu";
import { metricDeltaBetween } from "../MetricDelta";
import { ProjectedValueDisplay } from "../ProjectedValueDisplay";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { NumberField, SliderField, TextField } from "../Field";
import { WorkspaceMetricSplit } from "./WorkspaceMetricSplit";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import {
  computeRsuGrossForProjectionYear,
  getAnnualSalaryTotal,
  type Income,
  type IncomeItem,
  type IncomeResults,
  type PassiveIncomeItem,
  type RsuItem,
  type SalaryItem,
} from "../../lib/incomeModel";
import { toDisplayValue, type Projection } from "../../lib/projectionState";
import { smallCapsTextClass } from "../../lib/text";
import { type TaxConfig } from "../../lib/taxConfig";

type IncomeSectionProps = {
  comparison?: IncomeComparison | null;
  income: Income;
  incomeResults: IncomeResults;
  projection: Projection;
  rsuGrowthRateById: Record<string, number>;
  selectedYearLabel: string;
  retirementSavingTotal: number;
  taxConfig: TaxConfig;
  onAddSalaryItem: () => void;
  onAddPassiveIncomeItem: () => void;
  onAddRsuItem: () => void;
  onRemoveIncomeItem: (itemId: string) => void;
  onUpdateIncomeField: (
    field: keyof Omit<Income, "incomeItems">,
    value: Income[keyof Omit<Income, "incomeItems">],
  ) => void;
  onUpdateIncomeItem: (itemId: string, patch: Partial<IncomeItem>) => void;
};

type IncomeComparison = {
  income: Income;
  incomeResults: IncomeResults;
  projection: Projection;
  retirementSavingTotal: number;
  rsuGrowthRateById: Record<string, number>;
};

type IncomeRowProps<T extends IncomeItem> = {
  comparisonValue?: number | null;
  item: T;
  projection: Projection;
  rsuGrowthRateById: Record<string, number>;
  selectedYearLabel: string;
  onRemoveIncomeItem: (itemId: string) => void;
  onUpdateIncomeItem: (itemId: string, patch: Partial<IncomeItem>) => void;
};

function renderIncomeSummary(item: IncomeItem, annualizedSalary: number) {
  if (item.type === "salary" || item.type === "passive") {
    return item.frequency === "monthly" ? `${usd(annualizedSalary)} / year` : "Annual";
  }

  const vestYears = Math.max(1, Math.round(item.vestingYears ?? 4));
  return `${vestYears} year vest`;
}

function projectedIncomeValue(item: IncomeItem, projection: Projection, rsuGrowthRateById: Record<string, number>) {
  if (item.type === "salary" || item.type === "passive") {
    const annualizedSalary = getAnnualSalaryTotal([{ amount: item.amount ?? 0, frequency: item.frequency }]);
    return toDisplayValue(
      annualizedSalary * Math.pow(1 + projection.incomeGrowthRate, projection.currentYear),
      projection.currentYear,
      projection,
    );
  }

  return toDisplayValue(
    computeRsuGrossForProjectionYear(
      [
        {
          id: item.id,
          name: item.name,
          grantAmount: item.grantAmount ?? 0,
          refresherAmount: item.refresherAmount ?? 0,
          vestingYears: item.vestingYears ?? 4,
          illiquid: item.illiquid,
        },
      ],
      projection.currentYear,
      rsuGrowthRateById[item.id] ?? projection.assetGrowthRate,
      projection.incomeGrowthRate,
    ),
    projection.currentYear,
    projection,
  );
}

function RecurringIncomeRowItem({
  comparisonValue,
  item,
  projection,
  rsuGrowthRateById,
  selectedYearLabel,
  onRemoveIncomeItem,
  onUpdateIncomeItem,
}: IncomeRowProps<SalaryItem | PassiveIncomeItem>) {
  const annualizedSalary = getAnnualSalaryTotal([{ amount: item.amount ?? 0, frequency: item.frequency }]);
  const isPassive = item.type === "passive";
  const value = projectedIncomeValue(item, projection, rsuGrowthRateById);

  return (
    <RowItem
      onRemove={(event) => {
        event.stopPropagation();
        onRemoveIncomeItem(item.id);
      }}
      detailsTitle="Income details"
      detailsSummary={renderIncomeSummary(item, annualizedSalary)}
      details={
        <SegmentedToggle
          label="Frequency"
          ariaLabel={`${item.name || (isPassive ? "Passive income" : "Salary")} frequency`}
          className="w-fit"
          value={item.frequency}
          onChange={(frequency) => onUpdateIncomeItem(item.id, { frequency })}
          options={[
            { value: "annual", label: "Annual" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      }
    >
      <TextField
        label="Income name"
        value={item.name}
        onChange={(event) => onUpdateIncomeItem(item.id, { name: event.target.value })}
      />
      <NumberField
        label="Amount"
        prefix="$"
        step="1000"
        value={item.amount}
        onValueChange={(value) => onUpdateIncomeItem(item.id, { amount: value })}
      />
      <ProjectedValueDisplay
        delta={metricDeltaBetween(value, comparisonValue)}
        label={selectedYearLabel}
        value={usd(value)}
      />
    </RowItem>
  );
}

function RsuRowItem({
  comparisonValue,
  item,
  projection,
  rsuGrowthRateById,
  selectedYearLabel,
  onRemoveIncomeItem,
  onUpdateIncomeItem,
}: IncomeRowProps<RsuItem>) {
  const value = projectedIncomeValue(item, projection, rsuGrowthRateById);

  return (
    <RowItem
      onRemove={(event) => {
        event.stopPropagation();
        onRemoveIncomeItem(item.id);
      }}
      detailsTitle="RSU details"
      details={
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Annual refresher"
            prefix="$"
            step="1000"
            value={item.refresherAmount}
            onValueChange={(value) => onUpdateIncomeItem(item.id, { refresherAmount: value })}
          />
          <NumberField
            label="Years left to vest"
            suffix="years"
            step="1"
            value={item.vestingYears}
            onValueChange={(value) => onUpdateIncomeItem(item.id, { vestingYears: value })}
          />
          <SegmentedToggle
            label="Liquidity"
            ariaLabel={`${item.name || "RSU grant"} liquidity`}
            className="w-fit"
            value={item.illiquid ? "illiquid" : "liquid"}
            onChange={(value) => onUpdateIncomeItem(item.id, { illiquid: value === "illiquid" })}
            options={[
              { value: "liquid", label: "Liquid" },
              { value: "illiquid", label: "Illiquid" },
            ]}
          />
        </div>
      }
    >
      <TextField
        label="Income name"
        value={item.name}
        onChange={(event) => onUpdateIncomeItem(item.id, { name: event.target.value })}
      />
      <NumberField
        label="Unvested remaining"
        prefix="$"
        step="1000"
        value={item.grantAmount}
        onValueChange={(value) => onUpdateIncomeItem(item.id, { grantAmount: value })}
      />
      <ProjectedValueDisplay
        delta={metricDeltaBetween(value, comparisonValue)}
        label={selectedYearLabel}
        value={usd(value)}
      />
    </RowItem>
  );
}

export function IncomeSection({
  comparison,
  income,
  incomeResults,
  projection,
  rsuGrowthRateById,
  selectedYearLabel,
  retirementSavingTotal,
  taxConfig,
  onAddSalaryItem,
  onAddPassiveIncomeItem,
  onAddRsuItem,
  onRemoveIncomeItem,
  onUpdateIncomeField,
  onUpdateIncomeItem,
}: IncomeSectionProps) {
  const comparisonItemsById = new Map((comparison?.income.incomeItems ?? []).map((item) => [item.id, item]));
  const annualIncome = incomeResults.grossSalary + incomeResults.passiveIncome;

  function comparisonIncomeValue(item: IncomeItem) {
    if (!comparison) {
      return null;
    }

    const comparisonItem = comparisonItemsById.get(item.id);
    if (item.type !== comparisonItem?.type) {
      return 0;
    }

    return projectedIncomeValue(comparisonItem, comparison.projection, comparison.rsuGrowthRateById);
  }

  return (
    <WorkspaceSection
      id="income"
      index="01"
      title="Income"
      summary="Cash In"
      actions={
        <AddMenu
          className="w-full sm:w-auto"
          label="Add income"
          options={[
            { id: "salary", label: "Salary", onSelect: onAddSalaryItem },
            { id: "passive", label: "Passive income", onSelect: onAddPassiveIncomeItem },
            { id: "rsu", label: "RSU", onSelect: onAddRsuItem },
          ]}
        />
      }
    >
      <div className="grid gap-2">
        {income.incomeItems.map((item) =>
          item.type === "salary" || item.type === "passive" ? (
            <RecurringIncomeRowItem
              key={item.id}
              comparisonValue={comparisonIncomeValue(item)}
              item={item}
              projection={projection}
              rsuGrowthRateById={rsuGrowthRateById}
              selectedYearLabel={selectedYearLabel}
              onRemoveIncomeItem={onRemoveIncomeItem}
              onUpdateIncomeItem={onUpdateIncomeItem}
            />
          ) : (
            <RsuRowItem
              key={item.id}
              comparisonValue={comparisonIncomeValue(item)}
              item={item}
              projection={projection}
              rsuGrowthRateById={rsuGrowthRateById}
              selectedYearLabel={selectedYearLabel}
              onRemoveIncomeItem={onRemoveIncomeItem}
              onUpdateIncomeItem={onUpdateIncomeItem}
            />
          ),
        )}
      </div>

      <div className="mt-8">
        <WorkspaceMetricSplit
          metrics={{
            primaryItem: {
              delta: metricDeltaBetween(incomeResults.monthlyTakeHome, comparison?.incomeResults.monthlyTakeHome),
              label: "Monthly take-home",
              value: usd(incomeResults.monthlyTakeHome),
            },
            items: [
              {
                delta: metricDeltaBetween(
                  annualIncome,
                  comparison
                    ? comparison.incomeResults.grossSalary + comparison.incomeResults.passiveIncome
                    : undefined,
                ),
                label: "Annual income",
                value: usd(annualIncome),
              },
              {
                delta: metricDeltaBetween(incomeResults.totalTaxes, comparison?.incomeResults.totalTaxes, "lower"),
                label: "Total taxes",
                value: usd(incomeResults.totalTaxes),
              },
              {
                delta: metricDeltaBetween(retirementSavingTotal, comparison?.retirementSavingTotal),
                label: "Retirement saving",
                value: usd(retirementSavingTotal),
              },
            ],
          }}
        >
          <div className={smallCapsTextClass}>Retirement saving</div>
          <div className="grid gap-4">
            <SliderField
              id="employee401k"
              label="Traditional 401(k)"
              valueLabel={usd(income.employee401k)}
              min="0"
              max={taxConfig.employee401kLimit}
              step="50"
              value={income.employee401k}
              onChange={(event) => onUpdateIncomeField("employee401k", Number(event.target.value))}
            />
            <SliderField
              id="megaBackdoor"
              label="Roth 401(k)"
              valueLabel={usd(incomeResults.megaBackdoor)}
              min="0"
              max={Math.max(0, Math.round(incomeResults.availableMegaRoom))}
              step="50"
              value={Math.min(income.megaBackdoor, Math.max(0, Math.round(incomeResults.availableMegaRoom)))}
              onChange={(event) => onUpdateIncomeField("megaBackdoor", Number(event.target.value))}
            />
            <SliderField
              id="iraContribution"
              label="IRA"
              valueLabel={usd(income.iraContribution)}
              min="0"
              max={taxConfig.iraContributionLimit}
              step="50"
              value={income.iraContribution}
              onChange={(event) => onUpdateIncomeField("iraContribution", Number(event.target.value))}
            />
            <SliderField
              id="hsaContribution"
              label="HSA"
              valueLabel={usd(income.hsaContribution)}
              min="0"
              max={taxConfig.hsaContributionLimit}
              step="50"
              value={income.hsaContribution}
              onChange={(event) => onUpdateIncomeField("hsaContribution", Number(event.target.value))}
            />
          </div>
        </WorkspaceMetricSplit>
      </div>
    </WorkspaceSection>
  );
}
