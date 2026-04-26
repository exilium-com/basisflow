import { useEffect, useRef, useState } from "react";

type InlineRenameControlProps = {
  value: string;
  onCancel: () => void;
  onCommit: (value: string) => void;
};

export function InlineRenameControl({ value, onCancel, onCommit }: InlineRenameControlProps) {
  const [draftValue, setDraftValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

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
      className="flex h-full w-full min-w-0 items-center gap-2 bg-(--surface) px-4"
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
        className="min-w-0 flex-1 border-0 border-b border-(--teal) bg-transparent px-2 text-base font-bold
          text-(--ink-soft) focus-visible:outline-none"
        value={draftValue}
        aria-label="Profile name"
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <button
        className="px-2 text-base font-bold text-(--teal) focus-visible:outline-none"
        type="submit"
        aria-label="Save name"
      >
        ✓
      </button>
    </form>
  );
}
