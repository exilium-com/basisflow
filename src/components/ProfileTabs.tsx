import React from "react";
import clsx from "clsx";
import { InlineRenameControl } from "./InlineRenameControl";

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
  const [menuProfileName, setMenuProfileName] = React.useState<string | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<React.CSSProperties>({});
  const [renamingProfileName, setRenamingProfileName] = React.useState<string | null>(null);
  const [renameWidth, setRenameWidth] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const tabListRef = React.useRef<HTMLElement | null>(null);
  const profileTabRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const visibleProfiles = React.useMemo(
    () => (activeProfileName && !profiles.includes(activeProfileName) ? [activeProfileName, ...profiles] : profiles),
    [activeProfileName, profiles],
  );

  function closeMenu() {
    setMenuProfileName(null);
    setMenuPosition({});
  }

  function startRename(profile: string) {
    setRenameWidth(profileTabRefs.current[profile]?.offsetWidth ?? null);
    setRenamingProfileName(profile);
    closeMenu();
  }

  function closeRename() {
    setRenamingProfileName(null);
    setRenameWidth(null);
    onRenameClosed?.();
  }

  function getMenuPosition(profile: string): React.CSSProperties {
    const containerElement = containerRef.current;
    const tabElement = profileTabRefs.current[profile];
    if (!containerElement || !tabElement) {
      return {};
    }

    const containerRect = containerElement.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();
    return {
      top: "100%",
      right: containerRect.right - tabRect.right,
    };
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

      if (!menuProfileName) {
        const scrollDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        tabListElement.scrollLeft = Math.max(0, Math.min(maxScrollLeft, tabListElement.scrollLeft + scrollDelta));
      }
    };

    tabListElement.addEventListener("wheel", scrollHorizontally, { passive: false });
    return () => tabListElement.removeEventListener("wheel", scrollHorizontally);
  }, [menuProfileName]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeMenu();
        }
      }}
    >
      <nav
        ref={tabListRef}
        className="hide-scrollbar flex min-w-0 flex-1 overflow-x-auto overflow-y-visible whitespace-nowrap"
        aria-label="Profiles"
      >
        {!activeProfileName ? (
          <button
            className="min-w-40 shrink-0 border-b-2 border-(--teal) bg-(--teal-tint) px-8 text-left text-base font-bold
              text-(--teal) shadow-sm focus-visible:outline-none"
            type="button"
            aria-pressed="true"
            disabled
          >
            Current
          </button>
        ) : null}
        {visibleProfiles.map((profile, index) => {
          const active = activeProfileName === profile;
          const menuOpen = menuProfileName === profile;
          const renaming = renamingProfileName === profile;

          return (
            <div
              key={profile}
              ref={(element) => {
                profileTabRefs.current[profile] = element;
              }}
              className={clsx(
                "relative flex min-w-40 shrink-0 items-center border-b-2 border-transparent transition",
                index > 0 && "border-l border-(--line)",
                active
                  ? "border-b-(--teal) bg-(--teal-tint) shadow-sm"
                  : "hover:border-(--teal-soft) hover:bg-(--surface) hover:shadow-sm",
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
                    className={clsx(
                      `min-w-0 flex-1 bg-transparent py-4 pr-2 pl-8 text-left text-base font-bold text-(--ink-soft)
                        transition hover:text-(--ink) focus-visible:outline-none`,
                      active && "text-(--teal)",
                    )}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectProfile(profile)}
                  >
                    {profile}
                  </button>
                  <button
                    className="flex w-8 items-center justify-center bg-transparent text-base font-bold text-(--ink-soft)
                      transition hover:text-(--teal) focus-visible:outline-none"
                    type="button"
                    aria-label={`Manage ${profile}`}
                    aria-expanded={menuOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (menuOpen) {
                        closeMenu();
                      } else {
                        setMenuProfileName(profile);
                        setMenuPosition(getMenuPosition(profile));
                      }
                    }}
                  >
                    ⋮
                  </button>
                </>
              )}
            </div>
          );
        })}
        <button
          className="sticky right-0 z-20 shrink-0 bg-(--paper) px-4 text-lg text-(--ink-soft) transition
            hover:text-(--ink) focus-visible:outline-none"
          type="button"
          aria-label="Create profile"
          onClick={onCreateProfile}
        >
          +
        </button>
      </nav>
      {menuProfileName ? (
        <div className="absolute z-50 mt-1 border border-(--line) bg-(--white) py-1 shadow-sm" style={menuPosition}>
          <button
            className="block w-full bg-transparent px-4 py-2 text-left text-sm font-bold text-(--ink-soft)
              hover:bg-(--surface) hover:text-(--ink) focus-visible:outline-none"
            type="button"
            onClick={() => {
              onDuplicateProfile(menuProfileName);
              closeMenu();
            }}
          >
            Duplicate
          </button>
          {menuProfileName !== activeProfileName ? (
            <button
              className="block w-full bg-transparent px-4 py-2 text-left text-sm font-bold text-(--ink-soft)
                hover:bg-(--surface) hover:text-(--ink) focus-visible:outline-none"
              type="button"
              onClick={() => {
                onCompareProfile(menuProfileName === compareProfileName ? null : menuProfileName);
                closeMenu();
              }}
            >
              {menuProfileName === compareProfileName ? "Stop comparing" : "Compare"}
            </button>
          ) : null}
          <button
            className="block w-full bg-transparent px-4 py-2 text-left text-sm font-bold text-(--ink-soft)
              hover:bg-(--surface) hover:text-(--ink) focus-visible:outline-none"
            type="button"
            onClick={() => startRename(menuProfileName)}
          >
            Rename
          </button>
          <button
            className="block w-full bg-transparent px-4 py-2 text-left text-sm font-bold text-(--destructive)
              hover:bg-(--destructive-soft) focus-visible:outline-none"
            type="button"
            onClick={() => {
              onRemoveProfile(menuProfileName);
              closeMenu();
            }}
          >
            Remove
          </button>
          <button
            className="block w-full bg-transparent px-4 py-2 text-left text-sm font-bold text-(--destructive)
              hover:bg-(--destructive-soft) focus-visible:outline-none"
            type="button"
            onClick={() => {
              onResetProfile(menuProfileName);
              closeMenu();
            }}
          >
            Reset
          </button>
        </div>
      ) : null}
    </div>
  );
}
