import React from "react";
import { ActionButton } from "../ActionButton";
import { NumberField, TextField } from "../Field";
import { ProjectedValueDisplay } from "../ProjectedValueDisplay";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceSection } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import { type ExpenseStateItem, type ExpensesState } from "../../lib/expensesModel";
import { toDisplayValue, type Projection, type ProjectionExpenseOverride } from "../../lib/projectionState";
import { type ProjectionRow } from "../../lib/projectionUtils";

type ExpensesSectionProps = {
  expenseState: ExpensesState;
  expenseGrowthRate: number;
  expenseOverrides: Record<string, ProjectionExpenseOverride>;
  currentRow: ProjectionRow;
  projection: Projection;
  selectedYearLabel: string;
  onAddExpense: () => void;
  onRemoveExpense: (expenseId: string) => void;
  onUpdateExpense: (expenseId: string, patch: Partial<ExpenseStateItem>) => void;
  onUpdateExpenseOverride: (expenseId: string, patch: ProjectionExpenseOverride) => void;
};

export function ExpensesSection({
  expenseState,
  expenseGrowthRate,
  expenseOverrides,
  currentRow,
  projection,
  selectedYearLabel,
  onAddExpense,
  onRemoveExpense,
  onUpdateExpense,
  onUpdateExpenseOverride,
}: ExpensesSectionProps) {
  return (
    <WorkspaceSection
      id="expenses"
      index="04"
      title="Expenses"
      summary="Cash Out"
      actions={<ActionButton onClick={onAddExpense}>Add expense</ActionButton>}
    >
      <div className="grid gap-2.5">
        {expenseState.expenses.map((expense) => {
          const override = expenseOverrides[expense.id];
          const showsGrowthOverride = expense.frequency !== "one_off";

          return (
            <RowItem
              key={expense.id}
              removeLabel="Remove expense"
              onRemove={() => onRemoveExpense(expense.id)}
              detailsTitle="Expense details"
              detailsSummary={
                showsGrowthOverride && override?.growthRate != null ? `Growth ${override.growthRate}%` : null
              }
              detailsOpen={expense.detailsOpen}
              onToggleDetails={(detailsOpen) => onUpdateExpense(expense.id, { detailsOpen })}
              headerClassName="grid items-center gap-3 lg:grid-cols-3"
              detailsContentClassName="flex flex-wrap items-end gap-3"
              header={
                <>
                  <TextField
                    label="Expense name"
                    placeholder="Expense name"
                    value={expense.name}
                    onChange={(event) => onUpdateExpense(expense.id, { name: event.target.value })}
                  />
                  <NumberField
                    label="Amount"
                    prefix="$"
                    suffix={
                      expense.frequency === "annual" ? "/ year" : expense.frequency === "one_off" ? "" : "/ month"
                    }
                    min="0"
                    step="50"
                    placeholder="0"
                    value={expense.amount}
                    onValueChange={(value) => onUpdateExpense(expense.id, { amount: value })}
                  />
                  <ProjectedValueDisplay
                    label={selectedYearLabel}
                    value={usd(
                      toDisplayValue(
                        currentRow.expenseSnapshotsById[expense.id]?.amount ?? expense.amount ?? 0,
                        projection.currentYear,
                        projection,
                      ),
                    )}
                  />
                </>
              }
            >
              <SegmentedToggle
                label="Cadence"
                ariaLabel={`Cadence for ${expense.name || "expense"}`}
                className="w-fit"
                value={expense.frequency}
                onChange={(frequency) => onUpdateExpense(expense.id, { frequency })}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "annual", label: "Annual" },
                  { value: "one_off", label: "One-off" },
                ]}
              />
              {showsGrowthOverride ? (
                <NumberField
                  className="w-32"
                  label="Growth override"
                  suffix="%"
                  min="-20"
                  step="0.1"
                  value={override?.growthRate ?? null}
                  placeholder={String(expenseGrowthRate)}
                  onValueChange={(value) => onUpdateExpenseOverride(expense.id, { growthRate: value })}
                />
              ) : null}
              {expense.frequency === "one_off" ? (
                <NumberField
                  className="w-28"
                  label="Relative year"
                  min="1"
                  step="1"
                  value={expense.oneOffYear ?? ""}
                  onValueChange={(value) => onUpdateExpense(expense.id, { oneOffYear: value })}
                />
              ) : null}
            </RowItem>
          );
        })}
      </div>
    </WorkspaceSection>
  );
}
