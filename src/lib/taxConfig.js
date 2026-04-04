import { roundTo } from "./format";
import { loadStoredJson, saveJson } from "./storage";

export const STORAGE_KEY = "basisflow_tax_config";

export const DEFAULT_CONFIG = {
  annualAdditionsLimit: 72000,
  federalStandardDeduction: 16100,
  stateStandardDeduction: 5706,
  caSdiRate: 1.3,
  federalBrackets: [
    { top: 12400, rate: 10 },
    { top: 50400, rate: 12 },
    { top: 105700, rate: 22 },
    { top: 201775, rate: 24 },
    { top: 256225, rate: 32 },
    { top: 640600, rate: 35 },
    { top: null, rate: 37 },
  ],
  stateBrackets: [
    { top: 11079, rate: 1 },
    { top: 26264, rate: 2 },
    { top: 41452, rate: 4 },
    { top: 57542, rate: 6 },
    { top: 72724, rate: 8 },
    { top: 371479, rate: 9.3 },
    { top: 445771, rate: 10.3 },
    { top: 742953, rate: 11.3 },
    { top: 1000000, rate: 12.3 },
    { top: null, rate: 13.3 },
  ],
  longTermCapitalGains: [
    { top: 49450, rate: 0 },
    { top: 545500, rate: 15 },
    { top: null, rate: 20 },
  ],
};

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function normalizeBracketList(list, fallback) {
  if (!Array.isArray(list) || !list.length) {
    return fallback.map((item) => ({ ...item }));
  }

  const normalized = list
    .map((item) => ({
      top: item.top === null || item.top === "" ? null : Number(item.top),
      rate: Number(item.rate),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.rate) &&
        item.rate >= 0 &&
        (item.top === null || (Number.isFinite(item.top) && item.top >= 0)),
    )
    .sort((left, right) => {
      if (left.top === null) {
        return 1;
      }
      if (right.top === null) {
        return -1;
      }
      return left.top - right.top;
    });

  if (!normalized.length || normalized[normalized.length - 1].top !== null) {
    return fallback.map((item) => ({ ...item }));
  }

  return normalized;
}

export function normalizeConfig(rawConfig) {
  const fallback = cloneDefaultConfig();

  return {
    annualAdditionsLimit: Number.isFinite(Number(rawConfig?.annualAdditionsLimit))
      ? Math.max(0, Number(rawConfig.annualAdditionsLimit))
      : fallback.annualAdditionsLimit,
    federalStandardDeduction: Number.isFinite(
      Number(rawConfig?.federalStandardDeduction),
    )
      ? Math.max(0, Number(rawConfig.federalStandardDeduction))
      : fallback.federalStandardDeduction,
    stateStandardDeduction: Number.isFinite(
      Number(rawConfig?.stateStandardDeduction),
    )
      ? Math.max(0, Number(rawConfig.stateStandardDeduction))
      : fallback.stateStandardDeduction,
    caSdiRate: Number.isFinite(Number(rawConfig?.caSdiRate))
      ? Math.max(0, Number(rawConfig.caSdiRate))
      : fallback.caSdiRate,
    federalBrackets: normalizeBracketList(
      rawConfig?.federalBrackets,
      fallback.federalBrackets,
    ),
    stateBrackets: normalizeBracketList(
      rawConfig?.stateBrackets,
      fallback.stateBrackets,
    ),
    longTermCapitalGains: normalizeBracketList(
      rawConfig?.longTermCapitalGains,
      fallback.longTermCapitalGains,
    ),
  };
}

export function loadTaxConfig() {
  return normalizeConfig(loadStoredJson(STORAGE_KEY));
}

export function saveTaxConfig(config) {
  const normalized = normalizeConfig(config);
  saveJson(STORAGE_KEY, normalized);
  return normalized;
}

export function resetTaxConfig() {
  const defaults = cloneDefaultConfig();
  saveJson(STORAGE_KEY, defaults);
  return defaults;
}

export function computeProgressiveTax(income, brackets) {
  let remaining = Math.max(0, income);
  let previousTop = 0;
  let total = 0;

  for (const bracket of brackets) {
    const top = bracket.top === null ? Infinity : bracket.top;
    const span = Math.min(remaining, top - previousTop);

    if (span > 0) {
      total += span * (bracket.rate / 100);
      remaining -= span;
    }

    previousTop = top;
    if (remaining <= 0) {
      break;
    }
  }

  return roundTo(total, 2);
}

export function computeAdditionalTax(baseIncome, addedIncome, brackets) {
  const safeBase = Math.max(0, baseIncome);
  const safeAdded = Math.max(0, addedIncome);
  return (
    computeProgressiveTax(safeBase + safeAdded, brackets) -
    computeProgressiveTax(safeBase, brackets)
  );
}
