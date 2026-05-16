import React from "react";
import clsx from "clsx";
import { InlineRenameControl } from "./InlineRenameControl";
import { ThreeDotMenu, type ThreeDotMenuItems } from "./ThreeDotMenu";

const profileNavClassName = "hide-scrollbar flex min-w-0 flex-1 overflow-x-auto";

const profilePlaceholderClassName =
  "border-b-2 border-teal bg-teal-tint px-4 text-sm font-bold text-teal lg:px-8 lg:text-base";

const profileTabClassName = "flex min-w-32 shrink-0 items-center border-b-2 border-transparent transition lg:min-w-40";

const profileButtonClassName =
  "min-w-0 flex-1 px-4 text-left text-sm font-bold whitespace-nowrap text-ink-soft hover:text-ink lg:px-8 lg:text-base";

const createProfileButtonClassName =
  "sticky right-0 w-10 shrink-0 bg-paper text-base text-ink-soft hover:text-ink lg:w-14 lg:text-lg";

type ProfileTabsProps = {
  activeProfileName: string | null;
  compareProfileName?: string | null;
  profiles: string[];
  onCompareProfile: (name: string | null) => void;
  onCreateProfile: () => void;
  onDuplicateProfile: (name: string) => void;
  onRemoveProfile: (name: string) => void;
  onRenameProfile: (currentName: string, nextName: string) => void;
  onResetProfile: (name: string) => void;
  onSelectProfile: (name: string) => void;
  renameProfileName?: string | null;
  onRenameClosed?: () => void;
};

export function ProfileTabs({
  activeProfileName,
  compareProfileName = null,
  profiles,
  onCompareProfile,
  onCreateProfile,
  onDuplicateProfile,
  onRemoveProfile,
  onRenameProfile,
  onResetProfile,
  onSelectProfile,
  renameProfileName = null,
  onRenameClosed,
}: ProfileTabsProps) {
  const [renamingProfileName, setRenamingProfileName] = React.useState<string | null>(null);
  const [renameWidth, setRenameWidth] = React.useState<number | null>(null);
  const tabListRef = React.useRef<HTMLElement | null>(null);
  const profileTabRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const visibleProfiles = React.useMemo(
    () => (activeProfileName && !profiles.includes(activeProfileName) ? [activeProfileName, ...profiles] : profiles),
    [activeProfileName, profiles],
  );

  function startRename(profile: string) {
    setRenameWidth(profileTabRefs.current[profile]?.offsetWidth ?? null);
    setRenamingProfileName(profile);
  }

  function closeRename() {
    setRenamingProfileName(null);
    setRenameWidth(null);
    onRenameClosed?.();
  }

  React.useEffect(() => {
    if (renameProfileName && visibleProfiles.includes(renameProfileName)) {
      startRename(renameProfileName);
    }
  }, [renameProfileName, visibleProfiles]);

  React.useEffect(() => {
    const tabListElement = tabListRef.current;
    if (!tabListElement) {
      return undefined;
    }

    const scrollHorizontally = (event: WheelEvent) => {
      const maxScrollLeft = tabListElement.scrollWidth - tabListElement.clientWidth;
      if (maxScrollLeft <= 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const scrollDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      tabListElement.scrollLeft = Math.max(0, Math.min(maxScrollLeft, tabListElement.scrollLeft + scrollDelta));
    };

    tabListElement.addEventListener("wheel", scrollHorizontally, { passive: false });
    return () => tabListElement.removeEventListener("wheel", scrollHorizontally);
  }, []);

  return (
    <div className="relative flex min-w-0 flex-1">
      <nav ref={tabListRef} className={profileNavClassName} aria-label="Profiles">
        {!activeProfileName ? (
          <button className={profilePlaceholderClassName} type="button" aria-pressed="true" disabled>
            Current
          </button>
        ) : null}
        {visibleProfiles.map((profile) => {
          const active = activeProfileName === profile;
          const renaming = renamingProfileName === profile;
          const compareLabel = profile === compareProfileName ? "Stop comparing" : "Compare";
          const menuItems: ThreeDotMenuItems = {
            Duplicate: {
              action: () => onDuplicateProfile(profile),
            },
            ...(profile !== activeProfileName
              ? {
                  [compareLabel]: {
                    action: () => onCompareProfile(profile === compareProfileName ? null : profile),
                  },
                }
              : {}),
            Rename: {
              action: () => startRename(profile),
            },
            Remove: { action: () => onRemoveProfile(profile), destructive: true },
            Reset: { action: () => onResetProfile(profile), destructive: true },
          };

          return (
            <div
              key={profile}
              ref={(element) => {
                profileTabRefs.current[profile] = element;
              }}
              className={clsx(
                profileTabClassName,
                active
                  ? "border-b-teal bg-teal-tint lg:shadow-sm"
                  : "hover:border-teal-soft hover:bg-surface lg:hover:shadow-sm",
              )}
              style={renaming && renameWidth ? { width: renameWidth } : undefined}
            >
              {renaming ? (
                <InlineRenameControl
                  value={profile}
                  onCancel={closeRename}
                  onCommit={(nextName) => {
                    onRenameProfile(profile, nextName);
                    closeRename();
                  }}
                />
              ) : (
                <>
                  <button
                    className={clsx(profileButtonClassName, active && "text-teal")}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectProfile(profile)}
                  >
                    {profile}
                  </button>
                  <ThreeDotMenu
                    ariaLabel={`Manage ${profile}`}
                    buttonClassName="mr-2 lg:mr-4 lg:size-8"
                    items={menuItems}
                  />
                </>
              )}
            </div>
          );
        })}
        <button
          className={createProfileButtonClassName}
          type="button"
          aria-label="Create profile"
          onClick={onCreateProfile}
        >
          +
        </button>
      </nav>
    </div>
  );
}
