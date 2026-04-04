import { rebuildDerivedState } from "./derivedState";

export const APP_STORAGE_KEY = "basisflow_app_state";
export const SAVED_PROFILE_PREFIX = "basisflow_saved_";

function cloneFallbackValue(fallbackValue) {
  return typeof fallbackValue === "function" ? fallbackValue() : structuredClone(fallbackValue);
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

function writeStorageDocumentForKey(storageKey, documentValue) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(documentValue));
  } catch {
    // Best effort.
  }
}

function readStorageDocument() {
  return readStorageDocumentForKey(APP_STORAGE_KEY);
}

function writeStorageDocument(documentValue) {
  writeStorageDocumentForKey(APP_STORAGE_KEY, documentValue);
}

function getProfileStorageKey(name) {
  return `${SAVED_PROFILE_PREFIX}${name}`;
}

export function loadStoredJson(name) {
  const documentValue = readStorageDocument();
  return Object.prototype.hasOwnProperty.call(documentValue, name) ? documentValue[name] : null;
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

  writeStorageDocumentForKey(getProfileStorageKey(trimmedName), readStorageDocument());
  return true;
}

export function loadProfile(name) {
  const trimmedName = String(name ?? "").trim();
  const selectedProfile = readStorageDocumentForKey(getProfileStorageKey(trimmedName));

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
