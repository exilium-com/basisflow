import {
  advanceProjectedBucket,
  ensurePinnedRetirementBuckets,
  getVisiblePinnedRetirementBucketIds,
  snapshotProjectedBucket,
} from "./assetsModel";
import { roundTo, usd } from "./format";
import { computeAnnualTaxes } from "./incomeModel";
import { computeAdditionalTax } from "./taxConfig";
import { CASH_BUCKET_ID, toDisplayValue } from "./projectionState";

export function createDerivedProjectionBuckets(assetState, incomeDirectedContributions) {
  const visiblePinnedRetirementBucketIds = getVisiblePinnedRetirementBucketIds(assetState, incomeDirectedContributions);
  const pinnedState = ensurePinnedRetirementBuckets(assetState, visiblePinnedRetirementBucketIds);
  const buckets = [...pinnedState.buckets];

  if (!buckets.some((bucket) => bucket.id === CASH_BUCKET_ID)) {
    buckets.unshift({
      id: CASH_BUCKET_ID,
      taxTreatment: "none",
      name: "Cash",
      current: "0",
      contribution: "0",
      growth: "0",
      basis: "0",
      detailsOpen: false,
    });
  }

  const pinnedIds = [CASH_BUCKET_ID, ...visiblePinnedRetirementBucketIds];

  return {
    ...pinnedState,
    buckets: buckets
      .map((bucket) =>
        bucket.id === CASH_BUCKET_ID
          ? {
              ...bucket,
              growth: "0",
              basis: bucket.current || "0",
            }
          : bucket,
      )
      .sort((left, right) => {
        const leftIndex = pinnedIds.indexOf(left.id);
        const rightIndex = pinnedIds.indexOf(right.id);

        if (leftIndex !== -1 || rightIndex !== -1) {
          if (leftIndex === -1) {
            return 1;
          }
          if (rightIndex === -1) {
            return -1;
          }
          return leftIndex - rightIndex;
        }

        return 0;
      }),
  };
}

export function getPinnedProjectionBucketIds(assetState, incomeDirectedContributions) {
  return new Set([CASH_BUCKET_ID, ...getVisiblePinnedRetirementBucketIds(assetState, incomeDirectedContributions)]);
}

export function getSelectedProjectionRow({ currentYear, incomeSummary, mortgageSummary, results }) {
  if (currentYear === 0) {
    return {
      year: 0,
      takeHome: incomeSummary.annualTakeHome ?? 0,
      nonHousingExpenses: results.annualExpenseTotal,
      mortgageLineItem: results.fixedMortgageAnnual,
      bucketSnapshotsById: results.currentAssetSnapshotsById,
      expenseSnapshotsById: results.currentExpenseSnapshotsById,
      vestedRsuBalance: results.currentVestedRsuBalance,
      assetsGross: results.currentAssetsGross,
      capitalGainsTax: results.currentCapitalGainsTax,
      totalCapitalGains: results.currentTotalCapitalGains,
      homeEquity: mortgageSummary.currentEquity ?? 0,
      residualCash: results.currentAssetSnapshotsById?.[CASH_BUCKET_ID]?.balance ?? 0,
      netWorth: results.currentNetWorth,
    };
  }

  return results.projection.find((row) => row.year === currentYear) ?? results.ending;
}

export function getSelectedYearLabel(currentYear) {
  return currentYear === 0 ? "Today" : `Year ${currentYear}`;
}

