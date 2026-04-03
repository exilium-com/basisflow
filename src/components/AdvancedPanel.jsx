import React from "react";

export function AdvancedPanel({ id, open, onToggle, title, children }) {
  return (
    <details
      id={id}
      className="mt-6 overflow-hidden border border-(--line) bg-(--white-soft)"
      open={open}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
    >
      <summary
        className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4"
      >
        <span className="text-lg font-extrabold text-(--ink-soft)">{title}</span>
        <span
          className="flex-none text-sm leading-none font-extrabold text-(--teal)"
          aria-hidden="true"
        >
          {open ? "−" : "+"}
        </span>
      </summary>
      <div className="border-t border-(--line-soft) px-4 pt-3 pb-4">
        {children}
      </div>
    </details>
  );
}
