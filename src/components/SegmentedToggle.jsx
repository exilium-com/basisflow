import React from "react";
import clsx from "clsx";

const toggleClassName = "inline-flex h-10 items-center gap-1 border border-(--line) bg-(--white-soft) p-1";
const segmentClassName =
  "h-8 rounded-sm border border-transparent bg-transparent px-3 text-sm font-bold text-(--ink) transition duration-150 hover:bg-(--teal-soft) focus-visible:outline-none";
const activeSegmentClassName = "!border-(--teal) !bg-(--teal-tint) !text-(--teal)";

export function SegmentedToggle({ options, value, onChange, ariaLabel, className = "" }) {
  return (
    <div className={clsx(toggleClassName, className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          className={clsx(segmentClassName, value === option.value && activeSegmentClassName)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
