(function () {
  const STORAGE_KEY = "finance_tools_tax_config_v1";

  const DEFAULT_CONFIG = {
    federalBrackets: [
      { top: 12400, rate: 10 },
      { top: 50400, rate: 12 },
      { top: 105700, rate: 22 },
      { top: 201775, rate: 24 },
      { top: 256225, rate: 32 },
      { top: 640600, rate: 35 },
      { top: null, rate: 37 }
    ],
    stateBrackets: [
      { top: 10412, rate: 1 },
      { top: 24684, rate: 2 },
      { top: 38959, rate: 4 },
      { top: 54081, rate: 6 },
      { top: 68350, rate: 8 },
      { top: 349137, rate: 9.3 },
      { top: 418961, rate: 10.3 },
      { top: 698271, rate: 11.3 },
      { top: 1000000, rate: 12.3 },
      { top: null, rate: 13.3 }
    ],
    longTermCapitalGains: [
      { top: 49450, rate: 0 },
      { top: 545500, rate: 15 },
      { top: null, rate: 20 }
    ]
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
        rate: Number(item.rate)
      }))
      .filter((item) => Number.isFinite(item.rate) && item.rate >= 0 && (item.top === null || Number.isFinite(item.top) && item.top >= 0))
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

  function normalizeConfig(rawConfig) {
    const fallback = cloneDefaultConfig();
    return {
      federalBrackets: normalizeBracketList(rawConfig?.federalBrackets, fallback.federalBrackets),
      stateBrackets: normalizeBracketList(rawConfig?.stateBrackets, fallback.stateBrackets),
      longTermCapitalGains: normalizeBracketList(rawConfig?.longTermCapitalGains, fallback.longTermCapitalGains)
    };
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return cloneDefaultConfig();
      }
      return normalizeConfig(JSON.parse(raw));
    } catch {
      return cloneDefaultConfig();
    }
  }

  function saveConfig(config) {
    const normalized = normalizeConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function resetConfig() {
    const defaults = cloneDefaultConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  function computeProgressiveTax(income, brackets) {
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

    return total;
  }

  function computeAdditionalTax(baseIncome, addedIncome, brackets) {
    const safeBase = Math.max(0, baseIncome);
    const safeAdded = Math.max(0, addedIncome);
    return computeProgressiveTax(safeBase + safeAdded, brackets) - computeProgressiveTax(safeBase, brackets);
  }

  window.FinanceTaxConfig = {
    STORAGE_KEY,
    DEFAULT_CONFIG,
    loadConfig,
    saveConfig,
    resetConfig,
    normalizeConfig,
    computeProgressiveTax,
    computeAdditionalTax
  };
})();
