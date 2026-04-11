import React from "react";
import { ActionButton } from "../ActionButton";
import { NumberField, TextField } from "../Field";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { WorkspaceSection } from "./WorkspaceSection";
import { type ExpenseStateItem, type ExpensesState } from "../../lib/expensesModel";

type ExpensesSectionProps = {
  expenseState: ExpensesState;
  onAddExpense: () => void;
  onRemoveExpense: (expenseId: string) => void;
  onUpdateExpense: (expenseId: string, patch: Partial<ExpenseStateItem>) => void;
};

export function ExpensesSection({ expenseState, onAddExpense, onRemoveExpense, onUpdateExpense }: ExpensesSectionProps) {
  return (
    <WorkspaceSection
      id="expenses"
      index="04"
      title="Expenses"
      summary="Cash Out"
      actions={<ActionButton onClick={onAddExpense}>Add expense</ActionButton>}
    >
      <div className="grid gap-2.5">
        {expenseState.expenses.map((expense) => (
          <RowItem
            key={expense.id}
            removeLabel="Remove expense"
            onRemove={() => onRemoveExpense(expense.id)}
            detailsTitle="Expense details"
            detailsOpen={expense.detailsOpen}
            onToggleDetails={(detailsOpen) => onUpdateExpense(expense.id, { detailsOpen })}
            headerClassName="grid items-center gap-3 lg:grid-cols-2"
            detailsContentClassName="grid gap-3"
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
            {expense.frequency === "one_off" ? (
              <NumberField
                label="Relative year"
                min="1"
                step="1"
                value={expense.oneOffYear ?? ""}
                onValueChange={(value) => onUpdateExpense(expense.id, { oneOffYear: value })}
              />
            ) : null}
          </RowItem>
        ))}
      </div>
    </WorkspaceSection>
  );
}
