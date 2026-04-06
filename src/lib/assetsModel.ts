import { clamp, readNumber, roundTo } from "./format";
import { computeAdditionalTax, type TaxConfig } from "./taxConfig";

export type AssetTaxTreatment = "none" | "taxDeductible" | "taxDeferred";

export type AssetBucketState = {
  id: string;
  taxTreatment: AssetTaxTreatment;
  name: string;
  current: number | null;
  contribution: number | null;
  growth: number | null;
  basis: number | null;
  detailsOpen: boolean;
};

export type AssetsState = {
  buckets: AssetBucketState[];
};

export type AssetInputBucket = Omit<AssetBucketState, "current" | "contribution" | "growth" | "basis"> & {
  current: number;
  contribution: number;
  growth: number;
  basis: number;
};

export type AssetInputs = {
  baselineGrowthRate: number;
  buckets: AssetInputBucket[];
};

export type AssetTotals = {
  currentTotal: number;
  taxableCurrentTotal: number;
  taxDeductibleCurrentTotal: number;
  taxDeferredCurrentTotal: number;
};

export type DerivedAssetsState = {
  state: AssetsState;
  pinnedBucketIds: Set<string>;
  inputs: AssetInputs;
  orderedBuckets: AssetBucketState[];
  totals: AssetTotals;
};

export type ResolvedPinnedBuckets = {
  state: AssetsState;
  pinnedBucketIds: Set<string>;
  orderedBuckets: AssetBucketState[];
};

export type ProjectedBucketState = AssetInputBucket & {
  balance: number;
  basisValue: number;
};

export type ProjectedBucketValues = {
  id: string;
  type: "none" | "tax_deductible" | "tax_deferred";
  taxTreatment: AssetTaxTreatment;
  balance: number;
  basis: number;
  taxDue: number;
  afterTax: number;
  annualContribution: number;
};

export const DEFAULT_ASSETS_STATE: AssetsState = {
  buckets: [],
};

export const TYPE_DEFAULTS = {
  none: {
    name: "Taxable Asset",
    current: 320000,
    contribution: 24000,
    growth: 7,
    basis: 210000,
  },
  taxDeferred: {
    name: "Tax-Deferred Asset",
    current: 95000,
    contribution: 10000,
    growth: 7,
  },
  taxDeductible: {
    name: "Tax-Deductible Asset",
    current: 95000,
    contribution: 10000,
    growth: 7,
  },
} satisfies Record<AssetTaxTreatment, { name: string; current: number; contribution: number; growth: number; basis?: number }>;

type PinnedBucketConfig = {
  id: string;
  name: string;
  taxTreatment: AssetTaxTreatment;
  reserveCash?: boolean;
};

export const PINNED_BUCKETS: Record<
  string,
  PinnedBucketConfig
> = {
  reserveCashBucketId: {
    id: "cash-bucket",
    name: "Cash",
    taxTreatment: "none",
    reserveCash: true,
  },
  retirementBucketId: {
    id: "traditional-401k",
    name: "401(k)",
    taxTreatment: "taxDeductible",
  },
  iraBucketId: {
    id: "ira-bucket",
    name: "IRA",
    taxTreatment: "taxDeferred",
  },
  megaBucketId: {
    id: "roth-401k",
    name: "Roth 401(k)",
    taxTreatment: "taxDeferred",
  },
  hsaBucketId: {
    id: "hsa-bucket",
    name: "HSA",
    taxTreatment: "taxDeferred",
  },
};

export function createAssetBucket(overrides: Partial<AssetBucketState> = {}): AssetBucketState {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    taxTreatment: overrides.taxTreatment ?? "none",
    name: overrides.name ?? "",
    current: overrides.current ?? null,
    contribution: overrides.contribution ?? null,
    growth: overrides.growth ?? null,
    basis: overrides.basis ?? null,
    detailsOpen: overrides.detailsOpen ?? false,
  };
}

function hasMeaningfulBucketValues(bucket: Partial<AssetBucketState> | null | undefined) {
  return (
    Math.max(0, bucket?.current ?? 0) > 0 ||
    Math.max(0, bucket?.contribution ?? 0) > 0 ||
    Math.max(0, bucket?.basis ?? 0) > 0 ||
    bucket?.growth != null
  );
}

