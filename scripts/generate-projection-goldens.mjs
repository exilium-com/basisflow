import { writeFileSync } from "node:fs";
import { incomeGoldens } from "../src/lib/__tests__/goldens/income.js";

const MORTGAGE = {
  annualMortgage: 84000,
  homePrice: 1200000,
  currentEquity: 300000,
};

const STOCK_BUCKET = {
  id: "stock-bucket",
  taxTreatment: "none",
  name: "Stocks",
  current: "0",
  contribution: "0",
  growth: "7",
  basis: "0",
  detailsOpen: false,
};

function projectStockBalance(annualContribution, growthRate, years) {
  let balance = 0;

  for (let year = 1; year <= years; year += 1) {
    balance = roundToCents(
      balance * (1 + growthRate) +
        annualContribution * (1 + growthRate / 2),
    );
  }

  return balance;
}

function roundToCents(value) {
  return Math.round(value * 100) / 100;
}

function toProjectionGolden(incomeGolden) {
  const salary = incomeGolden.scenario.salary ?? 0;
  const inputs = incomeGolden.scenario.inputs ?? {};
  const incomeExpected = incomeGolden.expected ?? {};
  const employee401k = inputs.employee401k ?? 0;
  const hsaContribution = inputs.hsaContribution ?? 0;
  const iraContribution = inputs.iraContribution ?? 0;
  const megaBackdoorInput = inputs.megaBackdoorInput ?? 0;
  const totalTaxes =
    incomeExpected.totalTaxes ??
    (incomeExpected.federalTax ?? 0) +
      (incomeExpected.californiaTax ?? 0) +
      (incomeExpected.fica?.total ?? 0) +
      (incomeExpected.caSdi ?? 0);
  const annualTakeHome = roundToCents(
    salary -
      employee401k -
      hsaContribution -
      iraContribution -
      megaBackdoorInput -
      totalTaxes,
  );
  const mortgage = MORTGAGE.annualMortgage;

  const scenario = {
    name: `${incomeGolden.name} with 1.2m house and 300k down`,
    scenario: {
      salary,
      annualTakeHome,
      annualMortgage: mortgage,
      annualExpenses: 0,
      homePrice: MORTGAGE.homePrice,
      currentEquity: MORTGAGE.currentEquity,
      retirement: {
        employee401k,
        employerMatch: 0,
        iraContribution,
        megaBackdoor: megaBackdoorInput,
        hsaContribution,
      },
      accounts: [],
      allocations: {
        [STOCK_BUCKET.id]: {
          amount: 100,
          growth: Number(STOCK_BUCKET.growth),
        },
      },
      horizonYears: 5,
    },
  };

  const yearlyExpected = Object.fromEntries(
    [1, 5].map((year) => {
      const stockBalance = projectStockBalance(
        annualTakeHome - mortgage,
        Number(STOCK_BUCKET.growth) / 100,
        year,
      );
      return [
        year,
        {
          takeHome: annualTakeHome,
          mortgage,
          expenses: 0,
          freeCash: roundToCents(annualTakeHome - mortgage),
          reserveCash: 0,
          stockBalance,
        },
      ];
    }),
  );

  return {
    ...scenario,
    expected: yearlyExpected,
  };
}

const projectionGoldens = incomeGoldens.map(toProjectionGolden);

const output = `export const projectionGoldens = ${JSON.stringify(
  projectionGoldens,
  null,
  2,
)};\n`;

writeFileSync(
  new URL("../src/lib/__tests__/goldens/projection.js", import.meta.url),
  output,
);
