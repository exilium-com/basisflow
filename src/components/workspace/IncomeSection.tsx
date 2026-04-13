import React from "react";
import { AddMenu } from "../AddMenu";
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
import clsx from "clsx";

type IncomeSectionProps = {
  income: Income;
  incomeResults: IncomeResults;
  projection: Projection;
  rsuGrowthRateById: Record<string, number>;
  selectedYearLabel: string;
  retirementSavingTotal: number;
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

type IncomeRowProps<T extends IncomeItem> = {
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
  item,
  projection,
  rsuGrowthRateById,
  selectedYearLabel,
  onRemoveIncomeItem,
  onUpdateIncomeItem,
}: IncomeRowProps<SalaryItem | PassiveIncomeItem>) {
  const annualizedSalary = getAnnualSalaryTotal([{ amount: item.amount ?? 0, frequency: item.frequency }]);
  const isPassive = item.type === "passive";

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
        min="0"
        step="1000"
        value={item.amount}
        onValueChange={(value) => onUpdateIncomeItem(item.id, { amount: value })}
      />
      <ProjectedValueDisplay
        label={selectedYearLabel}
        value={usd(projectedIncomeValue(item, projection, rsuGrowthRateById))}
      />
    </RowItem>
  );
}

function RsuRowItem({
  item,
  projection,
  rsuGrowthRateById,
  selectedYearLabel,
  onRemoveIncomeItem,
  onUpdateIncomeItem,
}: IncomeRowProps<RsuItem>) {
  return (
    <RowItem
      onRemove={(event) => {
        event.stopPropagation();
        onRemoveIncomeItem(item.id);
      }}
      detailsTitle="RSU details"
      details={
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Annual refresher"
            prefix="$"
            min="0"
            step="1000"
            value={item.refresherAmount}
            onValueChange={(value) => onUpdateIncomeItem(item.id, { refresherAmount: value })}
          />
          <NumberField
            label="Years left to vest"
            suffix="years"
            min="1"
            step="1"
            value={item.vestingYears}
            onValueChange={(value) => onUpdateIncomeItem(item.id, { vestingYears: value })}
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
        min="0"
        step="1000"
        value={item.grantAmount}
        onValueChange={(value) => onUpdateIncomeItem(item.id, { grantAmount: value })}
      />
      <ProjectedValueDisplay
        label={selectedYearLabel}
        value={usd(projectedIncomeValue(item, projection, rsuGrowthRateById))}
      />
    </RowItem>
  );
}

export function IncomeSection({
  income,
  incomeResults,
  projection,
  rsuGrowthRateById,
  selectedYearLabel,
  retirementSavingTotal,
  onAddSalaryItem,
  onAddPassiveIncomeItem,
  onAddRsuItem,
  onRemoveIncomeItem,
  onUpdateIncomeField,
  onUpdateIncomeItem,
}: IncomeSectionProps) {
  return (
    <WorkspaceSection
      id="income"
      index="01"
      title="Income"
      summary="Cash In"
      actions={
        <AddMenu
          label="Add income"
          options={[
            { id: "salary", label: "Salary", onSelect: onAddSalaryItem },
            { id: "passive", label: "Passive income", onSelect: onAddPassiveIncomeItem },
            { id: "rsu", label: "RSU", onSelect: onAddRsuItem },
          ]}
        />
      }
    >
      <div className="grid gap-4">
        {income.incomeItems.map((item) =>
          item.type === "salary" || item.type === "passive" ? (
            <RecurringIncomeRowItem
              key={item.id}
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
          metrics={
            {
              primaryItem: { label: "Monthly take-home", value: usd(incomeResults.monthlyTakeHome, 2) },
              items: [
                { label: "Annual income", value: usd(incomeResults.grossSalary + incomeResults.passiveIncome, 2) },
                { label: "Total taxes", value: usd(incomeResults.totalTaxes, 2) },
                { label: "Retirement saving", value: usd(retirementSavingTotal, 2) },
              ],
            }
          }
        >
          <div className={clsx(smallCapsTextClass, "mb-4")}>Retirement saving</div>
          <div className="grid gap-4">
            <SliderField
              id="employee401k"
              label="Traditional 401(k)"
              valueLabel={usd(income.employee401k)}
              min="0"
              max="24500"
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
              max="7000"
              step="50"
              value={income.iraContribution}
              onChange={(event) => onUpdateIncomeField("iraContribution", Number(event.target.value))}
            />
            <SliderField
              id="hsaContribution"
              label="HSA"
              valueLabel={usd(income.hsaContribution)}
              min="0"
              max="4400"
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
