import { readNumber } from "./format";

export function createDefaultExpenseState() {
  return {
    expenses: [],
    advancedOpen: false,
  };
}

export function normalizeExpense(rawExpense) {
  return {
    id: typeof rawExpense?.id === "string" && rawExpense.id ? rawExpense.id : crypto.randomUUID(),
    name: typeof rawExpense?.name === "string" ? rawExpense.name : "",
    amount:
      typeof rawExpense?.amount === "string"
        ? rawExpense.amount
        : typeof rawExpense?.monthly === "string"
          ? rawExpense.monthly
          : "0",
    frequency:
      rawExpense?.frequency === "annual" ? "annual" : rawExpense?.frequency === "one_off" ? "one_off" : "monthly",
    oneOffYear: typeof rawExpense?.oneOffYear === "string" ? rawExpense.oneOffYear : "",
    growthRate: typeof rawExpense?.growthRate === "string" ? rawExpense.growthRate : "",
    detailsOpen: Boolean(rawExpense?.detailsOpen),
  };
}

export function normalizeExpensesState(parsed, fallback) {
  const expenses = Array.isArray(parsed?.expenses)
    ? parsed.expenses.map((expense) => normalizeExpense(expense))
    : fallback.expenses;

  return {
    expenses,
    advancedOpen: Boolean(parsed?.advancedOpen),
  };
}

export function normalizeExpenseInputs(state, baselineGrowthRate = 2.5) {
  const baselineGrowthValue = readNumber(baselineGrowthRate, 2.5);

  return {
    baselineGrowthRate: baselineGrowthValue / 100,
    expenses: state.expenses.map((expense) => {
      const amount = Math.max(0, readNumber(expense.amount, 0));
      const frequency =
        expense.frequency === "annual" ? "annual" : expense.frequency === "one_off" ? "one_off" : "monthly";
      const oneOffYear = Math.max(1, Math.round(readNumber(expense.oneOffYear, 1)));
      return {
        ...expense,
        label: expense.name.trim() || "Untitled expense",
        amount,
        frequency,
        oneOffYear,
        monthlyEquivalent: frequency === "annual" ? amount / 12 : frequency === "monthly" ? amount : 0,
        annualBase: frequency === "annual" ? amount : frequency === "monthly" ? amount * 12 : 0,
        growthRate: readNumber(expense.growthRate, baselineGrowthValue) / 100,
      };
    }),
  };
}

export function getAnnualNonHousingExpenses(expenses, year) {
  return expenses.reduce(
    (sum, expense) =>
      sum +
      (expense.frequency === "one_off"
        ? expense.oneOffYear === year
          ? expense.amount
          : 0
        : expense.annualBase * Math.pow(1 + expense.growthRate, Math.max(year, 0))),
    0,
  );
}

export function calculateExpenseSnapshot(inputs) {
  const monthlyExpenseTotal = inputs.expenses.reduce((sum, expense) => sum + expense.monthlyEquivalent, 0);
  return {
    monthlyExpenseTotal,
    annualExpenseTotal: monthlyExpenseTotal * 12,
    expenseCount: inputs.expenses.length,
  };
}
