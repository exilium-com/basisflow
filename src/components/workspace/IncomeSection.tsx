import React from "react";
import { ActionButton } from "../ActionButton";
import { MetricGrid } from "../MetricGrid";
import { ProjectedValueDisplay } from "../ProjectedValueDisplay";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { SliderField } from "../SliderField";
import { NumberField, TextField } from "../Field";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import {
  computeRsuGrossForProjectionYear,
  getAnnualSalaryTotal,
  type Income,
  type IncomeItem,
  type IncomeResults,
} from "../../lib/incomeModel";
import { toDisplayValue, type Projection } from "../../lib/projectionState";

type IncomeSectionProps = {
  income: Income;
  incomeResults: IncomeResults;
  projection: Projection;
  selectedYearLabel: string;
  retirementSavingTotal: number;
  onAddSalaryItem: () => void;
  onAddRsuItem: () => void;
  onRemoveIncomeItem: (itemId: string) => void;
  onUpdateIncomeField: (
    field: keyof Omit<Income, "incomeItems">,
    value: Income[keyof Omit<Income, "incomeItems">],
  ) => void;
  onUpdateIncomeItem: (itemId: string, patch: Partial<IncomeItem>) => void;
};

function renderIncomeSummary(item: IncomeItem, annualizedSalary: number) {
  if (item.type === "salary") {
    return item.frequency === "monthly" ? `${usd(annualizedSalary)} / year` : "Annual";
  }

  const vestYears = Math.max(1, Math.round(item.vestingYears ?? 4));
  return `${vestYears} year vest`;
}

function projectedIncomeValue(item: IncomeItem, projection: Projection) {
  if (item.type === "salary") {
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
      projection.rsuStockGrowthRate,
      projection.incomeGrowthRate,
    ),
    projection.currentYear,
    projection,
  );
}

export function IncomeSection({
  income,
  incomeResults,
  projection,
  selectedYearLabel,
  retirementSavingTotal,
  onAddSalaryItem,
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
        <div className="flex flex-wrap gap-4">
          <ActionButton onClick={onAddSalaryItem}>Add salary</ActionButton>
          <ActionButton onClick={onAddRsuItem}>Add RSU</ActionButton>
        </div>
      }
    >
      <div className="grid gap-4">
        {income.incomeItems.map((item) => {
          if (item.type === "salary") {
            const annualizedSalary = getAnnualSalaryTotal([{ amount: item.amount ?? 0, frequency: item.frequency }]);

            return (
              <RowItem
                key={item.id}
                headerClassName="grid grid-cols-3 gap-4"
                removeLabel={`Remove ${item.name || "salary"}`}
                onRemove={(event) => {
                  event.stopPropagation();
                  onRemoveIncomeItem(item.id);
                }}
                detailsTitle="Salary details"
                detailsSummary={renderIncomeSummary(item, annualizedSalary)}
                detailsOpen={Boolean(item.detailsOpen)}
                onToggleDetails={(detailsOpen) => onUpdateIncomeItem(item.id, { detailsOpen })}
                header={
                  <>
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
                      value={usd(projectedIncomeValue(item, projection))}
                    />
                  </>
                }
              >
                <SegmentedToggle
                  label="Frequency"
                  ariaLabel={`${item.name || "Salary"} frequency`}
                  className="w-fit"
                  value={item.frequency}
                  onChange={(frequency) => onUpdateIncomeItem(item.id, { frequency })}
                  options={[
                    { value: "annual", label: "Annual" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                />
              </RowItem>
            );
          }

          return (
            <RowItem
              key={item.id}
              headerClassName="grid grid-cols-3 gap-4"
              removeLabel={`Remove ${item.name || "RSU grant"}`}
              onRemove={(event) => {
                event.stopPropagation();
                onRemoveIncomeItem(item.id);
              }}
              detailsTitle="RSU details"
              detailsOpen={Boolean(item.detailsOpen)}
              onToggleDetails={(detailsOpen) => onUpdateIncomeItem(item.id, { detailsOpen })}
              header={
                <>
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
                    value={usd(projectedIncomeValue(item, projection))}
                  />
                </>
              }
            >
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
            </RowItem>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <div className="mb-4 text-xs font-extrabold tracking-widest text-(--ink-soft) uppercase">
            Retirement saving
          </div>
          <div className="grid gap-4 divide-y divide-(--line-soft) pb-4">
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
        </div>

        <div className="col-span-2 grid gap-4">
          <MetricGrid
            primaryItem={{ label: "Monthly take-home", value: usd(incomeResults.monthlyTakeHome, 2) }}
            items={[
              { label: "Annual salary", value: usd(incomeResults.grossSalary, 2) },
              { label: "Total taxes", value: usd(incomeResults.totalTaxes, 2) },
              { label: "Retirement saving", value: usd(retirementSavingTotal, 2) },
            ]}
          />
        </div>
      </div>
    </WorkspaceSection>
  );
}
