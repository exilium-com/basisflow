import { produce, type Draft } from "immer";
import { DEFAULT_ASSETS_STATE, normalizeAssetsState, type AssetsState } from "./assetsModel";
import { DEFAULT_EXPENSES_STATE, normalizeExpensesState, type ExpensesState } from "./expensesModel";
import { DEFAULT_INCOME, normalizeIncome, type Income } from "./incomeModel";
import { DEFAULT_MORTGAGE_STATE, normalizeMortgageState, type MortgageState } from "./mortgageConfig";
import { DEFAULT_PROJECTION_STATE, normalizeProjectionState, type ProjectionState } from "./projectionState";
import type { DraftStateAction } from "./state";
import { normalizeConfig, type TaxConfig } from "./taxConfig";

const PROFILE_STORE_KEY = "basisflow_profiles";

export type WorkspaceProfileDocument = {
  income: Income;
  mortgage: MortgageState;
  assets: AssetsState;
  expenses: ExpensesState;
  projection: ProjectionState;
  taxConfig: TaxConfig;
};

export type WorkspaceProfile = {
  name: string;
  document: WorkspaceProfileDocument;
};

type ProfileStore = {
  activeProfileName: string;
  profiles: WorkspaceProfile[];
};

type ProfileStoreAction =
  | { type: "create"; name: string }
  | { type: "select"; name: string }
  | { type: "duplicate"; sourceName: string }
  | { type: "remove"; name: string }
  | { type: "rename"; currentName: string; nextName: string }
  | { type: "reset"; name: string }
  | { type: "updateActiveDocument"; nextDocument: DraftStateAction<WorkspaceProfileDocument> };

function runStorage<T>(fallback: T, action: () => T) {
  try {
    return action();
  } catch {
    return fallback;
  }
}

function readJsonKey(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as unknown;
}

function asRecord(value: unknown) {
  return typeof value === "object" && value ? (value as Record<string, unknown>) : {};
}

function normalizeProfileName(name: unknown) {
  return typeof name === "string" ? name.trim() : "";
}

export function nextProfileName(baseName: string, names: string[]) {
  const usedNames = new Set(names);
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  for (let index = 2; index < 1000; index += 1) {
    const name = `${baseName} ${index}`;
    if (!usedNames.has(name)) {
      return name;
    }
  }

  return `${baseName} ${Date.now()}`;
}

function setProfileDocument(
  profile: Draft<WorkspaceProfile>,
  nextDocument: DraftStateAction<WorkspaceProfileDocument>,
) {
  if (typeof nextDocument === "function") {
    nextDocument(profile.document as Draft<WorkspaceProfileDocument>);
  } else {
    profile.document = normalizeProfileDocument(nextDocument);
  }
}

function createDefaultProfileDocument(): WorkspaceProfileDocument {
  return {
    income: structuredClone(DEFAULT_INCOME),
    mortgage: structuredClone(DEFAULT_MORTGAGE_STATE),
    assets: structuredClone(DEFAULT_ASSETS_STATE),
    expenses: structuredClone(DEFAULT_EXPENSES_STATE),
    projection: structuredClone(DEFAULT_PROJECTION_STATE),
    taxConfig: normalizeConfig(null),
  };
}

function normalizeProfileDocument(rawDocument: unknown): WorkspaceProfileDocument {
  const document = asRecord(rawDocument);
  const fallback = createDefaultProfileDocument();

  return {
    income: normalizeIncome(document.income, fallback.income),
    mortgage: normalizeMortgageState(document.mortgage, fallback.mortgage),
    assets: normalizeAssetsState(document.assets, fallback.assets),
    expenses: normalizeExpensesState(document.expenses, fallback.expenses),
    projection: normalizeProjectionState(document.projection, fallback.projection),
    taxConfig: normalizeConfig(document.taxConfig),
  };
}

function createDefaultProfileStore(): ProfileStore {
  return {
    activeProfileName: "Profile",
    profiles: [
      {
        name: "Profile",
        document: createDefaultProfileDocument(),
      },
    ],
  };
}

