import { useCallback, useEffect, useState } from "react";
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
  const [compareProfileName, setCompareProfileName] = useState<string | null>(null);
  const [profileToRename, setProfileToRename] = useState<string | null>(null);
  const profileNames = getProfileNames(profileStore);
  const activeProfile = getActiveProfile(profileStore);
  const compareProfile =
    profileStore.profiles.find(
      (profile) => profile.name === compareProfileName && profile.name !== activeProfile.name,
    ) ?? null;

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
    if (name === compareProfileName) {
      setCompareProfileName(null);
    }
  }

  function handleDuplicateProfile(name: string) {
    setProfileStore((store) => updateProfileStore(store, { type: "duplicate", sourceName: name }));
  }

  function handleRemoveProfile(name: string) {
    setProfileStore((store) => updateProfileStore(store, { type: "remove", name }));
    if (name === activeProfile.name || name === compareProfileName) {
      setCompareProfileName(null);
    }
  }

  function handleRenameProfile(currentName: string, nextName: string) {
    const normalizedName = nextName.trim();
    setProfileStore((store) => updateProfileStore(store, { type: "rename", currentName, nextName }));
    if (currentName === compareProfileName && normalizedName && !profileNames.includes(normalizedName)) {
      setCompareProfileName(normalizedName);
    }
  }

  function handleResetProfile(name: string) {
    if (!window.confirm(`Reset "${name}" to defaults?`)) {
      return;
    }

    setProfileStore((store) => updateProfileStore(store, { type: "reset", name }));
  }

  return (
    <div className="mx-auto mb-8 flex min-h-screen w-full max-w-screen-2xl flex-col px-4">
      <header className="sticky top-0 z-40 -mx-4 mb-4 h-16 border-b border-(--line) bg-(--paper) px-4">
        <div className="flex h-full min-w-0 gap-4">
          <Link to="/" className="flex shrink-0 items-center no-underline">
            <h1 className="font-serif text-3xl text-(--ink) sm:text-4xl">Basisflow</h1>
          </Link>
          <ProfileTabs
            activeProfileName={profileStore.activeProfileName}
            compareProfileName={compareProfileName}
            profiles={profileNames}
            onCompareProfile={setCompareProfileName}
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

      <WorkspacePage compareProfile={compareProfile} profile={activeProfile} setProfileDocument={setProfileDocument} />
    </div>
  );
}
