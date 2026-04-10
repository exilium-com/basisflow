import { readNumber } from "./format";
import {
  buildIncomeInputs,
  buildIncomeSummary,
  calculateIncome,
  computeRsuGrossForItems,
  getAnnualSalaryTotal,
} from "./incomeModel";
import { buildMortgageInputs, DEFAULT_MORTGAGE_STATE, normalizeMortgageState } from "./mortgageConfig";
import { getMortgageYearInterest, getMortgageYearPropertyTax, serializeMortgageSummary, type MortgageSummary } from "./mortgagePage";
import { buildMortgageScenario } from "./mortgageSchedule";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY, MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "./storageKeys";
import { normalizeConfig, STORAGE_KEY as TAX_CONFIG_KEY } from "./taxConfig";

export const APP_STORAGE_KEY = "basisflow_app_state";
export const SAVED_PROFILE_PREFIX = "basisflow_saved_";

type StorageDocument = Record<string, unknown>;

type StoredIncomeItem = {
  type?: "salary" | "rsu";
  amount?: string | number;
  frequency?: string;
  grantAmount?: string | number;
  refresherAmount?: string | number;
  vestingYears?: string | number;
};

type StoredIncomeState = {
  incomeItems?: StoredIncomeItem[];
  employee401k?: string | number;
  matchRate?: string | number;
  iraContribution?: string | number;
  megaBackdoor?: string | number;
  megaBackdoorInput?: string | number;
  hsaContribution?: string | number;
};

function runStorage<T>(fallback: T, action: () => T) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

function readStorageDocumentForKey(storageKey: string): StorageDocument {
  return runStorage({}, () => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  });
}

function writeStorageDocumentForKey(storageKey: string, documentValue: StorageDocument) {
  runStorage(undefined, () => {
    localStorage.setItem(storageKey, JSON.stringify(documentValue));
    return undefined;
  });
}

function readStorageDocument(): StorageDocument {
  return readStorageDocumentForKey(APP_STORAGE_KEY);
}

function writeStorageDocument(documentValue: StorageDocument) {
  writeStorageDocumentForKey(APP_STORAGE_KEY, documentValue);
}

function getProfileStorageKey(name: string) {
  return `${SAVED_PROFILE_PREFIX}${name}`;
}

function rebuildStoredSummaries(documentValue: StorageDocument) {
  if (documentValue[MORTGAGE_STATE_KEY]) {
    const inputs = buildMortgageInputs(
      normalizeMortgageState(documentValue[MORTGAGE_STATE_KEY], DEFAULT_MORTGAGE_STATE),
    );
    documentValue[MORTGAGE_SUMMARY_KEY] = serializeMortgageSummary(
      buildMortgageScenario(inputs, inputs.activeLoanType),
    );
  }

  const incomeState = documentValue[INCOME_STATE_KEY];
  if (incomeState && typeof incomeState === "object" && Array.isArray((incomeState as StoredIncomeState).incomeItems)) {
    const state = incomeState as StoredIncomeState;
    const mortgageSummary = (documentValue[MORTGAGE_SUMMARY_KEY] ?? {}) as Partial<MortgageSummary>;
    const salaryItems = state.incomeItems!
      .filter((item) => item?.type === "salary")
      .map((item) => ({
        amount: readNumber(item?.amount, 0),
        frequency: item?.frequency === "monthly" ? ("monthly" as const) : ("annual" as const),
      }));
    const rsuItems = state.incomeItems!
      .filter((item) => item?.type === "rsu")
      .map((item) => ({
        grantAmount: readNumber(item?.grantAmount, 0),
        refresherAmount: readNumber(item?.refresherAmount, 0),
        vestingYears: readNumber(item?.vestingYears, 4),
      }));
    const inputs = buildIncomeInputs({
      grossSalary: getAnnualSalaryTotal(salaryItems),
      rsuGrossNextYear: computeRsuGrossForItems(rsuItems, 0),
      employee401k: readNumber(state.employee401k, 0),
      matchRate: readNumber(state.matchRate, 0),
      iraContribution: readNumber(state.iraContribution, 0),
      megaBackdoor: readNumber(state.megaBackdoor ?? state.megaBackdoorInput, 0),
      hsaContribution: readNumber(state.hsaContribution, 0),
      mortgageInterest: getMortgageYearInterest(mortgageSummary, 1),
      propertyTax: getMortgageYearPropertyTax(mortgageSummary),
      rsuItems,
    });
    documentValue[INCOME_SUMMARY_KEY] = buildIncomeSummary(
      inputs,
      calculateIncome(inputs, normalizeConfig(documentValue[TAX_CONFIG_KEY])),
    );
  }

  return documentValue;
}

export function loadStoredJson(name: string, _ignored?: unknown) {
  const documentValue = readStorageDocument();
  return Object.prototype.hasOwnProperty.call(documentValue, name) ? documentValue[name] : null;
}

export function saveJson(name: string, value: unknown) {
  const documentValue = readStorageDocument();
  documentValue[name] = value;
  writeStorageDocument(documentValue);
}

export function clearAppState() {
  return runStorage(false, () => {
    localStorage.removeItem(APP_STORAGE_KEY);
    return true;
  });
}

export function listProfiles() {
  return runStorage<string[]>([], () =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith(SAVED_PROFILE_PREFIX))
      .map((key) => key.slice(SAVED_PROFILE_PREFIX.length))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right)),
  );
}

export function saveProfile(name: string) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    return false;
  }

  writeStorageDocumentForKey(getProfileStorageKey(trimmedName), readStorageDocument());
  return true;
}

export function loadProfile(name: string) {
  const trimmedName = String(name ?? "").trim();
  const selectedProfile = readStorageDocumentForKey(getProfileStorageKey(trimmedName));

  if (!Object.keys(selectedProfile).length) {
    return false;
  }

  writeStorageDocument(rebuildStoredSummaries(structuredClone(selectedProfile)));
  return true;
}

export function deleteProfile(name: string) {
  const trimmedName = String(name ?? "").trim();
  if (!trimmedName) {
    return false;
  }

  return runStorage(false, () => {
    localStorage.removeItem(getProfileStorageKey(trimmedName));
    return true;
  });
}