function normalizeProfileStore(rawStore: unknown): ProfileStore {
  const store = asRecord(rawStore);
  const profiles = Array.isArray(store.profiles) ? store.profiles : [];
  const usedNames: string[] = [];
  const normalizedProfiles = profiles.map((rawProfile) => {
    const profile = asRecord(rawProfile);
    const profileName = normalizeProfileName(profile.name);
    const name = nextProfileName(profileName || "Profile", usedNames);
    usedNames.push(name);

    return {
      name,
      document: normalizeProfileDocument(profile.document),
    };
  });

  if (!normalizedProfiles.length) {
    return createDefaultProfileStore();
  }

  const activeProfileName = normalizeProfileName(store.activeProfileName);
  return {
    activeProfileName: normalizedProfiles.some((profile) => profile.name === activeProfileName)
      ? activeProfileName
      : normalizedProfiles[0].name,
    profiles: normalizedProfiles,
  };
}

export function readProfileStore() {
  return runStorage(createDefaultProfileStore(), () => {
    const storedProfileStore = readJsonKey(PROFILE_STORE_KEY);
    return storedProfileStore ? normalizeProfileStore(storedProfileStore) : createDefaultProfileStore();
  });
}

export function writeProfileStore(store: ProfileStore) {
  runStorage(undefined, () => {
    localStorage.setItem(PROFILE_STORE_KEY, JSON.stringify(store));
    return undefined;
  });
}

export function updateProfileStore(store: ProfileStore, action: ProfileStoreAction): ProfileStore {
  const createdDocument = action.type === "create" ? structuredClone(getActiveProfile(store).document) : null;
  const duplicatedDocument =
    action.type === "duplicate"
      ? structuredClone(store.profiles.find((profile) => profile.name === action.sourceName)?.document ?? null)
      : null;

  return produce(store, (draft) => {
    switch (action.type) {
      case "create":
        draft.profiles.push({
          name: action.name,
          document: createdDocument ?? createDefaultProfileDocument(),
        });
        draft.activeProfileName = action.name;
        break;

      case "select":
        if (draft.profiles.some((profile) => profile.name === action.name)) {
          draft.activeProfileName = action.name;
        }
        break;

      case "duplicate": {
        if (duplicatedDocument) {
          const nextName = nextProfileName(`${action.sourceName} copy`, getProfileNames(draft));
          draft.profiles.push({
            name: nextName,
            document: duplicatedDocument,
          });
          draft.activeProfileName = nextName;
        }
        break;
      }

      case "remove": {
        const wasActive = draft.activeProfileName === action.name;
        draft.profiles = draft.profiles.filter((profile) => profile.name !== action.name);
        if (!draft.profiles.length) {
          draft.profiles.push({
            name: "Profile",
            document: createDefaultProfileDocument(),
          });
        }

        if (wasActive) {
          draft.activeProfileName = draft.profiles[0].name;
        }
        break;
      }

      case "rename": {
        const nextName = action.nextName.trim();
        if (!nextName || draft.profiles.some((profile) => profile.name === nextName)) {
          return;
        }

        const profile = draft.profiles.find((entry) => entry.name === action.currentName);
        if (profile) {
          profile.name = nextName;
          if (draft.activeProfileName === action.currentName) {
            draft.activeProfileName = nextName;
          }
        }
        break;
      }

      case "reset": {
        const profile = draft.profiles.find((entry) => entry.name === action.name);
        if (profile) {
          profile.document = createDefaultProfileDocument();
        }
        break;
      }

      case "updateActiveDocument": {
        const profile = draft.profiles.find((entry) => entry.name === draft.activeProfileName);
        if (profile) {
          setProfileDocument(profile, action.nextDocument);
        }
        break;
      }
    }
  });
}

export function getActiveProfile(store: ProfileStore) {
  return store.profiles.find((profile) => profile.name === store.activeProfileName) ?? store.profiles[0];
}

export function getProfileNames(store: ProfileStore) {
  return store.profiles.map((profile) => profile.name);
}
