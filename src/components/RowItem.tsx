import React from "react";
import clsx from "clsx";
import { InlineRenameControl } from "./InlineRenameControl";
import { labelTextClass } from "../lib/text";

const rowControlButtonClassName = "grid size-5 place-items-center text-ink-soft focus-visible:outline-none";

function RenameIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 11.4V13h1.6l6.9-6.9-1.6-1.6L3 11.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m9.1 5.3 1.6 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" viewBox="0 0 16 16" fill="none">
      <path d="M3.5 4.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 4.5V3h3v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 6.2 5.4 13h5.2L11 6.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

type RowItemProps = {
  canRename?: boolean;
  fallbackName?: string;
  name?: string;
  onRemove?: () => void;
  onRename?: (nextName: string) => void;
  renameAriaLabel?: string;
  detailsSummary?: React.ReactNode;
  detailsClassName?: string;
  details?: React.ReactNode;
  children: React.ReactNode;
};

export function RowItem({
  canRename,
  fallbackName = "",
  name,
  onRemove,
  onRename,
  renameAriaLabel = "Name",
  detailsSummary = null,
  detailsClassName = "",
  details = null,
  children,
}: RowItemProps) {
  const detailsId = React.useId();
  const hasEditableTitle = name != null || fallbackName !== "";
  const displayName = (name ?? "").trim() || fallbackName;
  const renameEnabled = canRename ?? Boolean(onRename);
  const hasDetails = React.Children.count(details) > 0;
  const canToggleDetails = hasEditableTitle && hasDetails;
  const canRenameRow = hasEditableTitle && renameEnabled && Boolean(onRename);
  const canRemoveRow = hasEditableTitle && Boolean(onRemove);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const hasRowControls = canToggleDetails || canRenameRow || canRemoveRow;

  return (
    <article className="border border-line bg-white-soft">
      <div className="p-2 lg:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-2">
            {hasEditableTitle ? (
              renaming && onRename ? (
                <InlineRenameControl
                  ariaLabel={renameAriaLabel}
                  variant="title"
                  value={name || displayName}
                  onCancel={() => setRenaming(false)}
                  onCommit={(nextName) => {
                    onRename(nextName);
                    setRenaming(false);
                  }}
                />
              ) : (
                <div className="flex min-w-0 items-baseline gap-2">
                  <div className="truncate text-sm font-bold text-ink" title={displayName}>
                    {displayName}
                  </div>
                  {detailsSummary ? (
                    <div className={clsx(labelTextClass, "hidden lg:block")}>{detailsSummary}</div>
                  ) : null}
                </div>
              )
            ) : null}
            <div className="min-w-0">{children}</div>
            {canToggleDetails && detailsOpen ? (
              <div id={detailsId} className="border-t border-line-soft pt-2">
                <div className={detailsClassName || "grid gap-4 lg:grid-cols-2"}>{details}</div>
              </div>
            ) : null}
          </div>
          {hasRowControls ? (
            renaming ? (
              <div aria-hidden="true" className="flex shrink-0 items-center gap-1 opacity-0">
                {canToggleDetails ? <div className="size-5" /> : null}
                {canRenameRow ? <div className="size-5" /> : null}
                {canRemoveRow ? <div className="size-5" /> : null}
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-1">
                {canToggleDetails ? (
                  <button
                    type="button"
                    className={clsx(rowControlButtonClassName, "hover:text-teal")}
                    aria-label={`${detailsOpen ? "Hide" : "Show"} details for ${displayName}`}
                    aria-controls={detailsId}
                    aria-expanded={detailsOpen}
                    onClick={() => setDetailsOpen((open) => !open)}
                  >
                    <svg
                      aria-hidden="true"
                      className={clsx("size-3 transition-transform", detailsOpen ? "rotate-180" : "rotate-0")}
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                ) : null}
                {canRenameRow ? (
                  <button
                    type="button"
                    className={clsx(rowControlButtonClassName, "hover:text-teal")}
                    aria-label={`Rename ${displayName}`}
                    onClick={() => setRenaming(true)}
                  >
                    <RenameIcon />
                  </button>
                ) : null}
                {canRemoveRow ? (
                  <button
                    type="button"
                    className={clsx(rowControlButtonClassName, "hover:text-destructive")}
                    aria-label={`Remove ${displayName}`}
                    onClick={() => onRemove?.()}
                  >
                    <RemoveIcon />
                  </button>
                ) : null}
              </div>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}
