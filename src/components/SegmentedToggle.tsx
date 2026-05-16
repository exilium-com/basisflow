import React from "react";
import clsx from "clsx";
import { buttonTextClass, labelTextClass } from "../lib/text";

const toggleClassName = "inline-flex items-center gap-1 rounded-sm border border-line bg-white-soft p-1";
const segmentClassNameBySize = {
  default: `h-8 rounded-sm border bg-transparent px-3 ${buttonTextClass} focus-visible:outline-none`,
  compact: `h-6 rounded-sm border bg-transparent px-2 ${buttonTextClass} focus-visible:outline-none`,
};
const inactiveSegmentClassName = "border-transparent text-ink hover:bg-teal-soft";
const activeSegmentClassName = "!border-teal !bg-teal-tint !text-teal";

type SegmentedToggleOption<T extends string> = {
  value: T;
  label: React.ReactNode;
};

type SegmentedToggleProps<T extends string> = {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  label?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: "default" | "compact";
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  label = null,
  className = "",
  disabled = false,
  size = "default",
}: SegmentedToggleProps<T>) {
  return (
    <div className="inline-grid w-fit gap-1 justify-self-start">
      {label ? <div className={labelTextClass}>{label}</div> : null}
      <div className={clsx(toggleClassName, className)} role="group" aria-label={ariaLabel}>
        {options.map((option: SegmentedToggleOption<T>) => (
          <button
            key={option.value}
            className={clsx(
              segmentClassNameBySize[size],
              value === option.value ? activeSegmentClassName : inactiveSegmentClassName,
            )}
            type="button"
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
