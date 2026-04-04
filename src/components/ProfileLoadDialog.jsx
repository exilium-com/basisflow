import React from "react";
import { ProfileDialog } from "./ProfileDialog";

export function ProfileLoadDialog({ names, onClose, onDelete, onLoad }) {
  return (
    <ProfileDialog title="Load Profile" onClose={onClose}>
      {names.length ? (
        <div className="grid gap-2">
          {names.map((name) => (
            <button
              key={name}
              className="flex items-center justify-between gap-3 border border-(--line) bg-(--white-soft) px-4 py-3
                text-left transition duration-150 hover:-translate-y-px hover:bg-(--white)"
              onClick={() => onLoad(name)}
              type="button"
            >
              <span className="font-semibold text-(--ink)">{name}</span>
              <button
                aria-label={`Delete ${name}`}
                className="inline-flex h-9 w-9 items-center justify-center border bg-(--white) text-sm font-extrabold
                  transition duration-150 hover:-translate-y-px hover:bg-(--destructive-soft)"
                style={{
                  borderColor: "var(--destructive-soft)",
                  color: "var(--destructive)",
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(name);
                }}
                type="button"
              >
                X
              </button>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--ink-soft)">No saved profiles.</p>
      )}
    </ProfileDialog>
  );
}
