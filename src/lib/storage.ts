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
export const ACTIVE_PROFILE_KEY = "basisflow_active_profile";
export const PROFILE_ORDER_KEY = "basisflow_profile_order";
export const STORAGE_DOCUMENT_EVENT = "basisflow_storage_document_changed";

type StorageDocument = Record<string, unknown>;

let appDocumentCache: StorageDocument | null = null;
const profileDocumentCache = new Map<string, StorageDocument>();

function runStorage<T>(fallback: T, action: () => T) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

function readStorageDocumentForKey(storageKey: string): StorageDocument {
  if (storageKey === APP_STORAGE_KEY && appDocumentCache) {
    return appDocumentCache;
  }

  const cachedProfile = profileDocumentCache.get(storageKey);
  if (cachedProfile) {
    return cachedProfile;
  }

  return runStorage({}, () => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    const documentValue = parsed && typeof parsed === "object" ? parsed : {};
    if (storageKey === APP_STORAGE_KEY) {
      appDocumentCache = documentValue;
    } else if (storageKey.startsWith(SAVED_PROFILE_PREFIX)) {
      profileDocumentCache.set(storageKey, documentValue);
    }
    return documentValue;
  });
}

function writeStorageDocumentForKey(storageKey: string, documentValue: StorageDocument) {
  if (storageKey === APP_STORAGE_KEY) {
    appDocumentCache = documentValue;
  } else if (storageKey.startsWith(SAVED_PROFILE_PREFIX)) {
    profileDocumentCache.set(storageKey, documentValue);
  }

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

function normalizeProfileName(name: string) {
  return String(name ?? "").trim();
}

function profileExists(name: string) {
  return listProfiles().includes(name);
}

function readStoredProfileNames() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(SAVED_PROFILE_PREFIX))
    .map((key) => key.slice(SAVED_PROFILE_PREFIX.length))
    .filter(Boolean);
}

function readProfileOrder() {
  return runStorage<string[]>([], () => {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_ORDER_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === "string" && Boolean(name))
      : [];
  });
}

function writeProfileOrder(names: string[]) {
  runStorage(undefined, () => {
    localStorage.setItem(PROFILE_ORDER_KEY, JSON.stringify(names));
    return undefined;
  });
}

function addProfileToOrder(name: string) {
  const profileNames = readStoredProfileNames();
  const profileSet = new Set(profileNames);
  const orderedProfiles = readProfileOrder().filter((profile) => profile !== name && profileSet.has(profile));
  const orderedSet = new Set(orderedProfiles);
  const unorderedProfiles = profileNames.filter((profile) => profile !== name && !orderedSet.has(profile));

  writeProfileOrder([...orderedProfiles, ...unorderedProfiles, name]);
}

function readProfileDocument(name: string) {
  return readStorageDocumentForKey(getProfileStorageKey(name));
}

function hasDocumentValue(documentValue: StorageDocument) {
  return Object.keys(documentValue).length > 0;
}

function writeActiveProfileDocument(documentValue: StorageDocument) {
  const activeProfileName = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (activeProfileName) {
    writeStorageDocumentForKey(getProfileStorageKey(activeProfileName), documentValue);
  }
}

function notifyStorageDocumentChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_DOCUMENT_EVENT));
  }
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

export function loadStoredJson(name: string) {
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
  writeActiveProfileDocument(documentValue);
}

export function clearAppState() {
  return runStorage(false, () => {
    localStorage.removeItem(APP_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    appDocumentCache = null;
    notifyStorageDocumentChanged();
    return true;
  });
}

export function listProfiles() {
  return runStorage<string[]>([], () => {
    const profileNames = readStoredProfileNames();
    const profileSet = new Set(profileNames);
    const orderedProfiles = readProfileOrder().filter((name) => profileSet.has(name));
    const orderedSet = new Set(orderedProfiles);

    return [...orderedProfiles, ...profileNames.filter((name) => !orderedSet.has(name))];
  });
}

export function saveProfile(name: string) {
  const profileName = normalizeProfileName(name);
  if (!profileName) {
    return false;
  }

  const existingProfile = profileExists(profileName);
  writeStorageDocumentForKey(getProfileStorageKey(profileName), readStorageDocument());
  if (!existingProfile) {
    addProfileToOrder(profileName);
  }
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileName);
  return true;
}

export function loadProfile(name: string) {
  const profileName = normalizeProfileName(name);
  const selectedProfile = readProfileDocument(profileName);

  if (!hasDocumentValue(selectedProfile)) {
    return false;
  }

  writeStorageDocument(rebuildStoredSummaries(structuredClone(selectedProfile)));
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileName);
  notifyStorageDocumentChanged();
  return true;
}

export function deleteProfile(name: string) {
  const profileName = normalizeProfileName(name);
  if (!profileName) {
    return false;
  }

  const profileStorageKey = getProfileStorageKey(profileName);
  return runStorage(false, () => {
    localStorage.removeItem(profileStorageKey);
    profileDocumentCache.delete(profileStorageKey);
    writeProfileOrder(readProfileOrder().filter((profile) => profile !== profileName));
    if (localStorage.getItem(ACTIVE_PROFILE_KEY) === profileName) {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
    return true;
  });
}

export function getActiveProfileName() {
  return runStorage<string | null>(null, () => localStorage.getItem(ACTIVE_PROFILE_KEY));
}

export function duplicateProfile(sourceName: string, nextName: string) {
  const sourceProfileName = normalizeProfileName(sourceName);
  const nextProfileName = normalizeProfileName(nextName);
  if (!sourceProfileName || !nextProfileName || profileExists(nextProfileName)) {
    return false;
  }

  const sourceProfile = readProfileDocument(sourceProfileName);
  if (!hasDocumentValue(sourceProfile)) {
    return false;
  }

  writeStorageDocumentForKey(getProfileStorageKey(nextProfileName), structuredClone(sourceProfile));
  addProfileToOrder(nextProfileName);
  return true;
}

export function renameProfile(currentName: string, nextName: string) {
  const currentProfileName = normalizeProfileName(currentName);
  const nextProfileName = normalizeProfileName(nextName);
  if (
    !currentProfileName ||
    !nextProfileName ||
    currentProfileName === nextProfileName ||
    profileExists(nextProfileName)
  ) {
    return false;
  }

  const currentProfile = readProfileDocument(currentProfileName);
  if (!hasDocumentValue(currentProfile)) {
    return false;
  }

  const currentStorageKey = getProfileStorageKey(currentProfileName);
  const nextStorageKey = getProfileStorageKey(nextProfileName);
  return runStorage(false, () => {
    writeStorageDocumentForKey(nextStorageKey, currentProfile);
    localStorage.removeItem(currentStorageKey);
    profileDocumentCache.delete(currentStorageKey);
    writeProfileOrder(
      readProfileOrder().map((profile) => (profile === currentProfileName ? nextProfileName : profile)),
    );
    if (localStorage.getItem(ACTIVE_PROFILE_KEY) === currentProfileName) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, nextProfileName);
    }
    return true;
  });
}
