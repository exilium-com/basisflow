import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clearAppState, deleteProfile, listProfiles, loadProfile, saveProfile } from "../lib/storage";
import { ActionButton } from "./ActionButton";
import { ProfileLoadDialog } from "./ProfileLoadDialog";
import { ProfileSaveDialog } from "./ProfileSaveDialog";
import { ToastMessage } from "./ToastMessage";

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

type ShellActionsProps = {
  actions?: React.ReactNode;
  onOpenLoadDialog: () => void;
  onOpenSaveDialog: () => void;
  onResetAll: () => void;
  profileAvailable: boolean;
  statusMessage: string;
};

type PageShellProps = {
  actions?: React.ReactNode;
  title?: React.ReactNode;
  children: React.ReactNode;
};

function ShellActions({
  actions,
  onOpenLoadDialog,
  onOpenSaveDialog,
  onResetAll,
  profileAvailable,
  statusMessage,
}: ShellActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {statusMessage ? <ToastMessage message={statusMessage} /> : null}
      <ActionButton onClick={onOpenSaveDialog}>Save</ActionButton>
      <ActionButton
        className="disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onOpenLoadDialog}
        disabled={!profileAvailable}
      >
        Load
      </ActionButton>
      <ActionButton onClick={onResetAll}>Reset</ActionButton>
      {actions}
    </div>
  );
}

export function PageShell({ actions = null, title = "BasisFlow", children }: PageShellProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileNamePlaceholder, setProfileNamePlaceholder] = useState("");
  const savedProfiles = listProfiles();
  const profileAvailable = savedProfiles.length > 0;

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
    if (!saveProfile(resolvedProfileName)) {
      setStatusMessage("Enter a profile name");
      return;
    }

    setStatusMessage(`Saved ${resolvedProfileName}`);
    closeSaveDialog();
  }

  function handleLoadProfile(name: string) {
    if (!loadProfile(name)) {
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

  function handleDeleteProfile(name: string) {
    if (!deleteProfile(name)) {
      setStatusMessage("Could not delete profile");
      return;
    }

    setStatusMessage(`Deleted ${name}`);
  }

  function handleResetAll() {
    if (
      !window.confirm("Reset all app data to defaults? This clears the current working state but keeps saved profiles.")
    ) {
      return;
    }

    if (!clearAppState()) {
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

  return (
    <div className="mx-auto mb-8 flex min-h-screen w-full max-w-screen-2xl flex-col px-4">
      <header className="my-4 flex items-end justify-between border-b border-(--line) pb-4">
        <Link to="/" className="no-underline">
          <h1 className="font-serif text-4xl leading-none tracking-tight text-(--ink)">{title}</h1>
        </Link>
        <ShellActions
          actions={actions}
          onOpenLoadDialog={openLoadDialog}
          onOpenSaveDialog={openSaveDialog}
          onResetAll={handleResetAll}
          profileAvailable={profileAvailable}
          statusMessage={statusMessage}
        />
      </header>

      {children}

      {saveDialogOpen ? (
        <ProfileSaveDialog
          onClose={closeSaveDialog}
          onProfileNameChange={setProfileName}
          onSave={handleSaveProfile}
          placeholder={profileNamePlaceholder}
          value={profileName}
        />
      ) : null}

      {loadDialogOpen ? (
        <ProfileLoadDialog
          names={savedProfiles}
          onClose={closeLoadDialog}
          onDelete={handleDeleteProfile}
          onLoad={handleLoadProfile}
        />
      ) : null}
    </div>
  );
}
