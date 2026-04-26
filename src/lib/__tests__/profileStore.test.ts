import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProfileDocument, readProfileStore, writeProfileStore } from "../profileStore";

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
    writeProfileStore({
      activeProfileName: "Profile",
      profiles: [{ name: "Profile", document: createDefaultProfileDocument() }],
    });

    expect(storageKeys(localStorage)).toEqual(["basisflow_profiles"]);
  });

  it("uses a default profile when no profile store exists", () => {
    const store = readProfileStore();

    expect(store.activeProfileName).toBe("Profile");
    expect(store.profiles.map((profile) => profile.name)).toEqual(["Profile"]);
    expect(storageKeys(localStorage)).toEqual([]);
  });
});
