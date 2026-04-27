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
});
