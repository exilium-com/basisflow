import { beforeEach, describe, expect, it, vi } from "vitest";
import { readProfileStore, updateProfileStore, writeProfileStore } from "../profileStore";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function storageKeys(storage: Storage) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
}

describe("profileStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("stores profiles under one localStorage key", () => {
    writeProfileStore(readProfileStore());

    expect(storageKeys(localStorage)).toEqual(["basisflow_profiles"]);
  });

  it("uses a default profile when no profile store exists", () => {
    const store = readProfileStore();

    expect(store.activeProfileName).toBe("Profile");
    expect(store.profiles.map((profile) => profile.name)).toEqual(["Profile"]);
    expect(storageKeys(localStorage)).toEqual([]);
  });

  it("clones profile documents when creating and duplicating profiles", () => {
    const store = updateProfileStore(readProfileStore(), { type: "create", name: "Copy" });
    const duplicated = updateProfileStore(store, { type: "duplicate", sourceName: "Copy" });

    expect(duplicated.profiles.map((profile) => profile.name)).toEqual(["Profile", "Copy", "Copy copy"]);
    expect(duplicated.profiles[0].document).not.toBe(duplicated.profiles[1].document);
    expect(duplicated.profiles[1].document).not.toBe(duplicated.profiles[2].document);
  });

  it("keeps workspace projection settings outside profile documents", () => {
    const store = updateProfileStore(readProfileStore(), {
      type: "updateWorkspaceSettings",
      nextSettings: (draft) => {
        draft.projection.currentYear = 7;
        draft.projection.assetGrowthRate = 4;
        draft.income.matchRate = 75;
      },
    });
    const withSecondProfile = updateProfileStore(store, { type: "create", name: "Second" });

    expect(withSecondProfile.workspaceSettings.projection.currentYear).toBe(7);
    expect(withSecondProfile.workspaceSettings.projection.assetGrowthRate).toBe(4);
    expect(withSecondProfile.workspaceSettings.income.matchRate).toBe(75);
    expect(withSecondProfile.profiles[0].document.projection).not.toHaveProperty("currentYear");
    expect(withSecondProfile.profiles[1].document.projection).not.toHaveProperty("currentYear");
  });

  it("migrates old profile-scoped right panel settings into workspace settings", () => {
    localStorage.setItem(
      "basisflow_profiles",
      JSON.stringify({
        activeProfileName: "Profile",
        profiles: [
          {
            name: "Profile",
            document: {
              income: { matchRate: 80 },
              projection: {
                currentYear: 3,
                assetGrowthRate: 9,
                homeAppreciationRate: 4,
                mortgageFundingBucketId: "cash-bucket",
              },
            },
          },
        ],
      }),
    );

    const store = readProfileStore();

    expect(store.workspaceSettings.income.matchRate).toBe(80);
    expect(store.workspaceSettings.projection.currentYear).toBe(3);
    expect(store.workspaceSettings.projection.assetGrowthRate).toBe(9);
    expect(store.workspaceSettings.projection.homeAppreciationRate).toBe(4);
    expect(store.profiles[0].document.projection.mortgageFundingBucketId).toBe("cash-bucket");
  });
});
