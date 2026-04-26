import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  clearAppState,
  deleteProfile,
  duplicateProfile,
  getActiveProfileName,
  listProfiles,
  loadProfile,
  renameProfile,
  saveProfile,
} from "../lib/storage";
import { ProfileTabs } from "./ProfileTabs";

type PageShellProps = {
  children: React.ReactNode;
};

function nextProfileName(baseName: string, names: string[]) {
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

export function PageShell({ children }: PageShellProps) {
  const [savedProfiles, setSavedProfiles] = useState(listProfiles);
  const [activeProfileName, setActiveProfileName] = useState(getActiveProfileName);
  const [profileToRename, setProfileToRename] = useState<string | null>(null);

  function refreshProfiles() {
    setSavedProfiles(listProfiles());
    setActiveProfileName(getActiveProfileName());
  }

  function handleCreateProfile() {
    const profileName = nextProfileName("Profile", savedProfiles);
    if (!saveProfile(profileName)) {
      return;
    }

    refreshProfiles();
    setProfileToRename(profileName);
  }

  function handleLoadProfile(name: string) {
    if (loadProfile(name)) {
      refreshProfiles();
    }
  }

  function handleDuplicateProfile(name: string) {
    const nextName = nextProfileName(`${name} copy`, savedProfiles);
    if (!duplicateProfile(name, nextName) || !loadProfile(nextName)) {
      return;
    }

    refreshProfiles();
  }

  function handleRemoveProfile(name: string) {
    const wasActive = activeProfileName === name;
    const fallbackProfile = savedProfiles.find((profile) => profile !== name);
    if (!deleteProfile(name)) {
      return;
    }

    if (wasActive && fallbackProfile) {
      loadProfile(fallbackProfile);
    } else if (wasActive) {
      clearAppState();
    }

    refreshProfiles();
  }

  function handleRenameProfile(currentName: string, nextName: string) {
    if (!renameProfile(currentName, nextName)) {
      return;
    }

    refreshProfiles();
  }

  function handleResetAll() {
    if (
      !window.confirm("Reset all app data to defaults? This clears the current working state but keeps saved profiles.")
    ) {
      return;
    }

    if (!clearAppState()) {
      return;
    }

    refreshProfiles();
  }

  return (
    <div className="mx-auto mb-8 flex min-h-screen w-full max-w-screen-2xl flex-col px-4">
      <header className="sticky top-0 z-40 -mx-4 mb-4 border-b border-(--line) bg-(--paper) px-4 pt-4">
        <div className="flex min-w-0 items-stretch gap-4">
          <Link to="/" className="flex shrink-0 items-start pb-4 no-underline">
            <h1 className="font-serif text-3xl text-(--ink) sm:text-4xl">Basisflow</h1>
          </Link>
          <ProfileTabs
            activeProfileName={activeProfileName}
            profiles={savedProfiles}
            onCreateProfile={handleCreateProfile}
            onDuplicateProfile={handleDuplicateProfile}
            onRemoveProfile={handleRemoveProfile}
            onRenameProfile={handleRenameProfile}
            onResetAll={handleResetAll}
            onSelectProfile={handleLoadProfile}
            renameProfileName={profileToRename}
            onRenameClosed={() => setProfileToRename(null)}
          />
        </div>
      </header>

      {children}
    </div>
  );
}
