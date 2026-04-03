import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../lib/nav";
import { cx } from "../lib/cx";

export function PageShell({ actions = null, children }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 sm:px-4">
      <nav
        className="mt-3 mb-3 flex flex-wrap gap-2 border-b border-(--line) pb-3"
        aria-label="Tools"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            className={({ isActive }) =>
              cx(
                "inline-flex h-10 items-center gap-2 border border-(--line) bg-(--white-soft) px-3 text-xs font-extrabold uppercase tracking-wide text-(--ink) no-underline transition duration-150 hover:-translate-y-px hover:bg-(--white) focus-visible:-translate-y-px focus-visible:bg-(--white) focus-visible:outline-none",
                isActive && "border-(--teal) bg-(--teal-soft)",
              )
            }
            to={item.to}
            end={item.to === "/"}
          >
            <span className="text-xs text-(--ink-soft)">{item.index}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {actions ? (
          <div className="ml-auto flex flex-wrap gap-1.5">{actions}</div>
        ) : null}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
