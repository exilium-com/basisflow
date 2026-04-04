import { clamp, roundTo } from "./format";
import { createProjectedBucketState, snapshotProjectedBucket } from "./assetsModel";
import { getAnnualNonHousingExpenses } from "./expensesModel";
import { computeIncrementalTakeHome, computeRsuGrossForItems } from "./incomeModel";
import { buildIncomeDirectedContributions, CASH_BUCKET_ID } from "./projectionState";
import {
  advanceProjectionBuckets,
  buildExpenseSnapshots,
  computeDeductionTaxSavings,
  fundHomeEquityFromBuckets,
  getLoanYear,
  getTaxBases,
  mapSnapshotsById,
} from "./projectionUtils";

export function calculateProjection({
  incomeSummary,
  mortgageSummary,
  assetInputs,
  expenseInputs,
  projectionInputs,
  taxConfig,
}) {
  const annualTakeHomeBase = incomeSummary?.annualTakeHome ?? 0;
  const grossSalary = incomeSummary?.grossSalary ?? 0;
  const employee401k = incomeSummary?.employee401k ?? 0;
  const hsaContribution = incomeSummary?.hsaContribution ?? 0;
  const rsuGrossNextYear = incomeSummary?.rsuGrossNextYear ?? 0;
  const fixedMortgageAnnual = (mortgageSummary?.totalMonthlyPayment ?? 0) * 12;
  const homePrice = mortgageSummary?.homePrice ?? 0;
  const currentHomeEquity = mortgageSummary?.currentEquity ?? 0;
  const rsuInputs = {
    grossSalary,
    employee401k,
    hsaContribution,
    rsuItems: Array.isArray(incomeSummary?.rsuItems) ? incomeSummary.rsuItems : [],
  };
  const annualExpenseTotal = expenseInputs.expenses.reduce((sum, expense) => sum + expense.annualBase, 0);
  const incomeDirectedContributions = buildIncomeDirectedContributions(incomeSummary);
  const cashFundedAssetPlan = assetInputs.buckets.reduce((sum, bucket) => sum + bucket.contribution, 0);
  const deductibleCashFundedAssetPlan = assetInputs.buckets.reduce(
    (sum, bucket) => sum + (bucket.taxTreatment === "taxDeductible" ? bucket.contribution : 0),
    0,
  );

  let bucketStates = fundHomeEquityFromBuckets(
    assetInputs.buckets.map((bucket) => createProjectedBucketState(bucket)),
    projectionInputs.mortgageFundingBucketId,
    currentHomeEquity,
  );
  let vestedRsuBalance = 0;
  const currentTaxBases = getTaxBases(
    grossSalary,
    employee401k,
    hsaContribution,
    rsuGrossNextYear,
    taxConfig,
  );
  const currentAssetSnapshots = bucketStates.map((bucketState) =>
    snapshotProjectedBucket(bucketState, taxConfig, currentTaxBases),
  );
  const currentAssetsGross = currentAssetSnapshots.reduce((sum, bucket) => sum + bucket.balance, 0);
  const currentCapitalGainsTax = currentAssetSnapshots.reduce(
    (sum, bucket) => sum + (bucket.taxTreatment === "none" ? bucket.taxDue : 0),
    0,
  );
  const currentTotalCapitalGains = currentAssetSnapshots.reduce(
    (sum, bucket) => sum + Math.max(0, bucket.balance - bucket.basis),
    0,
  );
  const currentReserveCash = currentAssetSnapshots.find((bucket) => bucket.id === CASH_BUCKET_ID)?.balance ?? 0;
  const currentExpenseSnapshots = buildExpenseSnapshots(expenseInputs.expenses, 0);
  const projection = [];

  const allocationPercentScale =
    projectionInputs.allocationPercentTotal > 100 ? 100 / projectionInputs.allocationPercentTotal : 1;

  for (let year = 1; year <= projectionInputs.horizonYears; year += 1) {
    const rsuGross = computeRsuGrossForItems(
      rsuInputs.rsuItems,
      year - 1,
      projectionInputs.rsuStockGrowthRate,
      projectionInputs.takeHomeGrowthRate,
    );
    const rsuNet = roundTo(computeIncrementalTakeHome(rsuInputs, taxConfig, rsuGross), 2);
    const takeHome = roundTo(annualTakeHomeBase * Math.pow(1 + projectionInputs.takeHomeGrowthRate, year), 2);
    const nonHousingExpenses = roundTo(getAnnualNonHousingExpenses(expenseInputs.expenses, year), 2);
    const ordinaryIncomeBase = grossSalary * Math.pow(1 + projectionInputs.takeHomeGrowthRate, year);
    const taxBases = getTaxBases(ordinaryIncomeBase, employee401k, hsaContribution, rsuGross, taxConfig);
    const baseDeductionTaxSavings = computeDeductionTaxSavings(
      ordinaryIncomeBase,
      deductibleCashFundedAssetPlan,
      taxConfig,
    );
    const freeCashBeforeAllocation = roundTo(
      takeHome - fixedMortgageAnnual - nonHousingExpenses - cashFundedAssetPlan + baseDeductionTaxSavings,
      2,
    );
    const positiveFreeCash = Math.max(0, freeCashBeforeAllocation);
    let remainingFreeCash = positiveFreeCash;

    const extraContributionByBucket = {};
    let allocatedFreeCash = 0;
    let deductibleExtraContribution = 0;

    assetInputs.buckets.forEach((bucket) => {
      if (bucket.id === CASH_BUCKET_ID || (incomeDirectedContributions[bucket.id] ?? 0) > 0) {
        return;
      }

      const allocation = projectionInputs.allocations[bucket.id] ?? { mode: "percent", value: 0 };
      if (allocation.mode !== "amount") {
        return;
      }

      const extraContribution = roundTo(Math.min(remainingFreeCash, allocation.value), 2);
      extraContributionByBucket[bucket.id] = extraContribution;
      allocatedFreeCash = roundTo(allocatedFreeCash + extraContribution, 2);
      remainingFreeCash = roundTo(remainingFreeCash - extraContribution, 2);
      if (bucket.taxTreatment === "taxDeductible") {
        deductibleExtraContribution = roundTo(deductibleExtraContribution + extraContribution, 2);
      }
    });

    assetInputs.buckets.forEach((bucket) => {
      if (bucket.id === CASH_BUCKET_ID || (incomeDirectedContributions[bucket.id] ?? 0) > 0) {
        return;
      }

      const allocation = projectionInputs.allocations[bucket.id] ?? { mode: "percent", value: 0 };
      if (allocation.mode !== "percent") {
        return;
      }

      const share = (clamp(allocation.value, 0, 100) / 100) * allocationPercentScale;
      const extraContribution = roundTo(remainingFreeCash * share, 2);
      extraContributionByBucket[bucket.id] = roundTo(
        (extraContributionByBucket[bucket.id] ?? 0) + extraContribution,
        2,
      );
      allocatedFreeCash = roundTo(allocatedFreeCash + extraContribution, 2);
      if (bucket.taxTreatment === "taxDeductible") {
        deductibleExtraContribution = roundTo(deductibleExtraContribution + extraContribution, 2);
      }
    });

    const extraDeductionTaxSavings = computeDeductionTaxSavings(
      ordinaryIncomeBase,
      deductibleExtraContribution,
      taxConfig,
    );
    const reserveCashFlow =
      freeCashBeforeAllocation >= 0
        ? freeCashBeforeAllocation - allocatedFreeCash + extraDeductionTaxSavings
        : freeCashBeforeAllocation;
    const { assetSnapshots, nextBucketStates } = advanceProjectionBuckets({
      bucketStates,
      extraContributionByBucket,
      incomeDirectedContributions,
      reserveCashFlow,
      taxConfig,
      taxBases,
    });
    bucketStates = nextBucketStates;

    const homeEquity =
      homePrice * Math.pow(1 + projectionInputs.homeAppreciationRate, year) -
      getLoanYear(mortgageSummary, year).endingBalance;
    const assetsGross = assetSnapshots.reduce((sum, bucket) => sum + bucket.balance, 0);
    const capitalGainsTax = assetSnapshots.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "none" ? bucket.taxDue : 0),
      0,
    );
    const totalCapitalGains = assetSnapshots.reduce(
      (sum, bucket) => sum + Math.max(0, bucket.balance - bucket.basis),
      0,
    );
    const reserveCash = assetSnapshots.find((bucket) => bucket.id === CASH_BUCKET_ID)?.balance ?? 0;
    vestedRsuBalance = roundTo(vestedRsuBalance * (1 + projectionInputs.rsuStockGrowthRate) + rsuNet, 2);

    projection.push({
      year,
      takeHome,
      rsuGross,
      rsuNet,
      nonHousingExpenses,
      mortgageLineItem: fixedMortgageAnnual,
      freeCashBeforeAllocation,
      bucketSnapshotsById: mapSnapshotsById(assetSnapshots),
      expenseSnapshotsById: mapSnapshotsById(buildExpenseSnapshots(expenseInputs.expenses, year)),
      vestedRsuBalance,
      assetsGross,
      capitalGainsTax,
      totalCapitalGains,
      homeEquity,
      residualCash: reserveCash,
      netWorth: assetsGross + homeEquity + (projectionInputs.includeVestedRsusInNetWorth ? vestedRsuBalance : 0),
    });
  }

  return {
    annualExpenseTotal,
    fixedMortgageAnnual,
    currentAssetSnapshotsById: mapSnapshotsById(currentAssetSnapshots),
    currentExpenseSnapshotsById: mapSnapshotsById(currentExpenseSnapshots),
    currentAssetsGross,
    currentVestedRsuBalance: 0,
    currentCapitalGainsTax,
    currentTotalCapitalGains,
    currentNetWorth: currentAssetsGross + currentHomeEquity,
    ending:
      projection[projection.length - 1] ?? {
        netWorth: currentAssetsGross + currentHomeEquity,
        homeEquity: currentHomeEquity,
        assetsGross: currentAssetsGross,
        vestedRsuBalance: 0,
        capitalGainsTax: currentCapitalGainsTax,
        totalCapitalGains: currentTotalCapitalGains,
        residualCash: currentReserveCash,
      },
    incomeDirectedContributions,
    projection,
  };
}
