import { readNumber } from "./format";

export type ExpenseFrequency = "monthly" | "annual" | "one_off";

export type ExpenseStateItem = {
  id: string;
  name: string;
  amount: number | null;
  frequency: ExpenseFrequency;
  oneOffYear: number | null;
  growthRate: number | null;
  detailsOpen: boolean;
};

export type ExpensesState = {
  expenses: ExpenseStateItem[];
  advancedOpen: boolean;
};

export type ExpenseInput = Omit<ExpenseStateItem, "amount" | "oneOffYear" | "growthRate"> & {
  label: string;
  amount: number;
  oneOffYear: number;
  monthlyEquivalent: number;
  annualBase: number;
  growthRate: number;
};

export type ExpenseInputs = {
  baselineGrowthRate: number;
  expenses: ExpenseInput[];
};

export type ExpenseSnapshot = {
  id: string;
  label: string;
  frequency: ExpenseFrequency;
  amount: number;
  annualAmount: number;
  cadenceLabel: string;
};

export const DEFAULT_EXPENSES_STATE: ExpensesState = {
  expenses: [],
  advancedOpen: false,
};

export function normalizeExpensesState(parsed: unknown, fallback: ExpensesState): ExpensesState {
  const state = typeof parsed === "object" && parsed ? (parsed as { expenses?: unknown[]; advancedOpen?: unknown }) : {};
  const expenses = Array.isArray(state.expenses)
    ? state.expenses.map((rawExpense) => {
        const expense = (rawExpense as Partial<ExpenseStateItem> & { monthly?: string | number }) ?? {};
        const frequency: ExpenseFrequency =
          expense.frequency === "annual" ? "annual" : expense.frequency === "one_off" ? "one_off" : "monthly";
        return {
          id: typeof expense.id === "string" && expense.id ? expense.id : crypto.randomUUID(),
          name: typeof expense.name === "string" ? expense.name : "",
          amount: expense.amount != null ? readNumber(expense.amount, null) : readNumber(expense.monthly, null),
          frequency,
          oneOffYear: readNumber(expense.oneOffYear, null),
          growthRate: readNumber(expense.growthRate, null),
          detailsOpen: Boolean(expense.detailsOpen),
        };
      })
    : fallback.expenses;

  return {
    expenses,
    advancedOpen: Boolean(state.advancedOpen),
  };
}

export function normalizeExpenseInputs(
  state: ExpensesState,
  baselineGrowthRate = 2.5,
): ExpenseInputs {
  return {
    baselineGrowthRate: baselineGrowthRate / 100,
    expenses: state.expenses.map((expense) => {
      const amount = Math.max(0, expense.amount ?? 0);
      const frequency =
        expense.frequency === "annual" ? "annual" : expense.frequency === "one_off" ? "one_off" : "monthly";
      const oneOffYear = Math.max(1, Math.round(expense.oneOffYear ?? 1));
      return {
        ...expense,
        label: expense.name.trim() || "Untitled expense",
        amount,
        frequency,
        oneOffYear,
        monthlyEquivalent: frequency === "annual" ? amount / 12 : frequency === "monthly" ? amount : 0,
        annualBase: frequency === "annual" ? amount : frequency === "monthly" ? amount * 12 : 0,
        growthRate: (expense.growthRate ?? baselineGrowthRate) / 100,
      };
    }),
  };
}

export function getAnnualNonHousingExpenses(expenses: ExpenseInput[], year: number) {
  return expenses.reduce(
    (sum, expense) =>
      sum +
      (expense.frequency === "one_off"
        ? expense.oneOffYear === year
          ? expense.amount
          : 0
        : expense.annualBase * Math.pow(1 + expense.growthRate, year)),
    0,
  );
}

export function calculateExpenseSnapshot(inputs: ExpenseInputs) {
  const monthlyExpenseTotal = inputs.expenses.reduce((sum, expense) => sum + expense.monthlyEquivalent, 0);
  return {
    monthlyExpenseTotal,
    annualExpenseTotal: monthlyExpenseTotal * 12,
    expenseCount: inputs.expenses.length,
  };
}
