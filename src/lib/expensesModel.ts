import { readNumber } from "./format";

export type ExpenseFrequency = "monthly" | "annual" | "one_off";

export type ExpenseStateItem = {
  id: string;
  name: string;
  amount: number | null;
  frequency: ExpenseFrequency;
  oneOffYear: number | null;
  growthRate: number | null;
};

export type ExpensesState = {
  expenses: ExpenseStateItem[];
  advancedOpen: boolean;
};

export type Expense = Omit<ExpenseStateItem, "amount" | "oneOffYear" | "growthRate"> & {
  label: string;
  amount: number;
  oneOffYear: number;
  monthlyEquivalent: number;
  annualBase: number;
  growthRate: number;
};

export type Expenses = {
  baselineGrowthRate: number;
  expenses: Expense[];
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

function normalizeExpense(
  rawExpense: Partial<ExpenseStateItem> & { monthly?: string | number } = {},
): ExpenseStateItem {
  const frequency: ExpenseFrequency =
    rawExpense.frequency === "annual" ? "annual" : rawExpense.frequency === "one_off" ? "one_off" : "monthly";

  return {
    id: typeof rawExpense.id === "string" && rawExpense.id ? rawExpense.id : crypto.randomUUID(),
    name: typeof rawExpense.name === "string" ? rawExpense.name : "",
    amount: rawExpense.amount != null ? readNumber(rawExpense.amount, null) : readNumber(rawExpense.monthly, null),
    frequency,
    oneOffYear: readNumber(rawExpense.oneOffYear, null),
    growthRate: readNumber(rawExpense.growthRate, null),
  };
}

export function normalizeExpensesState(parsed: unknown, fallback: ExpensesState): ExpensesState {
  const state = typeof parsed === "object" && parsed ? (parsed as { expenses?: unknown[]; advancedOpen?: unknown }) : {};
  const expenses = Array.isArray(state.expenses)
    ? state.expenses.map((rawExpense) =>
        normalizeExpense((rawExpense as Partial<ExpenseStateItem> & { monthly?: string | number }) ?? {}),
      )
    : fallback.expenses;

  return {
    expenses,
    advancedOpen: Boolean(state.advancedOpen),
  };
}

export function createExpenses(
  state: ExpensesState,
  baselineGrowthRate = 2.5,
): Expenses {
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

export function getAnnualNonHousingExpenses(expenses: Expense[], year: number) {
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

export function calculateExpenseSnapshot(expenses: Expenses) {
  const monthlyExpenseTotal = expenses.expenses.reduce((sum, expense) => sum + expense.monthlyEquivalent, 0);
  return {
    monthlyExpenseTotal,
    annualExpenseTotal: monthlyExpenseTotal * 12,
    expenseCount: expenses.expenses.length,
  };
}
