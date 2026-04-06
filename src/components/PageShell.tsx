import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../lib/nav";
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
  children: React.ReactNode;
};

function ToolNavLinks() {
  return NAV_ITEMS.map((item) => (
    <NavLink
      key={item.key}
      className={({ isActive }) =>
        clsx(
          `inline-flex h-10 items-center gap-2 border border-(--line) bg-(--white-soft) px-3 text-xs font-extrabold
          tracking-wide text-(--ink) uppercase no-underline transition duration-150 hover:-translate-y-px
          hover:bg-(--white) focus-visible:-translate-y-px focus-visible:bg-(--white) focus-visible:outline-none`,
          isActive && "!border-(--teal) !bg-(--teal-tint) !text-(--teal)",
        )
      }
      to={item.to}
      end={item.to === "/"}
    >
      <span className="text-xs opacity-70">{item.index}</span>
      <span>{item.label}</span>
    </NavLink>
  ));
}

function ShellActions({
  actions,
  onOpenLoadDialog,
  onOpenSaveDialog,
  onResetAll,
  profileAvailable,
  statusMessage,
}: ShellActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {statusMessage ? <ToastMessage message={statusMessage} /> : null}
      <ActionButton className="px-3 text-xs tracking-wide uppercase" onClick={onOpenSaveDialog}>
        Save
      </ActionButton>
      <ActionButton
        className="px-3 text-xs tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onOpenLoadDialog}
        disabled={!profileAvailable}
      >
        Load
      </ActionButton>
      <ActionButton className="px-3 text-xs tracking-wide uppercase" onClick={onResetAll}>
        Reset
      </ActionButton>
      {actions}
    </div>
  );
}

export function PageShell({ actions = null, children }: PageShellProps) {
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
    <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-3 sm:px-4">
      <nav className="mt-3 mb-3 border-b border-(--line) pb-3" aria-label="Tools">
        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <ToolNavLinks />
          <div className="ml-auto">
            <ShellActions
              actions={actions}
              onOpenLoadDialog={openLoadDialog}
              onOpenSaveDialog={openSaveDialog}
              onResetAll={handleResetAll}
              profileAvailable={profileAvailable}
              statusMessage={statusMessage}
            />
          </div>
        </div>

        <div className="sm:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap">
            <ToolNavLinks />
          </div>
          <div className="mt-2 flex justify-end">
            <ShellActions
              actions={actions}
              onOpenLoadDialog={openLoadDialog}
              onOpenSaveDialog={openSaveDialog}
              onResetAll={handleResetAll}
              profileAvailable={profileAvailable}
              statusMessage={statusMessage}
            />
          </div>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

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
