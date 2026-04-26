import React from "react";
import { labelTextClass } from "../lib/text";

type AdvancedPanelProps = {
  id: string;
  defaultOpen?: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
};

export function AdvancedPanel({ id, defaultOpen = false, title, children }: AdvancedPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <details
      id={id}
      className="overflow-hidden border border-(--line) bg-(--white-soft)"
      open={open}
      onToggle={(event: React.SyntheticEvent<HTMLDetailsElement>) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
        <span className={labelTextClass}>{title}</span>
        <span className="flex-none text-sm font-extrabold text-(--teal)" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </summary>
      <div className="border-t border-(--line-soft) p-4">{children}</div>
    </details>
  );
}
