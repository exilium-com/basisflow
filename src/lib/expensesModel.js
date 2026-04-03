import { readNumber } from "./format";

export function createDefaultExpenseState() {
  return {
    expenses: [
      {
        id: crypto.randomUUID(),
        name: "Essentials",
        amount: "0",
        frequency: "monthly",
        growthRate: "",
        detailsOpen: false,
      },
      {
        id: crypto.randomUUID(),
        name: "Lifestyle",
        amount: "0",
        frequency: "monthly",
        growthRate: "",
        detailsOpen: false,
      },
      {
        id: crypto.randomUUID(),
        name: "Irregular / Travel",
        amount: "0",
        frequency: "monthly",
        growthRate: "",
        detailsOpen: false,
      },
      {
        id: crypto.randomUUID(),
        name: "Other",
        amount: "0",
        frequency: "monthly",
        growthRate: "",
        detailsOpen: false,
      },
    ],
    advancedOpen: false,
  };
}

export function normalizeExpense(rawExpense) {
  return {
    id:
      typeof rawExpense?.id === "string" && rawExpense.id
        ? rawExpense.id
        : crypto.randomUUID(),
    name: typeof rawExpense?.name === "string" ? rawExpense.name : "",
    amount:
      typeof rawExpense?.amount === "string"
        ? rawExpense.amount
        : typeof rawExpense?.monthly === "string"
          ? rawExpense.monthly
          : "0",
    frequency: rawExpense?.frequency === "annual" ? "annual" : "monthly",
    growthRate:
      typeof rawExpense?.growthRate === "string" ? rawExpense.growthRate : "",
    detailsOpen: Boolean(rawExpense?.detailsOpen),
  };
}

function getLegacyExpenses(parsed) {
  const legacyDefs = [
    ["Essentials", parsed?.essentialsMonthly],
    ["Lifestyle", parsed?.lifestyleMonthly],
    ["Irregular / Travel", parsed?.irregularMonthly],
    ["Other", parsed?.otherMonthly],
  ];

  return legacyDefs.map(([name, monthly]) =>
    normalizeExpense({ name, monthly }),
  );
}

export function normalizeExpensesState(parsed, fallback) {
  const expenses =
    Array.isArray(parsed?.expenses) && parsed.expenses.length
      ? parsed.expenses.map((expense) => normalizeExpense(expense))
      : getLegacyExpenses(parsed);

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
      const frequency = expense.frequency === "annual" ? "annual" : "monthly";
      return {
        ...expense,
        label: expense.name.trim() || "Untitled expense",
        amount,
        frequency,
        monthlyEquivalent: frequency === "annual" ? amount / 12 : amount,
        annualBase: frequency === "annual" ? amount : amount * 12,
        growthRate: readNumber(expense.growthRate, baselineGrowthValue) / 100,
      };
    }),
  };
}

export function getAnnualNonHousingExpenses(expenses, year) {
  return expenses.reduce(
    (sum, expense) =>
      sum + expense.annualBase * Math.pow(1 + expense.growthRate, year - 1),
    0,
  );
}

export function calculateExpenseSnapshot(inputs) {
  const monthlyExpenseTotal = inputs.expenses.reduce(
    (sum, expense) => sum + expense.monthlyEquivalent,
    0,
  );
  return {
    monthlyExpenseTotal,
    annualExpenseTotal: monthlyExpenseTotal * 12,
    expenseCount: inputs.expenses.length,
  };
}
