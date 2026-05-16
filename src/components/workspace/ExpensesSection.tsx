import { ActionButton } from "../ActionButton";
import { NumberField } from "../Field";
import { metricDeltaBetween } from "../MetricDelta";
import { PeriodSuffix } from "../PeriodSuffix";
import { RowItem } from "../RowItem";
import { SegmentedToggle } from "../SegmentedToggle";
import { RowMoneyField, RowValueProjection } from "./RowValueProjection";
import { workspaceSectionActionClassName, WorkspaceSection, WorkspaceSectionFooter } from "./WorkspaceSection";
import { usd } from "../../lib/format";
import { type ExpenseStateItem, type ExpensesState } from "../../lib/expensesModel";
import { toDisplayValue, type Projection, type ProjectionExpenseOverride } from "../../lib/projectionState";
import { type ProjectionRow } from "../../lib/projectionUtils";
import { labelTextClass } from "../../lib/text";

const expensePeriodButtonClassName = "bg-transparent p-0 text-ink-soft hover:text-ink";

type ExpensesSectionProps = {
  comparison?: {
    currentRow: ProjectionRow;
    projection: Projection;
  } | null;
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
  comparison,
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
    <WorkspaceSection id="expenses" index="04" title="Expenses" summary="Cash Out">
      <div className="grid gap-2">
        {expenseState.expenses.length === 0 ? <div className={`${labelTextClass} py-4`}>Spend some money!</div> : null}

        {expenseState.expenses.map((expense) => {
          const override = expenseOverrides[expense.id];
          const showsGrowthOverride = expense.frequency !== "one_off";
          const value = toDisplayValue(
            currentRow.expenseSnapshotsById[expense.id]?.amount ?? expense.amount ?? 0,
            projection.currentYear,
            projection,
          );
          const comparisonValue =
            comparison &&
            toDisplayValue(
              comparison.currentRow.expenseSnapshotsById[expense.id]?.amount ?? 0,
              comparison.projection.currentYear,
              comparison.projection,
            );
          const nextFrequency = expense.frequency === "annual" ? "monthly" : "annual";
          const detailsSummary =
            showsGrowthOverride && override?.growthRate != null ? `Annual increase ${override.growthRate}%` : null;

          return (
            <RowItem
              key={expense.id}
              detailsClassName="flex flex-wrap items-start gap-4"
              detailsSummary={detailsSummary}
              fallbackName="Untitled expense"
              name={expense.name}
              canRename
              renameAriaLabel="Expense name"
              onRemove={() => onRemoveExpense(expense.id)}
              onRename={(nextName) => onUpdateExpense(expense.id, { name: nextName })}
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
                      className="w-28"
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
                      className="w-28"
                      label="Relative year"
                      step="1"
                      value={expense.oneOffYear ?? ""}
                      onValueChange={(value) => onUpdateExpense(expense.id, { oneOffYear: value })}
                    />
                  ) : null}
                </>
              }
            >
              <RowValueProjection
                delta={metricDeltaBetween(value, comparisonValue, "lower")}
                label={selectedYearLabel}
                value={usd(value)}
              >
                <RowMoneyField
                  label="Amount"
                  suffix={
                    expense.frequency === "one_off" ? (
                      ""
                    ) : (
                      <button
                        type="button"
                        className={expensePeriodButtonClassName}
                        aria-label={`Switch ${expense.name || "expense"} to ${nextFrequency}`}
                        onClick={() => onUpdateExpense(expense.id, { frequency: nextFrequency })}
                      >
                        <PeriodSuffix period={expense.frequency === "annual" ? "year" : "month"} />
                      </button>
                    )
                  }
                  step="50"
                  placeholder="0"
                  value={expense.amount}
                  onValueChange={(value) => onUpdateExpense(expense.id, { amount: value })}
                />
              </RowValueProjection>
            </RowItem>
          );
        })}
      </div>
      <WorkspaceSectionFooter>
        <ActionButton className={workspaceSectionActionClassName} onClick={onAddExpense}>
          Add expense
        </ActionButton>
      </WorkspaceSectionFooter>
    </WorkspaceSection>
  );
}
