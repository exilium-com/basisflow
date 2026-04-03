import React from "react";
import { cx } from "../lib/cx";

export function RowItem({
  header,
  headerClassName = "",
  action = null,
  selected = false,
  onSelect,
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

  return (
    <article
      className={cx(
        "relative border border-(--line) bg-(--white-soft)",
        selected && "border-(--teal) bg-(--white)",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
    >
      {onRemove ? (
        <button
          className="absolute top-2 right-3 z-10 border-0 bg-transparent p-0
            text-xs leading-none font-extrabold text-(--ink-soft) transition
            hover:text-(--ink) focus-visible:outline-none"
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          X
        </button>
      ) : null}

      <div className={defaultHeaderPadding}>
        <div className="flex items-start justify-between gap-3">
          <div className={cx("min-w-0 flex-1", headerClassName)}>{header}</div>
          {action ? (
            <div
              className="flex-none"
              onClick={(event) => event.stopPropagation()}
            >
              {action}
            </div>
          ) : null}
        </div>
      </div>

      <details
        open={detailsOpen}
        onClick={(event) => event.stopPropagation()}
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
