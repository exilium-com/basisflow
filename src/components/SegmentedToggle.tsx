import React from "react";
import clsx from "clsx";
import { buttonTextClass, labelTextClass } from "../lib/text";

const labelClassName = labelTextClass;
const toggleClassName = "inline-flex h-10 items-center gap-1 border border-(--line) bg-(--white-soft) p-1";
const segmentClassName =
  `h-8 rounded-sm border border-transparent bg-transparent px-4 ${buttonTextClass} text-(--ink) transition hover:bg-(--teal-soft) focus-visible:outline-none`;
const activeSegmentClassName = "!border-(--teal) !bg-(--teal-tint) !text-(--teal)";

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
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  label = null,
  className = "",
  disabled = false,
}: SegmentedToggleProps<T>) {
  return (
    <div className="grid justify-items-start gap-1">
      {label ? <div className={labelClassName}>{label}</div> : null}
      <div className={clsx(toggleClassName, className)} role="group" aria-label={ariaLabel}>
        {options.map((option: SegmentedToggleOption<T>) => (
          <button
            key={option.value}
            className={clsx(segmentClassName, value === option.value && activeSegmentClassName)}
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
