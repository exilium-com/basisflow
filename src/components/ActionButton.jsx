import React from "react";
import { Link } from "react-router-dom";
import { cx } from "../lib/cx";

export function ActionButton({
  to,
  className = "",
  style,
  type = "button",
  children,
  ...props
}) {
  const buttonClassName = cx(
    "inline-flex h-10 items-center justify-center gap-2 border border-(--line) bg-(--white-soft) px-4 text-sm font-bold text-(--ink) transition duration-150 hover:-translate-y-px hover:bg-(--white) focus-visible:-translate-y-px focus-visible:bg-(--white) focus-visible:outline-none",
    className,
  );

  if (to) {
    return (
      <Link className={buttonClassName} style={style} to={to} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClassName} style={style} type={type} {...props}>
      {children}
    </button>
  );
}