export function normalizeBucket(rawBucket: Partial<AssetBucketState> | null | undefined): AssetBucketState {
  return createAssetBucket({
    id: typeof rawBucket?.id === "string" && rawBucket.id ? rawBucket.id : crypto.randomUUID(),
    taxTreatment:
      rawBucket?.taxTreatment === "taxDeductible"
        ? "taxDeductible"
        : rawBucket?.taxTreatment === "taxDeferred"
          ? "taxDeferred"
          : "none",
    name: typeof rawBucket?.name === "string" ? rawBucket.name : "",
    current: readNumber(rawBucket?.current, null),
    contribution: readNumber(rawBucket?.contribution, null),
    growth: readNumber(rawBucket?.growth, null),
    basis: readNumber(rawBucket?.basis, null),
    detailsOpen: Boolean(rawBucket?.detailsOpen),
  });
}

export function normalizeAssetsState(parsed: unknown, fallback: AssetsState): AssetsState {
  const state = typeof parsed === "object" && parsed ? (parsed as { buckets?: unknown[] }) : {};
  return {
    buckets: Array.isArray(state.buckets)
      ? state.buckets.map((bucket) => normalizeBucket(bucket as Partial<AssetBucketState>))
      : fallback.buckets,
  };
}

function isPinnedBucketId(bucketId: string) {
  return Object.values(PINNED_BUCKETS).some((config) => config.id === bucketId);
}

function sortBucketsByPinnedIds<T extends { id: string }>(
  buckets: T[],
  pinnedBucketIds: Iterable<string>,
) {
  const pinnedIds = Array.from(pinnedBucketIds);

  return [...buckets].sort((left, right) => {
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
  });
}

function getPinnedBucketIds(
  state: AssetsState,
  incomeDirectedContributions: Record<string, number> = {},
) {
  const visibleIds = new Set<string>(
    Object.values(PINNED_BUCKETS)
      .filter((config) => config.reserveCash)
      .map((config) => config.id),
  );

  state.buckets.forEach((bucket) => {
    if (isPinnedBucketId(bucket.id) && hasMeaningfulBucketValues(bucket)) {
      visibleIds.add(bucket.id);
    }
  });

  Object.values(PINNED_BUCKETS).forEach((config) => {
    if ((incomeDirectedContributions[config.id] ?? 0) > 0) {
      visibleIds.add(config.id);
    }
  });

  return visibleIds;
}

export function resolvePinnedBuckets(
  state: AssetsState,
  incomeDirectedContributions: Record<string, number> = {},
): ResolvedPinnedBuckets {
  const pinnedBucketIds = getPinnedBucketIds(state, incomeDirectedContributions);
  const buckets = [...state.buckets].filter((bucket) => {
    if (!isPinnedBucketId(bucket.id)) {
      return true;
    }

    return pinnedBucketIds.has(bucket.id) || hasMeaningfulBucketValues(bucket);
  });
  let changed = buckets.length !== state.buckets.length;

  Object.values(PINNED_BUCKETS).forEach((config) => {
    if (!config.reserveCash && !pinnedBucketIds.has(config.id)) {
      return;
    }

    const existingIndex = buckets.findIndex((bucket) => bucket.id === config.id);

    if (existingIndex === -1) {
      changed = true;
      buckets.push(
        createAssetBucket({
          id: config.id,
          name: config.name,
          taxTreatment: config.taxTreatment,
        }),
      );
      return;
    }

    const nextBucket = {
      ...buckets[existingIndex],
      id: config.id,
      name: config.name,
      taxTreatment: config.taxTreatment,
      basis: config.taxTreatment === "none" ? buckets[existingIndex].basis : null,
    };
    changed =
      changed ||
      nextBucket.id !== buckets[existingIndex].id ||
      nextBucket.name !== buckets[existingIndex].name ||
      nextBucket.taxTreatment !== buckets[existingIndex].taxTreatment ||
      nextBucket.basis !== buckets[existingIndex].basis;
    buckets[existingIndex] = nextBucket;
  });

  const nextState = changed ? { ...state, buckets } : state;

  return {
    state: nextState,
    pinnedBucketIds,
    orderedBuckets: sortBucketsByPinnedIds(nextState.buckets, pinnedBucketIds),
  };
}

