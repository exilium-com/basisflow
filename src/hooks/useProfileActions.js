import { useEffect, useMemo, useState } from "react";
import { clearAppState, deleteProfile, hasSavedProfile, listProfiles, loadProfile, saveProfile } from "../lib/storage";

const PROFILE_NAME_OPTIONS = [
  "Golden Path",
  "Weekend Numbers",
  "Quiet Rich",
  "Coastline Plan",
  "Future Me",
  "Rainy Day Map",
  "Soft Landing",
  "Long View",
  "Compound Mode",
  "Sunday Spreadsheet",
];

const PENDING_TOAST_KEY = "basisflow_pending_toast";

export function useProfileActions() {
  const [statusMessage, setStatusMessage] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileNamePlaceholder, setProfileNamePlaceholder] = useState("");
  const savedProfiles = useMemo(() => listProfiles(), [statusMessage, saveDialogOpen, loadDialogOpen]);
  const profileAvailable = hasSavedProfile();

  useEffect(() => {
    try {
      const pendingToast = sessionStorage.getItem(PENDING_TOAST_KEY);
      if (pendingToast) {
        setStatusMessage(pendingToast);
        sessionStorage.removeItem(PENDING_TOAST_KEY);
      }
    } catch {
      // Best effort.
    }
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatusMessage("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  function closeSaveDialog() {
    setSaveDialogOpen(false);
    setProfileName("");
    setProfileNamePlaceholder("");
  }

  function openSaveDialog() {
    setProfileName("");
    setProfileNamePlaceholder(PROFILE_NAME_OPTIONS[Math.floor(Math.random() * PROFILE_NAME_OPTIONS.length)]);
    setSaveDialogOpen(true);
  }

  function openLoadDialog() {
    setLoadDialogOpen(true);
  }

  function closeLoadDialog() {
    setLoadDialogOpen(false);
  }

  function handleSaveProfile() {
    const resolvedProfileName = profileName.trim() || profileNamePlaceholder;
    const saved = saveProfile(resolvedProfileName);
    if (!saved) {
      setStatusMessage("Enter a profile name");
      return;
    }

    setStatusMessage(`Saved ${resolvedProfileName}`);
    closeSaveDialog();
  }

  function handleLoadProfile(name) {
    const loaded = loadProfile(name);
    if (!loaded) {
      setStatusMessage("Profile not found");
      return;
    }

    try {
      sessionStorage.setItem(PENDING_TOAST_KEY, `Loaded ${name}`);
    } catch {
      // Best effort.
    }

    closeLoadDialog();
    window.location.reload();
  }

  function handleDeleteProfile(name) {
    const deleted = deleteProfile(name);
    if (!deleted) {
      setStatusMessage("Could not delete profile");
      return;
    }

    setStatusMessage(`Deleted ${name}`);
  }

  function handleResetAll() {
    const confirmed = window.confirm(
      "Reset all app data to defaults? This clears the current working state but keeps saved profiles.",
    );
    if (!confirmed) {
      return;
    }

    const cleared = clearAppState();
    if (!cleared) {
      setStatusMessage("Could not reset app state");
      return;
    }

    try {
      sessionStorage.setItem(PENDING_TOAST_KEY, "Reset all");
    } catch {
      // Best effort.
    }

    window.location.reload();
  }

  return {
    closeLoadDialog,
    closeSaveDialog,
    handleDeleteProfile,
    handleLoadProfile,
    handleResetAll,
    handleSaveProfile,
    loadDialogOpen,
    openLoadDialog,
    openSaveDialog,
    profileAvailable,
    profileName,
    profileNamePlaceholder,
    saveDialogOpen,
    savedProfiles,
    setProfileName,
    statusMessage,
  };
}
