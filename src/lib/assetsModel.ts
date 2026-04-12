import { clamp, readNumber, roundTo } from "./format";
import { DEFAULT_INCOME_SUMMARY, type IncomeSummary, type RsuInputItem } from "./incomeModel";
import { computeAdditionalTax, type TaxConfig } from "./taxConfig";

export type AssetTaxTreatment = "none" | "taxDeductible" | "taxDeferred";

export type AssetBucketState = {
  id: string;
  taxTreatment: AssetTaxTreatment;
  name: string;
  linkedRsuId: string | null;
  current: number | null;
  contribution: number | null;
  growth: number | null;
  basis: number | null;
  illiquid: boolean;
  detailsOpen: boolean;
};

export type AssetsState = {
  buckets: AssetBucketState[];
};

export type AssetBucket = Omit<AssetBucketState, "current" | "contribution" | "growth" | "basis"> & {
  current: number;
  contribution: number;
  growth: number;
  basis: number;
};

export type Assets = {
  baselineGrowthRate: number;
  buckets: AssetBucket[];
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
  assets: Assets;
  orderedBuckets: AssetBucketState[];
  totals: AssetTotals;
};

export type ResolvedPinnedBuckets = {
  state: AssetsState;
  pinnedBucketIds: Set<string>;
  orderedBuckets: AssetBucketState[];
};

export type ProjectedBucketState = AssetBucket & {
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
  linkedRsuId?: string;
  current?: number;
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
    linkedRsuId: overrides.linkedRsuId ?? null,
    current: overrides.current ?? null,
    contribution: overrides.contribution ?? null,
    growth: overrides.growth ?? null,
    basis: overrides.basis ?? null,
    illiquid: overrides.illiquid ?? false,
    detailsOpen: overrides.detailsOpen ?? false,
  };
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
    linkedRsuId: typeof rawBucket?.linkedRsuId === "string" ? rawBucket.linkedRsuId : null,
    current: readNumber(rawBucket?.current, null),
    contribution: readNumber(rawBucket?.contribution, null),
    growth: readNumber(rawBucket?.growth, null),
    basis: readNumber(rawBucket?.basis, null),
    illiquid: Boolean(rawBucket?.illiquid),
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

export function buildIncomeDirectedContributions(summary: IncomeSummary = DEFAULT_INCOME_SUMMARY) {
  const contributions: Record<string, number> = {};

  function add(bucketId: string, amount = 0) {
    if (amount > 0) {
      contributions[bucketId] = (contributions[bucketId] ?? 0) + amount;
    }
  }

  add(PINNED_BUCKETS.retirementBucketId.id, (summary.employee401k ?? 0) + (summary.employerMatch ?? 0));
  add(PINNED_BUCKETS.megaBucketId.id, summary.megaBackdoor ?? 0);
  add(PINNED_BUCKETS.hsaBucketId.id, summary.hsaContribution ?? 0);
  add(PINNED_BUCKETS.iraBucketId.id, summary.iraContribution ?? 0);

  return contributions;
}

function hasMeaningfulBucketValues(bucket: Partial<AssetBucketState>) {
  return (
    (bucket.current ?? 0) > 0 ||
    (bucket.contribution ?? 0) > 0 ||
    (bucket.basis ?? 0) > 0 ||
    bucket.growth != null
  );
}

function buildPinnedBucketConfigs(rsuItems: RsuInputItem[] = []): PinnedBucketConfig[] {
  return [
    ...Object.values(PINNED_BUCKETS),
    ...rsuItems.map((rsuItem) => ({
      id: `rsu-bucket-${rsuItem.id ?? crypto.randomUUID()}`,
      name: rsuItem.name || "RSU grant",
      taxTreatment: "none" as const,
      linkedRsuId: rsuItem.id ?? "",
      current: Math.max(0, rsuItem.grantAmount),
    })),
  ];
}

