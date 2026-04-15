import { buildIncomeSummary, calculateIncome, DEFAULT_INCOME, normalizeIncome, resolveIncome } from "./incomeModel";
import { DEFAULT_MORTGAGE_STATE, normalizeMortgageState } from "./mortgageConfig";
import {
  getMortgageYearAverageBalance,
  getMortgageYearInterest,
  getMortgageYearPropertyTax,
  serializeMortgageSummary,
  type MortgageSummary,
} from "./mortgagePage";
import { buildMortgageScenario } from "./mortgageSchedule";
import { INCOME_STATE_KEY, INCOME_SUMMARY_KEY, MORTGAGE_STATE_KEY, MORTGAGE_SUMMARY_KEY } from "./storageKeys";
import { normalizeConfig, STORAGE_KEY as TAX_CONFIG_KEY } from "./taxConfig";

export const APP_STORAGE_KEY = "basisflow_app_state";
export const SAVED_PROFILE_PREFIX = "basisflow_saved_";

type StorageDocument = Record<string, unknown>;

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

function shouldRebuildSummaries(name: string) {
  return name === INCOME_STATE_KEY || name === MORTGAGE_STATE_KEY || name === TAX_CONFIG_KEY;
}

function buildStoredMortgageSummary(documentValue: StorageDocument) {
  const mortgage = normalizeMortgageState(documentValue[MORTGAGE_STATE_KEY], DEFAULT_MORTGAGE_STATE);
  return serializeMortgageSummary(buildMortgageScenario(mortgage, mortgage.activeLoanId));
}

function rebuildStoredSummaries(documentValue: StorageDocument) {
  if (documentValue[MORTGAGE_STATE_KEY]) {
    documentValue[MORTGAGE_SUMMARY_KEY] = buildStoredMortgageSummary(documentValue);
  }

  if (documentValue[INCOME_STATE_KEY]) {
    const mortgageSummary =
      documentValue[MORTGAGE_SUMMARY_KEY] != null
        ? (documentValue[MORTGAGE_SUMMARY_KEY] as MortgageSummary)
        : buildStoredMortgageSummary(documentValue);
    const income = resolveIncome(normalizeIncome(documentValue[INCOME_STATE_KEY], DEFAULT_INCOME), {
      mortgageAverageBalance: getMortgageYearAverageBalance(mortgageSummary, 0),
      mortgageInterest: getMortgageYearInterest(mortgageSummary, 0),
      propertyTax: getMortgageYearPropertyTax(mortgageSummary),
    });
    documentValue[INCOME_SUMMARY_KEY] = buildIncomeSummary(
      income,
      calculateIncome(income, normalizeConfig(documentValue[TAX_CONFIG_KEY])),
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
  if (shouldRebuildSummaries(name)) {
    rebuildStoredSummaries(documentValue);
  }
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
