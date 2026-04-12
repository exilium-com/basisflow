import React from "react";
import { ActionButton } from "./ActionButton";
import { TextField } from "./Field";
import { ProfileDialog } from "./ProfileDialog";
import { buttonTextClass } from "../lib/text";

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
        <ActionButton onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton
          className={`${buttonTextClass} border-(--teal) bg-(--teal) text-(--white)`}
          onClick={onSave}
        >
          Save
        </ActionButton>
      </div>
    </ProfileDialog>
  );
}