export function resolvePinnedBuckets(
  state: AssetsState,
  incomeDirectedContributions: Record<string, number> = {},
  rsuItems: RsuInputItem[] = [],
): ResolvedPinnedBuckets {
  const pinnedConfigs = buildPinnedBucketConfigs(rsuItems);
  const allPinnedBucketIds = new Set(pinnedConfigs.map((config) => config.id));
  const pinnedBucketIds = new Set(
    pinnedConfigs.filter((config) => config.reserveCash || config.linkedRsuId).map((config) => config.id),
  );

  state.buckets.forEach((bucket) => {
    if (allPinnedBucketIds.has(bucket.id) && hasMeaningfulBucketValues(bucket)) {
      pinnedBucketIds.add(bucket.id);
    }
  });

  pinnedConfigs.forEach((config) => {
    if ((incomeDirectedContributions[config.id] ?? 0) > 0) {
      pinnedBucketIds.add(config.id);
    }
  });

  const buckets = state.buckets.filter(
    (bucket) =>
      !allPinnedBucketIds.has(bucket.id) ||
      pinnedBucketIds.has(bucket.id) ||
      hasMeaningfulBucketValues(bucket),
  );
  let changed = buckets.length !== state.buckets.length;

  pinnedConfigs.forEach((config) => {
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
          linkedRsuId: config.linkedRsuId ?? null,
          current: config.current ?? null,
          basis: config.taxTreatment === "none" ? (config.current ?? null) : null,
          illiquid: config.linkedRsuId ? true : undefined,
        }),
      );
      return;
    }

    const nextBucket = {
      ...buckets[existingIndex],
      id: config.id,
      name: config.name,
      taxTreatment: config.taxTreatment,
      linkedRsuId: config.linkedRsuId ?? null,
      current: config.current ?? buckets[existingIndex].current,
      basis: config.taxTreatment === "none" ? (config.current ?? buckets[existingIndex].basis) : null,
      illiquid: config.linkedRsuId ? true : buckets[existingIndex].illiquid,
    };
    changed =
      changed ||
      nextBucket.id !== buckets[existingIndex].id ||
      nextBucket.name !== buckets[existingIndex].name ||
      nextBucket.linkedRsuId !== buckets[existingIndex].linkedRsuId ||
      nextBucket.current !== buckets[existingIndex].current ||
      nextBucket.taxTreatment !== buckets[existingIndex].taxTreatment ||
      nextBucket.basis !== buckets[existingIndex].basis ||
      nextBucket.illiquid !== buckets[existingIndex].illiquid;
    buckets[existingIndex] = nextBucket;
  });

  const nextState = changed ? { ...state, buckets } : state;
  const orderedBuckets = [...nextState.buckets].sort((left, right) => {
    const leftIndex = pinnedConfigs.findIndex((config) => config.id === left.id);
    const rightIndex = pinnedConfigs.findIndex((config) => config.id === right.id);

    if (leftIndex === -1 && rightIndex === -1) {
      return 0;
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });

  return {
    state: nextState,
    pinnedBucketIds,
    orderedBuckets,
  };
}

export function createAssets(
  state: AssetsState,
  baselineGrowthRate = TYPE_DEFAULTS.none.growth,
): Assets {
  return {
    baselineGrowthRate: baselineGrowthRate / 100,
    buckets: state.buckets.filter((bucket) => !bucket.linkedRsuId).map((bucket) => {
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

export function summarizeAssets(assets: Assets): AssetTotals {
  return {
    currentTotal: assets.buckets.reduce((sum, bucket) => sum + bucket.current, 0),
    taxableCurrentTotal: assets.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "none" ? bucket.current : 0),
      0,
    ),
    taxDeductibleCurrentTotal: assets.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "taxDeductible" ? bucket.current : 0),
      0,
    ),
    taxDeferredCurrentTotal: assets.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "taxDeferred" ? bucket.current : 0),
      0,
    ),
  };
}

export function deriveAssetsState(
  state: AssetsState,
  baselineGrowthRate = TYPE_DEFAULTS.none.growth,
  incomeDirectedContributions: Record<string, number> = {},
  rsuItems: RsuInputItem[] = [],
): DerivedAssetsState {
  const pinnedBuckets = resolvePinnedBuckets(state, incomeDirectedContributions, rsuItems);
  const assets = createAssets(pinnedBuckets.state, baselineGrowthRate);

  return {
    state: pinnedBuckets.state,
    pinnedBucketIds: pinnedBuckets.pinnedBucketIds,
    assets,
    orderedBuckets: pinnedBuckets.orderedBuckets,
    totals: summarizeAssets(assets),
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
