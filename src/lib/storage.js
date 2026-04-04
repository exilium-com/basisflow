export const APP_STORAGE_KEY = "basisflow_app_state";
export const SAVED_PROFILE_PREFIX = "basisflow_saved_";

import {
  calculateIncome,
  computeRsuGrossForItems,
  getAnnualSalaryTotal,
} from "./incomeModel";
import {
  buildMortgageScenario,
  createDefaultMortgageState,
  normalizeMortgageInputs,
  normalizeMortgageState,
} from "./mortgageModel";
import {
  INCOME_STATE_KEY,
  INCOME_SUMMARY_KEY,
  MORTGAGE_STATE_KEY,
  MORTGAGE_SUMMARY_KEY,
} from "./storageKeys";
import { normalizeConfig, STORAGE_KEY as TAX_CONFIG_KEY } from "./taxConfig";

function cloneFallbackValue(fallbackValue) {
  return typeof fallbackValue === "function"
    ? fallbackValue()
    : structuredClone(fallbackValue);
}

function readStorageDocumentForKey(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readStorageDocument() {
  return readStorageDocumentForKey(APP_STORAGE_KEY);
}

function writeStorageDocumentForKey(storageKey, documentValue) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(documentValue));
  } catch {
    // Best effort.
  }
}

function writeStorageDocument(documentValue) {
  writeStorageDocumentForKey(APP_STORAGE_KEY, documentValue);
}

function getProfileStorageKey(name) {
  return `${SAVED_PROFILE_PREFIX}${name}`;
}

function rebuildIncomeSummary(documentValue) {
  const incomeState = documentValue[INCOME_STATE_KEY];
  if (!incomeState || !Array.isArray(incomeState.incomeItems)) {
    return;
  }

  const salaryItems = incomeState.incomeItems
    .filter((item) => item?.type === "salary")
    .map((item) => ({
      amount: Number(item?.amount) || 0,
      frequency: item?.frequency === "monthly" ? "monthly" : "annual",
    }));
  const rsuItems = incomeState.incomeItems
    .filter((item) => item?.type === "rsu")
    .map((item) => ({
      grantAmount: Number(item?.grantAmount) || 0,
      refresherAmount: Number(item?.refresherAmount) || 0,
      vestingYears: Number(item?.vestingYears) || 4,
    }));
  const taxConfig = normalizeConfig(documentValue[TAX_CONFIG_KEY]);
  const inputs = {
    grossSalary: getAnnualSalaryTotal(salaryItems),
    rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
    employee401k: Number(incomeState.employee401k) || 0,
    matchRate: Number(incomeState.matchRate) || 0,
    iraContribution: Number(incomeState.iraContribution) || 0,
    megaBackdoorInput: Number(incomeState.megaBackdoorInput) || 0,
    hsaContribution: Number(incomeState.hsaContribution) || 0,
    rsuItems,
  };
  const results = calculateIncome(inputs, taxConfig);

  documentValue[INCOME_SUMMARY_KEY] = {
    grossSalary: results.grossSalary,
    annualTakeHome: results.annualTakeHome,
    monthlyTakeHome: results.monthlyTakeHome,
    federalTax: results.federalTax,
    californiaTax: results.californiaTax,
    socialSecurityTax: results.fica.socialSecurity,
    medicareTax: results.fica.medicare,
    additionalMedicareTax: results.fica.additionalMedicare,
    caSdi: results.caSdi,
    totalTaxes: results.totalTaxes,
    employee401k: inputs.employee401k,
    employerMatch: results.employerMatch,
    iraContribution: inputs.iraContribution,
    megaBackdoor: results.mega,
    hsaContribution: inputs.hsaContribution,
    matchRate: inputs.matchRate,
    rsuItems: inputs.rsuItems,
    rsuGrossNextYear: results.rsuGrossNextYear,
    rsuNetNextYear: results.rsuNetNextYear,
  };
}

function rebuildMortgageSummary(documentValue) {
  const mortgageState = documentValue[MORTGAGE_STATE_KEY];
  if (!mortgageState) {
    return;
  }

  const normalizedState = normalizeMortgageState(
    mortgageState,
    createDefaultMortgageState(),
  );
  const inputs = normalizeMortgageInputs(normalizedState);
  const scenario = buildMortgageScenario(inputs, inputs.activeLoanType);
  const yearlyLoan = scenario.yearlyBreakdown.map((row) => {
    const monthIndex = Math.min(row.year * 12, scenario.schedule.length) - 1;
    const endingBalance =
      monthIndex >= 0
        ? scenario.schedule[monthIndex].balance
        : scenario.loanAmount;

    return {
      year: row.year,
      principal: row.principal,
      interest: row.interest,
      endingBalance,
    };
  });

  documentValue[MORTGAGE_SUMMARY_KEY] = {
    type: scenario.type,
    typeLabel: scenario.typeLabel,
    isArm: scenario.isArm,
    homePrice: scenario.inputs.homePrice,
    currentEquity: scenario.inputs.homePrice - scenario.loanAmount,
    loanAmount: scenario.loanAmount,
    totalMonthlyPayment: scenario.totalMonthlyPayment,
    principalInterest: scenario.principalInterest,
    monthlyTax: scenario.monthlyTax,
    monthlyInsurance: scenario.monthlyInsurance,
    monthlyHoa: scenario.monthlyHoa,
    totalInterest: scenario.totalInterest,
    yearlyLoan,
  };
}

function rebuildDerivedState(documentValue) {
  rebuildIncomeSummary(documentValue);
  rebuildMortgageSummary(documentValue);
  return documentValue;
}

export function loadStoredJson(name) {
  const documentValue = readStorageDocument();
  return Object.prototype.hasOwnProperty.call(documentValue, name)
    ? documentValue[name]
    : null;
}

export function saveJson(name, value) {
  const documentValue = readStorageDocument();
  documentValue[name] = value;
  writeStorageDocument(documentValue);
}

export function loadStateObject(name, fallbackValue, options = {}) {
  const fallback = cloneFallbackValue(fallbackValue);
  const value = loadStoredJson(name);

  if (value === null) {
    return fallback;
  }

  return options.normalize ? options.normalize(value, fallback) : value;
}

export function saveStateObject(name, value) {
  saveJson(name, value);
}

export function clearAppState() {
  try {
    localStorage.removeItem(APP_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function listProfiles() {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(SAVED_PROFILE_PREFIX))
      .map((key) => key.slice(SAVED_PROFILE_PREFIX.length))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export function hasSavedProfile() {
  return listProfiles().length > 0;
}

export function saveProfile(name) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    return false;
  }

  writeStorageDocumentForKey(
    getProfileStorageKey(trimmedName),
    readStorageDocument(),
  );
  return true;
}

export function loadProfile(name) {
  const trimmedName = String(name ?? "").trim();
  const selectedProfile = readStorageDocumentForKey(
    getProfileStorageKey(trimmedName),
  );

  if (!Object.keys(selectedProfile).length) {
    return false;
  }

  writeStorageDocument(rebuildDerivedState(structuredClone(selectedProfile)));
  return true;
}

export function deleteProfile(name) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    return false;
  }

  try {
    localStorage.removeItem(getProfileStorageKey(trimmedName));
    return true;
  } catch {
    return false;
  }
}
