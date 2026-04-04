import { clamp, readNumber, roundTo } from "./format";
import { computeAdditionalTax } from "./taxConfig";

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
};

export const PINNED_RETIREMENT_BUCKETS = {
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

function normalizeTaxTreatment(rawBucket) {
  if (rawBucket?.taxTreatment === "taxDeductible") {
    return "taxDeductible";
  }
  if (rawBucket?.taxTreatment === "taxDeferred") {
    return "taxDeferred";
  }
  if (typeof rawBucket?.taxFree === "boolean") {
    return rawBucket.taxFree ? "taxDeferred" : "none";
  }
  if (rawBucket?.type === "tax_free") {
    return "taxDeferred";
  }
  return "none";
}

export function createSeedBucket(taxTreatment, detailsOpen = false) {
  const defaults = TYPE_DEFAULTS[taxTreatment] ?? TYPE_DEFAULTS.none;
  return {
    id: crypto.randomUUID(),
    taxTreatment,
    name: defaults.name,
    current: String(defaults.current),
    contribution: String(defaults.contribution),
    growth: String(defaults.growth),
    basis: taxTreatment === "none" ? String(defaults.basis) : "",
    detailsOpen,
  };
}

export function createBlankBucket() {
  return {
    id: crypto.randomUUID(),
    taxTreatment: "none",
    name: "",
    current: "",
    contribution: "",
    growth: "",
    basis: "",
    detailsOpen: false,
  };
}

export function createPinnedBucket({ id, name, taxTreatment }) {
  return {
    id,
    name,
    taxTreatment,
    current: "",
    contribution: "",
    growth: "",
    basis: taxTreatment === "none" ? "" : "",
    detailsOpen: false,
  };
}

export function createDefaultAssetsState() {
  return {
    buckets: [],
  };
}

function hasMeaningfulBucketValues(bucket) {
  return (
    Math.max(0, readNumber(bucket?.current, 0)) > 0 ||
    Math.max(0, readNumber(bucket?.contribution, 0)) > 0 ||
    Math.max(0, readNumber(bucket?.basis, 0)) > 0 ||
    String(bucket?.growth ?? "").trim() !== ""
  );
}

export function normalizeBucket(rawBucket) {
  return {
    id:
      typeof rawBucket?.id === "string" && rawBucket.id
        ? rawBucket.id
        : crypto.randomUUID(),
    taxTreatment: normalizeTaxTreatment(rawBucket),
    name: typeof rawBucket?.name === "string" ? rawBucket.name : "",
    current: typeof rawBucket?.current === "string" ? rawBucket.current : "",
    contribution:
      typeof rawBucket?.contribution === "string" ? rawBucket.contribution : "",
    growth: typeof rawBucket?.growth === "string" ? rawBucket.growth : "",
    basis: typeof rawBucket?.basis === "string" ? rawBucket.basis : "",
    detailsOpen: Boolean(rawBucket?.detailsOpen),
  };
}

function isLegacySeedBucket(bucket, taxTreatment) {
  return (
    bucket.taxTreatment === taxTreatment &&
    bucket.name === "" &&
    bucket.current === "" &&
    bucket.contribution === "" &&
    bucket.growth === "" &&
    bucket.basis === ""
  );
}

export function normalizeAssetsState(parsed, fallback) {
  const rawBuckets =
    Array.isArray(parsed?.buckets) && parsed.buckets.length
      ? parsed.buckets.map((bucket) => normalizeBucket(bucket))
      : fallback.buckets;
  const buckets =
    rawBuckets.length === 2 &&
    isLegacySeedBucket(rawBuckets[0], "none") &&
    isLegacySeedBucket(rawBuckets[1], "taxDeferred")
      ? [
          createSeedBucket("none", rawBuckets[0].detailsOpen),
          createSeedBucket("taxDeferred", rawBuckets[1].detailsOpen),
        ]
      : rawBuckets;

  return {
    buckets,
  };
}

export function getPinnedRetirementTargets() {
  return Object.fromEntries(
    Object.entries(PINNED_RETIREMENT_BUCKETS).map(([key, config]) => [
      key,
      config.id,
    ]),
  );
}

export function getVisiblePinnedRetirementBucketIds(
  state,
  incomeDirectedContributions = {},
) {
  const visibleIds = new Set();

  state.buckets.forEach((bucket) => {
    const isPinnedRetirementBucket = Object.values(PINNED_RETIREMENT_BUCKETS).some(
      (config) => config.id === bucket.id,
    );

    if (isPinnedRetirementBucket && hasMeaningfulBucketValues(bucket)) {
      visibleIds.add(bucket.id);
    }
  });

  Object.values(PINNED_RETIREMENT_BUCKETS).forEach((config) => {
    if ((incomeDirectedContributions[config.id] ?? 0) > 0) {
      visibleIds.add(config.id);
    }
  });

  return visibleIds;
}

export function ensurePinnedRetirementBuckets(state, visibleBucketIds = null) {
  const targets = getPinnedRetirementTargets();
  const visibleIds =
    visibleBucketIds instanceof Set ? visibleBucketIds : null;
  const buckets = [...state.buckets].filter((bucket) => {
    const isPinnedRetirementBucket = Object.values(PINNED_RETIREMENT_BUCKETS).some(
      (config) => config.id === bucket.id,
    );

    if (!isPinnedRetirementBucket || !visibleIds) {
      return true;
    }

    return visibleIds.has(bucket.id) || hasMeaningfulBucketValues(bucket);
  });

  Object.entries(PINNED_RETIREMENT_BUCKETS).forEach(([key, config]) => {
    if (visibleIds && !visibleIds.has(config.id)) {
      return;
    }

    const targetId = targets[key];
    const existingIndex = buckets.findIndex((bucket) => bucket.id === targetId);

    if (existingIndex === -1) {
      buckets.push(
        createPinnedBucket({
          id: targetId,
          name: config.name,
          taxTreatment: config.taxTreatment,
        }),
      );
      return;
    }

    buckets[existingIndex] = {
      ...buckets[existingIndex],
      id: targetId,
      name: config.name,
      taxTreatment: config.taxTreatment,
      basis: config.taxTreatment === "none" ? buckets[existingIndex].basis : "",
    };
  });

  return {
    ...state,
    buckets,
  };
}

export function defaultLabelForBucket(bucket) {
  return bucket.name.trim() || TYPE_DEFAULTS[bucket.taxTreatment].name;
}

export function normalizeAssetInputs(
  state,
  baselineGrowthRate = TYPE_DEFAULTS.none.growth,
) {
  return {
    baselineGrowthRate:
      readNumber(baselineGrowthRate, TYPE_DEFAULTS.none.growth) / 100,
    buckets: state.buckets.map((bucket) => {
      const current = Math.max(0, readNumber(bucket.current, 0));
      const contribution = Math.max(0, readNumber(bucket.contribution, 0));
      const growth =
        readNumber(
          bucket.growth,
          readNumber(baselineGrowthRate, TYPE_DEFAULTS.none.growth),
        ) / 100;
      const basis =
        bucket.taxTreatment === "none"
          ? clamp(readNumber(bucket.basis, current), 0, current)
          : 0;

      return {
        ...bucket,
        label: defaultLabelForBucket(bucket),
        current,
        contribution,
        growth,
        basis,
      };
    }),
  };
}

function computeCapitalGainsRate(amount, brackets) {
  const safeAmount = Math.max(0, amount);

  for (const bracket of brackets) {
    if (bracket.top === null || safeAmount <= bracket.top) {
      return bracket.rate / 100;
    }
  }

  return 0;
}

function computeCapitalGainsTax(
  amount,
  taxConfig,
  { federalTaxableIncome = 0 } = {},
) {
  const gain = Math.max(0, amount);
  return roundTo(
    computeAdditionalTax(
      federalTaxableIncome,
      gain,
      taxConfig.longTermCapitalGains,
    ),
    2,
  );
}

function computeOrdinaryWithdrawalTax(amount, taxConfig) {
  const federal = computeAdditionalTax(0, amount, taxConfig.federalBrackets);
  const state = computeAdditionalTax(0, amount, taxConfig.stateBrackets);
  return roundTo(federal + state, 2);
}

export function createProjectedBucketState(bucket) {
  return {
    ...bucket,
    balance: bucket.current,
    basisValue:
      bucket.taxTreatment === "none" ? bucket.basis : bucket.current,
  };
}

export function advanceProjectedBucket(bucketState, annualContribution = 0) {
  const contribution = Math.max(0, annualContribution);
  const balance = roundTo(
    bucketState.balance * (1 + bucketState.growth) +
      contribution * (1 + bucketState.growth / 2),
    2,
  );
  const basisValue = roundTo(
    bucketState.taxTreatment === "none" ||
    bucketState.taxTreatment === "taxDeferred"
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

export function snapshotProjectedBucket(bucketState, taxConfig, taxBases) {
  const taxDue = roundTo(
    bucketState.taxTreatment === "none"
      ? computeCapitalGainsTax(
          Math.max(0, bucketState.balance - bucketState.basisValue),
          taxConfig,
          taxBases,
        )
      : bucketState.taxTreatment === "taxDeductible"
        ? computeOrdinaryWithdrawalTax(bucketState.balance, taxConfig)
        : computeOrdinaryWithdrawalTax(
            Math.max(0, bucketState.balance - bucketState.basisValue),
            taxConfig,
          ),
    2,
  );

  return {
    id: bucketState.id,
    label: bucketState.label,
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

export function calculateAssetSnapshot(inputs, taxConfig) {
  const bucketStates = inputs.buckets.map((bucket) =>
    createProjectedBucketState(bucket),
  );
  const buckets = bucketStates.map((bucketState) =>
    snapshotProjectedBucket(bucketState, taxConfig),
  );

  const totals = {
    currentTotal: inputs.buckets.reduce((sum, bucket) => sum + bucket.current, 0),
    annualContributionTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + bucket.contribution,
      0,
    ),
    taxableCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxTreatment === "none" ? bucket.current : 0),
      0,
    ),
    taxDeductibleCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) =>
        sum + (bucket.taxTreatment === "taxDeductible" ? bucket.current : 0),
      0,
    ),
    taxDeferredCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) =>
        sum + (bucket.taxTreatment === "taxDeferred" ? bucket.current : 0),
      0,
    ),
    currentEmbeddedTax: buckets.reduce((sum, bucket) => sum + bucket.taxDue, 0),
    afterTaxCurrentTotal: buckets.reduce(
      (sum, bucket) => sum + bucket.afterTax,
      0,
    ),
    basisProtected: buckets.reduce(
      (sum, bucket) =>
        bucket.type === "none" ? sum + bucket.basis : sum + bucket.balance,
      0,
    ),
  };

  return { totals, buckets };
}

export function projectAssetBuckets(
  inputs,
  horizonYears,
  taxConfig,
  extraContributionByBucketId = {},
) {
  let bucketStates = inputs.buckets.map((bucket) =>
    createProjectedBucketState(bucket),
  );
  const projection = [];

  for (let year = 1; year <= horizonYears; year += 1) {
    bucketStates = bucketStates.map((bucketState) =>
      advanceProjectedBucket(
        bucketState,
        bucketState.contribution +
          Math.max(0, extraContributionByBucketId[bucketState.id]?.[year] ?? 0),
      ),
    );

    const snapshots = bucketStates.map((bucketState) =>
      snapshotProjectedBucket(bucketState, taxConfig),
    );
    projection.push({
      year,
      grossValue: snapshots.reduce((sum, item) => sum + item.balance, 0),
      embeddedTax: snapshots.reduce((sum, item) => sum + item.taxDue, 0),
      afterTaxValue: snapshots.reduce((sum, item) => sum + item.afterTax, 0),
    });
  }

  return {
    buckets: bucketStates.map((bucketState) =>
      snapshotProjectedBucket(bucketState, taxConfig),
    ),
    projection,
  };
}
