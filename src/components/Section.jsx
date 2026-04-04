import React from "react";
import clsx from "clsx";

export function Section({ title, actions = null, divider = false, children }) {
  return (
    <section className={clsx(divider && "mt-7 border-t border-(--line-soft) pt-4")}>
      <div className="mb-4 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
