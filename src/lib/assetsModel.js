import { clamp, readNumber } from "./format";
import { computeAdditionalTax } from "./taxConfig";

export const TYPE_DEFAULTS = {
  taxable: {
    name: "Taxable Asset",
    current: 320000,
    contribution: 24000,
    growth: 7,
    basis: 210000,
  },
  taxFree: {
    name: "Tax-Free Asset",
    current: 95000,
    contribution: 10000,
    growth: 7,
  },
};

export function createSeedBucket(taxFree, detailsOpen = false) {
  const defaults = TYPE_DEFAULTS[taxFree ? "taxFree" : "taxable"];
  return {
    id: crypto.randomUUID(),
    taxFree,
    name: defaults.name,
    current: String(defaults.current),
    contribution: String(defaults.contribution),
    growth: String(defaults.growth),
    basis: taxFree ? "" : String(defaults.basis),
    detailsOpen,
  };
}

export function createBlankBucket() {
  return {
    id: crypto.randomUUID(),
    taxFree: false,
    name: "",
    current: "",
    contribution: "",
    growth: "",
    basis: "",
    detailsOpen: false,
  };
}

export function createDefaultAssetsState() {
  return {
    buckets: [createSeedBucket(false), createSeedBucket(true)],
  };
}

export function normalizeBucket(rawBucket) {
  const rawType = rawBucket?.type;
  const taxFree =
    typeof rawBucket?.taxFree === "boolean"
      ? rawBucket.taxFree
      : rawType === "tax_free";

  return {
    id:
      typeof rawBucket?.id === "string" && rawBucket.id
        ? rawBucket.id
        : crypto.randomUUID(),
    taxFree,
    name: typeof rawBucket?.name === "string" ? rawBucket.name : "",
    current: typeof rawBucket?.current === "string" ? rawBucket.current : "",
    contribution:
      typeof rawBucket?.contribution === "string" ? rawBucket.contribution : "",
    growth: typeof rawBucket?.growth === "string" ? rawBucket.growth : "",
    basis: typeof rawBucket?.basis === "string" ? rawBucket.basis : "",
    detailsOpen: Boolean(rawBucket?.detailsOpen),
  };
}

function isLegacySeedBucket(bucket, taxFree) {
  return (
    bucket.taxFree === taxFree &&
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
    isLegacySeedBucket(rawBuckets[0], false) &&
    isLegacySeedBucket(rawBuckets[1], true)
      ? [
          createSeedBucket(false, rawBuckets[0].detailsOpen),
          createSeedBucket(true, rawBuckets[1].detailsOpen),
        ]
      : rawBuckets;

  return {
    buckets,
  };
}

export function defaultLabelForBucket(bucket) {
  return (
    bucket.name.trim() ||
    TYPE_DEFAULTS[bucket.taxFree ? "taxFree" : "taxable"].name
  );
}

export function normalizeAssetInputs(
  state,
  baselineGrowthRate = TYPE_DEFAULTS.taxable.growth,
) {
  return {
    baselineGrowthRate:
      readNumber(baselineGrowthRate, TYPE_DEFAULTS.taxable.growth) / 100,
    buckets: state.buckets.map((bucket) => {
      const current = Math.max(0, readNumber(bucket.current, 0));
      const contribution = Math.max(0, readNumber(bucket.contribution, 0));
      const growth =
        readNumber(
          bucket.growth,
          readNumber(baselineGrowthRate, TYPE_DEFAULTS.taxable.growth),
        ) / 100;
      const basis = !bucket.taxFree
        ? clamp(readNumber(bucket.basis, current), 0, current)
        : current;

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

function computeCapitalGainsTax(amount, taxConfig) {
  const federal = computeAdditionalTax(
    0,
    amount,
    taxConfig.longTermCapitalGains,
  );
  const state = computeAdditionalTax(0, amount, taxConfig.stateBrackets);
  return federal + state;
}

export function createProjectedBucketState(bucket) {
  return {
    ...bucket,
    balance: bucket.current,
    basisValue: bucket.taxFree ? bucket.current : bucket.basis,
  };
}

export function advanceProjectedBucket(bucketState, annualContribution = 0) {
  const contribution = Math.max(0, annualContribution);
  const balance =
    bucketState.balance * (1 + bucketState.growth) +
    contribution * (1 + bucketState.growth / 2);
  const basisValue = bucketState.taxFree
    ? balance
    : bucketState.basisValue + contribution;

  return {
    ...bucketState,
    balance,
    basisValue,
  };
}

export function snapshotProjectedBucket(bucketState, taxConfig) {
  const taxDue = bucketState.taxFree
    ? 0
    : computeCapitalGainsTax(
        Math.max(0, bucketState.balance - bucketState.basisValue),
        taxConfig,
      );

  return {
    id: bucketState.id,
    label: bucketState.label,
    type: bucketState.taxFree ? "tax_free" : "taxable",
    balance: bucketState.balance,
    basis: bucketState.basisValue,
    taxDue,
    afterTax: bucketState.balance - taxDue,
    annualContribution: bucketState.contribution,
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
    currentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + bucket.current,
      0,
    ),
    annualContributionTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + bucket.contribution,
      0,
    ),
    taxableCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxFree ? 0 : bucket.current),
      0,
    ),
    taxFreeCurrentTotal: inputs.buckets.reduce(
      (sum, bucket) => sum + (bucket.taxFree ? bucket.current : 0),
      0,
    ),
    currentEmbeddedTax: buckets.reduce((sum, bucket) => sum + bucket.taxDue, 0),
    afterTaxCurrentTotal: buckets.reduce(
      (sum, bucket) => sum + bucket.afterTax,
      0,
    ),
    basisProtected: buckets.reduce(
      (sum, bucket) =>
        bucket.type === "taxable" ? sum + bucket.basis : sum + bucket.balance,
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
