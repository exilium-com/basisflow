import React from "react";
import clsx from "clsx";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../lib/nav";
import { ActionButton } from "./ActionButton";
import { ProfileLoadDialog } from "./ProfileLoadDialog";
import { ProfileSaveDialog } from "./ProfileSaveDialog";
import { ToastMessage } from "./ToastMessage";
import { useProfileActions } from "../hooks/useProfileActions";

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

function ShellActions({ actions, onOpenSaveDialog, onOpenLoadDialog, onResetAll, profileAvailable, statusMessage }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {statusMessage ? <ToastMessage message={statusMessage} /> : null}
      <ActionButton className="px-3 text-xs tracking-wide uppercase" onClick={onOpenSaveDialog}>
        Save Profile
      </ActionButton>
      <ActionButton
        className="px-3 text-xs tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onOpenLoadDialog}
        disabled={!profileAvailable}
      >
        Load Profile
      </ActionButton>
      <ActionButton className="px-3 text-xs tracking-wide uppercase" onClick={onResetAll}>
        Reset
      </ActionButton>
      {actions}
    </div>
  );
}

export function PageShell({ actions = null, children }) {
  const {
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
  } = useProfileActions();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-3 sm:px-4">
      <nav className="mt-3 mb-3 border-b border-(--line) pb-3" aria-label="Tools">
        <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <ToolNavLinks />
          <div className="ml-auto">
            <ShellActions
              actions={actions}
              onOpenSaveDialog={openSaveDialog}
              onOpenLoadDialog={openLoadDialog}
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
              onOpenSaveDialog={openSaveDialog}
              onOpenLoadDialog={openLoadDialog}
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
