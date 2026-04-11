import React from "react";

type AdvancedPanelProps = {
  id: string;
  open: boolean;
  onToggle?: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
};

export function AdvancedPanel({ id, open, onToggle, title, children }: AdvancedPanelProps) {
  return (
    <details
      id={id}
      className="overflow-hidden border border-(--line) bg-(--white-soft)"
      open={open}
      onToggle={(event: React.SyntheticEvent<HTMLDetailsElement>) => onToggle?.(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4">
        <span className="text-lg font-extrabold text-(--ink-soft)">{title}</span>
        <span className="flex-none text-sm leading-none font-extrabold text-(--teal)" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </summary>
      <div className="border-t border-(--line-soft) p-4">{children}</div>
    </details>
  );
}
