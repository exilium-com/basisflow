import React from "react";
import { ActionButton } from "./ActionButton";
import { TextField } from "./Field";
import { ProfileDialog } from "./ProfileDialog";

type ProfileSaveDialogProps = {
  onClose: () => void;
  onProfileNameChange: (value: string) => void;
  onSave: () => void;
  placeholder: string;
  value: string;
};

export function ProfileSaveDialog({
  onClose,
  onProfileNameChange,
  onSave,
  placeholder,
  value,
}: ProfileSaveDialogProps) {
  return (
    <ProfileDialog title="Save Profile" onClose={onClose}>
      <TextField
        label="Profile name"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onProfileNameChange(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <ActionButton className="text-xs tracking-wide uppercase" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton
          className="border-(--teal) bg-(--teal) text-xs text-(--white) tracking-wide uppercase"
          onClick={onSave}
        >
          Save
        </ActionButton>
      </div>
    </ProfileDialog>
  );
}
