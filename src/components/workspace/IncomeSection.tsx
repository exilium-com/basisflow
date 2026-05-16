import { AddMenu } from "../AddMenu";
import { metricDeltaBetween } from "../MetricDelta";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { PeriodSuffix } from "../PeriodSuffix";
import { NumberField, SliderField } from "../Field";
import { RowMoneyField, RowValueProjection } from "./RowValueProjection";
import { WorkspaceMetricSplit } from "./WorkspaceMetricSplit";
import { workspaceSectionActionClassName, WorkspaceSection, WorkspaceSectionFooter } from "./WorkspaceSection";
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
import { type ProjectionRow } from "../../lib/projectionUtils";
import { smallCapsTextClass } from "../../lib/text";
import { type TaxConfig } from "../../lib/taxConfig";

type IncomeSectionProps = {
  comparison?: IncomeComparison | null;
  currentRow: ProjectionRow;
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
  currentRow: ProjectionRow;
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
    return item.frequency === "monthly" ? (
      <>
        {usd(annualizedSalary)} <PeriodSuffix period="year" />
      </>
    ) : (
      "Annual"
    );
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
      fallbackName={isPassive ? "Passive income" : "Salary"}
      name={item.name}
      canRename
      renameAriaLabel="Income name"
      onRemove={() => onRemoveIncomeItem(item.id)}
      onRename={(nextName) => onUpdateIncomeItem(item.id, { name: nextName })}
      detailsSummary={renderIncomeSummary(item, annualizedSalary)}
      details={
        <SegmentedToggle
          label="Frequency"
          ariaLabel={`${item.name || (isPassive ? "Passive income" : "Salary")} frequency`}
          value={item.frequency}
          onChange={(frequency) => onUpdateIncomeItem(item.id, { frequency })}
          options={[
            { value: "annual", label: "Annual" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
      }
    >
      <RowValueProjection
        delta={metricDeltaBetween(value, comparisonValue)}
        label={selectedYearLabel}
        value={usd(value)}
      >
        <RowMoneyField
          label="Amount"
          step="1000"
          value={item.amount}
          onValueChange={(value) => onUpdateIncomeItem(item.id, { amount: value })}
        />
      </RowValueProjection>
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
      fallbackName="RSU grant"
      name={item.name}
      canRename
      renameAriaLabel="Income name"
      detailsSummary={renderIncomeSummary(item, 0)}
      onRemove={() => onRemoveIncomeItem(item.id)}
      onRename={(nextName) => onUpdateIncomeItem(item.id, { name: nextName })}
      details={
        <div className="grid gap-4 lg:grid-cols-3">
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
      <RowValueProjection
        delta={metricDeltaBetween(value, comparisonValue)}
        label={selectedYearLabel}
        value={usd(value)}
      >
        <RowMoneyField
          label="Unvested remaining"
          step="1000"
          value={item.grantAmount}
          onValueChange={(value) => onUpdateIncomeItem(item.id, { grantAmount: value })}
        />
      </RowValueProjection>
    </RowItem>
  );
}

export function IncomeSection({
  comparison,
  currentRow,
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
  const totalTax = toDisplayValue(currentRow.totalTax, projection.currentYear, projection);
  const comparisonTotalTax =
    comparison &&
    toDisplayValue(comparison.currentRow.totalTax, comparison.projection.currentYear, comparison.projection);

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
    <WorkspaceSection id="income" index="01" title="Income" summary="Cash In">
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

      <WorkspaceSectionFooter>
        <AddMenu
          className={workspaceSectionActionClassName}
          label="Add income"
          options={[
            { id: "salary", label: "Salary", onSelect: onAddSalaryItem },
            { id: "passive", label: "Passive income", onSelect: onAddPassiveIncomeItem },
            { id: "rsu", label: "RSU", onSelect: onAddRsuItem },
          ]}
        />
      </WorkspaceSectionFooter>

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
                delta: metricDeltaBetween(totalTax, comparisonTotalTax, "lower"),
                label: "Total taxes",
                value: usd(totalTax),
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
