import React from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";

type SharedActionButtonProps = {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

type ButtonProps = SharedActionButtonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "style" | "children"> & {
    to?: undefined;
    type?: "button" | "submit" | "reset";
  };

type LinkProps = SharedActionButtonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "style" | "children"> & {
    to: string;
  };

type ActionButtonProps = ButtonProps | LinkProps;

function isLinkProps(props: ActionButtonProps): props is LinkProps {
  return "to" in props && typeof props.to === "string";
}

export function ActionButton(props: ActionButtonProps) {
  const { className = "", style, children } = props;
  const buttonClassName = clsx(
    "inline-flex h-10 items-center justify-center gap-2 border border-(--line) bg-(--white-soft) px-4 text-sm font-bold text-(--ink) transition duration-150 hover:-translate-y-px hover:bg-(--white) focus-visible:-translate-y-px focus-visible:bg-(--white) focus-visible:outline-none",
    className,
  );

  if (isLinkProps(props)) {
    const { to, className: _className, style: _style, children: _children, ...linkProps } = props;
    return (
      <Link className={buttonClassName} style={style} to={to} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", className: _className, style: _style, children: _children, ...buttonProps } = props;
  return (
    <button className={buttonClassName} style={style} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
