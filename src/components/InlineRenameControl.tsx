import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

type InlineRenameControlProps = {
  ariaLabel?: string;
  variant?: "tab" | "title";
  value: string;
  onCancel: () => void;
  onCommit: (value: string) => void;
};

const renameInputClassName = clsx(
  "min-w-0 flex-1 border-b border-teal bg-transparent",
  "font-bold text-ink-soft focus-visible:outline-none",
);

const renameSubmitClassName = clsx("shrink-0 font-bold text-teal hover:text-ink", "focus-visible:outline-none");

const titleSubmitClassName = clsx("grid size-6 place-items-center border", "border-teal-soft bg-teal-tint text-xs");

export function InlineRenameControl({
  ariaLabel = "Profile name",
  variant = "tab",
  value,
  onCancel,
  onCommit,
}: InlineRenameControlProps) {
  const [draftValue, setDraftValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isTitleVariant = variant === "title";

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    const nextValue = draftValue.trim();
    if (!nextValue || nextValue === value) {
      onCancel();
      return;
    }

    onCommit(nextValue);
  }

  return (
    <form
      className={clsx("flex w-full min-w-0 items-center gap-2", isTitleVariant ? "min-h-6" : "h-full bg-surface px-4")}
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          commit();
        }
      }}
    >
      <input
        ref={inputRef}
        className={clsx(renameInputClassName, isTitleVariant ? "text-sm" : "px-2")}
        value={draftValue}
        aria-label={ariaLabel}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <button
        className={clsx(renameSubmitClassName, isTitleVariant ? titleSubmitClassName : "px-2")}
        type="submit"
        aria-label="Save name"
      >
        ✓
      </button>
    </form>
  );
}
