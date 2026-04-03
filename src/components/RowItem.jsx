import React from "react";
import { cx } from "../lib/cx";

export function RowItem({
  header,
  headerClassName = "",
  removeLabel,
  onRemove,
  detailsTitle,
  detailsSummary = null,
  detailsOpen = false,
  onToggleDetails,
  detailsContentClassName = "",
  children,
}) {
  const defaultHeaderPadding = onRemove
    ? "px-4 pt-3 pb-3 pr-12"
    : "px-4 pt-3 pb-3";
  const removeButtonClassName =
    "absolute top-2 right-3 z-10 border-0 bg-transparent p-0 text-xs font-extrabold leading-none text-(--ink-soft) transition hover:text-(--ink) focus-visible:outline-none";

  return (
    <article className="relative border border-(--line) bg-(--white-soft)">
      {onRemove ? (
        <button
          className={removeButtonClassName}
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          X
        </button>
      ) : null}

      <div className={cx(defaultHeaderPadding, headerClassName)}>{header}</div>

      <details
        open={detailsOpen}
        onToggle={(event) => onToggleDetails?.(event.currentTarget.open)}
      >
        <summary
          className="relative flex cursor-pointer list-none items-center
            justify-between gap-3 px-4 pt-2 pb-3 text-xs font-extrabold
            tracking-wide text-(--ink) uppercase"
        >
          <span
            aria-hidden="true"
            className="absolute top-0 right-6 left-6 border-t
              border-(--line-soft)"
          />
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="text-(--teal)">
              {detailsOpen ? "−" : "+"}
            </span>
            <span>{detailsTitle}</span>
          </span>
          {detailsSummary ? (
            <span
              className="text-right text-sm font-semibold tracking-normal
                text-(--ink-soft) normal-case"
            >
              {detailsSummary}
            </span>
          ) : null}
        </summary>
        <div className={cx("px-4 pb-4", detailsContentClassName)}>
          {children}
        </div>
      </details>
    </article>
  );
}
