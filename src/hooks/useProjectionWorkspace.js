import { useMemo } from "react";
import { createDefaultAssetsState, normalizeAssetInputs, normalizeAssetsState } from "../lib/assetsModel";
import { createDefaultExpenseState, normalizeExpenseInputs, normalizeExpensesState } from "../lib/expensesModel";
import { loadStoredJson } from "../lib/storage";
import {
  buildIncomeDirectedContributions,
  createDefaultProjectionState,
  normalizeProjectionInputs,
  normalizeProjectionState,
  CASH_BUCKET_ID,
} from "../lib/projectionState";
import { calculateProjection } from "../lib/projectionCalculation";
import {
  buildMonthlyCashFlow,
  createDerivedProjectionBuckets,
  buildProjectionSummaryItems,
  getPinnedProjectionBucketIds,
  getSelectedProjectionRow,
  getSelectedYearLabel,
} from "../lib/projectionUtils";
import { loadTaxConfig } from "../lib/taxConfig";
import { useRefreshVersion } from "./useRefreshVersion";
import { useStoredState } from "./useStoredState";
import {
  ASSETS_STATE_KEY,
  EXPENSES_STATE_KEY,
  INCOME_SUMMARY_KEY,
  MORTGAGE_SUMMARY_KEY,
  PROJECTION_STATE_KEY,
} from "../lib/storageKeys";

export function useProjectionWorkspace() {
  const [state, setState] = useStoredState(PROJECTION_STATE_KEY, createDefaultProjectionState, {
    normalize: normalizeProjectionState,
  });
  const refreshVersion = useRefreshVersion();

  const taxConfig = useMemo(() => loadTaxConfig(), [refreshVersion]);
  const incomeSummary = useMemo(() => loadStoredJson(INCOME_SUMMARY_KEY) ?? {}, [refreshVersion]);
  const mortgageSummary = useMemo(() => loadStoredJson(MORTGAGE_SUMMARY_KEY) ?? {}, [refreshVersion]);
  const rawAssetsState = useMemo(
    () => loadStoredJson(ASSETS_STATE_KEY, true) ?? createDefaultAssetsState(),
    [refreshVersion],
  );
  const rawExpensesState = useMemo(
    () => loadStoredJson(EXPENSES_STATE_KEY, true) ?? createDefaultExpenseState(),
    [refreshVersion],
  );
  const assetState = useMemo(() => normalizeAssetsState(rawAssetsState, createDefaultAssetsState()), [rawAssetsState]);
  const expenseState = useMemo(
    () => normalizeExpensesState(rawExpensesState, createDefaultExpenseState()),
    [rawExpensesState],
  );
  const incomeDirectedContributions = useMemo(() => buildIncomeDirectedContributions(incomeSummary), [incomeSummary]);
  const projectionAssetState = useMemo(
    () => {
      const derivedState = createDerivedProjectionBuckets(assetState, incomeDirectedContributions);

      return {
        ...derivedState,
        buckets: derivedState.buckets.map((bucket) => {
          const override = state.assetOverrides?.[bucket.id] ?? {};
          return {
            ...bucket,
            contribution: bucket.id === CASH_BUCKET_ID ? "0" : bucket.contribution,
            growth: bucket.id === CASH_BUCKET_ID ? "0" : typeof override.growth === "string" ? override.growth : "",
          };
        }),
      };
    },
    [assetState, incomeDirectedContributions, state],
  );
  const projectionExpenseState = useMemo(
    () => ({
      ...expenseState,
      expenses: expenseState.expenses.map((expense) => {
        const override = state.expenseOverrides?.[expense.id] ?? {};
        return {
          ...expense,
          growthRate: typeof override.growthRate === "string" ? override.growthRate : "",
        };
      }),
    }),
    [expenseState, state.expenseOverrides],
  );
  const assetInputs = useMemo(
    () => normalizeAssetInputs(projectionAssetState, state.assetGrowthRate),
    [projectionAssetState, state.assetGrowthRate],
  );
  const expenseInputs = useMemo(
    () => normalizeExpenseInputs(projectionExpenseState, state.expenseGrowthRate),
    [projectionExpenseState, state.expenseGrowthRate],
  );
  const projectionInputs = useMemo(
    () => normalizeProjectionInputs(state, assetInputs, incomeDirectedContributions),
    [state, assetInputs, incomeDirectedContributions],
  );
  const results = useMemo(
    () =>
      calculateProjection({
        incomeSummary,
        mortgageSummary,
        assetInputs,
        expenseInputs,
        projectionInputs,
        taxConfig,
      }),
    [incomeSummary, mortgageSummary, assetInputs, expenseInputs, projectionInputs, taxConfig],
  );
  const selectedRow = useMemo(
    () =>
      getSelectedProjectionRow({
        currentYear: projectionInputs.currentYear,
        incomeSummary,
        mortgageSummary,
        results,
      }),
    [incomeSummary, mortgageSummary, projectionInputs.currentYear, results],
  );
  const selectedYearLabel = getSelectedYearLabel(projectionInputs.currentYear);
  const summaryItems = useMemo(
    () =>
      buildProjectionSummaryItems({
        projectionInputs,
        results,
        selectedRow,
      }),
    [projectionInputs, results, selectedRow],
  );
  const monthlyCashFlow = useMemo(
    () =>
      buildMonthlyCashFlow({
        incomeSummary,
        projectionInputs,
        selectedRow,
      }),
    [incomeSummary, projectionInputs, selectedRow],
  );
  const pinnedProjectionBucketIds = useMemo(
    () => getPinnedProjectionBucketIds(assetState, incomeDirectedContributions),
    [assetState, incomeDirectedContributions],
  );

  function updateState(patch) {
    setState((current) => ({ ...current, ...patch }));
  }

  function updateAllocation(bucketId, value) {
    setState((current) => ({
      ...current,
      allocations: {
        ...current.allocations,
        [bucketId]: {
          mode:
            current.allocations?.[bucketId]?.mode === "amount"
              ? "amount"
              : "percent",
          value,
        },
      },
    }));
  }

  function updateAllocationMode(bucketId, mode) {
    setState((current) => ({
      ...current,
      allocations: {
        ...current.allocations,
        [bucketId]: {
          mode: mode === "amount" ? "amount" : "percent",
          value: current.allocations?.[bucketId]?.value ?? "0",
        },
      },
    }));
  }

  function updateAssetOverride(bucketId, patch) {
    setState((current) => ({
      ...current,
      assetOverrides: {
        ...current.assetOverrides,
        [bucketId]: {
          ...(current.assetOverrides?.[bucketId] ?? {}),
          ...patch,
        },
      },
    }));
  }

  function updateExpenseOverride(expenseId, patch) {
    setState((current) => ({
      ...current,
      expenseOverrides: {
        ...current.expenseOverrides,
        [expenseId]: {
          ...(current.expenseOverrides?.[expenseId] ?? {}),
          ...patch,
        },
      },
    }));
  }

  return {
    assetInputs,
    expenseInputs,
    monthlyCashFlow,
    pinnedProjectionBucketIds,
    projectionInputs,
    results,
    selectedRow,
    selectedYearLabel,
    state,
    summaryItems,
    updateAllocation,
    updateAllocationMode,
    updateAssetOverride,
    updateExpenseOverride,
    updateState,
  };
}
