import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProfileTabs } from "../components/ProfileTabs";
import {
  getActiveProfile,
  getProfileNames,
  nextProfileName,
  readProfileStore,
  updateProfileStore,
  writeProfileStore,
  type WorkspaceProfileDocument,
} from "../lib/profileStore";
import type { DraftStateSetter } from "../lib/state";
import { WorkspacePage } from "./WorkspacePage";

export function WorkspaceProfileShell() {
  const [profileStore, setProfileStore] = useState(readProfileStore);
  const [profileToRename, setProfileToRename] = useState<string | null>(null);
  const profileNames = getProfileNames(profileStore);
  const activeProfile = getActiveProfile(profileStore);

  useEffect(() => {
    writeProfileStore(profileStore);
  }, [profileStore]);

  const setProfileDocument = useCallback<DraftStateSetter<WorkspaceProfileDocument>>((nextDocument) => {
    setProfileStore((store) => updateProfileStore(store, { type: "updateActiveDocument", nextDocument }));
  }, []);

  function handleCreateProfile() {
    const profileName = nextProfileName("Profile", profileNames);
    setProfileStore((store) => updateProfileStore(store, { type: "create", name: profileName }));
    setProfileToRename(profileName);
  }

  function handleSelectProfile(name: string) {
    setProfileStore((store) => updateProfileStore(store, { type: "select", name }));
  }

  function handleDuplicateProfile(name: string) {
    setProfileStore((store) => updateProfileStore(store, { type: "duplicate", sourceName: name }));
  }

  function handleRemoveProfile(name: string) {
    setProfileStore((store) => updateProfileStore(store, { type: "remove", name }));
  }

  function handleRenameProfile(currentName: string, nextName: string) {
    setProfileStore((store) => updateProfileStore(store, { type: "rename", currentName, nextName }));
  }

  function handleResetProfile(name: string) {
    if (!window.confirm(`Reset "${name}" to defaults?`)) {
      return;
    }

    setProfileStore((store) => updateProfileStore(store, { type: "reset", name }));
  }

  return (
    <div className="mx-auto mb-8 flex min-h-screen w-full max-w-screen-2xl flex-col px-4">
      <header className="sticky top-0 z-40 -mx-4 mb-4 border-b border-(--line) bg-(--paper) px-4 pt-4">
        <div className="flex min-w-0 items-stretch gap-4">
          <Link to="/" className="flex shrink-0 items-start pb-4 no-underline">
            <h1 className="font-serif text-3xl text-(--ink) sm:text-4xl">Basisflow</h1>
          </Link>
          <ProfileTabs
            activeProfileName={profileStore.activeProfileName}
            profiles={profileNames}
            onCreateProfile={handleCreateProfile}
            onDuplicateProfile={handleDuplicateProfile}
            onRemoveProfile={handleRemoveProfile}
            onRenameProfile={handleRenameProfile}
            onResetProfile={handleResetProfile}
            onSelectProfile={handleSelectProfile}
            renameProfileName={profileToRename}
            onRenameClosed={() => setProfileToRename(null)}
          />
        </div>
      </header>

      <WorkspacePage profile={activeProfile} setProfileDocument={setProfileDocument} />
    </div>
  );
}
