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
  onRemove,
  detailsTitle,
  detailsSummary = null,
  detailsClassName = "",
  details = null,
  children,
}: RowItemProps) {
  const detailsId = React.useId();
  const hasDetails = Boolean(detailsTitle) && React.Children.count(details) > 0;
  const [detailsOpen, setDetailsOpen] = React.useState(false);

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
          aria-label="remove"
          onClick={onRemove}
        >
          <span className={smallCapsTextClass}>X</span>
        </button>
      ) : null}

      <div className="p-4 pr-12">
        <div className="flex items-start justify-between gap-4">
          <div className={clsx("min-w-0 flex-1", bodyClassName || "grid gap-4 sm:grid-cols-3")}>
            {children}
            {hasDetails ? (
              <button
                className="inline-flex items-center gap-2 text-xs text-(--ink) focus-visible:outline-none"
                type="button"
                aria-controls={detailsId}
                aria-expanded={detailsOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setDetailsOpen((open) => !open);
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

      {hasDetails && detailsOpen ? (
        <div id={detailsId}>
          <div aria-hidden="true" className="mx-4 border-t border-(--line-soft)" />
          <div className={clsx("p-4", detailsClassName)}>{details}</div>
        </div>
      ) : null}
    </article>
  );
}
