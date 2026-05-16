import clsx from "clsx";
import type React from "react";
import { labelTextClass } from "../lib/text";

type InlineLabelLayoutProps = {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  label?: React.ReactNode;
  labelClassName?: string;
  mobileInline?: boolean;
};

export function InlineLabelLayout({
  children,
  className,
  htmlFor,
  label,
  labelClassName,
  mobileInline = false,
}: InlineLabelLayoutProps) {
  const labelClass = clsx(labelTextClass, mobileInline && "shrink-0 text-xs lg:text-sm", labelClassName);
  const labelNode = htmlFor ? (
    <label className={labelClass} htmlFor={htmlFor}>
      {label}
    </label>
  ) : (
    <div className={labelClass}>{label}</div>
  );

  return (
    <div
      className={clsx(
        mobileInline ? "flex min-w-0 items-center gap-3 lg:grid lg:gap-1" : "grid min-w-0 gap-1",
        className,
      )}
    >
      {label ? labelNode : null}
      {mobileInline ? <div className="min-w-0 flex-1">{children}</div> : children}
    </div>
  );
}
