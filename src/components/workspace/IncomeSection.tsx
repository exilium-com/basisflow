import React from "react";
import { ActionButton } from "../ActionButton";
import { MetricGrid } from "../MetricGrid";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { SliderField } from "../SliderField";
import { NumberField, TextField } from "../Field";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import {
  getAnnualSalaryTotal,
  type Income,
  type IncomeResults,
  type IncomeState,
  type IncomeStateItem,
} from "../../lib/incomeModel";

type IncomeSectionProps = {
  income: Income;
  incomeResults: IncomeResults;
  incomeState: IncomeState;
  retirementSavingTotal: number;
  onAddSalaryItem: () => void;
  onAddRsuItem: () => void;
  onRemoveIncomeItem: (itemId: string) => void;
  onUpdateIncomeField: (
    field: keyof Omit<IncomeState, "incomeItems">,
    value: IncomeState[keyof Omit<IncomeState, "incomeItems">],
  ) => void;
  onUpdateIncomeItem: (itemId: string, patch: Partial<IncomeStateItem>) => void;
};

function renderIncomeSummary(item: IncomeStateItem, annualizedSalary: number) {
  if (item.type === "salary") {
    return item.frequency === "monthly" ? `${usd(annualizedSalary)} / year` : "Annual";
  }

  const vestYears = Math.max(1, Math.round(item.vestingYears ?? 4));
  return `${vestYears} year vest`;
}

export function IncomeSection({
  income,
  incomeResults,
  incomeState,
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
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={onAddSalaryItem}>Add salary</ActionButton>
          <ActionButton onClick={onAddRsuItem}>Add RSU</ActionButton>
        </div>
      }
    >
      <div className="grid gap-3">
        {incomeState.incomeItems.map((item) => {
          if (item.type === "salary") {
            const annualizedSalary = getAnnualSalaryTotal([{ amount: item.amount ?? 0, frequency: item.frequency }]);

            return (
              <RowItem
                key={item.id}
                headerClassName="grid gap-3 md:grid-cols-2"
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
              headerClassName="grid gap-3 md:grid-cols-2"
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
                </>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
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

      <div className="split-main-sidebar-wide mt-8">
        <div>
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
              value={incomeState.employee401k}
              onChange={(event) => onUpdateIncomeField("employee401k", Number(event.target.value))}
            />
            <SliderField
              id="megaBackdoor"
              label="Roth 401(k)"
              valueLabel={usd(incomeResults.megaBackdoor)}
              min="0"
              max={Math.max(0, Math.round(incomeResults.availableMegaRoom))}
              step="50"
              value={Math.min(incomeState.megaBackdoor, Math.max(0, Math.round(incomeResults.availableMegaRoom)))}
              onChange={(event) => onUpdateIncomeField("megaBackdoor", Number(event.target.value))}
            />
            <SliderField
              id="iraContribution"
              label="IRA"
              valueLabel={usd(income.iraContribution)}
              min="0"
              max="7000"
              step="50"
              value={incomeState.iraContribution}
              onChange={(event) => onUpdateIncomeField("iraContribution", Number(event.target.value))}
            />
            <SliderField
              id="hsaContribution"
              label="HSA"
              valueLabel={usd(income.hsaContribution)}
              min="0"
              max="4400"
              step="50"
              value={incomeState.hsaContribution}
              onChange={(event) => onUpdateIncomeField("hsaContribution", Number(event.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-6">
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