export function normalizeAssetInputs(
  state: AssetsState,
  baselineGrowthRate = TYPE_DEFAULTS.none.growth,
): AssetInputs {
  return {
    baselineGrowthRate: baselineGrowthRate / 100,
    buckets: state.buckets.map((bucket) => {
      const current = Math.max(0, bucket.current ?? 0);
      const contribution = Math.max(0, bucket.contribution ?? 0);
      const growth = (bucket.growth ?? baselineGrowthRate) / 100;
      const basis = bucket.taxTreatment === "none" ? clamp(bucket.basis ?? current, 0, current) : 0;

      return {
        ...bucket,
        current,
        contribution,
        growth,
        basis,
      };
    }),
  };
}

export function summarizeAssetInputs(inputs: AssetInputs): AssetTotals {
  return {
    currentTotal: inputs.buckets.reduce((sum, bucket) => sum + bucket.current, 0),
    taxableCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "none" ? bucket.current : 0),
      0,
    ),
    taxDeductibleCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "taxDeductible" ? bucket.current : 0),
      0,
    ),
    taxDeferredCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "taxDeferred" ? bucket.current : 0),
      0,
    ),
  };
}

export function deriveAssetsState(
  state: AssetsState,
  baselineGrowthRate = TYPE_DEFAULTS.none.growth,
  incomeDirectedContributions: Record<string, number> = {},
): DerivedAssetsState {
  const pinnedBuckets = resolvePinnedBuckets(state, incomeDirectedContributions);
  const inputs = normalizeAssetInputs(pinnedBuckets.state, baselineGrowthRate);

  return {
    state: pinnedBuckets.state,
    pinnedBucketIds: pinnedBuckets.pinnedBucketIds,
    inputs,
    orderedBuckets: pinnedBuckets.orderedBuckets,
    totals: summarizeAssetInputs(inputs),
  };
}

function computeCapitalGainsTax(
  amount: number,
  taxConfig: TaxConfig,
  { federalTaxableIncome = 0 }: { federalTaxableIncome?: number } = {},
) {
  const gain = Math.max(0, amount);
  return roundTo(computeAdditionalTax(federalTaxableIncome, gain, taxConfig.longTermCapitalGains), 2);
}

function computeOrdinaryWithdrawalTax(amount: number, taxConfig: TaxConfig) {
  const federal = computeAdditionalTax(0, amount, taxConfig.federalBrackets);
  const state = computeAdditionalTax(0, amount, taxConfig.stateBrackets);
  return roundTo(federal + state, 2);
}

export function advanceProjectedBucket(bucketState: ProjectedBucketState, annualContribution = 0): ProjectedBucketState {
  const contribution = Math.max(0, annualContribution);
  const balance = roundTo(
    bucketState.balance * (1 + bucketState.growth) + contribution * (1 + bucketState.growth / 2),
    2,
  );
  const basisValue = roundTo(
    bucketState.taxTreatment === "none" || bucketState.taxTreatment === "taxDeferred"
      ? bucketState.basisValue + contribution
      : bucketState.basisValue,
    2,
  );

  return {
    ...bucketState,
    balance,
    basisValue,
  };
}

export function deriveProjectedBucketValues(
  bucketState: ProjectedBucketState,
  taxConfig: TaxConfig,
  taxBases: { federalTaxableIncome?: number } | undefined = undefined,
): ProjectedBucketValues {
  const taxDue = roundTo(
    bucketState.taxTreatment === "none"
      ? computeCapitalGainsTax(Math.max(0, bucketState.balance - bucketState.basisValue), taxConfig, taxBases)
      : bucketState.taxTreatment === "taxDeductible"
        ? computeOrdinaryWithdrawalTax(bucketState.balance, taxConfig)
        : computeOrdinaryWithdrawalTax(Math.max(0, bucketState.balance - bucketState.basisValue), taxConfig),
    2,
  );

  return {
    id: bucketState.id,
    type:
      bucketState.taxTreatment === "none"
        ? "none"
        : bucketState.taxTreatment === "taxDeductible"
          ? "tax_deductible"
          : "tax_deferred",
    taxTreatment: bucketState.taxTreatment,
    balance: roundTo(bucketState.balance, 2),
    basis: roundTo(bucketState.basisValue, 2),
    taxDue,
    afterTax: roundTo(bucketState.balance - taxDue, 2),
    annualContribution: roundTo(bucketState.contribution, 2),
  };
}

export function deriveProjectedBucketValuesList(
  bucketStates: ProjectedBucketState[],
  taxConfig: TaxConfig,
  taxBases: { federalTaxableIncome?: number } | undefined = undefined,
) {
  return bucketStates.map((bucketState) => deriveProjectedBucketValues(bucketState, taxConfig, taxBases));
}
