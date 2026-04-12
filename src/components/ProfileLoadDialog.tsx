import React from "react";
import { ProfileDialog } from "./ProfileDialog";

type ProfileLoadDialogProps = {
  names: string[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onLoad: (name: string) => void;
};

export function ProfileLoadDialog({ names, onClose, onDelete, onLoad }: ProfileLoadDialogProps) {
  return (
    <ProfileDialog title="Load Profile" onClose={onClose}>
      {names.length ? (
        <div className="grid gap-2">
          {names.map((name: string) => (
            <div key={name} className="flex items-stretch">
              <button
                className="flex flex-1 items-center border border-(--line) bg-(--white-soft) p-4 font-semibold text-(--ink)
                  transition
                  hover:-translate-y-px hover:bg-(--white)"
                onClick={() => onLoad(name)}
                type="button"
              >
                {name}
              </button>
              <button
                aria-label={`Delete ${name}`}
                className="flex w-10 items-center justify-center border border-l-0 border-(--destructive-soft)
                  bg-(--white) text-sm font-extrabold text-(--destructive) transition
                  hover:-translate-y-px hover:bg-(--destructive-soft)"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(name);
                }}
                type="button"
              >
                X
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-(--ink-soft)">No saved profiles.</p>
      )}
    </ProfileDialog>
  );
}
