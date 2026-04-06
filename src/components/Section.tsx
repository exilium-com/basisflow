import React from "react";
import clsx from "clsx";

export function Section({
  title = null,
  actions = null,
  divider = false,
  children,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx(divider && "mt-7 border-t border-(--line-soft) pt-4")}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
