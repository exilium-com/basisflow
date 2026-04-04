import React, { useMemo } from "react";
import { Field, NumberField, TextField } from "../components/Field";
import { PageShell } from "../components/PageShell";
import { ResultList } from "../components/ResultList";
import { RowItem } from "../components/RowItem";
import { Section } from "../components/Section";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { SummaryStrip } from "../components/SummaryStrip";
import { WorkspaceLayout } from "../components/WorkspaceLayout";
import { usd } from "../lib/format";
import { loadStoredJson } from "../lib/storage";
import {
  calculateExpenseSnapshot,
  createDefaultExpenseState,
  normalizeExpenseInputs,
  normalizeExpensesState,
} from "../lib/expensesModel";
import {
  createDefaultProjectionState,
  normalizeProjectionState,
} from "../lib/projectionModel";
import { useStoredState } from "../hooks/useStoredState";
import { surfaceClass } from "../lib/ui";
import { EXPENSES_STATE_KEY, PROJECTION_STATE_KEY } from "../lib/storageKeys";

export function ExpensesPage() {
  const [state, setState] = useStoredState(
    EXPENSES_STATE_KEY,
    createDefaultExpenseState,
    {
      normalize: normalizeExpensesState,
      localStorage: true,
      preferLocalStorage: true,
    },
  );

  const projectionState = useMemo(
    () =>
      normalizeProjectionState(
        loadStoredJson(PROJECTION_STATE_KEY, true) ??
          createDefaultProjectionState(),
        createDefaultProjectionState(),
      ),
    [state],
  );
  const inputs = useMemo(
    () => normalizeExpenseInputs(state, projectionState.expenseGrowthRate),
    [state, projectionState.expenseGrowthRate],
  );
  const results = useMemo(() => calculateExpenseSnapshot(inputs), [inputs]);

  function updateExpense(expenseId, patch) {
    setState((current) => ({
      ...current,
      expenses: current.expenses.map((expense) =>
        expense.id === expenseId ? { ...expense, ...patch } : expense,
      ),
    }));
  }

  function addExpense() {
    setState((current) => ({
      ...current,
      expenses: [
        ...current.expenses,
        {
          id: crypto.randomUUID(),
          name: "",
          amount: "0",
          frequency: "monthly",
          oneOffYear: "",
          growthRate: "",
          detailsOpen: false,
        },
      ],
    }));
  }

  function removeExpense(expenseId) {
    setState((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }

  const summaryItems = [
    {
      label: "Monthly run-rate spend",
      value: usd(results.annualExpenseTotal / 12),
    },
  ];

  return (
    <PageShell>
      <main className={surfaceClass}>
        <WorkspaceLayout
          summary={
            <>
              <SummaryStrip
                kicker="Annual Non-Housing Spend"
                value={usd(results.annualExpenseTotal)}
              />
              <ResultList items={summaryItems} />
            </>
          }
        >
          <Section
            title="Expenses"
            actions={
              <ActionButton onClick={addExpense}>
                Add expense
              </ActionButton>
            }
          >
            <div className="grid gap-2.5">
              {state.expenses.map((expense) => {
                return (
                  <RowItem
                    key={expense.id}
                    removeLabel="Remove expense"
                    onRemove={() => removeExpense(expense.id)}
                    detailsTitle="Expense details"
                    detailsOpen={expense.detailsOpen}
                    onToggleDetails={(open) =>
                      updateExpense(expense.id, { detailsOpen: open })
                    }
                    headerClassName="grid items-center gap-3 lg:grid-cols-2"
                    detailsContentClassName="grid gap-3"
                    header={
                      <>
                        <TextField
                          label="Expense name"
                          placeholder="Expense name"
                          value={expense.name}
                          onChange={(event) =>
                            updateExpense(expense.id, {
                              name: event.target.value,
                            })
                          }
                        />
                        <NumberField
                          label="Amount"
                          prefix="$"
                          suffix={
                            expense.frequency === "annual"
                              ? "/year"
                              : expense.frequency === "one_off"
                                ? ""
                                : "/month"
                          }
                          min="0"
                          step="50"
                          placeholder="0"
                          value={expense.amount}
                          onChange={(event) =>
                            updateExpense(expense.id, {
                              amount: event.target.value,
                            })
                          }
                        />
                      </>
                    }
                  >
                    <Field
                      label="Cadence"
                      className="inline-grid self-start justify-self-start"
                    >
                      <SegmentedToggle
                        ariaLabel={`Cadence for ${expense.name || "expense"}`}
                        value={expense.frequency}
                        onChange={(nextValue) =>
                          updateExpense(expense.id, { frequency: nextValue })
                        }
                        options={[
                          { value: "monthly", label: "Monthly" },
                          { value: "annual", label: "Annual" },
                          { value: "one_off", label: "One-off" },
                        ]}
                      />
                    </Field>
                    {expense.frequency === "one_off" ? (
                      <NumberField
                        label="Relative year"
                        min="1"
                        step="1"
                        value={expense.oneOffYear ?? ""}
                        onChange={(event) =>
                          updateExpense(expense.id, {
                            oneOffYear: event.target.value,
                          })
                        }
                      />
                    ) : null}
                  </RowItem>
                );
              })}
            </div>
          </Section>
        </WorkspaceLayout>
      </main>
    </PageShell>
  );
}