export function buildProjectionSummaryItems({ projectionInputs, results, selectedRow }) {
  return [
    {
      label: "Gross assets",
      value: usd(
        toDisplayValue(
          selectedRow.assetsGross ?? results.currentAssetsGross,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Home equity",
      value: usd(toDisplayValue(selectedRow.homeEquity ?? 0, projectionInputs.currentYear, projectionInputs)),
    },
    {
      label: "Capital gains tax",
      value: usd(
        toDisplayValue(
          selectedRow.capitalGainsTax ?? results.currentCapitalGainsTax,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Total capital gains",
      value: usd(
        toDisplayValue(
          selectedRow.totalCapitalGains ?? results.currentTotalCapitalGains,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
    {
      label: "Vested RSUs",
      value: usd(
        toDisplayValue(
          selectedRow.vestedRsuBalance ?? results.currentVestedRsuBalance,
          projectionInputs.currentYear,
          projectionInputs,
        ),
      ),
    },
  ];
}

export function buildMonthlyCashFlow({ incomeSummary, projectionInputs, selectedRow }) {
  const growthFactor = Math.pow(1 + projectionInputs.takeHomeGrowthRate, Math.max(projectionInputs.currentYear, 0));
  const grossIncome = toDisplayValue(
    Math.max(0, ((Number(incomeSummary.grossSalary) || 0) * growthFactor) / 12),
    projectionInputs.currentYear,
    projectionInputs,
  );
  const retirementSaving = toDisplayValue(
    (Math.max(0, Number(incomeSummary.employee401k) || 0) +
      Math.max(0, Number(incomeSummary.iraContribution) || 0) +
      Math.max(0, Number(incomeSummary.megaBackdoor) || 0) +
      Math.max(0, Number(incomeSummary.hsaContribution) || 0)) /
      12,
    projectionInputs.currentYear,
    projectionInputs,
  );
  const takeHome = Math.max(
    0,
    toDisplayValue((selectedRow.takeHome ?? 0) / 12, projectionInputs.currentYear, projectionInputs),
  );
  const taxes = Math.max(0, grossIncome - retirementSaving - takeHome);
  const mortgage = Math.max(
    0,
    toDisplayValue((selectedRow.mortgageLineItem ?? 0) / 12, projectionInputs.currentYear, projectionInputs),
  );
  const expenses = Math.max(
    0,
    toDisplayValue((selectedRow.nonHousingExpenses ?? 0) / 12, projectionInputs.currentYear, projectionInputs),
  );
  const excess = Math.max(0, grossIncome - taxes - retirementSaving - mortgage - expenses);
  const shortfall = Math.max(0, taxes + retirementSaving + mortgage + expenses - grossIncome);
  const items = [
    {
      label: "Taxes",
      value: taxes,
      color: "#d18a5b",
    },
    {
      label: "Retirement savings",
      value: retirementSaving,
      color: "#0d6a73",
    },
    {
      label: "Mortgage",
      value: mortgage,
      color: "#7c8e97",
    },
    {
      label: "Expenses",
      value: expenses,
      color: "#9cadb5",
    },
    {
      label: "Excess",
      value: excess,
      color: "#b8d8d9",
    },
    {
      label: "Shortfall",
      value: shortfall,
      color: "var(--danger)",
    },
  ].filter((item) => item.value > 0);

  return {
    items,
    netFlow: excess - shortfall,
    total: grossIncome,
  };
}

export function getTaxBases(grossSalary, employee401k, hsaContribution, rsuGross, taxConfig) {
  const taxes = computeAnnualTaxes(
    {
      grossSalary,
      employee401k,
      hsaContribution,
    },
    taxConfig,
    rsuGross,
  );

  return {
    federalTaxableIncome: taxes.federalTaxableIncome,
  };
}

function snapshotExpenseForYear(expense, year) {
  if (expense.frequency === "one_off") {
    const active = year > 0 && expense.oneOffYear === year;
    return {
      id: expense.id,
      label: expense.label,
      frequency: expense.frequency,
      amount: active ? expense.amount : 0,
      annualAmount: active ? expense.amount : 0,
      cadenceLabel: "One-off",
    };
  }

  const annualAmount = expense.annualBase * Math.pow(1 + expense.growthRate, Math.max(year, 0));

  return {
    id: expense.id,
    label: expense.label,
    frequency: expense.frequency,
    amount: expense.frequency === "monthly" ? annualAmount / 12 : annualAmount,
    annualAmount,
    cadenceLabel: expense.frequency === "annual" ? "Annual" : "Monthly",
  };
}

export function buildExpenseSnapshots(expenses, year) {
  return expenses.map((expense) => snapshotExpenseForYear(expense, year));
}

export function mapSnapshotsById(snapshots) {
  return Object.fromEntries(snapshots.map((snapshot) => [snapshot.id, snapshot]));
}

export function computeDeductionTaxSavings(baseIncome, deduction, taxConfig) {
  if (deduction <= 0) {
    return 0;
  }

  const taxableBase = Math.max(0, baseIncome - deduction);
  const federal = computeAdditionalTax(taxableBase, deduction, taxConfig.federalBrackets);
  const state = computeAdditionalTax(taxableBase, deduction, taxConfig.stateBrackets);
  return roundTo(federal + state, 2);
}

export function getLoanYear(mortgageSummary, year) {
  const yearlyLoan = Array.isArray(mortgageSummary?.yearlyLoan) ? mortgageSummary.yearlyLoan : [];
  const found = yearlyLoan.find((row) => row.year === year);
  if (found) {
    return found;
  }
  const last = yearlyLoan[yearlyLoan.length - 1];
  return last
    ? { year, principal: 0, interest: 0, endingBalance: 0 }
    : {
        year,
        principal: 0,
        interest: 0,
        endingBalance: mortgageSummary?.loanAmount ?? 0,
      };
}

export function fundHomeEquityFromBuckets(bucketStates, fundingBucketId, amount) {
  if (!fundingBucketId || amount <= 0) {
    return bucketStates;
  }

  return bucketStates.map((bucketState) => {
    if (bucketState.id !== fundingBucketId) {
      return bucketState;
    }

    const fundedAmount = Math.min(bucketState.balance, amount);
    if (fundedAmount <= 0) {
      return bucketState;
    }

    const nextBalance = bucketState.balance - fundedAmount;
    const nextBasisValue =
      bucketState.taxTreatment === "none" || bucketState.taxTreatment === "taxDeferred"
        ? bucketState.balance > 0
          ? bucketState.basisValue * (nextBalance / bucketState.balance)
          : bucketState.basisValue
        : 0;

    return {
      ...bucketState,
      balance: nextBalance,
      basisValue: Math.max(0, nextBasisValue),
    };
  });
}

function advanceProjectedBucketWithNetContribution(bucketState, annualContribution = 0) {
  const nextBalance = roundTo(
    bucketState.balance * (1 + bucketState.growth) + annualContribution * (1 + bucketState.growth / 2),
    2,
  );

  let nextBasisValue = bucketState.basisValue;
  if (bucketState.taxTreatment === "none" || bucketState.taxTreatment === "taxDeferred") {
    if (annualContribution >= 0) {
      nextBasisValue = roundTo(bucketState.basisValue + annualContribution, 2);
    } else if (bucketState.balance > 0) {
      nextBasisValue = roundTo(bucketState.basisValue * (Math.max(0, nextBalance) / bucketState.balance), 2);
    } else {
      nextBasisValue = 0;
    }
  } else {
    nextBasisValue = 0;
  }

  return {
    ...bucketState,
    balance: nextBalance,
    basisValue: Math.max(0, nextBasisValue),
  };
}

export function advanceProjectionBuckets({
  bucketStates,
  extraContributionByBucket,
  incomeDirectedContributions,
  reserveCashFlow,
  taxConfig,
  taxBases,
}) {
  const nextBucketStates = bucketStates.map((bucketState) => {
    const totalContribution =
      bucketState.contribution +
      (incomeDirectedContributions[bucketState.id] ?? 0) +
      (extraContributionByBucket[bucketState.id] ?? 0) +
      (bucketState.id === CASH_BUCKET_ID ? reserveCashFlow : 0);

    return bucketState.id === CASH_BUCKET_ID
      ? advanceProjectedBucketWithNetContribution(bucketState, totalContribution)
      : advanceProjectedBucket(bucketState, totalContribution);
  });

  return {
    nextBucketStates,
    assetSnapshots: nextBucketStates.map((bucketState) => snapshotProjectedBucket(bucketState, taxConfig, taxBases)),
  };
}
