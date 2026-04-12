import React from "react";
import clsx from "clsx";
import { labelTextClass, smallCapsTextClass } from "../lib/text";

type RowItemProps = {
  bodyClassName?: string;
  action?: React.ReactNode;
  pinned?: boolean;
  selected?: boolean;
  onSelect?: React.MouseEventHandler<HTMLElement>;
  removeLabel?: string;
  onRemove?: React.MouseEventHandler<HTMLButtonElement>;
  detailsTitle?: React.ReactNode;
  detailsSummary?: React.ReactNode;
  detailsOpen?: boolean;
  onToggleDetails?: (open: boolean) => void;
  detailsClassName?: string;
  details?: React.ReactNode;
  children: React.ReactNode;
};

export function RowItem({
  bodyClassName = "",
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
  detailsClassName = "",
  details = null,
  children,
}: RowItemProps) {
  const detailsId = React.useId();
  const headerPadding = "p-4 pr-12";

  return (
    <article
      className={clsx(
        "relative border border-(--line) bg-(--white-soft)",
        pinned && "border-(--teal-soft)! bg-(--teal-tint)!",
        selected && "border-(--teal) bg-(--white)",
        onSelect && "cursor-pointer",
      )}
      onClick={onSelect}
    >
      {onRemove ? (
        <button
          className="absolute top-4 right-4 z-10 border-0 bg-transparent p-0 leading-none transition hover:text-(--ink)
            focus-visible:outline-none"
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <span className={smallCapsTextClass}>X</span>
        </button>
      ) : null}

      <div className={headerPadding}>
        <div className="flex items-start justify-between gap-4">
          <div className={clsx("min-w-0 flex-1", bodyClassName || "grid grid-cols-3 gap-4")}>
            {children}
            {detailsTitle ? (
              <button
                className="inline-flex items-center gap-2 text-xs text-(--ink) focus-visible:outline-none"
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
                {detailsSummary ? <span className={labelTextClass}>{detailsSummary}</span> : null}
              </button>
            ) : null}
          </div>
          {action ? (
            <div className="flex-none" onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}>
              {action}
            </div>
          ) : null}
        </div>
      </div>

      {detailsTitle && detailsOpen && details ? (
        <div id={detailsId}>
          <div aria-hidden="true" className="mx-4 border-t border-(--line-soft)" />
          <div className={clsx("p-4", detailsClassName)}>{details}</div>
        </div>
      ) : null}
    </article>
  );
}
