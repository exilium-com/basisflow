import React from "react";
import { cx } from "../lib/cx";

export function RowItem({
  header,
  headerClassName = "",
  action = null,
  pinned = false,
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
  const detailsId = React.useId();
  const headerPadding = onRemove ? "px-4 pt-3 pb-3 pr-12" : "px-4 pt-3 pb-3";

  return (
    <article
      className={cx(
        "relative border border-(--line) bg-(--white-soft)",
        pinned && "!border-(--teal-soft) !bg-(--teal-tint)",
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

      <div className={headerPadding}>
        <div className="flex items-start justify-between gap-3">
          <div className={cx("min-w-0 flex-1", headerClassName)}>
            {header}
            {detailsTitle ? (
              <button
                className="inline-flex items-center gap-2 text-xs text-(--ink)
                  focus-visible:outline-none"
                type="button"
                aria-controls={detailsId}
                aria-expanded={detailsOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleDetails?.(!detailsOpen);
                }}
              >
                <span aria-hidden="true" className="text-(--teal)">
                  {detailsOpen ? "−" : "+"}
                </span>
                <span>{detailsTitle}</span>
                {detailsSummary ? (
                  <span className="text-(--ink-soft)">{detailsSummary}</span>
                ) : null}
              </button>
            ) : null}
          </div>
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

      {detailsTitle && detailsOpen ? (
        <div id={detailsId}>
          <div
            aria-hidden="true"
            className="mx-6 border-t border-(--line-soft)"
          />
          <div className={cx("px-4 pt-2 pb-4", detailsContentClassName)}>
            {children}
          </div>
        </div>
      ) : null}
    </article>
  );
}
