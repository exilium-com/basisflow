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
import { labelTextClass } from "../../lib/text";

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
      actions={
        <ActionButton className="w-full justify-center sm:w-auto" onClick={onAddExpense}>
          Add expense
        </ActionButton>
      }
    >
      <div className="grid gap-2">
        {expenseState.expenses.length === 0 ? <div className={`${labelTextClass} py-4`}>Spend some money!</div> : null}

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
                showsGrowthOverride && override?.growthRate != null ? `Annual increase ${override.growthRate}%` : null
              }
              detailsClassName="flex flex-wrap items-start gap-4"
              details={
                <>
                  <SegmentedToggle
                    label="Cadence"
                    ariaLabel={`Cadence for ${expense.name || "expense"}`}
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
                      label="Annual increase"
                      suffix="%"
                      step="0.5"
                      value={override?.growthRate ?? null}
                      placeholder={String(expenseGrowthRate)}
                      onValueChange={(value) => onUpdateExpenseOverride(expense.id, { growthRate: value })}
                    />
                  ) : null}
                  {expense.frequency === "one_off" ? (
                    <NumberField
                      label="Relative year"
                      step="1"
                      value={expense.oneOffYear ?? ""}
                      onValueChange={(value) => onUpdateExpense(expense.id, { oneOffYear: value })}
                    />
                  ) : null}
                </>
              }
            >
              <TextField
                label="Expense name"
                placeholder="Expense name"
                value={expense.name}
                onChange={(event) => onUpdateExpense(expense.id, { name: event.target.value })}
              />
              <NumberField
                label="Amount"
                prefix="$"
                suffix={expense.frequency === "annual" ? "/ year" : expense.frequency === "one_off" ? "" : "/ month"}
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
            </RowItem>
          );
        })}
      </div>
    </WorkspaceSection>
  );
}
