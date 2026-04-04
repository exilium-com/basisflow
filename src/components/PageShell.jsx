import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../lib/nav";
import { cx } from "../lib/cx";
import { TextField } from "./Field";
import { ProfileDialog } from "./ProfileDialog";
import { ToastMessage } from "./ToastMessage";
import {
  deleteProfile,
  hasSavedProfile,
  listProfiles,
  loadProfile,
  saveProfile,
} from "../lib/storage";

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

function pickRandomProfileName() {
  return PROFILE_NAME_OPTIONS[
    Math.floor(Math.random() * PROFILE_NAME_OPTIONS.length)
  ];
}

export function PageShell({ actions = null, children }) {
  const [statusMessage, setStatusMessage] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileNamePlaceholder, setProfileNamePlaceholder] = useState("");
  const savedProfiles = useMemo(
    () => listProfiles(),
    [statusMessage, saveDialogOpen, loadDialogOpen],
  );
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
    setProfileNamePlaceholder(pickRandomProfileName());
    setSaveDialogOpen(true);
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

    setLoadDialogOpen(false);
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

  function handleDeleteHover(event, active) {
    if (active) {
      event.currentTarget.style.backgroundColor = "var(--destructive-soft)";
    } else {
      event.currentTarget.style.backgroundColor = "var(--white)";
    }
  }

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-3
        sm:px-4"
    >
      <nav
        className="mt-3 mb-3 flex flex-wrap gap-2 border-b border-(--line) pb-3"
        aria-label="Tools"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            className={({ isActive }) =>
              cx(
                `inline-flex h-10 items-center gap-2 border border-(--line)
                bg-(--white-soft) px-3 text-xs font-extrabold tracking-wide
                text-(--ink) uppercase no-underline transition duration-150
                hover:-translate-y-px hover:bg-(--white)
                focus-visible:-translate-y-px focus-visible:bg-(--white)
                focus-visible:outline-none`,
                isActive &&
                  "!border-(--teal) !bg-(--teal-tint) !text-(--teal)",
              )
            }
            to={item.to}
            end={item.to === "/"}
          >
            <span className="text-xs opacity-70">{item.index}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {statusMessage ? (
            <ToastMessage message={statusMessage} />
          ) : null}
          <button
            className="inline-flex h-10 items-center border border-(--line)
              bg-(--white-soft) px-3 text-xs font-extrabold tracking-wide
              text-(--ink) uppercase transition duration-150
              hover:-translate-y-px hover:bg-(--white)
              focus-visible:-translate-y-px focus-visible:bg-(--white)
              focus-visible:outline-none"
            type="button"
            onClick={openSaveDialog}
          >
            Save Profile
          </button>
          <button
            className="inline-flex h-10 items-center border border-(--line)
              bg-(--white-soft) px-3 text-xs font-extrabold tracking-wide
              text-(--ink) uppercase transition duration-150
              hover:-translate-y-px hover:bg-(--white)
              focus-visible:-translate-y-px focus-visible:bg-(--white)
              focus-visible:outline-none disabled:cursor-not-allowed
              disabled:opacity-50"
            type="button"
            onClick={() => setLoadDialogOpen(true)}
            disabled={!profileAvailable}
          >
            Load Profile
          </button>
          {actions}
        </div>
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {saveDialogOpen ? (
        <ProfileDialog title="Save Profile" onClose={closeSaveDialog}>
          <TextField
            label="Profile name"
            placeholder={profileNamePlaceholder}
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              className="inline-flex h-10 items-center border border-(--line)
                bg-(--white-soft) px-4 text-xs font-extrabold tracking-wide
                text-(--ink) uppercase transition duration-150 hover:bg-(--white)"
              onClick={closeSaveDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center border px-4 text-xs
                font-extrabold tracking-wide uppercase transition duration-150"
              onClick={handleSaveProfile}
              style={{
                backgroundColor: "var(--teal)",
                borderColor: "var(--teal)",
                color: "var(--white)",
              }}
              type="button"
            >
              Save
            </button>
          </div>
        </ProfileDialog>
      ) : null}

      {loadDialogOpen ? (
        <ProfileDialog
          title="Load Profile"
          onClose={() => setLoadDialogOpen(false)}
        >
          {savedProfiles.length ? (
            <div className="grid gap-2">
              {savedProfiles.map((name) => (
                <button
                  key={name}
                  className="flex items-center justify-between gap-3 border border-(--line)
                    bg-(--white-soft) px-4 py-3 text-left transition duration-150
                    hover:-translate-y-px hover:bg-(--white)"
                  onClick={() => handleLoadProfile(name)}
                  type="button"
                >
                  <span className="font-semibold text-(--ink)">{name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`Delete ${name}`}
                      className="inline-flex h-9 w-9 items-center justify-center border
                        bg-(--white) text-sm font-extrabold transition duration-150
                        hover:-translate-y-px"
                      style={{
                        borderColor: "var(--destructive-soft)",
                        color: "var(--destructive)",
                      }}
                      onMouseEnter={(event) => handleDeleteHover(event, true)}
                      onMouseLeave={(event) => handleDeleteHover(event, false)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteProfile(name);
                      }}
                      type="button"
                    >
                      X
                    </button>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-(--ink-soft)">No saved profiles.</p>
          )}
        </ProfileDialog>
      ) : null}
    </div>
  );
}
